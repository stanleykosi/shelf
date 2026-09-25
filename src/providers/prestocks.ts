import { PublicKey } from "@solana/web3.js";
import Decimal from "decimal.js";
import { z } from "zod";
import { premiumBps, premiumLabel } from "@/domain/market-data";
import { issuerLogoUrl } from "./issuer-logo";

const listingSchema = z.object({
  name: z.string().min(1),
  symbol: z.string().min(1),
  description: z.string().default(""),
  image: z.unknown().optional(),
  external_url: z.string().url(),
  contract_address: z.string(),
  markPrice: z.number().finite().nonnegative(),
  markValuation: z.number().finite().nonnegative(),
  tokenPrice: z.number().finite().nonnegative(),
  impliedValuation: z.number().finite().nonnegative(),
  supply: z.number().finite().nonnegative(),
});

export type PreStocksListing = {
  companyId: string;
  name: string;
  description: string;
  logoUrl?: string;
  symbol: string;
  mint: string;
  issuerUrl: string;
  markPriceUsd: string;
  tokenPriceUsd: string;
  markValuationUsd: string;
  impliedValuationUsd: string;
  supplyUi: string;
  premiumBps: number | null;
  premiumLabel: string;
  observedAt: string;
};

export type PreStocksDetail = {
  listing: PreStocksListing;
  sourceData: unknown;
};

function decimal(value: number): string {
  return new Decimal(value.toString()).toString();
}

function listingForRow(row: z.infer<typeof listingSchema>, observedAt: string): PreStocksListing | null {
  if (!/^[A-Za-z0-9.-]{1,32}$/.test(row.symbol)) return null;
  try {
    new PublicKey(row.contract_address);
  } catch {
    return null;
  }
  const markPriceUsd = decimal(row.markPrice);
  const tokenPriceUsd = decimal(row.tokenPrice);
  const basisPoints = premiumBps(markPriceUsd, tokenPriceUsd);
  return {
    companyId: `issuer:prestocks:${row.symbol}`,
    name: row.name.replace(/\s+prestocks$/i, ""),
    description: row.description,
    logoUrl: issuerLogoUrl(row.image, "prestocks"),
    symbol: row.symbol,
    mint: row.contract_address,
    issuerUrl: row.external_url,
    markPriceUsd,
    tokenPriceUsd,
    markValuationUsd: decimal(row.markValuation),
    impliedValuationUsd: decimal(row.impliedValuation),
    supplyUi: decimal(row.supply),
    premiumBps: basisPoints,
    premiumLabel: premiumLabel(basisPoints),
    observedAt,
  };
}

export class LivePreStocksProvider {
  private readonly send: typeof fetch;

  constructor(
    private readonly endpoint = "https://prestocks.com/api/prestocks",
    send?: typeof fetch,
  ) {
    const url = new URL(endpoint);
    if (url.protocol !== "https:" || url.hostname !== "prestocks.com") {
      throw new Error("PRESTOCKS_ENDPOINT_NOT_ALLOWED");
    }
    this.send = send ?? fetch;
  }

  private async rows() {
    const response = await this.send(this.endpoint, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error("PRESTOCKS_UNAVAILABLE");

    const sourceData: unknown = await response.json();
    const rows = z.array(listingSchema).parse(sourceData);
    return { rows, sourceRows: sourceData as unknown[] };
  }

  async detail(symbol: string): Promise<PreStocksDetail | null> {
    if (!/^[A-Za-z0-9.-]{1,32}$/.test(symbol)) throw new Error("PRESTOCKS_SYMBOL_INVALID");
    const { rows, sourceRows } = await this.rows();
    const index = rows.findIndex((row) => row.symbol.toLowerCase() === symbol.toLowerCase());
    if (index === -1) return null;
    const listing = listingForRow(rows[index], new Date().toISOString());
    return listing ? { listing, sourceData: sourceRows[index] } : null;
  }

  async listings(): Promise<PreStocksListing[]> {
    const { rows } = await this.rows();
    const observedAt = new Date().toISOString();
    const listings = rows.flatMap((row) => {
      const listing = listingForRow(row, observedAt);
      return listing ? [listing] : [];
    });
    if (new Set(listings.map((listing) => listing.companyId)).size !== listings.length) {
      throw new Error("PRESTOCKS_DUPLICATE_ASSET");
    }
    return listings;
  }
}
