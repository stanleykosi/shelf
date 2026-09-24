import { afterEach, describe, expect, it, vi } from "vitest";
import { productById } from "../src/data/catalog";
import { beginScanSession, changeScanCandidate, proposeProduct, readScanSession, scanErrorMessage } from "../src/lib/scan-session";
import { scanMatches } from "./fixtures/scan";

describe("memory-only scan verification", () => {
  it("proposes exact catalog identities from issuer responses without trusting ownership", () => {
    beginScanSession([
      { ...scanMatches[0], productId: null, companyId: "untrusted-issuer", ownerName: "Unverified owner", sourceIds: ["src-xstocks"] },
      { ...scanMatches[1], productId: null },
      { ...scanMatches[2], companyId: "company-pepsico", ownerName: "PepsiCo" },
    ], "photo");
    const candidates = readScanSession()!.candidates;
    expect(candidates[0].productId).toBe("product-doritos-snack");
    expect(candidates[0].decision).toBe("proposed");
    expect(candidates[1].productId).toBeNull();
    expect(candidates[1].alternatives.length).toBeGreaterThan(1);
    expect(candidates[2].productId).toBeNull();
    expect(JSON.stringify(candidates)).not.toContain("Unverified owner");
  });
  afterEach(() => { vi.useRealTimers(); });
  it("requires explicit confirmation and never chooses one Product from an ambiguous brand", () => {
    beginScanSession(scanMatches, "photo");
    expect(readScanSession()?.candidates.map((candidate) => candidate.decision)).toEqual(["proposed", "proposed", "proposed"]);
    expect(readScanSession()?.candidates[1].productId).toBeNull();
    expect(readScanSession()?.candidates[1].alternatives.length).toBeGreaterThan(1);
    changeScanCandidate("candidate-2", { decision: "confirmed" });
    expect(readScanSession()?.candidates[2].decision).toBe("proposed");
    changeScanCandidate("candidate-0", { decision: "confirmed" });
    changeScanCandidate("candidate-1", { productId: "product-tide-laundry", decision: "proposed" });
    expect(readScanSession()?.candidates[0].decision).toBe("confirmed");
    expect(readScanSession()?.candidates[1].decision).toBe("proposed");
  });
  it("manual input proposes a catalog ID and expiry discards all raw candidate evidence", () => {
    vi.useFakeTimers();
    beginScanSession([proposeProduct(productById("product-doritos-snack")!)], "search");
    expect(readScanSession()?.candidates[0].productId).toBe("product-doritos-snack");
    vi.advanceTimersByTime(30 * 60 * 1000);
    expect(readScanSession()).toBeNull();
  });
  it("maps provider and privacy failures without leaking raw messages", () => {
    expect(scanErrorMessage(new Error("AI_PRIVACY_UNAVAILABLE"))).toContain("required privacy controls");
    expect(scanErrorMessage(new Error("secret internal details"))).not.toContain("secret");
  });
});
