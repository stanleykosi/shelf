import { z } from "zod";

export const marketRanges = ["1D", "1W", "1M", "3M"] as const;
export type MarketRange = (typeof marketRanges)[number];

export type MarketCandle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

const ohlcvResponse = z.object({
  data: z.object({
    attributes: z.object({
      ohlcv_list: z.array(z.tuple([
        z.number().int(), z.number(), z.number(), z.number(), z.number(), z.number(),
      ])),
    }),
  }),
});

// Two shared upstream requests cover all four ranges. This cuts provider calls in half
// when someone explores the chart, while keeping each displayed range honest.
const rangeOptions: Record<MarketRange, { timeframe: string; aggregate: number; limit: number; seconds: number }> = {
  "1D": { timeframe: "minute", aggregate: 15, limit: 672, seconds: 86_400 },
  "1W": { timeframe: "minute", aggregate: 15, limit: 672, seconds: 7 * 86_400 },
  "1M": { timeframe: "day", aggregate: 1, limit: 90, seconds: 30 * 86_400 },
  "3M": { timeframe: "day", aggregate: 1, limit: 90, seconds: 90 * 86_400 },
};

/** GeckoTerminal returns newest-first arrays. Keep only finite, valid USD candles. */
export function parsePoolCandles(raw: unknown): MarketCandle[] {
  const parsed = ohlcvResponse.safeParse(raw);
  if (!parsed.success) throw new Error("MARKET_HISTORY_INVALID");

  const byTime = new Map<number, MarketCandle>();
  for (const [time, open, high, low, close, volume] of parsed.data.data.attributes.ohlcv_list) {
    if (time <= 0 || ![open, high, low, close].every((price) => Number.isFinite(price) && price > 0) ||
      !Number.isFinite(volume) || volume < 0 || low > high ||
      open < low || open > high || close < low || close > high) continue;
    byTime.set(time, { time, open, high, low, close, volume });
  }
  return [...byTime.values()].sort((left, right) => left.time - right.time);
}

export async function fetchPoolCandles(
  poolAddress: string,
  tokenMint: string,
  range: MarketRange,
  send: typeof fetch = fetch,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<MarketCandle[]> {
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(poolAddress) ||
    !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(tokenMint)) throw new Error("MARKET_ID_INVALID");

  const { timeframe, aggregate, limit, seconds } = rangeOptions[range];
  const url = new URL(`https://api.geckoterminal.com/api/v2/networks/solana/pools/${poolAddress}/ohlcv/${timeframe}`);
  url.searchParams.set("aggregate", String(aggregate));
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("currency", "usd");
  url.searchParams.set("token", tokenMint);
  const response = await send(url, {
    headers: { Accept: "application/json;version=20230203" },
    signal: AbortSignal.timeout(8_000),
    next: { revalidate: 180 },
  });
  if (!response.ok) throw new Error("MARKET_HISTORY_UNAVAILABLE");
  return parsePoolCandles(await response.json()).filter(
    (candle) => candle.time >= nowSeconds - seconds && candle.time <= nowSeconds,
  );
}
