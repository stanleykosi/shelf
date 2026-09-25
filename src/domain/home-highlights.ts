import type { XStocksListing } from "@/providers/xstocks";
import type { PoolMarket } from "@/providers/dexscreener";

export type HomeHighlight = {
  name: string;
  symbol: string;
  logoUrl?: string;
  priceUsd: string;
  change1hPct: number;
  liquidityUsd: number;
  venue: string;
};

export type HomeHighlights = {
  items: HomeHighlight[];
  checkedAt: string;
  incomplete: boolean;
};

// Editorial universe for a company-focused home section. Prices and ranking are always live data.
const familiarCompanySymbols = new Set([
  "AAPLX", "MSFTX", "NVDAX", "GOOGLX", "AMZNX", "METAX", "TSLAX", "NFLXX",
  "PEPX", "DISX", "WMTX", "JPMX", "MCDX", "KOX", "PGX", "JNJX", "XOMX", "AVGOX",
]);

/** Only current issuer listings can become company cards. Pool data supplies market context. */
export function selectHomeHighlights(listings: XStocksListing[], markets: PoolMarket[]): HomeHighlight[] {
  const marketByMint = new Map(markets.map((market) => [market.mint, market]));
  return listings.flatMap<HomeHighlight>((listing) => {
    if (!familiarCompanySymbols.has(listing.symbol.toUpperCase())) return [];
    const market = marketByMint.get(listing.mint);
    if (!market) return [];
    return [{
      name: listing.name,
      symbol: listing.symbol,
      logoUrl: listing.logoUrl,
      priceUsd: market.priceUsd,
      change1hPct: market.change1hPct,
      liquidityUsd: market.liquidityUsd,
      venue: market.venue,
    }];
  }).toSorted((left, right) => right.change1hPct - left.change1hPct || right.liquidityUsd - left.liquidityUsd).slice(0, 4);
}
