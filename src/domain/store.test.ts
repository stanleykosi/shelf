import { beforeEach, describe, expect, it } from "vitest";
import {
  consumeMagicDidToken,
  createOrder,
  deleteAccountData,
  quoteLegFromJupiter,
  recordFinalizedLeg,
  reviewCatalogReport,
  revokeInvite,
  state,
  stopOrder,
  userForMagicIdentity,
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
    state.sessions.clear();
    state.retainedFinancialRecords = [];
    state.pauses.buys = false;
    state.pauses.submissions = false;
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
    const input = { reviewDigest: quote.reviewDigest, signature };
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
