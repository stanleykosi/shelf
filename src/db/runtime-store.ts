import postgres from "postgres";
import { deserializeState, serializeState, type StoredState } from "@/domain/state-serialization";
import { replaceStoreState, state } from "@/domain/store";
import type { MarketHistoryPoint } from "@/domain/types";
import { env } from "@/lib/env";

type DatabaseClient = ReturnType<typeof postgres>;

const runtime = globalThis as typeof globalThis & {
  __shelfDatabase?: DatabaseClient;
  __shelfMarketDatabase?: DatabaseClient;
  __shelfRuntimeQueue?: Promise<void>;
};

function createDatabaseClient(): DatabaseClient {
  if (!env.DATABASE_URL) throw new Error("DATABASE_UNAVAILABLE");
  return postgres(env.DATABASE_URL, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    ssl: env.DATABASE_SSL ? "require" : false,
  });
}

function database(): DatabaseClient {
  runtime.__shelfDatabase ??= createDatabaseClient();
  return runtime.__shelfDatabase;
}

function marketDatabase(): DatabaseClient {
  runtime.__shelfMarketDatabase ??= createDatabaseClient();
  return runtime.__shelfMarketDatabase;
}

async function serializeWithinInstance<Result>(work: () => Promise<Result>): Promise<Result> {
  const previous = runtime.__shelfRuntimeQueue ?? Promise.resolve();
  let release = () => {};
  runtime.__shelfRuntimeQueue = new Promise<void>((resolve) => {
    release = resolve;
  });

  await previous;
  try {
    return await work();
  } finally {
    release();
  }
}

export async function runWithRuntimeState<Result>(
  mutating: boolean,
  work: () => Promise<Result>,
): Promise<Result> {
  return serializeWithinInstance(async () => {
    const result = await database().begin(async (transaction) => {
      if (mutating) {
        await transaction`select pg_advisory_xact_lock(hashtext('shelf-runtime-state'))`;
      }

      const rows = await transaction<{ payload: StoredState }[]>`
        select payload from runtime_states where key = 'default'
      `;
      if (rows[0]) replaceStoreState(deserializeState(rows[0].payload));

      const result = await work();
      if (mutating) {
        const payload: postgres.JSONValue = serializeState(state);
        await transaction`
          insert into runtime_states (key, version, payload, updated_at)
          values ('default', 1, ${transaction.json(payload)}, now())
          on conflict (key) do update
          set version = runtime_states.version + 1,
              payload = excluded.payload,
              updated_at = now()
        `;
      }
      return { value: result };
    });
    return result.value;
  });
}

export async function checkRuntimeStore(): Promise<void> {
  await database()`select 1`;
}

export async function readMarketHistory(mint: string): Promise<MarketHistoryPoint[]> {
  const rows = await marketDatabase()<
    {
      observedAt: Date;
      source: string;
      price: string;
    }[]
  >`
    select snapshots.observed_at as "observedAt", snapshots.source, snapshots.price::text
    from market_snapshots snapshots
    join instruments on instruments.id = snapshots.instrument_id
    where instruments.mint = ${mint}
      and snapshots.usable = true
      and snapshots.price is not null
    order by snapshots.observed_at desc
    limit 192
  `;

  const points = new Map<string, MarketHistoryPoint>();
  for (const row of rows.reverse()) {
    const observedAt = row.observedAt.toISOString();
    const point = points.get(observedAt) ?? { observedAt };
    if (row.source === "prestocks_mark") point.markPriceUsd = row.price;
    if (row.source === "prestocks_token") point.tokenPriceUsd = row.price;
    if (row.source === "xstocks_reference") point.referencePriceUsd = row.price;
    points.set(observedAt, point);
  }
  return [...points.values()].slice(-48);
}
