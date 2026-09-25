import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { reviewedGuestProductIds } from "@/components/screens/account-draft";
import { safeReturnTo } from "@/lib/routes";

describe("account frontend guards", () => {
  it("merges only unique reviewed Products, never raw recognition text or Company IDs", () => {
    expect(reviewedGuestProductIds(JSON.stringify([
      "product-doritos-snack", "product-doritos-snack", "company-pepsico", "unverified product", null, 17,
    ]))).toEqual(["product-doritos-snack"]);
    expect(reviewedGuestProductIds("not json")).toEqual([]);
    expect(reviewedGuestProductIds('{"productId":"product-doritos-snack"}')).toEqual([]);
  });

  it("auth navigation keeps safe intent and rejects external returns", () => {
    expect(safeReturnTo("/account/wallet")).toBe("/account/wallet");
    expect(safeReturnTo("https://example.com")).toBe("/onboarding");
    expect(safeReturnTo("//example.com")).toBe("/onboarding");
  });

  it("keeps acknowledgement, deletion, funding and retry guards explicit", () => {
    const source = readFileSync("src/components/screens/account.tsx", "utf8");
    expect(source).toContain("disabled={!terms || !adult}");
    expect(source).toContain("if (!acknowledgeDeletion || !acknowledgeWallet) return;");
    expect(source).toContain('freshPostJson("account/deletion", "account_deletion"');
    expect(source).toContain("mergeId.current ??= crypto.randomUUID()");
    expect(source).toContain("Withheld while deposits are disabled");
    expect(source).toContain("safeReturnTo(challenge.returnPath)");
  });
});
