import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("screen action inventory", () => {
  it("does not report unavailable operational mutations as queued or recorded", () => {
    const source = readFileSync("src/app/api/v1/[...path]/route.ts", "utf8");

    expect(source).toContain('throw new Error("RECONCILIATION_UNAVAILABLE")');
    expect(source).toContain('throw new Error("ADMIN_MUTATION_UNAVAILABLE")');
    expect(source).not.toContain('return { status: "queued", cashRaw: user.cashRaw }');
    expect(source).not.toContain('return { status: "recorded", liveCapabilitiesChanged: false }');
  });

  it("connects both market lanes to the same purchase route", () => {
    const marketScreen = readFileSync("src/components/screens/markets.tsx", "utf8");
    const apiRoute = readFileSync("src/app/api/v1/[...path]/route.ts", "utf8");

    expect(marketScreen).toContain("/assets/${provider}/${encodeURIComponent(symbol)}/buy");
    expect(apiRoute).toContain("await prepareOrderCompany(body.companyId)");
    expect(apiRoute).toContain("await verifyLegacyOrderInstrument(company");
    expect(apiRoute).toContain("await verifyIssuerForExecution(company)");
    expect(apiRoute).toContain("verifyCurrentIssuerInstrument(company, { prestocks: preStocks, xstocks: xStocks })");
    expect(apiRoute).toContain("outputMint: isBuy ? company.instrument.mint");
  });
});
