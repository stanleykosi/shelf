import { describe, expect, it } from "vitest";
import { LivePreStocksProvider } from "./prestocks";

const validRow = {
  name: "OpenAI PreStocks",
  symbol: "OPENAI",
  description: "Pre-IPO exposure",
  external_url: "https://www.prestocks.com/openai",
  contract_address: "PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF",
  markPrice: 996.02,
  markValuation: 1_000_000,
  tokenPrice: 1104.87,
  impliedValuation: 1_100_000,
  supply: 1901.87,
};

describe("PreStocks providers", () => {
  it("accepts only a reviewed symbol and exact mint pair", async () => {
    const send: typeof fetch = async () => new Response(
        JSON.stringify([
          validRow,
          {
            ...validRow,
            symbol: "UNREVIEWED",
            contract_address: "UnknownMint111111111111111111111111111111",
          },
        ]),
        { status: 200 },
      );
    const provider = new LivePreStocksProvider(undefined, send);

    const listings = await provider.listings();

    expect(listings).toHaveLength(1);
    expect(listings[0]).toMatchObject({
      companyId: "company-openai",
      symbol: "OPENAI",
      mint: validRow.contract_address,
      markPriceUsd: "996.02",
      premiumLabel: "10.93% premium",
    });
  });

  it("rejects a configured endpoint outside the issuer host", () => {
    expect(() => new LivePreStocksProvider("https://attacker.invalid/prestocks")).toThrow(
      "PRESTOCKS_ENDPOINT_NOT_ALLOWED",
    );
  });
});
