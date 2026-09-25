import { PublicKey } from "@solana/web3.js";
import { z } from "zod";
import { issuerLogoUrl } from "./issuer-logo";

const assetSchema = z.object({
  name: z.string().min(1),
  symbol: z.string().min(1),
  isin: z.string().optional(),
  description: z.string().default(""),
  logo: z.unknown().optional(),
  underlyingSymbol: z.string().optional(),
  underlying: z.object({
    symbol: z.string(),
    isin: z.string().nullable().optional(),
    type: z.string().nullable().optional(),
    currency: z.string().nullable().optional(),
    listingCountry: z.string().nullable().optional(),
  }).nullable().optional(),
  isTradingHalted: z.boolean(),
  trading: z.object({
    currency: z.string().optional(),
    tradingHoursMode: z.string().optional(),
    currentPeriod: z.string(),
    openNow: z.boolean(),
    nextChangeAt: z.string(),
    isTradingHalted: z.boolean().optional(),
    exchange: z.object({ name: z.string(), abbreviation: z.string() }),
  }).nullable(),
  deployments: z.array(z.object({
    address: z.string(),
    network: z.string(),
    supportsAtomicSwaps: z.boolean(),
  })),
});

const pageSchema = z.object({
  nodes: z.array(assetSchema),
  page: z.object({ currentPage: z.number().int(), hasNextPage: z.boolean() }),
});

export type XStocksListing = {
  companyId: string;
  name: string;
  description: string;
  logoUrl?: string;
  symbol: string;
  underlyingSymbol: string;
  mint: string;
  exchange: string;
  marketOpen: boolean;
  marketPeriod: string;
  nextChangeAt: string;
  tradingHalted: boolean;
  supportsAtomicSwaps: boolean;
  observedAt: string;
};

export type XStocksDetail = {
  listing: XStocksListing;
  metadata: XStocksMetadata;
  sourceData: unknown;
};

export type XStocksMetadata = {
  tokenIsin?: string;
  underlyingIsin?: string;
  underlyingType?: string;
  underlyingCurrency?: string;
  listingCountry?: string;
  tradingHoursMode?: string;
  issuerTradingAvailable: boolean;
};

export type XStocksDisclosures = {
  checkedAt: string;
  multiplier: {
    current: string;
    pending?: { value: string; activatesAt: string; reason?: string };
  } | null;
  reserves: {
    timestamp: string;
    sharesHeld: string;
    circulatingSupply: string;
  } | null;
};

const multiplierSchema = z.object({
  currentMultiplier: z.number().finite().positive(),
  newMultiplier: z.number().finite().nonnegative(),
  activationDateTime: z.number().finite().nonnegative(),
  reason: z.string().nullable(),
});

const reservesSchema = z.object({
  symbol: z.string(),
  timestamp: z.string().refine((value) => !Number.isNaN(Date.parse(value))),
  sharesHeld: z.string().regex(/^\d+(?:\.\d+)?$/),
  circulatingSupply: z.string().regex(/^\d+(?:\.\d+)?$/),
});

function listingForAsset(
  asset: z.infer<typeof assetSchema>,
  observedAt: string,
): XStocksListing | null {
  if (!/^[A-Za-z0-9.-]{1,32}$/.test(asset.symbol)) return null;
  const solana = asset.deployments.find((deployment) => deployment.network === "Solana");
  if (!solana) return null;
  try {
    new PublicKey(solana.address);
  } catch {
    return null;
  }
  return {
    companyId: `issuer:xstocks:${asset.symbol}`,
    name: asset.name.replace(/\s+xstock$/i, ""),
    description: asset.description,
    logoUrl: issuerLogoUrl(asset.logo, "xstocks"),
    symbol: asset.symbol,
    underlyingSymbol: asset.underlying?.symbol || asset.underlyingSymbol || "",
    mint: solana.address,
    exchange: asset.trading?.exchange.name ?? "Exchange unavailable",
    marketOpen: asset.trading?.openNow ?? false,
    marketPeriod: asset.trading?.currentPeriod ?? "unavailable",
    nextChangeAt: asset.trading?.nextChangeAt ?? "",
    tradingHalted: asset.isTradingHalted || asset.trading?.isTradingHalted === true,
    supportsAtomicSwaps: solana.supportsAtomicSwaps,
    observedAt,
  };
}

export class LiveXStocksProvider {
  private readonly send: typeof fetch;
  private readonly baseUrl: URL;

  constructor(baseUrl = "https://api.xstocks.fi/api/v2/", send?: typeof fetch) {
    this.baseUrl = new URL(baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
    if (this.baseUrl.protocol !== "https:" || this.baseUrl.hostname !== "api.xstocks.fi") {
      throw new Error("XSTOCKS_ENDPOINT_NOT_ALLOWED");
    }
    this.send = send ?? fetch;
  }

  async detail(symbol: string): Promise<XStocksDetail | null> {
    if (!/^[A-Za-z0-9.-]{1,32}$/.test(symbol)) throw new Error("XSTOCKS_SYMBOL_INVALID");
    const endpoint = new URL(`public/assets/${encodeURIComponent(symbol)}`, this.baseUrl);
    const response = await this.send(endpoint, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error("XSTOCKS_UNAVAILABLE");
    const sourceData: unknown = await response.json();
    const asset = assetSchema.parse(sourceData);
    if (asset.symbol !== symbol) throw new Error("XSTOCKS_ASSET_MISMATCH");
    const listing = listingForAsset(asset, new Date().toISOString());
    if (!listing) return null;
    return {
      listing,
      metadata: {
        tokenIsin: asset.isin || undefined,
        underlyingIsin: asset.underlying?.isin || undefined,
        underlyingType: asset.underlying?.type || undefined,
        underlyingCurrency: asset.underlying?.currency || asset.trading?.currency || undefined,
        listingCountry: asset.underlying?.listingCountry || undefined,
        tradingHoursMode: asset.trading?.tradingHoursMode || undefined,
        issuerTradingAvailable: asset.trading !== null,
      },
      sourceData,
    };
  }

  async disclosures(symbol: string): Promise<XStocksDisclosures> {
    if (!/^[A-Za-z0-9.-]{1,32}$/.test(symbol)) throw new Error("XSTOCKS_SYMBOL_INVALID");
    const assetPath = `public/assets/${encodeURIComponent(symbol)}`;
    const read = async (path: string) => {
      const response = await this.send(new URL(path, this.baseUrl), {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(6_000),
      });
      if (!response.ok) throw new Error("XSTOCKS_UNAVAILABLE");
      return response.json() as Promise<unknown>;
    };
    const [multiplierResult, reservesResult] = await Promise.allSettled([
      read(`${assetPath}/multiplier?network=Solana`).then((value) => multiplierSchema.parse(value)),
      read(`public/proof-of-reserves/${encodeURIComponent(symbol)}`).then((value) => reservesSchema.parse(value)),
    ]);
    const multiplier = multiplierResult.status === "fulfilled" ? multiplierResult.value : null;
    const reserves = reservesResult.status === "fulfilled" &&
      reservesResult.value.symbol.toLowerCase() === symbol.toLowerCase()
      ? reservesResult.value : null;
    let activationMs = multiplier?.activationDateTime ?? 0;
    if (activationMs > 0 && activationMs < 100_000_000_000) activationMs *= 1_000;
    const activationDate = new Date(activationMs);
    const pending = multiplier && multiplier.newMultiplier > 0 &&
      activationMs > 0 && !Number.isNaN(activationDate.getTime())
      ? {
          value: String(multiplier.newMultiplier),
          activatesAt: activationDate.toISOString(),
          reason: multiplier.reason ?? undefined,
        }
      : undefined;
    return {
      checkedAt: new Date().toISOString(),
      multiplier: multiplier ? { current: String(multiplier.currentMultiplier), pending } : null,
      reserves: reserves ? {
        timestamp: reserves.timestamp,
        sharesHeld: reserves.sharesHeld,
        circulatingSupply: reserves.circulatingSupply,
      } : null,
    };
  }

  async listing(symbol: string): Promise<XStocksListing | null> {
    return (await this.detail(symbol))?.listing ?? null;
  }

  async listings(): Promise<XStocksListing[]> {
    const observedAt = new Date().toISOString();
    const listings: XStocksListing[] = [];
    const maxPages = 20;
    const pagesPerBatch = 3;

    const fetchPage = async (pageNumber: number) => {
      const endpoint = new URL("public/assets", this.baseUrl);
      endpoint.searchParams.set("page", String(pageNumber));
      endpoint.searchParams.set("pageSize", "100");
      let response: Response | null = null;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          response = await this.send(endpoint, {
            headers: { Accept: "application/json" },
            signal: AbortSignal.timeout(12_000),
          });
        } catch {
          response = null;
        }
        if (response?.ok || (response && response.status < 500)) break;
      }
      if (!response?.ok) throw new Error("XSTOCKS_UNAVAILABLE");
      const page = pageSchema.parse(await response.json());
      if (page.page.currentPage !== pageNumber) throw new Error("XSTOCKS_INVALID_PAGE");
      return page;
    };

    // Responses stay in page order. Speculative requests after the final page
    // are ignored, while any missing page before it fails the whole feed.
    for (let firstPage = 0; firstPage < maxPages; firstPage += pagesPerBatch) {
      const pageNumbers = Array.from(
        { length: Math.min(pagesPerBatch, maxPages - firstPage) },
        (_, index) => firstPage + index,
      );
      const results = await Promise.allSettled(pageNumbers.map(fetchPage));

      for (const result of results) {
        if (result.status === "rejected") throw result.reason;
        for (const asset of result.value.nodes) {
          const listing = listingForAsset(asset, observedAt);
          if (listing) listings.push(listing);
        }
        if (result.value.page.hasNextPage) continue;
        if (new Set(listings.map((listing) => listing.companyId)).size !== listings.length) {
          throw new Error("XSTOCKS_DUPLICATE_ASSET");
        }
        return listings;
      }
    }
    throw new Error("XSTOCKS_PAGE_LIMIT");
  }
}
