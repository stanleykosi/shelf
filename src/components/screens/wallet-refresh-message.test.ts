import { describe, expect, it } from "vitest";
import { walletRefreshMessage } from "./wallet-refresh-message";

describe("wallet refresh notices", () => {
  it("does not claim a new balance snapshot while transaction reconciliation is pending", () => {
    expect(walletRefreshMessage(true)).toContain("last recorded balances");
    expect(walletRefreshMessage(true)).not.toContain("Balances refreshed");
  });

  it("confirms a finalized wallet snapshot once reconciliation is complete", () => {
    expect(walletRefreshMessage(false)).toBe("Balances refreshed from finalized Solana accounts.");
  });
});
