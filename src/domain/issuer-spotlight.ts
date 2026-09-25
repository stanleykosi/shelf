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
  "Funds & ETFs",
  "Other",
] as const;

export type IssuerSector = (typeof issuerSectors)[number];
export type DirectoryListing = {
  provider: IssuerListing["provider"];
  asset: Pick<IssuerListing["asset"], "companyId" | "name" | "symbol" | "logoUrl">;
  sector: IssuerSector;
};

export type IssuerDirectory = {
  listings: DirectoryListing[];
  unavailable: string[];
  stale: string[];
};

/** Compatibility name for editorial discovery components. */
export type IssuerSpotlight = IssuerDirectory;

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

export function buildIssuerDirectory(feeds: IssuerFeedSnapshot): IssuerDirectory {
  const listings = feeds.listings.map<DirectoryListing>((listing) => {
    const symbol = listing.asset.symbol.toUpperCase();
    const sector = listing.provider === "xstocks"
      ? publicSectors[symbol] ?? (/\bETF\b/i.test(listing.asset.name) ? "Funds & ETFs" : "Other")
      : privateSectors[symbol] ?? "Other";
    return {
      provider: listing.provider,
      asset: {
        companyId: listing.asset.companyId,
        name: listing.asset.name,
        symbol: listing.asset.symbol,
        logoUrl: listing.asset.logoUrl,
      },
      sector,
    };
  });

  return {
    listings: listings.toSorted((a, b) => a.asset.name.localeCompare(b.asset.name)),
    unavailable: feeds.unavailable,
    stale: feeds.stale,
  };
}

export function selectFeaturedCompanies(
  listings: DirectoryListing[],
  random: () => number = Math.random,
): DirectoryListing[] {
  const publicListings = listings.filter((listing) => listing.provider === "xstocks");
  const privateListings = listings.filter((listing) => listing.provider === "prestocks");
  const familiar = publicListings.filter((listing) => familiarPublicSymbols.has(listing.asset.symbol.toUpperCase()));
  const others = publicListings.filter((listing) =>
    publicSectors[listing.asset.symbol.toUpperCase()] && !familiarPublicSymbols.has(listing.asset.symbol.toUpperCase()),
  );
  const publicSelection = [
    ...shuffled(familiar, random).slice(0, 4),
    ...shuffled(others, random),
    ...shuffled(publicListings.filter((listing) => !publicSectors[listing.asset.symbol.toUpperCase()]), random),
  ].slice(0, 8);
  const privateSelection = shuffled(privateListings, random).slice(0, 2);

  return [
    ...publicSelection.slice(0, 4),
    ...privateSelection.slice(0, 1),
    ...publicSelection.slice(4),
    ...privateSelection.slice(1),
  ];
}
