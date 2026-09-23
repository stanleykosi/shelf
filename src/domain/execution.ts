import { createHash, randomUUID } from "node:crypto";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { Keypair, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { decryptText, encryptText } from "@/lib/secret-box";
import { env } from "@/lib/env";
import {
  SPONSOR_TRANSACTION_LIMIT_LAMPORTS,
  validateCompiledSponsorExposure,
} from "@/providers/solana-transaction-policy";
import {
  expireUnsignedPreparations,
  ownedOrder,
  requireFinancialAccess,
  state,
  type ExecutionPreparation,
  type UserState,
} from "./store";

export const SPONSOR_USER_DAILY_LIMIT_LAMPORTS = 20_000_000n;
export const SPONSOR_GLOBAL_DAILY_LIMIT_LAMPORTS = 100_000_000n;

const WALLET_LOCK_STATUSES = new Set<ExecutionPreparation["status"]>([
  "awaiting_signature",
  "signed",
  "submitted",
  "confirmed",
  "outcome_unknown",
]);

type NewPreparation = {
  transactionBase64: string;
  messageHash: string;
  expectedSigners: string[];
  lastValidBlockHeight: number;
};

function requireExecutionConfiguration() {
  if (
    !env.ENABLE_REAL_TRADING ||
    !env.DATA_ENCRYPTION_KEY ||
    !env.SPONSOR_PUBLIC_KEY ||
    !env.SPONSOR_SECRET_KEY
  ) {
    throw new Error("TRADE_EXECUTION_DISABLED");
  }
  return {
    encryptionKey: env.DATA_ENCRYPTION_KEY,
    sponsorPublicKey: env.SPONSOR_PUBLIC_KEY,
    sponsorSecretKey: env.SPONSOR_SECRET_KEY,
  };
}

function preparationFor(user: UserState, orderId: string, legId: string) {
  const order = ownedOrder(user, orderId);
  const leg = order.legs.find((candidate) => candidate.id === legId);
  if (!leg) throw new Error("NOT_FOUND");
  const preparation = [...state.preparations.values()].find((candidate) => {
    return candidate.userId === user.id && candidate.orderId === orderId && candidate.legId === legId;
  });
  if (!preparation) throw new Error("PREPARATION_REQUIRED");
  if (new Date(preparation.expiresAt).getTime() <= Date.now()) throw new Error("QUOTE_EXPIRED");
  return { order, leg, preparation };
}

function utcDate() {
  return new Date().toISOString().slice(0, 10);
}

function budgetUse(reservation: (typeof state.sponsorReservations)[number], date: string) {
  if (reservation.status === "released") return 0n;
  const reserved = BigInt(reservation.reservedLamports);
  if (reservation.status === "reserved") return reserved;
  if (!reservation.executionUtcDate) {
    // Unresolved work, including a finalized fee without a reliable chain
    // timestamp, continues to reserve budget across UTC midnight.
    const actual = BigInt(reservation.actualLamports ?? reservation.reservedLamports);
    return actual > reserved ? actual : reserved;
  }
  return reservation.executionUtcDate === date
    ? BigInt(reservation.actualLamports ?? reservation.reservedLamports)
    : 0n;
}

export function reserveSponsorBudget(user: UserState, preparation: ExecutionPreparation) {
  if (state.sponsorReservations.some((item) => item.preparationId === preparation.id)) {
    throw new Error("SPONSOR_RESERVATION_INVALID");
  }
  const date = utcDate();
  const globalUse = state.sponsorReservations.reduce((sum, item) => sum + budgetUse(item, date), 0n);
  const userUse = state.sponsorReservations
    .filter((item) => item.userId === user.id)
    .reduce((sum, item) => sum + budgetUse(item, date), 0n);
  if (
    SPONSOR_TRANSACTION_LIMIT_LAMPORTS > SPONSOR_USER_DAILY_LIMIT_LAMPORTS - userUse ||
    SPONSOR_TRANSACTION_LIMIT_LAMPORTS > SPONSOR_GLOBAL_DAILY_LIMIT_LAMPORTS - globalUse
  ) {
    throw new Error("SPONSOR_BUDGET_EXHAUSTED");
  }
  state.sponsorReservations.push({
    preparationId: preparation.id,
    userId: user.id,
    utcDate: date,
    reservedLamports: SPONSOR_TRANSACTION_LIMIT_LAMPORTS.toString(),
    status: "reserved",
  });
}

export function releaseSponsorReservation(preparationId: string, reason: string) {
  const reservation = state.sponsorReservations.find(
    (item) => item.preparationId === preparationId,
  );
  if (reservation?.status === "reserved") {
    reservation.status = "released";
    reservation.releaseReason = reason;
  }
}

export function settleSponsorReservation(
  preparation: ExecutionPreparation,
  sponsorDebitLamports: string,
  networkFeeLamports: string,
  blockTime: number | null,
) {
  const reservation = state.sponsorReservations.find(
    (item) => item.preparationId === preparation.id,
  );
  if (!reservation || reservation.status === "released") {
    throw new Error("SPONSOR_RESERVATION_INVALID");
  }
  const actual = BigInt(sponsorDebitLamports);
  reservation.status = "settled";
  reservation.actualLamports = actual.toString();
  reservation.networkFeeLamports = networkFeeLamports;
  const chainDate = blockTime !== null && Number.isSafeInteger(blockTime) && blockTime >= 0
    ? new Date(blockTime * 1000)
    : null;
  reservation.executionUtcDate = chainDate && Number.isFinite(chainDate.getTime())
    ? chainDate.toISOString().slice(0, 10)
    : undefined;
  preparation.sponsorDebitLamports = actual.toString();
  preparation.networkFeeLamports = networkFeeLamports;
  if (actual > BigInt(reservation.reservedLamports)) {
    state.pauses.submissions = true;
    state.audits.push({
      action: "sponsor:reservation_exceeded",
      actorId: preparation.userId,
      reference: preparation.id,
      reason: `Sponsor debit ${actual} exceeded reserved ${reservation.reservedLamports} lamports`,
      at: new Date().toISOString(),
    });
  }
}

function requireAvailableInput(user: UserState, leg: ReturnType<typeof preparationFor>["leg"]) {
  const requested = BigInt(leg.requestedInputRaw);
  if (leg.side === "buy" || !leg.instrumentId) {
    if (BigInt(user.cashRaw) < requested) throw new Error("INSUFFICIENT_USDC");
    return;
  }
  const holding = user.holdings.find((item) => item.instrumentId === leg.instrumentId);
  const available = BigInt(
    leg.inventoryScope === "external" ? (holding?.externalRaw ?? "0") : (holding?.rawAmount ?? "0"),
  );
  if (available < requested) throw new Error("INSUFFICIENT_ASSET");
}

export function storeExecutionPreparation(
  user: UserState,
  orderId: string,
  legId: string,
  input: NewPreparation,
): ExecutionPreparation | undefined {
  if (!env.DATA_ENCRYPTION_KEY) return undefined;
  const order = ownedOrder(user, orderId);
  const leg = order.legs.find((candidate) => candidate.id === legId);
  if (!leg?.quote) throw new Error("QUOTE_REQUIRED");

  for (const [id, existing] of state.preparations) {
    if (
      existing.orderId === orderId &&
      existing.legId === legId &&
      ["prepared", "cancelled", "expired", "failed"].includes(existing.status)
    ) {
      state.preparations.delete(id);
    }
  }
  const preparation: ExecutionPreparation = {
    id: randomUUID(),
    userId: user.id,
    orderId,
    legId,
    reviewDigest: leg.quote.reviewDigest,
    messageHash: input.messageHash,
    encryptedUnsignedTransaction: encryptText(input.transactionBase64, env.DATA_ENCRYPTION_KEY),
    expectedSigners: input.expectedSigners,
    expiresAt: leg.quote.expiresAt,
    lastValidBlockHeight: input.lastValidBlockHeight,
    status: "prepared",
  };
  state.preparations.set(preparation.id, preparation);
  leg.status = "prepared";
  order.version += 1;
  return preparation;
}

export function transactionForWalletSignature(
  user: UserState,
  orderId: string,
  legId: string,
  reviewDigest: string,
) {
  const configuration = requireExecutionConfiguration();
  requireFinancialAccess(user);
  expireUnsignedPreparations(user.id);
  const { order, leg, preparation } = preparationFor(user, orderId, legId);
  const firstAttempt = preparation.status === "prepared" && leg.status === "prepared";
  const signingRetry = preparation.status === "awaiting_signature" && leg.status === "awaiting_signature";
  if (!firstAttempt && !signingRetry) {
    throw new Error("PREPARATION_STATE_INVALID");
  }
  if (preparation.reviewDigest !== reviewDigest) throw new Error("REVIEW_CHANGED");
  if (state.pauses.submissions) throw new Error("SUBMISSIONS_PAUSED");
  if (leg.side === "buy" && state.pauses.buys) throw new Error("PURCHASES_PAUSED");
  if (leg.instrumentId && user.reconciliationRequiredAssets.includes(leg.instrumentId)) {
    throw new Error("RECONCILIATION_REQUIRED");
  }
  requireAvailableInput(user, leg);
  const activePreparation = [...state.preparations.values()].find((candidate) => {
    return (
      candidate.id !== preparation.id &&
      candidate.userId === user.id &&
      WALLET_LOCK_STATUSES.has(candidate.status)
    );
  });
  if (activePreparation) throw new Error("WALLET_OPERATION_IN_PROGRESS");
  if (firstAttempt) {
    preparation.status = "awaiting_signature";
    leg.status = "awaiting_signature";
    order.status = "awaiting_user";
    order.version += 1;
  }
  return {
    preparationId: preparation.id,
    reviewDigest: preparation.reviewDigest,
    lastValidBlockHeight: preparation.lastValidBlockHeight,
    transactionBase64: decryptText(
      preparation.encryptedUnsignedTransaction,
      configuration.encryptionKey,
    ),
  };
}

function sponsorKeypair(encoded: string, expectedPublicKey: string) {
  let bytes: unknown;
  try {
    bytes = JSON.parse(encoded);
  } catch {
    throw new Error("SPONSOR_SECRET_KEY_INVALID");
  }
  if (
    !Array.isArray(bytes) ||
    bytes.length !== 64 ||
    bytes.some((value) => !Number.isInteger(value) || value < 0 || value > 255)
  ) {
    throw new Error("SPONSOR_SECRET_KEY_INVALID");
  }
  const keypair = Keypair.fromSecretKey(Uint8Array.from(bytes));
  if (keypair.publicKey.toBase58() !== expectedPublicKey) {
    throw new Error("SPONSOR_KEY_MISMATCH");
  }
  return keypair;
}

export function acceptWalletSignature(
  user: UserState,
  preparationId: string,
  signedTransactionBase64: string,
) {
  const configuration = requireExecutionConfiguration();
  requireFinancialAccess(user);
  const preparation = state.preparations.get(preparationId);
  if (!preparation || preparation.userId !== user.id) throw new Error("NOT_FOUND");
  if (preparation.status !== "awaiting_signature") throw new Error("PREPARATION_STATE_INVALID");
  if (new Date(preparation.expiresAt).getTime() <= Date.now()) throw new Error("QUOTE_EXPIRED");
  if (!user.walletAddress) throw new Error("SOLANA_WALLET_UNAVAILABLE");
  const order = ownedOrder(user, preparation.orderId);
  const leg = order.legs.find((candidate) => candidate.id === preparation.legId);
  if (!leg || leg.status !== "awaiting_signature") {
    throw new Error("PREPARATION_STATE_INVALID");
  }
  if (state.pauses.submissions) throw new Error("SUBMISSIONS_PAUSED");
  if (leg.side === "buy" && state.pauses.buys) throw new Error("PURCHASES_PAUSED");
  if (leg.instrumentId && user.reconciliationRequiredAssets.includes(leg.instrumentId)) {
    throw new Error("RECONCILIATION_REQUIRED");
  }
  requireAvailableInput(user, leg);

  let transaction: VersionedTransaction;
  try {
    transaction = VersionedTransaction.deserialize(Buffer.from(signedTransactionBase64, "base64"));
  } catch {
    throw new Error("SIGNATURE_INVALID");
  }
  const messageBytes = transaction.message.serialize();
  const messageHash = createHash("sha256").update(messageBytes).digest("hex");
  if (messageHash !== preparation.messageHash) throw new Error("REVIEW_CHANGED");

  const signerKeys = transaction.message.staticAccountKeys
    .slice(0, transaction.message.header.numRequiredSignatures)
    .map((key) => key.toBase58());
  if (
    signerKeys.length !== preparation.expectedSigners.length ||
    signerKeys.some((key) => !preparation.expectedSigners.includes(key))
  ) {
    throw new Error("SIGNATURE_INVALID");
  }
  const walletIndex = signerKeys.indexOf(user.walletAddress);
  if (
    walletIndex < 0 ||
    !nacl.sign.detached.verify(
      messageBytes,
      transaction.signatures[walletIndex],
      new PublicKey(user.walletAddress).toBytes(),
    )
  ) {
    throw new Error("SIGNATURE_INVALID");
  }

  const sponsor = sponsorKeypair(
    configuration.sponsorSecretKey,
    configuration.sponsorPublicKey,
  );
  if (signerKeys[0] !== sponsor.publicKey.toBase58()) throw new Error("SPONSOR_KEY_MISMATCH");
  validateCompiledSponsorExposure(transaction, sponsor.publicKey.toBase58());
  reserveSponsorBudget(user, preparation);
  try {
    transaction.sign([sponsor]);
    const signedBytes = transaction.serialize();
    preparation.encryptedSignedTransaction = encryptText(
      Buffer.from(signedBytes).toString("base64"),
      configuration.encryptionKey,
    );
    preparation.signature = bs58.encode(transaction.signatures[0]);
  } catch (error) {
    releaseSponsorReservation(preparation.id, "sponsor_signing_failed");
    throw error;
  }
  preparation.status = "signed";
  leg.status = "signed";
  order.status = "in_progress";
  order.version += 1;
  return { preparationId, signature: preparation.signature, status: preparation.status };
}

export function signedTransactionForBroadcast(user: UserState, preparationId: string) {
  const configuration = requireExecutionConfiguration();
  const preparation = state.preparations.get(preparationId);
  if (!preparation || preparation.userId !== user.id) throw new Error("NOT_FOUND");
  if (!["signed", "submitted", "confirmed", "outcome_unknown"].includes(preparation.status)) {
    throw new Error("PREPARATION_STATE_INVALID");
  }
  if (!preparation.encryptedSignedTransaction || !preparation.signature) {
    throw new Error("PREPARATION_STATE_INVALID");
  }
  const order = ownedOrder(user, preparation.orderId);
  const leg = order.legs.find((candidate) => candidate.id === preparation.legId);
  if (!leg || !["signed", "submitted", "confirmed", "outcome_unknown"].includes(leg.status)) {
    throw new Error("PREPARATION_STATE_INVALID");
  }
  return {
    preparation,
    bytes: Buffer.from(
      decryptText(preparation.encryptedSignedTransaction, configuration.encryptionKey),
      "base64",
    ),
  };
}
