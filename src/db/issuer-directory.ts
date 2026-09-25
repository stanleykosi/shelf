import postgres from "postgres";
import type { DirectoryListing, IssuerDirectory } from "@/domain/issuer-spotlight";
import { env } from "@/lib/env";

type SnapshotRow = {
  provider: "xstocks" | "prestocks";
  listings: DirectoryListing[];
  fetched_at: Date;
};

const runtime = globalThis as typeof globalThis & {
  __shelfIssuerDirectoryDatabase?: ReturnType<typeof postgres>;
};

function database() {
  if (!env.DATABASE_URL) throw new Error("DATABASE_UNAVAILABLE");
  runtime.__shelfIssuerDirectoryDatabase ??= postgres(env.DATABASE_URL, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 3,
    prepare: false,
    ssl: env.DATABASE_SSL ? "require" : false,
  });
  return runtime.__shelfIssuerDirectoryDatabase;
}

export async function readIssuerDirectory(): Promise<IssuerDirectory | null> {
  const rows = await database()<SnapshotRow[]>`
    select provider, listings, fetched_at
    from issuer_feed_snapshots
    where provider in ('xstocks', 'prestocks')
  `;
  if (!rows.length) return null;

  const providers = ["xstocks", "prestocks"] as const;
  const names = { xstocks: "xStocks", prestocks: "PreStocks" };
  const missing = providers.filter((provider) => !rows.some((row) => row.provider === provider));
  const stale = rows.filter((row) => Date.now() - row.fetched_at.getTime() > 10 * 60_000);

  return {
    listings: rows.flatMap((row) => row.listings)
      .toSorted((a, b) => a.asset.name.localeCompare(b.asset.name)),
    unavailable: missing.map((provider) => names[provider]),
    stale: stale.map((row) => names[row.provider]),
  };
}

export async function saveIssuerDirectory(
  provider: SnapshotRow["provider"],
  listings: DirectoryListing[],
): Promise<void> {
  await database()`
    insert into issuer_feed_snapshots (provider, listings, fetched_at)
    values (${provider}, ${database().json(listings)}, now())
    on conflict (provider) do update
    set listings = excluded.listings, fetched_at = excluded.fetched_at
  `;
}
