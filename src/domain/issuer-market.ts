import type { MarketCandle, MarketRange } from "@/providers/geckoterminal";

export type IssuerMarketView = {
  state: "available" | "unavailable";
  historyState: "available" | "empty" | "error";
  range: MarketRange;
  checkedAt: string;
  priceUsd?: string;
  change24hPct?: number;
  liquidityUsd?: number;
  venue?: string;
  poolAddress?: string;
  candles: MarketCandle[];
};
