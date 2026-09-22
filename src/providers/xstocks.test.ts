import { describe, expect, it } from "vitest";
import { LiveXStocksProvider } from "./xstocks";

function asset(symbol: string, underlyingSymbol: string, mint: string) {
  return {
    name: `${underlyingSymbol} xStock`,
    symbol,
    underlyingSymbol,
    isTradingHalted: false,
    trading: {
      currentPeriod: "market",
      openNow: true,
      nextChangeAt: "2026-09-21T20:00:00.000Z",
      exchange: { name: "Nasdaq Stock Market", abbreviation: "NASDAQ" },
    },
    deployments: [{ address: mint, network: "Solana", supportsAtomicSwaps: true }],
  };
}

const reviewedAssets = {
  PEPx: asset("PEPx", "PEP", "Xsv99frTRUeornyvCfvhnDesQDWuvns1M852Pez91vF"),
  PGx: asset("PGx", "PG", "XsYdjDjNUygZ7yGKfQaB6TxLh2gC6RRjzLtLAGJrhzV"),
  AAPLx: asset("AAPLx", "AAPL", "XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp"),
};

describe("xStocks providers", () => {
  it("accepts only the reviewed Solana mint for each symbol", async () => {
    const send: typeof fetch = async (input) => {
      const symbol = new URL(String(input)).pathname
        .split("/")
        .at(-1) as keyof typeof reviewedAssets;
      return new Response(JSON.stringify(reviewedAssets[symbol]), { status: 200 });
    };

    const listings = await new LiveXStocksProvider(undefined, send).listings();

    expect(listings).toHaveLength(3);
    expect(listings.find((listing) => listing.symbol === "AAPLx")).toMatchObject({
      companyId: "company-apple",
      underlyingSymbol: "AAPL",
      marketOpen: true,
    });
  });

  it("rejects a mismatched mint from the issuer response", async () => {
    const send: typeof fetch = async (input) => {
      const symbol = new URL(String(input)).pathname
        .split("/")
        .at(-1) as keyof typeof reviewedAssets;
      const response = structuredClone(reviewedAssets[symbol]);
      response.deployments[0].address = "WrongMint111111111111111111111111111111111";
      return new Response(JSON.stringify(response), { status: 200 });
    };

    await expect(new LiveXStocksProvider(undefined, send).listings()).rejects.toThrow(
      "XSTOCKS_ASSET_MISMATCH",
    );
  });

  it("rejects endpoints outside the xStocks API host", () => {
    expect(() => new LiveXStocksProvider("https://attacker.invalid/api/")).toThrow(
      "XSTOCKS_ENDPOINT_NOT_ALLOWED",
    );
  });
});
