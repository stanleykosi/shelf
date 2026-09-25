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

  it("pins the requested Solana mint in the USD chart request", async () => {
    const requests: URL[] = [];
    const send = (async (input: RequestInfo | URL) => {
      requests.push(new URL(String(input)));
      return Response.json({ data: { attributes: { ohlcv_list: [[100, 10, 12, 9, 11, 75]] } } });
    }) as typeof fetch;
    const candles = await fetchPoolCandles(pool, mint, "1W", send);
    expect(candles).toHaveLength(1);
    expect(requests[0].pathname).toBe(`/api/v2/networks/solana/pools/${pool}/ohlcv/hour`);
    expect(requests[0].searchParams.get("token")).toBe(mint);
    expect(requests[0].searchParams.get("currency")).toBe("usd");
    expect(requests[0].searchParams.get("aggregate")).toBe("4");
  });
});
