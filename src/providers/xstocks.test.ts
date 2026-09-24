import { describe, expect, it } from "vitest";
import { LiveXStocksProvider } from "./xstocks";

function asset(symbol: string, mint: string) {
  return {
    name: `${symbol} xStock`,
    symbol,
    logo: `https://xstocks-metadata.backed.fi/logos/tokens/${symbol}.png`,
    underlying: { symbol: symbol.slice(0, -1) },
    isTradingHalted: false,
    trading: null,
    deployments: [{ address: mint, network: "Solana", supportsAtomicSwaps: true }],
  };
}

describe("xStocks provider", () => {
  it("reads every page and uses issuer-listed Solana mints", async () => {
    const pages = [
      { nodes: [asset("AAPLx", "XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp")],
        page: { currentPage: 0, hasNextPage: true } },
      { nodes: [{ ...asset("PEPx", "Xsv99frTRUeornyvCfvhnDesQDWuvns1M852Pez91vF"), logo: "https://xstocks-metadata.backed.fi/other/PEPx.png" }],
        page: { currentPage: 1, hasNextPage: false } },
    ];
    const requestedPages: number[] = [];
    const send: typeof fetch = async (input) => {
      const page = Number(new URL(String(input)).searchParams.get("page"));
      requestedPages.push(page);
      if (page >= pages.length) return new Response(null, { status: 404 });
      return new Response(JSON.stringify(pages[page]), { status: 200 });
    };
    const listings = await new LiveXStocksProvider(undefined, send).listings();

    expect(listings.map((listing) => listing.companyId)).toEqual([
      "issuer:xstocks:AAPLx",
      "issuer:xstocks:PEPx",
    ]);
    expect(listings[0].mint).toBe("XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp");
    expect(listings[0].logoUrl).toBe("https://xstocks-metadata.backed.fi/logos/tokens/AAPLx.png");
    expect(listings[1].logoUrl).toBeUndefined();
    expect(requestedPages).toEqual([0, 1, 2]);
  });

  it("does not accept a later page when an earlier required page fails", async () => {
    const send: typeof fetch = async (input) => {
      const page = Number(new URL(String(input)).searchParams.get("page"));
      if (page === 1) return new Response(null, { status: 503 });
      return new Response(JSON.stringify({
        nodes: [],
        page: { currentPage: page, hasNextPage: page === 0 },
      }));
    };

    await expect(new LiveXStocksProvider(undefined, send).listings())
      .rejects.toThrow("XSTOCKS_UNAVAILABLE");
  });

  it("rejects an unexpected page and foreign API host", async () => {
    const send: typeof fetch = async () => new Response(JSON.stringify({
      nodes: [], page: { currentPage: 4, hasNextPage: false },
    }));
    await expect(new LiveXStocksProvider(undefined, send).listings()).rejects.toThrow(
      "XSTOCKS_INVALID_PAGE",
    );
    expect(() => new LiveXStocksProvider("https://attacker.invalid/api/")).toThrow(
      "XSTOCKS_ENDPOINT_NOT_ALLOWED",
    );
  });

  it("fetches one exact symbol for financial verification", async () => {
    const sourceData = {
      ...asset("AAPLx", "XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp"),
      isin: "CH0000000001",
      issuerOnlyField: { availableToChat: true },
    };
    const send: typeof fetch = async (input) => {
      expect(String(input)).toContain("/public/assets/AAPLx");
      return new Response(JSON.stringify(sourceData));
    };
    const detail = await new LiveXStocksProvider(undefined, send).detail("AAPLx");
    expect(detail?.listing.companyId).toBe("issuer:xstocks:AAPLx");
    expect(detail?.sourceData).toEqual(sourceData);
  });
});
