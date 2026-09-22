import { z } from "zod";
import { companies } from "@/data/catalog";

const assetSchema = z.object({
  name: z.string().min(1),
  symbol: z.string().min(1),
  underlyingSymbol: z.string().min(1),
  isTradingHalted: z.boolean(),
  trading: z.object({
    currentPeriod: z.string().min(1),
    openNow: z.boolean(),
    nextChangeAt: z.string().datetime(),
    exchange: z.object({ name: z.string().min(1), abbreviation: z.string().min(1) }),
  }),
  deployments: z.array(
    z.object({
      address: z.string().min(1),
      network: z.string().min(1),
      supportsAtomicSwaps: z.boolean(),
    }),
  ),
});

export type XStocksListing = {
  companyId: string;
  name: string;
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

interface XStocksProvider {
  listings(): Promise<XStocksListing[]>;
}

const reviewedCompanies = companies.filter((company) => company.instrument?.provider === "xstocks");

export class LiveXStocksProvider implements XStocksProvider {
  private readonly send: typeof fetch;
  private readonly baseUrl: URL;

  constructor(baseUrl = "https://api.xstocks.fi/api/v2/", send?: typeof fetch) {
    this.baseUrl = new URL(baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
    if (this.baseUrl.protocol !== "https:" || this.baseUrl.hostname !== "api.xstocks.fi") {
      throw new Error("XSTOCKS_ENDPOINT_NOT_ALLOWED");
    }
    this.send = send ?? fetch;
  }

  async listings(): Promise<XStocksListing[]> {
    const observedAt = new Date().toISOString();
    return Promise.all(
      reviewedCompanies.map(async (company) => {
        const instrument = company.instrument!;
        const endpoint = new URL(
          `public/assets/${encodeURIComponent(instrument.symbol)}`,
          this.baseUrl,
        );
        const response = await this.send(endpoint, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(8_000),
        });
        if (!response.ok) throw new Error("XSTOCKS_UNAVAILABLE");

        const asset = assetSchema.parse(await response.json());
        const solana = asset.deployments.find((deployment) => deployment.network === "Solana");
        if (asset.symbol !== instrument.symbol || solana?.address !== instrument.mint) {
          throw new Error("XSTOCKS_ASSET_MISMATCH");
        }

        return {
          companyId: company.id,
          name: company.name,
          symbol: asset.symbol,
          underlyingSymbol: asset.underlyingSymbol,
          mint: solana.address,
          exchange: asset.trading.exchange.name,
          marketOpen: asset.trading.openNow,
          marketPeriod: asset.trading.currentPeriod,
          nextChangeAt: asset.trading.nextChangeAt,
          tradingHalted: asset.isTradingHalted,
          supportsAtomicSwaps: solana.supportsAtomicSwaps,
          observedAt,
        };
      }),
    );
  }
}
