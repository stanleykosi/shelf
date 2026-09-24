import type { IssuerFeedSnapshot, IssuerListing } from "./issuer-assets";

export const issuerSectors = [
  "Technology",
  "Food & drink",
  "Retail",
  "Finance",
  "Healthcare",
  "Media",
  "Industrials",
  "Energy",
  "Other",
] as const;

export type IssuerSector = (typeof issuerSectors)[number];
export type SpotlightListing = IssuerListing & { sector: IssuerSector };

export type IssuerSpotlight = {
  featured: SpotlightListing[];
  listings: SpotlightListing[];
  unavailable: string[];
  stale: string[];
};

// These are editorial sector labels, not issuer-supplied rankings or a token registry.
// Every displayed asset still has to exist in the current issuer feed.
const publicSectors: Record<string, IssuerSector> = {
  AAPLX: "Technology",
  MSFTX: "Technology",
  NVDAX: "Technology",
  GOOGLX: "Technology",
  METAX: "Technology",
  AMZNX: "Retail",
  WMTX: "Retail",
  PEPX: "Food & drink",
  KOX: "Food & drink",
  MCDX: "Food & drink",
  JPMX: "Finance",
  VX: "Finance",
  MAX: "Finance",
  JNJX: "Healthcare",
  UNHX: "Healthcare",
  DISX: "Media",
  NFLXX: "Media",
  TSLAX: "Industrials",
  XOMX: "Energy",
};

const privateSectors: Record<string, IssuerSector> = {
  ANDURIL: "Industrials",
  ANTHROPIC: "Technology",
  FIGUREAI: "Industrials",
  KALSHI: "Finance",
  NEURALINK: "Healthcare",
  OPENAI: "Technology",
  POLYMARKET: "Finance",
  SPACEX: "Industrials",
};

const familiarPublicSymbols = new Set([
  "AAPLX", "MSFTX", "NVDAX", "GOOGLX", "AMZNX", "METAX",
]);

function shuffled<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const otherIndex = Math.floor(random() * (index + 1));
    [result[index], result[otherIndex]] = [result[otherIndex], result[index]];
  }
  return result;
}

export function buildIssuerSpotlight(
  feeds: IssuerFeedSnapshot,
  random: () => number = Math.random,
): IssuerSpotlight {
  const listings = feeds.listings.flatMap<SpotlightListing>((listing) => {
    const symbol = listing.asset.symbol.toUpperCase();
    const sector = listing.provider === "xstocks"
      ? publicSectors[symbol]
      : privateSectors[symbol] ?? "Other";
    return sector ? [{ ...listing, sector }] : [];
  });

  const publicListings = listings.filter((listing) => listing.provider === "xstocks");
  const privateListings = listings.filter((listing) => listing.provider === "prestocks");
  const familiar = publicListings.filter((listing) => familiarPublicSymbols.has(listing.asset.symbol.toUpperCase()));
  const others = publicListings.filter((listing) => !familiarPublicSymbols.has(listing.asset.symbol.toUpperCase()));
  const featuredPublic = [
    ...shuffled(familiar, random).slice(0, 4),
    ...shuffled(others, random),
  ].slice(0, 10);
  const featuredPrivate = shuffled(privateListings, random).slice(0, 2);
  const featured = [
    ...featuredPublic.slice(0, 4),
    ...featuredPrivate.slice(0, 1),
    ...featuredPublic.slice(4, 8),
    ...featuredPrivate.slice(1),
    ...featuredPublic.slice(8),
  ];
  const featuredIds = new Set(featured.map((listing) => listing.asset.companyId));
  const remaining = listings
    .filter((listing) => !featuredIds.has(listing.asset.companyId))
    .toSorted((a, b) => a.asset.name.localeCompare(b.asset.name));

  return {
    featured,
    listings: [...featured, ...remaining],
    unavailable: feeds.unavailable,
    stale: feeds.stale,
  };
}
