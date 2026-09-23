import { describe, expect, it } from "vitest";
import { companyById } from "@/data/catalog";
import { verifyCurrentIssuerInstrument, verifyLegacyOrderInstrument } from "./issuer-verification";
import { companyFromIssuerListing, corporateActionsForIssuerInstrument, matchOwnershipCandidates } from "@/domain/issuer-assets";
import { SOLANA_TOKEN_2022_PROGRAM_ID } from "./solana-constants";

describe("execution issuer verification", () => {
  const company = companyById("company-pepsico")!;
  const now = Date.parse("2026-09-23T12:00:00.000Z");

  it("requests fresh issuer listings even when an earlier listing was current", async () => {
    let calls = 0;
    const xstocks = {
      listings: async () => {
        calls += 1;
        return calls === 1
          ? [{ companyId: company.id, mint: company.instrument!.mint, observedAt: new Date(now).toISOString(), supportsAtomicSwaps: true }]
          : [{ companyId: company.id, mint: "changed-mint", observedAt: new Date(now).toISOString(), supportsAtomicSwaps: true }];
      },
    };
    const providers = { prestocks: { listings: async () => [] }, xstocks };
    await expect(verifyCurrentIssuerInstrument(company, providers, now)).resolves.toMatchObject({
      mint: company.instrument!.mint,
    });
    await expect(verifyCurrentIssuerInstrument(company, providers, now))
      .rejects.toThrow("ISSUER_INSTRUMENT_UNAVAILABLE");
    expect(calls).toBe(2);
  });

  it("rejects a stale issuer observation", async () => {
    await expect(verifyCurrentIssuerInstrument(company, {
      xstocks: { listings: async () => [{
        companyId: company.id,
        mint: company.instrument!.mint,
        observedAt: new Date(now - 61_000).toISOString(),
        supportsAtomicSwaps: true,
      }] },
      prestocks: { listings: async () => [] },
    }, now)).rejects.toThrow("ISSUER_INSTRUMENT_UNAVAILABLE");
  });

  it("uses the fresh exact-symbol issuer endpoint when available", async () => {
    await expect(verifyCurrentIssuerInstrument(company, {
      xstocks: {
        listings: async () => { throw new Error("directory should not be read"); },
        listing: async (symbol) => ({
          companyId: `issuer:xstocks:${symbol}`,
          symbol,
          mint: company.instrument!.mint,
          observedAt: new Date(now).toISOString(),
        }),
      },
      prestocks: { listings: async () => [] },
    }, now)).resolves.toMatchObject({ mint: company.instrument!.mint });
  });

  it("accepts a provider observation stamped after the fetch begins", async () => {
    const prestocksCompany = companyById("company-openai")!;
    await expect(verifyCurrentIssuerInstrument(prestocksCompany, {
      prestocks: { listings: async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return [{
          companyId: prestocksCompany.id,
          mint: prestocksCompany.instrument!.mint,
          observedAt: new Date().toISOString(),
        }];
      } },
      xstocks: { listings: async () => [] },
    })).resolves.toMatchObject({ mint: prestocksCompany.instrument!.mint });
  });

  it("rejects a removed legacy asset before an order draft and checks mint scale", async () => {
    const providers = {
      prestocks: { listings: async () => [] },
      xstocks: { listings: async () => [] },
    };
    let mintChecks = 0;
    const inspectMints = async () => {
      mintChecks += 1;
      return [{ exists: true, ownerProgram: SOLANA_TOKEN_2022_PROGRAM_ID, decimals: 8 }];
    };
    await expect(verifyLegacyOrderInstrument(company, providers, inspectMints))
      .rejects.toThrow("ISSUER_INSTRUMENT_UNAVAILABLE");
    expect(mintChecks).toBe(0);
    const listedProviders = { ...providers, xstocks: { listings: async () => [{
      companyId: "issuer:xstocks:PEPx", symbol: "PEPx", mint: company.instrument!.mint,
      observedAt: new Date().toISOString(),
    }] } };
    await expect(verifyLegacyOrderInstrument(company, listedProviders, async () => [{
      exists: true, ownerProgram: SOLANA_TOKEN_2022_PROGRAM_ID, decimals: 9,
    }])).rejects.toThrow("ISSUER_MINT_INVALID");
    await expect(verifyLegacyOrderInstrument(company, listedProviders, inspectMints))
      .resolves.toMatchObject({ mint: company.instrument!.mint });
  });

  it("joins an AI owner suggestion only to issuer data and validates mint metadata", () => {
    const listing = {
      provider: "xstocks" as const,
      asset: {
        companyId: "issuer:xstocks:AAPLx",
        name: "Apple",
        description: "Apple xStock",
        symbol: "AAPLx",
        underlyingSymbol: "AAPL",
        mint: "XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp",
        exchange: "Nasdaq",
        marketOpen: true,
        marketPeriod: "market",
        nextChangeAt: "",
        tradingHalted: false,
        supportsAtomicSwaps: true,
        observedAt: new Date(now).toISOString(),
      },
    };
    const matches = matchOwnershipCandidates(
      [{ productName: "iPhone", companyNames: ["Apple Inc."] }],
      [listing],
    );
    expect(matches[0]).toMatchObject({
      ownerName: "Apple",
      issuer: "xstocks",
      mint: listing.asset.mint,
      confidenceBand: "low",
    });
    expect(matchOwnershipCandidates(
      [{ productName: "Pixel", companyNames: ["Alphabet Inc."] }],
      [{ ...listing, asset: { ...listing.asset, name: "Alphabet Class A" } }],
    )[0].state).toBe("matched");
    expect(matchOwnershipCandidates(
      [{ productName: "ChatGPT", companyNames: ["OpenAI Group PBC"] }],
      [{
        provider: "prestocks",
        asset: {
          companyId: "issuer:prestocks:OPENAI",
          name: "OpenAI",
          description: "Private exposure",
          symbol: "OPENAI",
          mint: "PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF",
          issuerUrl: "https://prestocks.com/",
          markPriceUsd: "1",
          tokenPriceUsd: "1",
          markValuationUsd: "1",
          impliedValuationUsd: "1",
          supplyUi: "1",
          premiumBps: 0,
          premiumLabel: "At mark",
          observedAt: new Date(now).toISOString(),
        },
      }],
    )[0].state).toBe("matched");
    expect(() => companyFromIssuerListing(listing, {
      ownerProgram: null, decimals: 9,
    })).toThrow("ISSUER_MINT_INVALID");
    expect(companyFromIssuerListing(listing, {
      ownerProgram: SOLANA_TOKEN_2022_PROGRAM_ID, decimals: 9,
    }).instrument).toMatchObject({ mint: listing.asset.mint, decimals: 9, tokenProgram: "token-2022" });
  });

  it("preserves reviewed lifecycle context only for the same issuer symbol and mint", () => {
    const spacex = companyById("company-spacex")!;
    const asset = {
      companyId: "issuer:prestocks:SPACEX", name: "SpaceX", symbol: "SPACEX",
      description: "Private exposure", mint: spacex.instrument!.mint,
      issuerUrl: "https://prestocks.com/spacex", markPriceUsd: "1", tokenPriceUsd: "1",
      markValuationUsd: "1", impliedValuationUsd: "1", supplyUi: "1",
      premiumBps: 0, premiumLabel: "At mark", observedAt: new Date().toISOString(),
    };
    const mint = { ownerProgram: SOLANA_TOKEN_2022_PROGRAM_ID, decimals: 9 };
    expect(companyFromIssuerListing({ provider: "prestocks", asset }, mint).instrument?.lifecycle)
      .toEqual(spacex.instrument?.lifecycle);
    expect(companyFromIssuerListing({ provider: "prestocks", asset: {
      ...asset, mint: "11111111111111111111111111111111",
    } }, mint).instrument?.lifecycle).toBeUndefined();
  });

  it("maps reviewed corporate actions to a dynamic instrument with the same verified identity", () => {
    const dynamic = {
      ...company, id: "issuer:xstocks:PEPx",
      instrument: { ...company.instrument!, id: "issuer:xstocks:PEPx" },
    };
    expect(corporateActionsForIssuerInstrument(dynamic)).toMatchObject([{
      id: "action-pepx-multiplier-fixture", instrumentId: "issuer:xstocks:PEPx",
    }]);
    expect(corporateActionsForIssuerInstrument({
      ...dynamic, instrument: { ...dynamic.instrument, mint: "changed-mint" },
    })).toEqual([]);
  });
});
