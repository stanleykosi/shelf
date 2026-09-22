import Decimal from "decimal.js";

export type MarketFeed<Listing> = {
  state: "current" | "stale";
  listings: Listing[];
};

export function premiumBps(markPriceUsd: string, tokenPriceUsd: string): number | null {
  const mark = new Decimal(markPriceUsd);
  if (mark.isZero()) return null;
  return new Decimal(tokenPriceUsd).minus(mark).dividedBy(mark).times(10_000).round().toNumber();
}

export function premiumLabel(basisPoints: number | null): string {
  if (basisPoints === null) return "Unavailable";
  const percentage = new Decimal(basisPoints).dividedBy(100).abs().toFixed(2);
  if (basisPoints === 0) return "At issuer mark";
  return `${percentage}% ${basisPoints > 0 ? "premium" : "discount"}`;
}
