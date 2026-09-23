import type { Company, RecognitionMatch } from "./types";
import { companies, corporateActions } from "@/data/catalog";
import type { OwnershipCandidate } from "@/providers/contracts";
import type { PreStocksListing } from "@/providers/prestocks";
import type { XStocksListing } from "@/providers/xstocks";
import { SOLANA_TOKEN_2022_PROGRAM_ID, SOLANA_TOKEN_PROGRAM_ID } from "@/providers/solana-constants";

export type IssuerListing =
  | { provider: "xstocks"; asset: XStocksListing }
  | { provider: "prestocks"; asset: PreStocksListing };

export type CorporateActionView = Omit<(typeof corporateActions)[number], "instrumentId"> & {
  instrumentId: string;
};

type IssuerIdentity = Pick<NonNullable<Company["instrument"]>, "provider" | "symbol" | "mint">;

function reviewedCompanyForInstrument(instrument: IssuerIdentity): Company | undefined {
  return companies.find((company) =>
    company.instrument?.provider === instrument.provider &&
    company.instrument.symbol.toLowerCase() === instrument.symbol.toLowerCase() &&
    company.instrument.mint === instrument.mint,
  );
}

export function reviewedCompanyForListing(listing: IssuerListing): Company | undefined {
  return reviewedCompanyForInstrument({
    provider: listing.provider,
    symbol: listing.asset.symbol,
    mint: listing.asset.mint,
  });
}

export function corporateActionsForIssuerInstrument(company: Company): CorporateActionView[] {
  const instrument = company.instrument;
  if (!instrument) return [];
  const reviewed = reviewedCompanyForInstrument(instrument);
  return corporateActions.filter((action) => action.instrumentId === reviewed?.instrument?.id)
    .map((action) => ({ ...action, instrumentId: instrument.id }));
}

function comparableName(value: string): string {
  return value.toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b(the|inc|incorporated|corp|corporation|company|co|ltd|limited|plc|holdings|llc|pbc|group)\b/g, " ")
    .replace(/\b(class|series) [a-z]\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function searchIssuerListings(query: string, listings: IssuerListing[]): IssuerListing[] {
  const words = comparableName(query);
  if (!words) return listings;
  return listings.filter(({ provider, asset }) => {
    const names = provider === "xstocks"
      ? [asset.name, asset.symbol, asset.underlyingSymbol]
      : [asset.name, asset.symbol];
    return names.some((name) => comparableName(name).includes(words));
  });
}

export function matchOwnershipCandidates(
  candidates: OwnershipCandidate[],
  listings: IssuerListing[],
): RecognitionMatch[] {
  return candidates.flatMap<RecognitionMatch>((candidate, index) => {
    const owners = candidate.companyNames.map(comparableName).filter(Boolean);
    const exactAssets = listings.filter(({ asset }) => owners.includes(comparableName(asset.name)));
    let assets = exactAssets;

    // An owner can use a shorter trading name than the issuer feed. For example,
    // "Disney" should find "The Walt Disney", but "Apple" must not find
    // "Apple Hospitality" merely because the first word is shared.
    if (!assets.length) {
      const shorterNameMatches = listings.filter(({ asset }) => {
        const issuerName = comparableName(asset.name);
        return owners.some((owner) => owner.length >= 4 && issuerName.endsWith(` ${owner}`));
      });
      const issuerNames = new Set(shorterNameMatches.map(({ asset }) => comparableName(asset.name)));
      if (issuerNames.size === 1) assets = shorterNameMatches;
    }

    if (!assets.length) {
      return [{
        candidateId: `candidate-${index}`,
        displayLabel: candidate.productName,
        productId: null,
        companyId: null,
        ownerName: candidate.companyNames[0],
        state: "unlisted" as const,
        confidenceBand: "low" as const,
        sourceIds: [],
        requiresConfirmation: true as const,
      }];
    }
    return assets.map(({ provider, asset }) => ({
      candidateId: `candidate-${index}-${asset.companyId}`,
      displayLabel: candidate.productName,
      productId: null,
      companyId: asset.companyId,
      ownerName: candidate.companyNames[0],
      matchedIssuerName: asset.name,
      issuer: provider,
      symbol: asset.symbol,
      mint: asset.mint,
      state: "matched" as const,
      confidenceBand: "low" as const,
      sourceIds: [provider === "xstocks" ? "src-xstocks" : "src-prestocks-api"],
      requiresConfirmation: true as const,
    }));
  });
}

export function companyFromIssuerListing(
  listing: IssuerListing,
  mint: { ownerProgram: string | null; decimals: number | null },
): Company {
  const { provider, asset } = listing;
  if (
    mint.decimals === null || mint.decimals < 0 || mint.decimals > 18 ||
    ![SOLANA_TOKEN_PROGRAM_ID, SOLANA_TOKEN_2022_PROGRAM_ID].includes(mint.ownerProgram ?? "")
  ) {
    throw new Error("ISSUER_MINT_INVALID");
  }
  return {
    id: asset.companyId,
    slug: asset.companyId,
    name: asset.name,
    ticker: provider === "xstocks" ? asset.underlyingSymbol : asset.symbol,
    exchange: provider === "xstocks" ? asset.exchange : "Private exposure",
    description: asset.description,
    instrument: {
      id: asset.companyId,
      symbol: asset.symbol,
      issuer: provider === "xstocks" ? "xStocks" : "PreStocks",
      provider,
      assetClass: provider === "xstocks" ? "public_equity_token" : "pre_ipo_exposure",
      referenceUrl: provider === "xstocks" ? "https://xstocks.fi/" : asset.issuerUrl,
      mint: asset.mint,
      tokenProgram: mint.ownerProgram === SOLANA_TOKEN_2022_PROGRAM_ID ? "token-2022" : "spl-token",
      decimals: mint.decimals,
      capabilities: {
        buy: provider === "prestocks" || !asset.tradingHalted,
        sell: true,
        transfer: true,
      },
      lifecycle: reviewedCompanyForListing(listing)?.instrument?.lifecycle,
    },
  };
}
