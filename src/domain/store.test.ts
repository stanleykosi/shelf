import { beforeEach, describe, expect, it } from "vitest";
import {
  createOrder,
  quoteLegFromJupiter,
  recordFinalizedLeg,
  reviewCatalogReport,
  state,
  userForMagicIdentity,
} from "./store";

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
