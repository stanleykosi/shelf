import { PublicKey } from "@solana/web3.js";
import Decimal from "decimal.js";
import { z } from "zod";
import { premiumBps, premiumLabel } from "@/domain/market-data";

const listingSchema = z.object({
  name: z.string().min(1),
  symbol: z.string().min(1),
  description: z.string().default(""),
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

function decimal(value: number): string {
  return new Decimal(value.toString()).toString();
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

  async listings(): Promise<PreStocksListing[]> {
    const response = await this.send(this.endpoint, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error("PRESTOCKS_UNAVAILABLE");

    const rows = z.array(listingSchema).parse(await response.json());
    const observedAt = new Date().toISOString();
    const listings = rows.flatMap((row) => {
      if (!/^[A-Za-z0-9.-]{1,32}$/.test(row.symbol)) return [];
      try {
        new PublicKey(row.contract_address);
      } catch {
        return [];
      }
      const markPriceUsd = decimal(row.markPrice);
      const tokenPriceUsd = decimal(row.tokenPrice);
      const basisPoints = premiumBps(markPriceUsd, tokenPriceUsd);
      return [{
        companyId: `issuer:prestocks:${row.symbol}`,
        name: row.name.replace(/\s+prestocks$/i, ""),
        description: row.description,
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
      }];
    });
    if (new Set(listings.map((listing) => listing.companyId)).size !== listings.length) {
      throw new Error("PRESTOCKS_DUPLICATE_ASSET");
    }
    return listings;
  }
}
