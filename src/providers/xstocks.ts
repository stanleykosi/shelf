import { PublicKey } from "@solana/web3.js";
import { z } from "zod";

const assetSchema = z.object({
  name: z.string().min(1),
  symbol: z.string().min(1),
  description: z.string().default(""),
  underlyingSymbol: z.string().optional(),
  underlying: z.object({ symbol: z.string() }).nullable().optional(),
  isTradingHalted: z.boolean(),
  trading: z.object({
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

  async listing(symbol: string): Promise<XStocksListing | null> {
    if (!/^[A-Za-z0-9.-]{1,32}$/.test(symbol)) throw new Error("XSTOCKS_SYMBOL_INVALID");
    const endpoint = new URL(`public/assets/${encodeURIComponent(symbol)}`, this.baseUrl);
    const response = await this.send(endpoint, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error("XSTOCKS_UNAVAILABLE");
    const asset = assetSchema.parse(await response.json());
    if (asset.symbol !== symbol) throw new Error("XSTOCKS_ASSET_MISMATCH");
    return listingForAsset(asset, new Date().toISOString());
  }

  async listings(): Promise<XStocksListing[]> {
    const observedAt = new Date().toISOString();
    const listings: XStocksListing[] = [];

    // Fail at the bound rather than silently returning an incomplete feed.
    for (let pageNumber = 0; pageNumber < 20; pageNumber += 1) {
      const endpoint = new URL("public/assets", this.baseUrl);
      endpoint.searchParams.set("page", String(pageNumber));
      const response = await this.send(endpoint, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) throw new Error("XSTOCKS_UNAVAILABLE");
      const page = pageSchema.parse(await response.json());
      if (page.page.currentPage !== pageNumber) throw new Error("XSTOCKS_INVALID_PAGE");
      for (const asset of page.nodes) {
        const listing = listingForAsset(asset, observedAt);
        if (listing) listings.push(listing);
      }
      if (!page.page.hasNextPage) {
        if (new Set(listings.map((listing) => listing.companyId)).size !== listings.length) {
          throw new Error("XSTOCKS_DUPLICATE_ASSET");
        }
        return listings;
      }
    }
    throw new Error("XSTOCKS_PAGE_LIMIT");
  }
}
