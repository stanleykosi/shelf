import postgres from "postgres";
import { randomUUID } from "node:crypto";

const jobKinds = ["refresh_issuer_context", "reconcile_transactions"] as const;

const databaseUrl = process.env.DATABASE_URL;
const preStocksApiUrl = process.env.PRESTOCKS_API_URL ?? "https://prestocks.com/api/prestocks";
const xStocksApiBaseUrl = process.env.XSTOCKS_API_BASE_URL ?? "https://api.xstocks.fi/api/v2/";
const appOrigin = process.env.APP_ORIGIN;
const workerSharedSecret = process.env.WORKER_SHARED_SECRET;

if (!databaseUrl) throw new Error("DATABASE_URL is required.");

const database = postgres(databaseUrl, { max: 1, prepare: false });
const startedAt = new Date();
const fiveMinuteBucket = Math.floor(startedAt.getTime() / 300_000);
const workerId = `railway:${randomUUID()}`;
const leaseUntil = new Date(startedAt.getTime() + 40_000);

type PreStocksRow = {
  symbol: string;
  contract_address: string;
  markPrice: number;
  tokenPrice: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isPreStocksRow(value: unknown): value is PreStocksRow {
  if (!isRecord(value)) return false;
  const row = value;
  return (
    typeof row.symbol === "string" &&
    typeof row.contract_address === "string" &&
    typeof row.markPrice === "number" &&
    Number.isFinite(row.markPrice) &&
    typeof row.tokenPrice === "number" &&
    Number.isFinite(row.tokenPrice)
  );
}

async function refreshPreStocksMarketData(heartbeat: () => Promise<void>): Promise<number> {
  const endpoint = new URL(preStocksApiUrl);
  if (endpoint.protocol !== "https:" || endpoint.hostname !== "prestocks.com") {
    throw new Error("PRESTOCKS_ENDPOINT_NOT_ALLOWED");
  }

  const response = await fetch(endpoint, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`PRESTOCKS_HTTP_${response.status}`);

  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) throw new Error("PRESTOCKS_RESPONSE_INVALID");
  await heartbeat();

  const instruments = await database<{ id: string; mint: string }[]>`
    select id, mint from instruments where issuer_name = 'PreStocks'
  `;
  const instrumentByMint = new Map(instruments.map((instrument) => [instrument.mint, instrument]));
  let snapshots = 0;

  for (const row of payload) {
    if (!isPreStocksRow(row)) continue;
    const instrument = instrumentByMint.get(row.contract_address);
    if (!instrument) continue;

    const prices = [
      { source: "prestocks_mark", price: row.markPrice },
      { source: "prestocks_token", price: row.tokenPrice },
    ];
    for (const price of prices) {
      await database`
        insert into market_snapshots (
          instrument_id,
          source,
          market_state,
          price,
          currency,
          unit,
          observed_at,
          source_as_of,
          normalization_version,
          usable
        )
        values (
          ${instrument.id},
          ${price.source},
          'reference',
          ${String(price.price)},
          'USD',
          'issuer_ui_unit',
          ${startedAt},
          ${startedAt},
          'prestocks-v1',
          true
        )
      `;
      snapshots += 1;
    }
    if (snapshots % 20 === 0) await heartbeat();
  }

  return snapshots;
}

async function verifyXStocksAssets(): Promise<number> {
  const baseUrl = new URL(xStocksApiBaseUrl);
  if (
    baseUrl.protocol !== "https:" ||
    baseUrl.hostname !== "api.xstocks.fi" ||
    !baseUrl.pathname.startsWith("/api/v2")
  ) {
    throw new Error("XSTOCKS_ENDPOINT_NOT_ALLOWED");
  }
  if (!baseUrl.pathname.endsWith("/")) baseUrl.pathname += "/";

  const instruments = await database<{ mint: string; symbol: string }[]>`
    select mint, symbol from instruments where issuer_name = 'Backed Finance'
  `;
  const verified = await Promise.all(
    instruments.map(async (instrument) => {
      const endpoint = new URL(`public/assets/${encodeURIComponent(instrument.symbol)}`, baseUrl);
      const response = await fetch(endpoint, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) throw new Error(`XSTOCKS_HTTP_${response.status}`);

      const payload: unknown = await response.json();
      if (!isRecord(payload)) throw new Error("XSTOCKS_RESPONSE_INVALID");
      const deployments = Array.isArray(payload.deployments) ? payload.deployments : [];
      const solana = deployments.find((deployment) => {
        return isRecord(deployment) && deployment.network === "Solana";
      });
      if (payload.symbol !== instrument.symbol || solana?.address !== instrument.mint) {
        throw new Error("XSTOCKS_ASSET_MISMATCH");
      }
      return instrument.symbol;
    }),
  );
  return verified.length;
}

async function reconcileTransactions(heartbeat: () => Promise<void>): Promise<string> {
  if (!appOrigin || !workerSharedSecret) throw new Error("RECONCILIATION_CONFIGURATION_REQUIRED");
  const endpoint = new URL("/api/internal/reconcile", appOrigin);
  let checked = 0;
  let finalized = 0;
  let errors = 0;
  let remaining = 0;
  let execution = "disabled";
  for (let batch = 0; batch < 2; batch += 1) {
    await heartbeat();
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${workerSharedSecret}` },
      signal: AbortSignal.timeout(24_000),
    });
    if (!response.ok) throw new Error(`RECONCILIATION_HTTP_${response.status}`);
    const payload: unknown = await response.json();
    if (!isRecord(payload) || !isRecord(payload.data) ||
      typeof payload.data.checked !== "number" || typeof payload.data.finalized !== "number" ||
      typeof payload.data.remaining !== "number" || typeof payload.data.errors !== "number" ||
      typeof payload.data.execution !== "string") {
      throw new Error("RECONCILIATION_INVALID");
    }
    checked += payload.data.checked;
    finalized += payload.data.finalized;
    errors += payload.data.errors;
    remaining = payload.data.remaining;
    execution = payload.data.execution;
    if (remaining === 0 || checked === 0 || execution !== "enabled") break;
  }
  return `checked:${checked},finalized:${finalized},errors:${errors},remaining:${remaining},execution:${execution}`;
}

async function renewJobLease(jobId: string): Promise<void> {
  const renewed = await database<{ id: string }[]>`
    update jobs
    set lease_until = now() + interval '40 seconds',
        updated_at = now()
    where id = ${jobId}
      and state = 'running'
      and worker_id = ${workerId}
    returning id
  `;
  if (renewed.length === 0) throw new Error("JOB_LEASE_LOST");
}

try {
  let failedJobs = 0;
  for (const kind of jobKinds) {
    const dedupeKey = `${kind}:${fiveMinuteBucket}`;
    const claimed = await database<{ id: string; attempts: number }[]>`
      insert into jobs (
        kind,
        dedupe_key,
        payload_references,
        state,
        next_run_at,
        attempts,
        lease_until,
        worker_id,
        created_at,
        updated_at
      )
      values (
        ${kind},
        ${dedupeKey},
        ${database.json({ source: "railway-scheduler", result: "claimed" })},
        'running',
        ${startedAt},
        1,
        ${leaseUntil},
        ${workerId},
        ${startedAt},
        ${startedAt}
      )
      on conflict (kind, dedupe_key) do update
      set state = 'running',
          payload_references = ${database.json({ source: "railway-scheduler", result: "expired_lease_reclaimed" })},
          attempts = jobs.attempts + 1,
          lease_until = excluded.lease_until,
          worker_id = excluded.worker_id,
          last_error_code = 'LEASE_EXPIRED',
          updated_at = excluded.updated_at
      where jobs.state = 'running'
        and jobs.lease_until is not null
        and jobs.lease_until <= excluded.updated_at
        and jobs.attempts < 5
      returning id, attempts
    `;
    if (claimed.length === 0) {
      const exhausted = await database<{ id: string }[]>`
        update jobs
        set state = 'failed',
            lease_until = null,
            worker_id = null,
            last_error_code = 'MAX_ATTEMPTS',
            updated_at = ${startedAt}
        where kind = ${kind}
          and dedupe_key = ${dedupeKey}
          and state = 'running'
          and lease_until is not null
          and lease_until <= ${startedAt}
          and attempts >= 5
        returning id
      `;
      if (exhausted.length > 0) failedJobs += 1;
      continue;
    }

    let jobState = "complete";
    let result = "not_started";

    try {
      await renewJobLease(claimed[0].id);
      if (kind === "refresh_issuer_context") {
        const snapshots = await refreshPreStocksMarketData(() => renewJobLease(claimed[0].id));
        await renewJobLease(claimed[0].id);
        const xStocksAssets = await verifyXStocksAssets();
        result = `prestocks_snapshots:${snapshots},xstocks_assets:${xStocksAssets}`;
      } else {
        result = await reconcileTransactions(() => renewJobLease(claimed[0].id));
      }
      await renewJobLease(claimed[0].id);
    } catch (error) {
      jobState = "failed";
      failedJobs += 1;
      result = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    }

    const payload = { source: "railway-scheduler", result };

    const settled = await database<{ id: string }[]>`
      update jobs
      set payload_references = ${database.json(payload)},
          state = ${jobState},
          lease_until = null,
          updated_at = now(),
          last_error_code = ${jobState === "failed" ? result : null}
      where id = ${claimed[0].id}
        and state = 'running'
        and worker_id = ${workerId}
      returning id
    `;
    if (settled.length === 0) {
      if (jobState !== "failed") failedJobs += 1;
      console.error(JSON.stringify({
        event: "job_lease_lost",
        kind,
        dedupeKey,
        attempts: claimed[0].attempts,
      }));
    }
  }

  console.log(
    JSON.stringify({
      status: failedJobs ? "partial_failure" : "complete",
      providers: ["prestocks", "xstocks", "shelf-reconciliation"],
      checkedJobs: jobKinds.length,
      failedJobs,
      startedAt: startedAt.toISOString(),
    }),
  );
} finally {
  await database.end();
}
