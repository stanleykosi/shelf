import { companyById } from "@/data/catalog";
import { env } from "@/lib/env";
import type { HeliusChainProvider } from "@/providers/live";
import { SOLANA_MAINNET_USDC_MINT } from "@/providers/solana-constants";
import { deserializeState, serializeState } from "./state-serialization";
import {
  releaseSponsorReservation,
  settleSponsorReservation,
  signedTransactionForBroadcast,
} from "./execution";
import {
  markLegConfirmed,
  markLegTerminal,
  ownedOrder,
  recordFinalizedLeg,
  replaceStoreState,
  state,
  type ExecutionPreparation,
  type UserState,
} from "./store";

type ChainStatus = Awaited<ReturnType<HeliusChainProvider["signatureStatus"]>>;

function preparationLeg(user: UserState, preparation: ExecutionPreparation) {
  const order = ownedOrder(user, preparation.orderId);
  const leg = order.legs.find((candidate) => candidate.id === preparation.legId);
  if (!leg) throw new Error("NOT_FOUND");
  return { order, leg };
}

function submissionPauseReason(user: UserState, preparation: ExecutionPreparation) {
  if (!preparation.broadcastAttemptedAt && (!user.invited || !user.eligible)) {
    return "ELIGIBILITY_DENIED";
  }
  if (state.pauses.submissions) return "SUBMISSIONS_PAUSED";
  if (state.pauses.buys && preparationLeg(user, preparation).leg.side === "buy") {
    return "PURCHASES_PAUSED";
  }
  return null;
}

function markOutcomeUnknown(user: UserState, preparation: ExecutionPreparation) {
  preparation.status = "outcome_unknown";
  const { order, leg } = preparationLeg(user, preparation);
  leg.status = "outcome_unknown";
  leg.signature = preparation.signature;
  order.status = "outcome_unknown";
  order.version += 1;
  return { status: preparation.status, order };
}

function expireUnseenPreparation(user: UserState, preparation: ExecutionPreparation) {
  preparation.status = "expired";
  preparation.terminalErrorCode = "BLOCKHASH_EXPIRED_UNSEEN";
  releaseSponsorReservation(preparation.id, "blockhash_expired_unseen");
  const order = markLegTerminal(
    user,
    preparation.orderId,
    preparation.legId,
    "expired",
    preparation.signature,
  );
  return { status: preparation.status, order };
}

async function applyKnownStatus(
  chain: HeliusChainProvider,
  user: UserState,
  preparation: ExecutionPreparation,
  status: Exclude<ChainStatus, "not_found">,
) {
  if (!env.FEE_USDC_TOKEN_ACCOUNT || !env.SPONSOR_PUBLIC_KEY || !preparation.signature) {
    throw new Error("RECONCILIATION_REQUIRED");
  }
  const { order, leg } = preparationLeg(user, preparation);

  if (status === "processed" || status === "pending_failure") {
    const unknown = status === "pending_failure";
    preparation.status = unknown ? "outcome_unknown" : "submitted";
    leg.status = preparation.status;
    leg.signature = preparation.signature;
    order.status = unknown ? "outcome_unknown" : "in_progress";
    order.version += 1;
    return { status: preparation.status, order };
  }

  if (status === "confirmed") {
    preparation.status = "confirmed";
    return {
      status: preparation.status,
      order: markLegConfirmed(user, order.id, leg.id, preparation.signature),
    };
  }

  const facts = await chain.transactionFacts(
    preparation.signature,
    user.walletAddress ?? "",
    env.SPONSOR_PUBLIC_KEY,
    "finalized",
  );
  if (status === "failed" && facts.succeeded) throw new Error("SETTLEMENT_MISMATCH");
  settleSponsorReservation(
    preparation,
    facts.sponsorDebitLamports,
    facts.networkFeeLamports,
    facts.blockTime,
  );

  if (status === "failed" || !facts.succeeded) {
    preparation.status = "failed";
    preparation.terminalErrorCode = "CHAIN_TRANSACTION_FAILED";
    return {
      status: preparation.status,
      order: markLegTerminal(
        user,
        order.id,
        leg.id,
        "failed",
        preparation.signature,
      ),
    };
  }

  const company = leg.companyId ? companyById(leg.companyId) : undefined;
  if (!leg.quote || !company?.instrument || !user.walletAddress) {
    throw new Error("RECONCILIATION_REQUIRED");
  }
  const isBuy = leg.side === "buy";
  const inputMint = isBuy ? SOLANA_MAINNET_USDC_MINT : company.instrument.mint;
  const outputMint = isBuy ? company.instrument.mint : SOLANA_MAINNET_USDC_MINT;
  const inputDelta = BigInt(facts.tokenDeltas[inputMint] ?? "0");
  const outputDelta = BigInt(facts.tokenDeltas[outputMint] ?? "0");
  const feeDelta = facts.accountTokenDeltas[
    `${env.FEE_USDC_TOKEN_ACCOUNT}:${SOLANA_MAINNET_USDC_MINT}`
  ];
  if (inputDelta >= 0n || outputDelta <= 0n || feeDelta === undefined) {
    throw new Error("SETTLEMENT_MISMATCH");
  }
  recordFinalizedLeg(user, order.id, leg.id, {
    reviewDigest: preparation.reviewDigest,
    signature: preparation.signature,
    actualInputRaw: (-inputDelta).toString(),
    actualOutputRaw: outputDelta.toString(),
    actualFeeRaw: feeDelta,
  });
  preparation.status = "finalized";
  return { status: preparation.status, order };
}

async function checkExpiryAfterUnseenSignature(
  chain: HeliusChainProvider,
  user: UserState,
  preparation: ExecutionPreparation,
) {
  if ((await chain.blockHeight()) <= preparation.lastValidBlockHeight) {
    return { kind: "valid" as const };
  }
  // A confirmed height can still roll back. Only a finalized height past the
  // last valid height rules out any future landing on the finalized chain.
  if ((await chain.blockHeight("finalized")) <= preparation.lastValidBlockHeight) {
    return { kind: "unresolved" as const };
  }
  // The first lookup may have raced with a landing. signatureStatus requests
  // full transaction history; lookup errors leave the preparation unresolved.
  const status = await chain.signatureStatus(preparation.signature!);
  return {
    kind: "resolved" as const,
    result: status === "not_found"
      ? expireUnseenPreparation(user, preparation)
      : await applyKnownStatus(chain, user, preparation, status),
  };
}

export async function broadcastStoredPreparation(
  chain: HeliusChainProvider,
  user: UserState,
  preparationId: string,
) {
  const { preparation, bytes } = signedTransactionForBroadcast(user, preparationId);
  const knownStatus = await chain.signatureStatus(preparation.signature!);
  if (knownStatus !== "not_found") {
    return applyKnownStatus(chain, user, preparation, knownStatus);
  }
  const expiry = await checkExpiryAfterUnseenSignature(chain, user, preparation);
  if (expiry.kind === "resolved") return expiry.result;
  if (expiry.kind === "unresolved") return markOutcomeUnknown(user, preparation);
  if (!env.ENABLE_REAL_TRADING) throw new Error("TRADE_EXECUTION_DISABLED");
  const pauseReason = submissionPauseReason(user, preparation);
  if (pauseReason) throw new Error(pauseReason);

  await chain.simulate(bytes);
  preparation.broadcastAttemptedAt = new Date().toISOString();
  let result: { signature: string };
  try {
    result = await chain.broadcast(bytes);
  } catch {
    // The RPC may have accepted the bytes before its response was lost. Keep
    // the signature and recover from history before any rebroadcast.
    return markOutcomeUnknown(user, preparation);
  }
  if (result.signature !== preparation.signature) throw new Error("SIGNATURE_CHANGED");

  preparation.status = "submitted";
  const { order, leg } = preparationLeg(user, preparation);
  if (leg.status !== "signed" && leg.status !== "submitted" && leg.status !== "outcome_unknown") {
    throw new Error("PREPARATION_STATE_INVALID");
  }
  leg.status = "submitted";
  leg.signature = result.signature;
  order.status = "in_progress";
  order.version += 1;
  return { orderId: order.id, signature: result.signature, status: preparation.status, order };
}

export async function reconcilePreparation(
  chain: HeliusChainProvider,
  user: UserState,
  preparation: ExecutionPreparation,
) {
  if (!preparation.signature) throw new Error("RECONCILIATION_REQUIRED");
  const status = await chain.signatureStatus(preparation.signature);
  if (status !== "not_found") return applyKnownStatus(chain, user, preparation, status);
  const expiry = await checkExpiryAfterUnseenSignature(chain, user, preparation);
  return expiry.kind === "resolved" ? expiry.result : markOutcomeUnknown(user, preparation);
}

export async function reconcileOutstandingPreparations(
  chain: HeliusChainProvider,
  userId?: string,
  maxItems = 2,
) {
  if (!Number.isInteger(maxItems) || maxItems < 1 || maxItems > 20) {
    throw new Error("RECONCILIATION_BATCH_INVALID");
  }
  let checked = 0;
  let finalized = 0;
  let failed = 0;
  let errors = 0;
  const pending = [...state.preparations.values()]
    .filter((item) => (!userId || item.userId === userId) &&
      ["signed", "submitted", "confirmed", "outcome_unknown"].includes(item.status));
  const candidates = pending
    .sort((left, right) =>
      (left.lastReconciliationCheckAt ?? "").localeCompare(right.lastReconciliationCheckAt ?? ""))
    .slice(0, maxItems)
    .map((item) => item.id);
  for (const id of candidates) {
    const preparation = state.preparations.get(id);
    const user = preparation && state.users.get(preparation.userId);
    if (!preparation) continue;
    checked += 1;
    const snapshot = structuredClone(serializeState(state));
    try {
      if (!user) throw new Error("RECONCILIATION_IDENTITY_MISSING");
      const submissionsBlocked = !env.ENABLE_REAL_TRADING || Boolean(submissionPauseReason(user, preparation));
      const result = submissionsBlocked
        ? await inspectWithoutBroadcast(chain, user, preparation)
        : await advancePreparation(chain, user, preparation);
      if (result.status === "finalized") finalized += 1;
      if (result.status === "failed" || result.status === "expired") failed += 1;
      preparation.lastReconciliationCheckAt = new Date().toISOString();
      delete preparation.reconciliationFailure;
    } catch (error) {
      replaceStoreState(deserializeState(snapshot));
      const restored = state.preparations.get(id);
      if (!restored) throw error;
      const code = error instanceof Error ? error.message : "RECONCILIATION_ERROR";
      const attempts = (restored.reconciliationFailure?.attempts ?? 0) + 1;
      restored.reconciliationFailure = { code, attempts, lastAt: new Date().toISOString() };
      restored.lastReconciliationCheckAt = restored.reconciliationFailure.lastAt;
      if (attempts === 1 || attempts % 3 === 0) {
        state.audits.push({
          action: "preparation:reconciliation_failed",
          actorId: state.users.has(restored.userId) ? restored.userId : undefined,
          reference: id,
          reason: `${code}; attempt ${attempts}`,
          at: new Date().toISOString(),
        });
      }
      failed += 1;
      errors += 1;
    }
  }
  return { checked, finalized, failed, errors, remaining: pending.length - finalized - (failed - errors) };
}

function advancePreparation(chain: HeliusChainProvider, user: UserState, preparation: ExecutionPreparation) {
  return preparation.status === "confirmed"
    ? reconcilePreparation(chain, user, preparation)
    : broadcastStoredPreparation(chain, user, preparation.id);
}

async function inspectWithoutBroadcast(
  chain: HeliusChainProvider,
  user: UserState,
  preparation: ExecutionPreparation,
) {
  if (!preparation.signature) throw new Error("RECONCILIATION_REQUIRED");
  const status = await chain.signatureStatus(preparation.signature);
  if (status !== "not_found") return applyKnownStatus(chain, user, preparation, status);
  const expiry = await checkExpiryAfterUnseenSignature(chain, user, preparation);
  if (expiry.kind === "resolved") return expiry.result;
  if (expiry.kind === "unresolved") return markOutcomeUnknown(user, preparation);
  return { status: preparation.status, order: ownedOrder(user, preparation.orderId) };
}

export async function reconcileOrderPreparations(chain: HeliusChainProvider, user: UserState, orderId: string) {
  const order = ownedOrder(user, orderId);
  const active = order.legs
    .filter((leg) => ["signed", "submitted", "confirmed", "outcome_unknown"].includes(leg.status))
    .sort((a, b) => a.position - b.position)[0];
  if (!active) return { status: order.status, order };
  const preparation = [...state.preparations.values()].find((candidate) =>
    candidate.userId === user.id && candidate.orderId === order.id && candidate.legId === active.id &&
    candidate.signature && ["signed", "submitted", "confirmed", "outcome_unknown"].includes(candidate.status),
  );
  if (!preparation) throw new Error("RECONCILIATION_REQUIRED");
  return !env.ENABLE_REAL_TRADING || Boolean(submissionPauseReason(user, preparation))
    ? inspectWithoutBroadcast(chain, user, preparation)
    : advancePreparation(chain, user, preparation);
}
