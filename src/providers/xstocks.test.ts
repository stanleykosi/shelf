import { describe, expect, it } from "vitest";
import { LiveXStocksProvider } from "./xstocks";

function asset(symbol: string, mint: string) {
  return {
    name: `${symbol} xStock`,
    symbol,
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
      { nodes: [asset("PEPx", "Xsv99frTRUeornyvCfvhnDesQDWuvns1M852Pez91vF")],
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
    expect(requestedPages).toEqual([0, 1]);
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
    const send: typeof fetch = async (input) => {
      expect(String(input)).toContain("/public/assets/AAPLx");
      return new Response(JSON.stringify(asset(
        "AAPLx", "XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp",
      )));
    };
    const listing = await new LiveXStocksProvider(undefined, send).listing("AAPLx");
    expect(listing?.companyId).toBe("issuer:xstocks:AAPLx");
  });
});
