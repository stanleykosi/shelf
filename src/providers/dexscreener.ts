import { z } from "zod";

const poolSchema = z.object({
  chainId: z.string(),
  dexId: z.string(),
  pairAddress: z.string(),
  baseToken: z.object({ address: z.string() }),
  priceUsd: z.string().nullable().optional(),
  priceChange: z.object({ h1: z.number().finite().optional() }).nullable().optional(),
  liquidity: z.object({ usd: z.number().finite().optional() }).nullable().optional(),
});

export type PoolMarket = {
  mint: string;
  pairAddress: string;
  venue: string;
  priceUsd: string;
  change1hPct: number;
  liquidityUsd: number;
};

/** Prefer the most liquid exact-mint pool, never the pool with the most flattering move. */
export function selectPoolMarkets(raw: unknown, requestedMints: ReadonlySet<string>): PoolMarket[] {
  const pools = z.array(poolSchema).parse(raw);
  const bestByMint = new Map<string, PoolMarket>();
  for (const pool of pools) {
    const mint = pool.baseToken.address;
    const price = Number(pool.priceUsd);
    const change = pool.priceChange?.h1;
    const liquidity = pool.liquidity?.usd;
    if (pool.chainId !== "solana" || !requestedMints.has(mint) ||
      !pool.pairAddress || !Number.isFinite(price) || price <= 0 ||
      change === undefined || liquidity === undefined || liquidity < 25_000) continue;
    const market = {
      mint,
      pairAddress: pool.pairAddress,
      venue: pool.dexId,
      priceUsd: pool.priceUsd!,
      change1hPct: change,
      liquidityUsd: liquidity,
    };
    if (!bestByMint.has(mint) || bestByMint.get(mint)!.liquidityUsd < liquidity) bestByMint.set(mint, market);
  }
  return [...bestByMint.values()];
}

export class LiveDexScreenerProvider {
  constructor(private readonly send: typeof fetch = fetch) {}

  async markets(mints: string[]): Promise<{ markets: PoolMarket[]; incomplete: boolean }> {
    const uniqueMints = [...new Set(mints)].filter((mint) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint));
    const batches: string[][] = [];
    for (let index = 0; index < uniqueMints.length; index += 30) batches.push(uniqueMints.slice(index, index + 30));
    if (!batches.length) return { markets: [], incomplete: false };

    const responses = await Promise.allSettled(batches.map(async (batch) => {
      const endpoint = `https://api.dexscreener.com/tokens/v1/solana/${batch.join(",")}`;
      const response = await this.send(endpoint, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) throw new Error("DEX_MARKET_UNAVAILABLE");
      return selectPoolMarkets(await response.json(), new Set(batch));
    }));
    const fulfilled = responses.filter((result): result is PromiseFulfilledResult<PoolMarket[]> => result.status === "fulfilled");
    if (!fulfilled.length) throw new Error("DEX_MARKET_UNAVAILABLE");
    return {
      markets: fulfilled.flatMap((result) => result.value),
      incomplete: fulfilled.length !== batches.length,
    };
  }
}
