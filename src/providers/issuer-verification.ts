import type { Company } from "@/domain/types";
import { SOLANA_TOKEN_2022_PROGRAM_ID, SOLANA_TOKEN_PROGRAM_ID } from "./solana-constants";

type IssuerListing = {
  companyId: string;
  symbol?: string;
  mint: string;
  observedAt: string;
  tradingHalted?: boolean;
  supportsAtomicSwaps?: boolean;
};

type IssuerProvider = {
  listings(): Promise<IssuerListing[]>;
  listing?(symbol: string): Promise<IssuerListing | null>;
};

export async function verifyCurrentIssuerInstrument(
  company: Company,
  providers: { prestocks: IssuerProvider; xstocks: IssuerProvider },
  now?: number,
) {
  const instrument = company.instrument;
  if (!instrument) throw new Error("ASSET_UNSUPPORTED");

  // Execution deliberately bypasses the display cache. A removed or changed
  // mint must be noticed even during that cache's five-minute window.
  const provider = instrument.provider === "prestocks" ? providers.prestocks : providers.xstocks;
  const listings = provider.listing
    ? [await provider.listing(instrument.symbol)].filter((item): item is IssuerListing => Boolean(item))
    : await provider.listings();
  // Live providers stamp observations when their response is parsed, so take
  // the comparison clock after awaiting the fetch rather than before it.
  const checkedAt = now ?? Date.now();
  const listing = listings.find((candidate) =>
    (candidate.companyId === company.id || candidate.symbol === instrument.symbol) &&
    candidate.mint === instrument.mint,
  );
  const observedAt = listing ? Date.parse(listing.observedAt) : NaN;
  if (
    !listing || !Number.isFinite(observedAt) || observedAt > checkedAt ||
    checkedAt - observedAt > 60_000 || listing.tradingHalted === true
  ) {
    throw new Error("ISSUER_INSTRUMENT_UNAVAILABLE");
  }
  return listing;
}

export async function verifyLegacyOrderInstrument(
  company: Company,
  providers: { prestocks: IssuerProvider; xstocks: IssuerProvider },
  inspectMints: (mints: string[]) => Promise<Array<{
    exists: boolean;
    ownerProgram: string | null;
    decimals: number | null;
  }>>,
) {
  const instrument = company.instrument;
  if (!instrument) throw new Error("ASSET_UNSUPPORTED");
  const listing = await verifyCurrentIssuerInstrument(company, providers);
  const [mint] = await inspectMints([instrument.mint]);
  const expectedProgram = instrument.tokenProgram === "token-2022"
    ? SOLANA_TOKEN_2022_PROGRAM_ID : SOLANA_TOKEN_PROGRAM_ID;
  if (!mint?.exists || mint.ownerProgram !== expectedProgram || mint.decimals !== instrument.decimals) {
    throw new Error("ISSUER_MINT_INVALID");
  }
  return listing;
}
