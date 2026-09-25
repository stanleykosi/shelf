import { afterEach, describe, expect, it, vi } from "vitest";
import { companies } from "../src/data/catalog";
import { companyResearchPath, readGuestIds } from "../src/components/screens/research-saved";

afterEach(() => vi.unstubAllGlobals());

describe("Saved research integrity", () => {
  it("does not seed guest research and rejects non-array state", () => {
    vi.stubGlobal("sessionStorage", { getItem: () => null });
    expect(readGuestIds("shelf:guest-items")).toEqual([]);
    vi.stubGlobal("sessionStorage", { getItem: () => '{"product":"invented"}' });
    expect(readGuestIds("shelf:guest-items")).toEqual([]);
  });

  it("deduplicates normalized IDs without converting other data", () => {
    vi.stubGlobal("sessionStorage", { getItem: () => '["product-doritos-snack",4,null,"product-doritos-snack"]' });
    expect(readGuestIds("shelf:guest-items")).toEqual(["product-doritos-snack"]);
  });

  it("opens current issuer details only for an exact issuer record", () => {
    const company = companies.find((item) => item.instrument)!;
    expect(companyResearchPath(company)).toBe(`/discover?q=${encodeURIComponent(company.name)}`);
    const issuer = { ...company, id: `issuer:xstocks:${company.instrument!.symbol}` };
    expect(companyResearchPath(issuer)).toBe(`/assets/${company.instrument!.provider}/${encodeURIComponent(company.instrument!.symbol)}`);
  });
});
