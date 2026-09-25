import { describe, expect, it } from "vitest";
import { selectHomeHighlights } from "@/domain/home-highlights";
import { selectPoolMarkets } from "@/providers/dexscreener";
import type { XStocksListing } from "@/providers/xstocks";

const appleMint = "XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp";
const pepsiMint = "Xsv99frTRUeornyvCfvhnDesQDWuvns1M852Pez91vF";

function listing(name: string, symbol: string, mint: string): XStocksListing {
  return {
    companyId: `issuer:xstocks:${symbol}`,
    name, symbol, mint,
    description: "", underlyingSymbol: symbol.replace(/x$/, ""), exchange: "Nasdaq",
    marketOpen: true, marketPeriod: "regular", nextChangeAt: "", tradingHalted: false,
    supportsAtomicSwaps: false, observedAt: "2026-09-25T00:00:00.000Z",
  };
}

function pool(mint: string, liquidityUsd: number, change24hPct: number, priceUsd = "140.25") {
  return {
    chainId: "solana", dexId: "raydium", pairAddress: `pair-${liquidityUsd}`,
    baseToken: { address: mint }, priceUsd,
    priceChange: { h1: -change24hPct, h24: change24hPct }, liquidity: { usd: liquidityUsd },
  };
}

describe("home market highlights", () => {
  it("uses only exact verified Solana mints and the deepest qualifying pool", () => {
    const markets = selectPoolMarkets([
      pool(appleMint, 20_000, 95),
      pool(appleMint, 70_000, 3),
      pool(appleMint, 90_000, -4),
      { ...pool(appleMint, 500_000, 80), chainId: "ethereum" },
      pool(pepsiMint, 60_000, 2),
      pool("unverified-mint", 500_000, 100),
      { ...pool(appleMint, 600_000, 100), priceChange: { h1: 100 } },
    ], new Set([appleMint, pepsiMint]));
    expect(markets).toHaveLength(2);
    expect(markets.find((market) => market.mint === appleMint)).toMatchObject({ change24hPct: -4, liquidityUsd: 90_000 });
  });

  it("sorts current company listings by 24-hour change without inventing missing prices", () => {
    const markets = selectPoolMarkets([
      pool(appleMint, 80_000, -2), pool(pepsiMint, 60_000, 4),
      pool("fund-mint", 150_000, 50),
    ], new Set([appleMint, pepsiMint, "fund-mint"]));
    const highlights = selectHomeHighlights([
      listing("Apple", "AAPLx", appleMint),
      listing("PepsiCo", "PEPx", pepsiMint),
      listing("SP500", "SPYx", "fund-mint"),
    ], markets);
    expect(highlights.map((item) => item.symbol)).toEqual(["PEPx", "AAPLx"]);
    expect(highlights[0]).toMatchObject({ priceUsd: "140.25", change24hPct: 4 });
  });
});
