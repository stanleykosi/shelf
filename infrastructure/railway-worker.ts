import postgres from "postgres@3.4.9";

const jobKinds = ["refresh_issuer_context"] as const;

const databaseUrl = process.env.DATABASE_URL;
const preStocksApiUrl = process.env.PRESTOCKS_API_URL ?? "https://prestocks.com/api/prestocks";
const xStocksApiBaseUrl = process.env.XSTOCKS_API_BASE_URL ?? "https://api.xstocks.fi/api/v2/";

if (!databaseUrl) throw new Error("DATABASE_URL is required.");

const database = postgres(databaseUrl, { max: 1, prepare: false });
const startedAt = new Date();
const fiveMinuteBucket = Math.floor(startedAt.getTime() / 300_000);

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

async function refreshPreStocksMarketData(): Promise<number> {
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

try {
  let failedJobs = 0;
  for (const kind of jobKinds) {
    const dedupeKey = `${kind}:${fiveMinuteBucket}`;
    let jobState = "complete";
    let result = "not_started";

    try {
      const snapshots = await refreshPreStocksMarketData();
      const xStocksAssets = await verifyXStocksAssets();
      result = `prestocks_snapshots:${snapshots},xstocks_assets:${xStocksAssets}`;
    } catch (error) {
      jobState = "failed";
      failedJobs += 1;
      result = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    }

    const payload = { source: "railway-scheduler", result };

    await database`
      insert into jobs (
        kind,
        dedupe_key,
        payload_references,
        state,
        next_run_at,
        attempts,
        created_at,
        updated_at
      )
      values (
        ${kind},
        ${dedupeKey},
        ${database.json(payload)},
        ${jobState},
        ${startedAt},
        1,
        ${startedAt},
        ${startedAt}
      )
      on conflict (kind, dedupe_key) do nothing
    `;
  }

  console.log(
    JSON.stringify({
      status: failedJobs ? "partial_failure" : "complete",
      providers: ["prestocks", "xstocks"],
      checkedJobs: jobKinds.length,
      failedJobs,
      startedAt: startedAt.toISOString(),
    }),
  );
} finally {
  await database.end();
}
