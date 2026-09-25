import { describe, expect, it } from "vitest";
import { fetchPoolCandles, parsePoolCandles } from "@/providers/geckoterminal";

const mint = "XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp";
const pool = "CKwJZwm7oj3nu4653N1EpDrqXbXAYXoPFiPeEnLouF8y";

describe("GeckoTerminal pool history", () => {
  it("sorts real-format candles and rejects malformed or impossible prices", () => {
    const candles = parsePoolCandles({ data: { attributes: { ohlcv_list: [
      [200, 12, 13, 11, 12.5, 100],
      [100, 10, 12, 9, 11, 75],
      [300, 10, 8, 9, 10, 12],
      [400, 0, 1, 0, 1, 12],
    ] } } });
    expect(candles.map((candle) => candle.time)).toEqual([100, 200]);
    expect(candles[1]).toMatchObject({ open: 12, high: 13, low: 11, close: 12.5, volume: 100 });
  });

  it("pins the mint and shares one upstream request shape across short ranges", async () => {
    const requests: URL[] = [];
    const now = 2_000_000;
    const send = (async (input: RequestInfo | URL) => {
      requests.push(new URL(String(input)));
      return Response.json({ data: { attributes: { ohlcv_list: [
        [now - 2 * 86_400, 10, 12, 9, 11, 75],
        [now - 7_200, 11, 13, 10, 12, 80],
        [now - 3_600, 12, 14, 11, 13, 85],
      ] } } });
    }) as typeof fetch;
    const day = await fetchPoolCandles(pool, mint, "1D", send, now);
    const week = await fetchPoolCandles(pool, mint, "1W", send, now);
    expect(day).toHaveLength(3);
    expect(week).toHaveLength(3);
    expect(requests[0].toString()).toBe(requests[1].toString());
    expect(requests[0].pathname).toBe(`/api/v2/networks/solana/pools/${pool}/ohlcv/minute`);
    expect(requests[0].searchParams.get("token")).toBe(mint);
    expect(requests[0].searchParams.get("currency")).toBe("usd");
    expect(requests[0].searchParams.get("aggregate")).toBe("15");
    expect(requests[0].searchParams.get("limit")).toBe("672");
  });

  it("shares the daily upstream series across month ranges", async () => {
    const requests: URL[] = [];
    const now = 8_000_000;
    const send = (async (input: RequestInfo | URL) => {
      requests.push(new URL(String(input)));
      return Response.json({ data: { attributes: { ohlcv_list: [
        [now - 50 * 86_400, 10, 12, 9, 11, 75],
        [now - 20 * 86_400, 11, 13, 10, 12, 80],
        [now - 86_400, 12, 14, 11, 13, 85],
      ] } } });
    }) as typeof fetch;
    expect(await fetchPoolCandles(pool, mint, "1M", send, now)).toHaveLength(3);
    expect(await fetchPoolCandles(pool, mint, "3M", send, now)).toHaveLength(3);
    expect(requests[0].toString()).toBe(requests[1].toString());
    expect(requests[0].pathname).toBe(`/api/v2/networks/solana/pools/${pool}/ohlcv/day`);
    expect(requests[0].searchParams.get("limit")).toBe("90");
  });

  it("requests older observed candles before the earliest visible time", async () => {
    let requestUrl: URL | null = null;
    const send = (async (input: RequestInfo | URL) => {
      requestUrl = new URL(String(input));
      return Response.json({ data: { attributes: { ohlcv_list: [
        [1_799_000_000, 10, 12, 9, 11, 75],
        [1_800_000_000, 11, 13, 10, 12, 80],
        [1_801_000_000, 12, 14, 11, 13, 85],
      ] } } });
    }) as typeof fetch;
    const candles = await fetchPoolCandles(pool, mint, "1D", send, 1_802_000_000, 1_801_000_000);
    expect(candles.map((candle) => candle.time)).toEqual([1_799_000_000, 1_800_000_000, 1_801_000_000]);
    expect(requestUrl).not.toBeNull();
    expect((requestUrl as URL | null)?.searchParams.get("before_timestamp")).toBe("1801000000");
  });
});
