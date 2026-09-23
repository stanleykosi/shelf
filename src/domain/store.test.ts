import { beforeEach, describe, expect, it } from "vitest";
import {
  consumeMagicDidToken,
  createOrder,
  deleteAccountData,
  quoteLegFromJupiter,
  reconcileInstrumentBalance,
  recordFinalizedLeg,
  reviewCatalogReport,
  revokeInvite,
  state,
  stopOrder,
  userForMagicIdentity,
  type ExecutionPreparation,
} from "./store";
import { Keypair } from "@solana/web3.js";

const user = userForMagicIdentity({
  issuer: "did:magic:test-member",
  walletAddress: "GSusvqZ1HBubM48J9SwtHqkNeggnQ6Lpjt18xcarYn3A",
});

describe("production order accounting", () => {
  beforeEach(() => {
    user.invited = true;
    user.eligible = true;
    user.cashRaw = "50000000";
    user.holdings = [];
    user.records = [];
    state.orders.clear();
    state.intents.clear();
    state.intentHashes.clear();
    state.lots = [];
    state.catalogReports = [];
    state.audits = [];
    state.authTokenUses.clear();
    state.preparations.clear();
    state.sponsorReservations = [];
    state.sessions.clear();
    state.retainedFinancialRecords = [];
    state.pauses.buys = false;
    state.pauses.submissions = false;
    user.reconciliationRequiredAssets = [];
  });

  it("returns the original order for a repeated client intent", () => {
    const input = {
      clientIntentId: "8a5f877d-fccc-4fb3-96f9-16c386c4cab0",
      type: "buy",
      companyId: "company-pepsico",
      amountUsdcRaw: "10000000",
    };
    expect(createOrder(user, input).id).toBe(createOrder(user, input).id);
    expect(state.orders.size).toBe(1);
  });

  it("rejects a reused intent with different economic terms", () => {
    const clientIntentId = "8a5f877d-fccc-4fb3-96f9-16c386c4cab0";
    createOrder(user, {
      clientIntentId,
      type: "buy",
      companyId: "company-pepsico",
      amountUsdcRaw: "10000000",
    });
    expect(() => createOrder(user, {
      clientIntentId,
      type: "buy",
      companyId: "company-pepsico",
      amountUsdcRaw: "20000000",
    })).toThrow("IDEMPOTENCY_CONFLICT");
  });

  it("stores an inspected Jupiter route as a non-executable preview", () => {
    const order = createOrder(user, {
      type: "buy",
      companyId: "company-pepsico",
      amountUsdcRaw: "10000000",
    });
    const quote = quoteLegFromJupiter(user, order.id, order.legs[0].id, {
      outputRaw: "2500000",
      minOutputRaw: "2487500",
      priceImpactBps: 8,
      routeDigest: "route-digest",
      routeLabels: ["Raydium CLMM"],
      transactionMessageHash: "message-hash",
      feeBps: 50,
    });
    expect(quote).toMatchObject({
      source: "jupiter",
      executionAvailable: false,
      executionBlockReason: "SPONSOR_ACTIVATION_PENDING",
      feeRaw: "50000",
    });
  });

  it("keeps a stopped order terminal when a quote is requested again", () => {
    const order = createOrder(user, {
      type: "buy",
      companyId: "company-pepsico",
      amountUsdcRaw: "10000000",
    });
    const legId = order.legs[0].id;
    const quoteInput = {
      outputRaw: "2500000",
      minOutputRaw: "2487500",
      priceImpactBps: 8,
      routeDigest: "route-digest",
      routeLabels: ["Raydium CLMM"],
      transactionMessageHash: "message-hash",
      feeBps: 50,
    };
    quoteLegFromJupiter(user, order.id, legId, quoteInput);
    expect(stopOrder(user, order.id).status).toBe("stopped");
    expect(() => quoteLegFromJupiter(user, order.id, legId, quoteInput)).toThrow(
      "LEG_NOT_QUOTEABLE",
    );
    expect(order.legs[0].status).toBe("cancelled");
  });

  it("does not reopen a proven failed leg after the order is explicitly stopped", () => {
    const order = createOrder(user, {
      type: "buy", companyId: "company-pepsico", amountUsdcRaw: "10000000",
    });
    const leg = order.legs[0];
    leg.status = "failed";
    state.preparations.set("proven-failure", {
      id: "proven-failure", userId: user.id, orderId: order.id, legId: leg.id,
      reviewDigest: "review", messageHash: "message", encryptedUnsignedTransaction: "ciphertext",
      expectedSigners: [], expiresAt: new Date(Date.now() + 60_000).toISOString(),
      lastValidBlockHeight: 1, status: "failed", signature: "signature",
      terminalErrorCode: "CHAIN_TRANSACTION_FAILED",
    });
    stopOrder(user, order.id);
    expect(() => quoteLegFromJupiter(user, order.id, leg.id, {
      outputRaw: "2500000", minOutputRaw: "2487500", priceImpactBps: 8,
      routeDigest: "route", routeLabels: [], transactionMessageHash: "message", feeBps: 50,
    })).toThrow("LEG_NOT_QUOTEABLE");
  });

  it("blocks spending when finalized inventory is below tracked inventory", () => {
    user.holdings = [{
      instrumentId: "instrument-pepx",
      companyId: "company-pepsico",
      symbol: "PEPx",
      rawAmount: "100",
      reservedRaw: "10",
      externalRaw: "25",
      decimals: 8,
      multiplier: "1",
      totalCostUsdcRaw: "5000000",
    }];

    reconcileInstrumentBalance(user, "instrument-pepx", "90");

    expect(user.reconciliationRequiredAssets).toContain("instrument-pepx");
    expect(user.holdings[0].externalRaw).toBe("0");
    expect(() => createOrder(user, {
      type: "sell",
      instrumentId: "instrument-pepx",
      amountRaw: "1",
    })).toThrow("RECONCILIATION_REQUIRED");
  });

  it("rejects DID token replay even under a different challenge", () => {
    const identity = {
      issuer: "did:magic:member",
      expiresAt: "2030-01-01T00:05:00.000Z",
    };
    consumeMagicDidToken("captured-token", "challenge-1", identity);
    expect(() => consumeMagicDidToken("captured-token", "challenge-2", identity)).toThrow(
      "AUTH_REPLAYED",
    );
    expect([...state.authTokenUses.values()][0]).not.toHaveProperty("issuer");
  });

  it("rejects changed wallet bindings and unsafe transfer destinations", () => {
    const originalWallet = user.walletAddress!;
    expect(() => userForMagicIdentity({
      issuer: user.magicIssuer!,
      walletAddress: Keypair.generate().publicKey.toBase58(),
    })).toThrow("WALLET_BINDING_MISMATCH");
    user.eligible = true;
    expect(() => createOrder(user, {
      type: "transfer",
      assetId: "usdc",
      inventoryScope: "cash",
      recipientAddress: originalWallet,
      amountRaw: "1000000",
    })).toThrow("RECIPIENT_SELF");
    expect(() => createOrder(user, {
      type: "transfer",
      assetId: "usdc",
      inventoryScope: "cash",
      recipientAddress: "not-a-solana-key",
      amountRaw: "1000000",
    })).toThrow("RECIPIENT_INVALID");
  });

  it("revokes an invite and removes the affected member's access", () => {
    user.email = "member@example.com";
    user.invited = true;
    state.invites = [{
      id: "invite-1",
      email: "member@example.com",
      status: "active",
      createdAt: new Date().toISOString(),
    }];
    expect(revokeInvite("invite-1")).toEqual({ status: "revoked", inviteId: "invite-1" });
    expect(user.invited).toBe(false);
  });

  it("deletes identity, wallet, holdings, and sessions while detaching retained records", () => {
    const deleted = userForMagicIdentity({
      issuer: "did:magic:delete-me",
      email: "delete@example.com",
      walletAddress: Keypair.generate().publicKey.toBase58(),
    });
    deleted.holdings = [{
      instrumentId: "instrument-pepx",
      companyId: "company-pepsico",
      symbol: "PEPx",
      rawAmount: "100000000",
      reservedRaw: "0",
      externalRaw: "0",
      decimals: 8,
      multiplier: "1",
      totalCostUsdcRaw: "10000000",
    }];
    deleted.records = [{
      id: "record-1",
      type: "buy",
      status: "finalized",
      recordedAt: new Date().toISOString(),
      asset: "instrument-pepx",
      rawAmount: "100000000",
      usdcRaw: "-10000000",
      feeRaw: "50000",
      multiplier: "1",
    }];
    state.sessions.set("session-delete", {
      userId: deleted.id,
      authMethod: "email",
      expiresAt: "2030-01-01T00:00:00.000Z",
    });
    deleteAccountData(deleted);
    expect(state.users.has(deleted.id)).toBe(false);
    expect(state.sessions.has("session-delete")).toBe(false);
    expect(state.retainedFinancialRecords[0].records).toHaveLength(1);
    expect(JSON.stringify(state.retainedFinancialRecords[0])).not.toContain("delete@example.com");
  });

  it("blocks deletion while an on-chain outcome is unresolved, then removes terminal preparations", () => {
    const member = userForMagicIdentity({
      issuer: "did:magic:pending-deletion",
      walletAddress: Keypair.generate().publicKey.toBase58(),
    });
    const preparation: ExecutionPreparation = {
      id: "pending-deletion-preparation", userId: member.id, orderId: "order", legId: "leg",
      reviewDigest: "digest", messageHash: "hash", encryptedUnsignedTransaction: "ciphertext",
      expectedSigners: [], expiresAt: "2030-01-01T00:00:00.000Z", lastValidBlockHeight: 1,
      status: "submitted", signature: "chain-signature",
    };
    state.preparations.set(preparation.id, preparation);
    expect(() => deleteAccountData(member)).toThrow("PENDING_FINANCIAL_OPERATION");
    expect(state.users.has(member.id)).toBe(true);
    preparation.status = "finalized";
    deleteAccountData(member);
    expect(state.preparations.has(preparation.id)).toBe(false);
  });

  it("cancels an unsigned preparation during account deletion", () => {
    const member = userForMagicIdentity({
      issuer: "did:magic:unsigned-deletion",
      walletAddress: Keypair.generate().publicKey.toBase58(),
    });
    state.preparations.set("unsigned-deletion-preparation", {
      id: "unsigned-deletion-preparation", userId: member.id, orderId: "order", legId: "leg",
      reviewDigest: "digest", messageHash: "hash", encryptedUnsignedTransaction: "ciphertext",
      expectedSigners: [], expiresAt: "2030-01-01T00:00:00.000Z", lastValidBlockHeight: 1,
      status: "awaiting_signature",
    });
    deleteAccountData(member);
    expect(state.preparations.has("unsigned-deletion-preparation")).toBe(false);
    expect(state.users.has(member.id)).toBe(false);
  });

  it("derives a sell fee from the actual finalized gross output, not its quote estimate", () => {
    user.holdings = [{
      instrumentId: "instrument-pepx", companyId: "company-pepsico", symbol: "PEPx",
      rawAmount: "100000000", reservedRaw: "0", externalRaw: "0", decimals: 8,
      multiplier: "1", totalCostUsdcRaw: "5000000",
    }];
    state.lots.push({
      userId: user.id, instrumentId: "instrument-pepx",
      remainingRaw: "100000000", costRemainingUsdcRaw: "5000000",
    });
    const order = createOrder(user, { type: "sell", instrumentId: "instrument-pepx", amountRaw: "100000000" });
    const quote = quoteLegFromJupiter(user, order.id, order.legs[0].id, {
      outputRaw: "8955000", minOutputRaw: "8900000", priceImpactBps: 5,
      routeDigest: "sell-route", routeLabels: [], transactionMessageHash: "sell-message", feeBps: 50,
    });
    expect(quote.feeRaw).toBe("45000");
    recordFinalizedLeg(user, order.id, order.legs[0].id, {
      reviewDigest: quote.reviewDigest, signature: "finalized-sell", actualInputRaw: "100000000",
      actualOutputRaw: "9950000", actualFeeRaw: "50000",
    });
    expect(order.legs[0].status).toBe("finalized");
    expect(user.cashRaw).toBe("59950000");
    expect(user.holdings[0].rawAmount).toBe("0");
  });

  it("records confirmed chain data once and keeps the real signature", () => {
    const order = createOrder(user, {
      type: "buy",
      companyId: "company-pepsico",
      amountUsdcRaw: "10000000",
    });
    const quote = quoteLegFromJupiter(user, order.id, order.legs[0].id, {
      outputRaw: "2500000",
      minOutputRaw: "2487500",
      priceImpactBps: 8,
      routeDigest: "route-digest",
      routeLabels: ["Raydium CLMM"],
      transactionMessageHash: "message-hash",
      feeBps: 50,
    });
    const signature = "5sL7confirmedSolanaSignature";
    const input = {
      reviewDigest: quote.reviewDigest,
      signature,
      actualInputRaw: "10000000",
      actualOutputRaw: "2500000",
      actualFeeRaw: "50000",
    };
    recordFinalizedLeg(user, order.id, order.legs[0].id, input);
    recordFinalizedLeg(user, order.id, order.legs[0].id, input);
    expect(user.cashRaw).toBe("40000000");
    expect(user.records).toHaveLength(1);
    expect(user.records[0].signature).toBe(signature);
  });

  it("persists one explicit catalog review decision and its audit reason", () => {
    state.catalogReports.push({
      id: "report-1",
      productId: "product-doritos-snack",
      relationshipId: null,
      reasonCode: "WRONG_PARENT",
      safeNote: "Packaging names a different regional licensee.",
      status: "open",
    });

    const reviewed = reviewCatalogReport(
      "report-1",
      "rejected",
      "owner-1",
      "Source does not support changing the reviewed parent.",
    );

    expect(reviewed).toMatchObject({
      status: "rejected",
      reviewedBy: "owner-1",
      reviewReason: "Source does not support changing the reviewed parent.",
    });
    expect(state.audits.at(-1)).toMatchObject({
      action: "catalog_report:rejected",
      reference: "report-1",
    });
    expect(() =>
      reviewCatalogReport("report-1", "approved", "owner-1", "Changed my mind."),
    ).toThrow("REVIEW_ALREADY_COMPLETED");
  });
});
