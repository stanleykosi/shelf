import { expect, it } from "vitest";
import type { IssuerListing } from "./issuer-assets";
import { buildIssuerDirectory, selectFeaturedCompanies } from "./issuer-spotlight";

it("includes every live listing while rotating ten featured assets", () => {
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

  const directory = buildIssuerDirectory(feeds);
  const first = selectFeaturedCompanies(directory.listings, () => 0);
  const second = selectFeaturedCompanies(directory.listings, () => 0.9);
  const liveIds = new Set(feeds.listings.map((listing) => listing.asset.companyId));

  expect(directory.listings).toHaveLength(feeds.listings.length);
  expect(directory.listings.find((listing) => listing.asset.symbol === "PEPx")?.sector).toBe("Food & drink");
  expect(directory.listings.find((listing) => listing.asset.symbol === "SPYx")?.sector).toBe("Other");
  expect(directory.listings[0].asset).not.toHaveProperty("mint");
  expect(first).toHaveLength(10);
  expect(first.filter((listing) => listing.provider === "prestocks")).toHaveLength(2);
  expect(first.every((listing) => liveIds.has(listing.asset.companyId))).toBe(true);
  expect(first.map((listing) => listing.asset.symbol))
    .not.toEqual(second.map((listing) => listing.asset.symbol));
});
