import { describe, expect, it } from "vitest";
import { companyById } from "@/data/catalog";
import { verifyCurrentIssuerInstrument, verifyLegacyOrderInstrument } from "./issuer-verification";
import { companyFromIssuerListing, corporateActionsForIssuerInstrument, matchOwnershipCandidates, resolveDiscoveryQuery, reviewedIssuerLinks, searchIssuerListings } from "@/domain/issuer-assets";
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
        logoUrl: "https://xstocks-metadata.backed.fi/logos/tokens/AAPLx.png",
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
      ownerName: "Apple Inc.",
      matchedIssuerName: "Apple",
      issuer: "xstocks",
      mint: listing.asset.mint,
      logoUrl: listing.asset.logoUrl,
      confidenceBand: "low",
    });
    expect(matchOwnershipCandidates(
      [{ productName: "Pixel", companyNames: ["Alphabet Inc."] }],
      [{ ...listing, asset: { ...listing.asset, name: "Alphabet Class A" } }],
    )[0].state).toBe("matched");
    const disney = { ...listing, asset: {
      ...listing.asset,
      companyId: "issuer:xstocks:DISx",
      name: "The Walt Disney",
      symbol: "DISx",
      underlyingSymbol: "DIS",
      mint: "Xsg93jDV656ULQ5u9yT2x5DS9b4xGD8aDCtfESSW6Bb",
    } };
    expect(searchIssuerListings("Disney", [disney])).toHaveLength(1);
    expect(matchOwnershipCandidates(
      [{ productName: "Spider-Man", companyNames: ["Disney"] }],
      [disney],
    )[0]).toMatchObject({
      ownerName: "Disney",
      matchedIssuerName: "The Walt Disney",
      issuer: "xstocks",
      symbol: "DISx",
      mint: disney.asset.mint,
      state: "matched",
    });
    expect(matchOwnershipCandidates(
      [{ productName: "Unrelated product", companyNames: ["Apple"] }],
      [{ ...listing, asset: { ...listing.asset, name: "Apple Hospitality" } }],
    )[0].state).toBe("unlisted");
    expect(matchOwnershipCandidates(
      [{ productName: "Unknown product", companyNames: ["Unknown Company"] }],
      [disney],
    )[0].state).toBe("unlisted");
    expect(matchOwnershipCandidates(
      [{ productName: "Spider-Man", companyNames: ["Disney"] }],
      [disney, { ...disney, asset: { ...disney.asset, companyId: "issuer:xstocks:OTHERx", name: "Other Disney" } }],
    )[0].state).toBe("unlisted");
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
    )[0]).toMatchObject({
      ownerName: "OpenAI Group PBC",
      matchedIssuerName: "OpenAI",
      issuer: "prestocks",
      symbol: "OPENAI",
      mint: "PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF",
    });
    const unknownOwner = matchOwnershipCandidates(
      [{ productName: "Unknown product", companyNames: [] }],
      [listing],
    )[0];
    expect(unknownOwner).toMatchObject({ state: "unlisted", companyId: null });
    expect(unknownOwner.issuer).toBeUndefined();
    expect(() => companyFromIssuerListing(listing, {
      ownerProgram: null, decimals: 9,
    })).toThrow("ISSUER_MINT_INVALID");
    expect(companyFromIssuerListing(listing, {
      ownerProgram: SOLANA_TOKEN_2022_PROGRAM_ID, decimals: 9,
    }).instrument).toMatchObject({ mint: listing.asset.mint, decimals: 9, tokenProgram: "token-2022" });
  });

  it("searches issuer feeds before AI and links reviewed products only to current mints", async () => {
    const listing = {
      provider: "xstocks" as const,
      asset: {
        companyId: "issuer:xstocks:PEPx",
        name: "PepsiCo",
        description: "PepsiCo xStock",
        symbol: "PEPx",
        underlyingSymbol: "PEP",
        mint: company.instrument!.mint,
        exchange: "Nasdaq",
        marketOpen: true,
        marketPeriod: "market",
        nextChangeAt: "",
        tradingHalted: false,
        supportsAtomicSwaps: true,
        observedAt: new Date(now).toISOString(),
      },
    };
    const feeds = { listings: [listing], unavailable: [], stale: [] };
    let aiCalls = 0;
    const inferOwnership = async () => {
      aiCalls += 1;
      return [{ productName: "Doritos", companyNames: ["PepsiCo"] }];
    };

    expect((await resolveDiscoveryQuery("PepsiCo", feeds, inferOwnership)).kind).toBe("company");
    expect(aiCalls).toBe(0);
    expect((await resolveDiscoveryQuery("Doritos", feeds)).kind).toBe("consent_required");
    expect(aiCalls).toBe(0);
    expect(await resolveDiscoveryQuery("Doritos", feeds, inferOwnership)).toMatchObject({
      kind: "product",
      matches: [{ issuer: "xstocks", symbol: "PEPx", mint: listing.asset.mint }],
    });
    expect(aiCalls).toBe(1);
    expect(reviewedIssuerLinks(feeds).byCompany[company.id]).toEqual([listing]);
    expect(reviewedIssuerLinks({ ...feeds, listings: [{
      ...listing,
      asset: { ...listing.asset, mint: "changed-mint" },
    }] }).byCompany[company.id]).toEqual([]);
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
