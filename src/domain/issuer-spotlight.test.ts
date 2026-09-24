import { expect, it } from "vitest";
import type { IssuerListing } from "./issuer-assets";
import { buildIssuerSpotlight } from "./issuer-spotlight";

it("rotates only current company tokens and keeps two PreStocks listings in the spotlight", () => {
  const publicSymbols = [
    ["AAPLx", "Apple"], ["MSFTx", "Microsoft"], ["NVDAx", "NVIDIA"],
    ["GOOGLx", "Alphabet"], ["AMZNx", "Amazon"], ["METAx", "Meta"],
    ["PEPx", "PepsiCo"], ["KOx", "Coca-Cola"], ["MCDx", "McDonald's"],
    ["JPMx", "JPMorgan Chase"], ["DISx", "The Walt Disney"], ["XOMx", "Exxon Mobil"],
    ["SPYx", "SP500"],
  ];
  const publicListings = publicSymbols.map(([symbol, name]) => ({
    provider: "xstocks" as const,
    asset: { companyId: `issuer:xstocks:${symbol}`, symbol, name },
  })) as IssuerListing[];
  const privateListings = ["OPENAI", "ANTHROPIC", "SPACEX"].map((symbol) => ({
    provider: "prestocks" as const,
    asset: { companyId: `issuer:prestocks:${symbol}`, symbol, name: symbol },
  })) as IssuerListing[];
  const feeds = { listings: [...publicListings, ...privateListings], unavailable: [], stale: [] };

  const first = buildIssuerSpotlight(feeds, () => 0);
  const second = buildIssuerSpotlight(feeds, () => 0.9);
  const liveIds = new Set(feeds.listings.map((listing) => listing.asset.companyId));

  expect(first.featured).toHaveLength(12);
  expect(first.featured.filter((listing) => listing.provider === "prestocks")).toHaveLength(2);
  expect(first.listings.find((listing) => listing.asset.symbol === "PEPx")?.sector).toBe("Food & drink");
  expect(first.listings.some((listing) => listing.asset.symbol === "SPYx")).toBe(false);
  expect(first.featured.every((listing) => liveIds.has(listing.asset.companyId))).toBe(true);
  expect(first.featured.map((listing) => listing.asset.symbol))
    .not.toEqual(second.featured.map((listing) => listing.asset.symbol));
});
