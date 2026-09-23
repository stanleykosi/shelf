import { Keypair } from "@solana/web3.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  acceptWalletSignature,
  reserveSponsorBudget,
  settleSponsorReservation,
  storeExecutionPreparation,
  transactionForWalletSignature,
} from "./execution";
import {
  createOrder,
  quoteLegFromJupiter,
  revokeInvite,
  state,
  stopOrder,
  userForMagicIdentity,
  type ExecutionPreparation,
  type UserState,
} from "./store";
import {
  broadcastStoredPreparation,
  reconcileOrderPreparations,
  reconcileOutstandingPreparations,
  reconcilePreparation,
} from "./transaction-orchestration";
import { refreshVerifiedWalletBalances } from "./wallet-refresh";
import { companyById } from "@/data/catalog";
import { SOLANA_MAINNET_USDC_MINT } from "@/providers/solana-constants";
import { env } from "@/lib/env";
import { encryptText } from "@/lib/secret-box";
import type { HeliusChainProvider } from "@/providers/live";

const encryptionKey = Buffer.alloc(32, 7).toString("base64");
let originalEnvironment: typeof env;

function addPreparedOrder(user: UserState, suffix: string) {
  const order = createOrder(user, {
    type: "buy",
    companyId: "company-pepsico",
    amountUsdcRaw: "5000000",
    clientIntentId: `intent-${suffix}`,
  });
  const leg = order.legs[0];
  const quote = quoteLegFromJupiter(user, order.id, leg.id, {
    outputRaw: "1000000",
    minOutputRaw: "990000",
    priceImpactBps: 5,
    routeDigest: `route-${suffix}`,
    routeLabels: ["test"],
    transactionMessageHash: `message-${suffix}`,
    feeBps: 50,
  });
  const preparation = storeExecutionPreparation(user, order.id, leg.id, {
    transactionBase64: "AA==",
    messageHash: `message-${suffix}`,
    expectedSigners: [env.SPONSOR_PUBLIC_KEY!, user.walletAddress!],
    lastValidBlockHeight: 100,
  })!;
  return { order, leg, quote, preparation };
}

function seededSubmittedPreparation(status: ExecutionPreparation["status"] = "submitted") {
  const user = userForMagicIdentity({
    issuer: `did:magic:${Keypair.generate().publicKey.toBase58()}`,
    walletAddress: Keypair.generate().publicKey.toBase58(),
  });
  user.invited = true;
  user.eligible = true;
  user.cashRaw = "10000000";
  const seeded = addPreparedOrder(user, "reconcile");
  seeded.preparation.status = status;
  seeded.preparation.signature = `persisted-${seeded.order.id}`;
  seeded.preparation.encryptedSignedTransaction = encryptText("AA==", encryptionKey);
  seeded.leg.status = status === "signed" ? "signed" : "submitted";
  state.sponsorReservations.push({
    preparationId: seeded.preparation.id,
    userId: user.id,
    utcDate: new Date().toISOString().slice(0, 10),
    reservedLamports: "5000000",
    status: "reserved",
  });
  return { user, ...seeded };
}

function chain(overrides: Partial<HeliusChainProvider>) {
  return overrides as HeliusChainProvider;
}

function successfulBuyFacts() {
  const mint = companyById("company-pepsico")!.instrument!.mint;
  return {
    succeeded: true,
    slot: 1,
    blockTime: 1,
    networkFeeLamports: "5000",
    sponsorDebitLamports: "5000",
    tokenDeltas: { [SOLANA_MAINNET_USDC_MINT]: "-5000000", [mint]: "1000000" },
    accountTokenDeltas: { [`${env.FEE_USDC_TOKEN_ACCOUNT}:${SOLANA_MAINNET_USDC_MINT}`]: "25000" },
  };
}

describe("transaction execution safety and recovery", () => {
  beforeEach(() => {
    originalEnvironment = { ...env };
    const sponsor = Keypair.generate();
    Object.assign(env, {
      ENABLE_REAL_TRADING: true,
      DATA_ENCRYPTION_KEY: encryptionKey,
      SPONSOR_PUBLIC_KEY: sponsor.publicKey.toBase58(),
      SPONSOR_SECRET_KEY: JSON.stringify([...sponsor.secretKey]),
      FEE_USDC_TOKEN_ACCOUNT: Keypair.generate().publicKey.toBase58(),
    });
    state.users.clear();
    state.orders.clear();
    state.intents.clear();
    state.intentHashes.clear();
    state.preparations.clear();
    state.sponsorReservations = [];
    state.invites = [];
    state.pauses.submissions = false;
    state.pauses.buys = false;
  });

  afterEach(() => {
    Object.assign(env, originalEnvironment);
  });

  it("invalidates an outstanding signing callback when the user stops the order", () => {
    const user = userForMagicIdentity({
      issuer: "did:magic:cancelled-signature",
      walletAddress: Keypair.generate().publicKey.toBase58(),
    });
    user.invited = true;
    user.eligible = true;
    user.cashRaw = "10000000";
    const { order, leg, quote, preparation } = addPreparedOrder(user, "cancel");
    transactionForWalletSignature(user, order.id, leg.id, quote.reviewDigest);

    stopOrder(user, order.id);

    expect(preparation.status).toBe("cancelled");
    expect(leg.status).toBe("cancelled");
    expect(() => acceptWalletSignature(user, preparation.id, "AA=="))
      .toThrow("PREPARATION_STATE_INVALID");
  });

  it("allows only one unresolved signing or submission per wallet", () => {
    const user = userForMagicIdentity({
      issuer: "did:magic:wallet-lock",
      walletAddress: Keypair.generate().publicKey.toBase58(),
    });
    user.invited = true;
    user.eligible = true;
    user.cashRaw = "10000000";
    const first = addPreparedOrder(user, "first");
    const second = addPreparedOrder(user, "second");
    transactionForWalletSignature(user, first.order.id, first.leg.id, first.quote.reviewDigest);

    expect(() =>
      transactionForWalletSignature(user, second.order.id, second.leg.id, second.quote.reviewDigest),
    ).toThrow("WALLET_OPERATION_IN_PROGRESS");
  });

  it("rejects sponsor signing when the user's daily reservation cap is exhausted", () => {
    const user = userForMagicIdentity({
      issuer: "did:magic:sponsor-cap",
      walletAddress: Keypair.generate().publicKey.toBase58(),
    });
    user.invited = true;
    user.eligible = true;
    const { preparation } = addPreparedOrder(user, "sponsor-cap");
    const today = new Date().toISOString().slice(0, 10);
    state.sponsorReservations = Array.from({ length: 4 }, (_, index) => ({
      preparationId: `previous-${index}`,
      userId: user.id,
      utcDate: today,
      reservedLamports: "5000000",
      status: "reserved" as const,
    }));

    expect(() => reserveSponsorBudget(user, preparation)).toThrow("SPONSOR_BUDGET_EXHAUSTED");
    expect(state.sponsorReservations).toHaveLength(4);
  });

  it("carries unresolved sponsor reservations across midnight", () => {
    const user = userForMagicIdentity({
      issuer: "did:magic:midnight-budget",
      walletAddress: Keypair.generate().publicKey.toBase58(),
    });
    user.invited = true;
    user.eligible = true;
    const { preparation } = addPreparedOrder(user, "midnight-budget");
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    state.sponsorReservations = Array.from({ length: 4 }, (_, index) => ({
      preparationId: `yesterday-${index}`,
      userId: user.id,
      utcDate: yesterday,
      reservedLamports: "5000000",
      status: "reserved" as const,
    }));
    expect(() => reserveSponsorBudget(user, preparation)).toThrow("SPONSOR_BUDGET_EXHAUSTED");

    state.sponsorReservations = Array.from({ length: 20 }, (_, index) => ({
      preparationId: `global-yesterday-${index}`,
      userId: `other-${index}`,
      utcDate: yesterday,
      reservedLamports: "5000000",
      status: "reserved" as const,
    }));
    expect(() => reserveSponsorBudget(user, preparation)).toThrow("SPONSOR_BUDGET_EXHAUSTED");
  });

  it("charges settled sponsorship to chain execution day and reserves unknown dates", () => {
    const user = userForMagicIdentity({
      issuer: "did:magic:sponsor-execution-date",
      walletAddress: Keypair.generate().publicKey.toBase58(),
    });
    user.invited = true;
    user.eligible = true;
    const { preparation } = addPreparedOrder(user, "sponsor-execution-date");
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const yesterdayTime = Date.parse(`${yesterday}T12:00:00.000Z`) / 1000;
    state.sponsorReservations = [{
      preparationId: preparation.id,
      userId: user.id,
      utcDate: yesterday,
      reservedLamports: "5000000",
      status: "reserved",
    }];
    settleSponsorReservation(preparation, "4000", "4000", yesterdayTime);
    expect(state.sponsorReservations[0].executionUtcDate).toBe(yesterday);

    const next = addPreparedOrder(user, "sponsor-after-yesterday");
    expect(() => reserveSponsorBudget(user, next.preparation)).not.toThrow();
    const today = new Date().toISOString().slice(0, 10);
    const todayTime = Date.parse(`${today}T12:00:00.000Z`) / 1000;
    state.sponsorReservations = Array.from({ length: 4 }, (_, index) => ({
      preparationId: `executed-today-${index}`,
      userId: user.id,
      utcDate: yesterday,
      reservedLamports: "5000000",
      actualLamports: "5000000",
      executionUtcDate: today,
      status: "settled" as const,
    }));
    expect(() => reserveSponsorBudget(user, next.preparation)).toThrow("SPONSOR_BUDGET_EXHAUSTED");
    state.sponsorReservations[0].executionUtcDate = undefined;
    expect(todayTime).toBeGreaterThan(yesterdayTime);
    expect(() => reserveSponsorBudget(user, next.preparation)).toThrow("SPONSOR_BUDGET_EXHAUSTED");
  });

  it("revokes new signing and first broadcast while still reconciling a landed signature", async () => {
    const { user, preparation, order, leg, quote } = seededSubmittedPreparation("signed");
    preparation.status = "prepared";
    leg.status = "prepared";
    user.email = "revoked@example.test";
    state.invites.push({
      id: "revoked-invite",
      email: user.email,
      status: "active",
      createdAt: new Date().toISOString(),
    });
    revokeInvite("revoked-invite");
    expect(user.invited).toBe(false);
    expect(() => transactionForWalletSignature(user, order.id, leg.id, quote.reviewDigest))
      .toThrow("ELIGIBILITY_DENIED");
    preparation.status = "awaiting_signature";
    leg.status = "awaiting_signature";
    expect(() => acceptWalletSignature(user, preparation.id, "AA=="))
      .toThrow("ELIGIBILITY_DENIED");
    preparation.status = "signed";
    leg.status = "signed";
    let broadcasts = 0;
    const unseen = chain({
      signatureStatus: async () => "not_found",
      blockHeight: async () => 50,
      broadcast: async () => { broadcasts += 1; return { signature: preparation.signature! }; },
    });
    await expect(broadcastStoredPreparation(unseen, user, preparation.id))
      .rejects.toThrow("ELIGIBILITY_DENIED");
    expect(broadcasts).toBe(0);
    await expect(reconcileOutstandingPreparations(chain({
      signatureStatus: async () => "confirmed",
    }), user.id)).resolves.toMatchObject({ checked: 1, errors: 0 });
    expect(preparation.status).toBe("confirmed");
  });

  it("expires abandoned unsigned approval before locking another order", () => {
    const user = userForMagicIdentity({
      issuer: "did:magic:abandoned-approval",
      walletAddress: Keypair.generate().publicKey.toBase58(),
    });
    user.invited = true;
    user.eligible = true;
    user.cashRaw = "10000000";
    const old = addPreparedOrder(user, "abandoned-old");
    const next = addPreparedOrder(user, "abandoned-next");
    transactionForWalletSignature(user, old.order.id, old.leg.id, old.quote.reviewDigest);
    old.preparation.expiresAt = "2000-01-01T00:00:00.000Z";

    expect(transactionForWalletSignature(user, next.order.id, next.leg.id, next.quote.reviewDigest))
      .toMatchObject({ preparationId: next.preparation.id });
    expect(old.preparation.status).toBe("expired");
    expect(old.leg.status).toBe("draft");
    expect(old.order.status).toBe("awaiting_user");
  });

  it("checks signature history before attempting a rebroadcast", async () => {
    const { user, preparation, leg } = seededSubmittedPreparation("signed");
    let broadcasts = 0;
    const provider = chain({
      signatureStatus: async () => "confirmed",
      broadcast: async () => {
        broadcasts += 1;
        return { signature: preparation.signature! };
      },
    });

    await expect(broadcastStoredPreparation(provider, user, preparation.id))
      .resolves.toMatchObject({ status: "confirmed" });
    expect(broadcasts).toBe(0);
    expect(preparation.status).toBe("confirmed");
    expect(leg.status).toBe("confirmed");
  });

  it("persists terminal chain failure and settles the sponsor reservation", async () => {
    const { user, preparation, order, leg } = seededSubmittedPreparation();
    const provider = chain({
      signatureStatus: async () => "failed",
      transactionFacts: async () => ({
        succeeded: false,
        slot: 1,
        blockTime: 1,
        networkFeeLamports: "5000",
        sponsorDebitLamports: "5000",
        tokenDeltas: {},
        accountTokenDeltas: {},
      }),
    });

    await expect(reconcilePreparation(provider, user, preparation))
      .resolves.toMatchObject({ status: "failed" });
    expect(preparation).toMatchObject({
      status: "failed",
      terminalErrorCode: "CHAIN_TRANSACTION_FAILED",
      networkFeeLamports: "5000",
    });
    expect(leg.status).toBe("failed");
    expect(order.status).toBe("failed");
    expect(state.sponsorReservations[0]).toMatchObject({
      status: "settled",
      actualLamports: "5000",
    });
  });

  it("retains the wallet lock and sponsor reservation for non-final chain errors", async () => {
    const { user, preparation, order, leg } = seededSubmittedPreparation();
    const provider = chain({ signatureStatus: async () => "pending_failure" });

    await expect(reconcilePreparation(provider, user, preparation))
      .resolves.toMatchObject({ status: "outcome_unknown" });
    expect(order.status).toBe("outcome_unknown");
    expect(leg.status).toBe("outcome_unknown");
    expect(state.sponsorReservations[0].status).toBe("reserved");
    expect(preparation.terminalErrorCode).toBeUndefined();
    const next = addPreparedOrder(user, "after-ambiguous-failure");
    expect(() => transactionForWalletSignature(user, next.order.id, next.leg.id, next.quote.reviewDigest))
      .toThrow("WALLET_OPERATION_IN_PROGRESS");
  });

  it("allows a proven failed leg to receive a fresh review but not an unproven failure", async () => {
    const { user, preparation, order, leg } = seededSubmittedPreparation();
    await reconcilePreparation(chain({
      signatureStatus: async () => "failed",
      transactionFacts: async () => ({
        succeeded: false, slot: 1, blockTime: 1, networkFeeLamports: "5000",
        sponsorDebitLamports: "5000", tokenDeltas: {}, accountTokenDeltas: {},
      }),
    }), user, preparation);
    expect(leg.status).toBe("failed");
    const input = {
      outputRaw: "1100000", minOutputRaw: "1000000", priceImpactBps: 5,
      routeDigest: "retry-route", routeLabels: [], transactionMessageHash: "retry-message", feeBps: 50,
    };
    expect(quoteLegFromJupiter(user, order.id, leg.id, input).version).toBe(2);
    expect(leg.status).toBe("quoted");
    const nextPreparation = storeExecutionPreparation(user, order.id, leg.id, {
      transactionBase64: "AA==",
      messageHash: input.transactionMessageHash,
      expectedSigners: [env.SPONSOR_PUBLIC_KEY!, user.walletAddress!],
      lastValidBlockHeight: 200,
    });
    expect(nextPreparation?.id).not.toBe(preparation.id);
    expect(nextPreparation?.status).toBe("prepared");
    leg.status = "failed";
    expect(() => quoteLegFromJupiter(user, order.id, leg.id, input))
      .toThrow("LEG_NOT_QUOTEABLE");
  });

  it("preserves an ambiguous outcome when the member stops the order", () => {
    const { user, order, leg } = seededSubmittedPreparation("outcome_unknown");
    leg.status = "outcome_unknown";
    expect(stopOrder(user, order.id).status).toBe("outcome_unknown");
    expect(leg.status).toBe("outcome_unknown");
  });

  it("blocks a quoted purchase at signing and broadcast after the owner pauses buys", async () => {
    const { user, preparation, order, leg, quote } = seededSubmittedPreparation("signed");
    preparation.status = "prepared";
    leg.status = "prepared";
    state.pauses.buys = true;
    expect(() => transactionForWalletSignature(user, order.id, leg.id, quote.reviewDigest))
      .toThrow("PURCHASES_PAUSED");
    preparation.status = "awaiting_signature";
    leg.status = "awaiting_signature";
    expect(() => acceptWalletSignature(user, preparation.id, "AA=="))
      .toThrow("PURCHASES_PAUSED");
    preparation.status = "signed";
    leg.status = "signed";
    let broadcasts = 0;
    const provider = chain({
      signatureStatus: async () => "not_found",
      blockHeight: async () => 50,
      broadcast: async () => { broadcasts += 1; return { signature: preparation.signature! }; },
    });
    await expect(broadcastStoredPreparation(provider, user, preparation.id))
      .rejects.toThrow("PURCHASES_PAUSED");
    expect(broadcasts).toBe(0);
  });

  it("processes a bounded fair batch of unresolved preparations", async () => {
    const first = seededSubmittedPreparation();
    const second = seededSubmittedPreparation();
    const checked: string[] = [];
    const provider = chain({ signatureStatus: async (signature) => {
      checked.push(signature);
      return "confirmed";
    } });
    expect(await reconcileOutstandingPreparations(provider, undefined, 1))
      .toMatchObject({ checked: 1, remaining: 2 });
    expect(await reconcileOutstandingPreparations(provider, undefined, 1))
      .toMatchObject({ checked: 1, remaining: 2 });
    expect(checked).toEqual([first.preparation.signature, second.preparation.signature]);
  });

  it("audits an orphaned preparation without starving later valid work", async () => {
    const orphan = seededSubmittedPreparation();
    const valid = seededSubmittedPreparation();
    state.users.delete(orphan.user.id);
    const provider = chain({ signatureStatus: async () => "confirmed" });
    expect(await reconcileOutstandingPreparations(provider, undefined, 1))
      .toMatchObject({ checked: 1, errors: 1, remaining: 2 });
    expect(state.preparations.get(orphan.preparation.id)?.reconciliationFailure)
      .toMatchObject({ code: "RECONCILIATION_IDENTITY_MISSING", attempts: 1 });
    expect(await reconcileOutstandingPreparations(provider, undefined, 1))
      .toMatchObject({ checked: 1, errors: 0 });
    expect(state.preparations.get(valid.preparation.id)?.status).toBe("confirmed");
    expect(state.audits.some((audit) =>
      audit.reference === orphan.preparation.id && audit.reason?.includes("RECONCILIATION_IDENTITY_MISSING")))
      .toBe(true);
  });

  it("expires only after history is empty and the blockhash is no longer valid", async () => {
    const { user, preparation, leg } = seededSubmittedPreparation();
    const provider = chain({
      signatureStatus: async () => "not_found",
      blockHeight: async () => preparation.lastValidBlockHeight + 1,
    });

    await expect(reconcilePreparation(provider, user, preparation))
      .resolves.toMatchObject({ status: "expired" });
    expect(leg.status).toBe("expired");
    expect(state.sponsorReservations[0]).toMatchObject({
      status: "released",
      releaseReason: "blockhash_expired_unseen",
    });
  });

  it("waits for a finalized expiry boundary before releasing a signed transaction", async () => {
    const { user, preparation, leg } = seededSubmittedPreparation();
    let historyChecks = 0;
    const provider = chain({
      signatureStatus: async () => { historyChecks += 1; return "not_found"; },
      blockHeight: async (commitment) => commitment === "finalized"
        ? preparation.lastValidBlockHeight
        : preparation.lastValidBlockHeight + 1,
    });
    await expect(reconcilePreparation(provider, user, preparation))
      .resolves.toMatchObject({ status: "outcome_unknown" });
    expect(historyChecks).toBe(1);
    expect(leg.status).toBe("outcome_unknown");
    expect(state.sponsorReservations[0].status).toBe("reserved");
  });

  it("rechecks history after finalized expiry and records a transaction that landed in between", async () => {
    const { user, preparation, leg } = seededSubmittedPreparation();
    let historyChecks = 0;
    const provider = chain({
      signatureStatus: async () => ++historyChecks === 1 ? "not_found" : "finalized",
      blockHeight: async () => preparation.lastValidBlockHeight + 1,
      transactionFacts: async () => successfulBuyFacts(),
    });
    await expect(reconcilePreparation(provider, user, preparation))
      .resolves.toMatchObject({ status: "finalized" });
    expect(historyChecks).toBe(2);
    expect(leg.status).toBe("finalized");
    expect(state.sponsorReservations[0].status).toBe("settled");
    expect(user.records).toHaveLength(1);
  });

  it("keeps the reservation when full signature history cannot be checked", async () => {
    const { user, preparation } = seededSubmittedPreparation();
    let historyChecks = 0;
    const provider = chain({
      signatureStatus: async () => {
        if (++historyChecks === 1) return "not_found";
        throw new Error("CHAIN_HISTORY_UNAVAILABLE");
      },
      blockHeight: async () => preparation.lastValidBlockHeight + 1,
    });
    await expect(reconcileOutstandingPreparations(provider, user.id, 1))
      .resolves.toMatchObject({ checked: 1, errors: 1, remaining: 1 });
    expect(state.preparations.get(preparation.id)?.status).toBe("submitted");
    expect(state.sponsorReservations[0].status).toBe("reserved");
  });

  it("checks the same expiry race before broadcast and during paused worker inspection", async () => {
    const first = seededSubmittedPreparation("signed");
    let lookups = 0;
    const landed = chain({
      signatureStatus: async () => ++lookups === 1 ? "not_found" : "confirmed",
      blockHeight: async () => first.preparation.lastValidBlockHeight + 1,
    });
    await expect(broadcastStoredPreparation(landed, first.user, first.preparation.id))
      .resolves.toMatchObject({ status: "confirmed" });
    expect(first.preparation.status).toBe("confirmed");
    expect(first.order.status).toBe("in_progress");

    const second = seededSubmittedPreparation("signed");
    env.ENABLE_REAL_TRADING = false;
    let pausedLookups = 0;
    const paused = chain({
      signatureStatus: async () => ++pausedLookups === 1 ? "not_found" : "confirmed",
      blockHeight: async () => second.preparation.lastValidBlockHeight + 1,
    });
    await expect(reconcileOutstandingPreparations(paused, second.user.id, 1))
      .resolves.toMatchObject({ checked: 1, errors: 0 });
    expect(pausedLookups).toBe(2);
    expect(second.preparation.status).toBe("confirmed");
    expect(state.sponsorReservations.find((item) => item.preparationId === second.preparation.id)?.status)
      .toBe("reserved");
  });

  it("returns an updated order after member status triggers the first broadcast", async () => {
    const { user, preparation, order } = seededSubmittedPreparation("signed");
    const provider = chain({
      signatureStatus: async () => "not_found",
      blockHeight: async () => 50,
      simulate: async () => ({ unitsConsumed: null }),
      broadcast: async () => ({ signature: preparation.signature! }),
    });
    await expect(reconcileOrderPreparations(provider, user, order.id))
      .resolves.toMatchObject({ status: "submitted", order: { id: order.id, status: "in_progress" } });
  });

  it("reuses the same prepared bytes after a dismissed signing prompt, without moving the version", () => {
    const user = userForMagicIdentity({ issuer: "did:magic:retry-prompt", walletAddress: Keypair.generate().publicKey.toBase58() });
    user.invited = true;
    user.eligible = true;
    user.cashRaw = "10000000";
    const { order, leg, quote, preparation } = addPreparedOrder(user, "retry-prompt");
    const first = transactionForWalletSignature(user, order.id, leg.id, quote.reviewDigest);
    const version = order.version;
    const second = transactionForWalletSignature(user, order.id, leg.id, quote.reviewDigest);
    expect(second).toEqual(first);
    expect(order.version).toBe(version);
    expect(preparation.status).toBe("awaiting_signature");
  });

  it("lets an expired unsigned approval be freshly quoted", () => {
    const user = userForMagicIdentity({ issuer: "did:magic:expired-prompt", walletAddress: Keypair.generate().publicKey.toBase58() });
    user.invited = true;
    user.eligible = true;
    user.cashRaw = "10000000";
    const { order, leg, quote, preparation } = addPreparedOrder(user, "expired-prompt");
    transactionForWalletSignature(user, order.id, leg.id, quote.reviewDigest);
    preparation.expiresAt = "2000-01-01T00:00:00.000Z";
    expect(quoteLegFromJupiter(user, order.id, leg.id, {
      outputRaw: "1100000", minOutputRaw: "1000000", priceImpactBps: 5,
      routeDigest: "new-route", routeLabels: [], transactionMessageHash: "new-message", feeBps: 50,
    }).version).toBe(2);
    expect(preparation.status).toBe("expired");
    expect(leg.status).toBe("quoted");
  });

  it("blocks the first broadcast under the emergency pause, but still reads signature history", async () => {
    const { user, preparation } = seededSubmittedPreparation("signed");
    state.pauses.submissions = true;
    let broadcasts = 0;
    const provider = chain({
      signatureStatus: async () => "not_found",
      blockHeight: async () => 50,
      simulate: async () => ({ unitsConsumed: null }),
      broadcast: async () => { broadcasts += 1; return { signature: preparation.signature! }; },
    });
    await expect(broadcastStoredPreparation(provider, user, preparation.id))
      .rejects.toThrow("SUBMISSIONS_PAUSED");
    expect(broadcasts).toBe(0);
    expect(preparation.status).toBe("signed");
    const landed = chain({ signatureStatus: async () => "confirmed" });
    await expect(broadcastStoredPreparation(landed, user, preparation.id))
      .resolves.toMatchObject({ status: "confirmed" });
  });

  it("keeps the real-trading gate off during wallet refresh while still checking history", async () => {
    const { user, preparation } = seededSubmittedPreparation("signed");
    env.ENABLE_REAL_TRADING = false;
    let historyChecks = 0;
    let broadcasts = 0;
    const provider = chain({
      signatureStatus: async () => { historyChecks += 1; return "not_found"; },
      blockHeight: async () => 50,
      broadcast: async () => { broadcasts += 1; return { signature: preparation.signature! }; },
      balances: async () => { throw new Error("BALANCES_MUST_WAIT"); },
    });
    await expect(refreshVerifiedWalletBalances(provider, user))
      .resolves.toMatchObject({ pendingReconciliation: true });
    expect(historyChecks).toBe(1);
    expect(broadcasts).toBe(0);
    expect(preparation.status).toBe("signed");
  });

  it("applies a finalized fill before loading the same post-trade wallet balances", async () => {
    const { user, preparation, leg } = seededSubmittedPreparation();
    const mint = companyById("company-pepsico")!.instrument!.mint;
    const provider = chain({
      signatureStatus: async () => "finalized",
      transactionFacts: async () => successfulBuyFacts(),
      balances: async () => ({ [SOLANA_MAINNET_USDC_MINT]: "5000000", [mint]: "1000000" }),
    });
    const result = await refreshVerifiedWalletBalances(provider, user);
    expect(result.pendingReconciliation).toBe(false);
    expect(user.cashRaw).toBe("5000000");
    expect(user.holdings.find((holding) => holding.instrumentId === leg.instrumentId))
      .toMatchObject({ rawAmount: "1000000", externalRaw: "0" });
    expect(preparation.status).toBe("finalized");
    expect(user.records).toHaveLength(1);
    await refreshVerifiedWalletBalances(provider, user);
    expect(user.cashRaw).toBe("5000000");
    expect(user.records).toHaveLength(1);
  });

  it("does not import a post-fill wallet snapshot while settlement is unresolved", async () => {
    const { user } = seededSubmittedPreparation();
    let balanceCalls = 0;
    const provider = chain({
      signatureStatus: async () => "not_found",
      blockHeight: async () => 50,
      simulate: async () => ({ unitsConsumed: null }),
      broadcast: async () => { throw new Error("rpc response lost"); },
      balances: async () => { balanceCalls += 1; return {}; },
    });
    const result = await refreshVerifiedWalletBalances(provider, user);
    expect(result.pendingReconciliation).toBe(true);
    expect(balanceCalls).toBe(0);
    expect(user.cashRaw).toBe("10000000");
  });

  it("persists one reconciliation error and continues to a later finalized signature", async () => {
    const first = seededSubmittedPreparation();
    const second = seededSubmittedPreparation();
    const provider = chain({
      signatureStatus: async () => "finalized",
      transactionFacts: async (signature) => {
        if (signature === first.preparation.signature) throw new Error("TRANSACTION_NOT_AVAILABLE");
        return successfulBuyFacts();
      },
    });
    const result = await reconcileOutstandingPreparations(provider);
    expect(result).toMatchObject({ checked: 2, finalized: 1, errors: 1 });
    expect(state.preparations.get(first.preparation.id)?.reconciliationFailure)
      .toMatchObject({ code: "TRANSACTION_NOT_AVAILABLE", attempts: 1 });
    expect(state.preparations.get(second.preparation.id)?.status).toBe("finalized");
    expect(state.users.get(second.user.id)?.cashRaw).toBe("5000000");
  });

  it("checks the active basket leg instead of an older finalized preparation", async () => {
    const { user, preparation, order, leg } = seededSubmittedPreparation();
    leg.status = "finalized";
    preparation.status = "finalized";
    const next = { ...leg, id: "second-leg", position: 1, status: "submitted" as const, signature: "second-signature" };
    order.legs.push(next);
    const nextPreparation = {
      ...preparation, id: "second-preparation", legId: next.id,
      status: "submitted" as const, signature: "second-signature",
    };
    state.preparations.set(nextPreparation.id, nextPreparation);
    const checked: string[] = [];
    const provider = chain({
      signatureStatus: async (signature) => { checked.push(signature); return "confirmed"; },
    });
    await expect(reconcileOrderPreparations(provider, user, order.id))
      .resolves.toMatchObject({ status: "confirmed" });
    expect(checked).toEqual(["second-signature"]);
  });
});
