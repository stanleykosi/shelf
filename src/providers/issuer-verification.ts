import type { Company } from "@/domain/types";

type IssuerListing = {
  companyId: string;
  mint: string;
  observedAt: string;
  tradingHalted?: boolean;
  supportsAtomicSwaps?: boolean;
};

type IssuerProvider = { listings(): Promise<IssuerListing[]> };

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
  const listings = await provider.listings();
  // Live providers stamp observations when their response is parsed, so take
  // the comparison clock after awaiting the fetch rather than before it.
  const checkedAt = now ?? Date.now();
  const listing = listings.find((candidate) =>
    candidate.companyId === company.id && candidate.mint === instrument.mint,
  );
  const observedAt = listing ? Date.parse(listing.observedAt) : NaN;
  if (
    !listing || !Number.isFinite(observedAt) || observedAt > checkedAt ||
    checkedAt - observedAt > 60_000 || listing.tradingHalted === true ||
    (instrument.provider === "xstocks" && listing.supportsAtomicSwaps !== true)
  ) {
    throw new Error("ISSUER_INSTRUMENT_UNAVAILABLE");
  }
  return listing;
}
