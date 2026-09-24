import { createHash, randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { PublicKey } from "@solana/web3.js";
import { companies, companyById, productById } from "@/data/catalog";
import { SOLANA_MAINNET_USDC_MINT } from "@/providers/solana-constants";
import { feeFor, splitBudget } from "./money";
import type {
  FinancialRecord,
  Company,
  Holding,
  Order,
  OrderLeg,
  Product,
  Quote,
  UserRole,
} from "./types";
import type { AuthenticationMethod } from "./identity";

export type AuthChallenge = {
  consumed: boolean;
  createdAt: string;
  expiresAt: string;
  purpose: string;
  userId?: string;
  authMethod?: AuthenticationMethod;
  walletAddress?: string;
};

export type AuthTokenUse = {
  challengeId: string;
  issuerDigest: string;
  usedAt: string;
  expiresAt: string;
};

export type SessionRecord = {
  userId: string;
  authMethod: AuthenticationMethod;
  expiresAt: string;
  revokedAt?: string;
};

export type FreshAuthorization = {
  userId: string;
  purpose: string;
  expiresAt: string;
};

export type UserState = {
  id: string;
  magicIssuer?: string;
  email?: string;
  walletAddress?: string;
  walletVerifiedAt?: string;
  sessionVersion: number;
  role: UserRole;
  invited: boolean;
  eligible: boolean;
  shelfName: string;
  shelfVersion: number;
  shelfProductIds: string[];
  watchCompanyIds: string[];
  cashRaw: string;
  holdings: Holding[];
  records: FinancialRecord[];
  reconciliationRequiredAssets: string[];
};

export type Share = {
  id: string;
  userId: string;
  tokenHash: string;
  productIds: string[];
  companyIds: string[];
  expiresAt: string;
  revoked: boolean;
};

export type CreatedShare = {
  id: string;
  token: string;
  expiresAt: string;
};

type AcquisitionLot = {
  userId: string;
  instrumentId: string;
  remainingRaw: string;
  costRemainingUsdcRaw: string;
};

export type AllocationDraft = {
  id: string;
  userId: string;
  budgetUsdcRaw: string;
  allocations: Array<{ companyId: string; amountUsdcRaw: string }>;
  warnings: string[];
  status: "draft";
  expiresAt: string;
};

export type ConsentRecord = {
  id: string;
  userId: string;
  scope: "ai_processing" | "shelf_context" | "terms";
  version: string;
  accepted: boolean;
  recordedAt: string;
};

export type CatalogReport = {
  id: string;
  productId: string | null;
  relationshipId: string | null;
  reasonCode: string;
  safeNote: string;
  status: "open" | "approved" | "rejected";
  reviewedAt?: string;
  reviewedBy?: string;
  reviewReason?: string;
};

type AuditEvent = {
  action: string;
  at: string;
  actorId?: string;
  reason?: string;
  scope?: keyof StoreState["pauses"];
  enabled?: boolean;
  reference?: string;
  retained?: string[];
};

export type StoreState = {
  issuerCompanies: Map<string, Company>;
  users: Map<string, UserState>;
  orders: Map<string, Order>;
  intents: Map<string, string>;
  intentHashes: Map<string, string>;
  shares: Map<string, Share>;
  authChallenges: Map<string, AuthChallenge>;
  authTokenUses: Map<string, AuthTokenUse>;
  sessions: Map<string, SessionRecord>;
  freshAuthorizations: Map<string, FreshAuthorization>;
  allocationDrafts: Map<string, AllocationDraft>;
  preparations: Map<string, ExecutionPreparation>;
  sponsorReservations: SponsorReservation[];
  consents: ConsentRecord[];
  catalogReports: CatalogReport[];
  invites: Array<{
    id: string;
    email: string;
    status: "active" | "revoked";
    createdAt: string;
  }>;
  lots: AcquisitionLot[];
  retainedFinancialRecords: Array<{
    deletionReference: string;
    records: FinancialRecord[];
    retainedAt: string;
  }>;
  pauses: { buys: boolean; submissions: boolean; suggestions: boolean };
  audits: AuditEvent[];
  aiUsage: Array<{ id?: string; at: string; costMicrousd: number; subjectHash?: string }>;
};

export type ExecutionPreparation = {
  id: string;
  userId: string;
  orderId: string;
  legId: string;
  reviewDigest: string;
  messageHash: string;
  encryptedUnsignedTransaction: string;
  encryptedSignedTransaction?: string;
  expectedSigners: string[];
  expiresAt: string;
  lastValidBlockHeight: number;
  status:
    | "prepared"
    | "awaiting_signature"
    | "signed"
    | "submitted"
    | "confirmed"
    | "outcome_unknown"
    | "finalized"
    | "failed"
    | "cancelled"
    | "expired";
  signature?: string;
  broadcastAttemptedAt?: string;
  networkFeeLamports?: string;
  sponsorDebitLamports?: string;
  terminalErrorCode?: string;
  lastReconciliationCheckAt?: string;
  reconciliationFailure?: { code: string; attempts: number; lastAt: string };
};

export type SponsorReservation = {
  preparationId: string;
  userId: string;
  utcDate: string;
  reservedLamports: string;
  status: "reserved" | "settled" | "released";
  actualLamports?: string;
  networkFeeLamports?: string;
  executionUtcDate?: string;
  releaseReason?: string;
};

const initialState: StoreState = {
  issuerCompanies: new Map(),
  users: new Map(),
  orders: new Map(),
  intents: new Map(),
  intentHashes: new Map(),
  shares: new Map(),
  authChallenges: new Map(),
  authTokenUses: new Map(),
  sessions: new Map(),
  freshAuthorizations: new Map(),
  allocationDrafts: new Map(),
  preparations: new Map(),
  sponsorReservations: [],
  consents: [],
  catalogReports: [],
  invites: [],
  lots: [],
  retainedFinancialRecords: [],
  pauses: { buys: false, submissions: false, suggestions: false },
  audits: [],
  aiUsage: [],
};

const globalStore = globalThis as typeof globalThis & { __shelfStore?: StoreState };
export const state = globalStore.__shelfStore ?? initialState;
globalStore.__shelfStore = state;

export function findCompany(companyId: string): Company | undefined {
  return state.issuerCompanies.get(companyId) ?? companyById(companyId);
}

export function replaceStoreState(nextState: StoreState): void {
  Object.assign(state, nextState);
}

export function reviewCatalogReport(
  reportId: string,
  decision: "approved" | "rejected",
  reviewerId: string,
  reason: string,
): CatalogReport {
  const report = state.catalogReports.find((candidate) => candidate.id === reportId);
  if (!report) throw new Error("NOT_FOUND");
  if (report.status !== "open") throw new Error("REVIEW_ALREADY_COMPLETED");

  const reviewedAt = new Date().toISOString();
  report.status = decision;
  report.reviewedAt = reviewedAt;
  report.reviewedBy = reviewerId;
  report.reviewReason = reason;
  state.audits.push({
    action: `catalog_report:${decision}`,
    actorId: reviewerId,
    reference: report.id,
    reason,
    at: reviewedAt,
  });
  return report;
}

export function revokeInvite(inviteId: string) {
  const invite = state.invites.find((candidate) => candidate.id === inviteId);
  if (!invite) throw new Error("NOT_FOUND");
  invite.status = "revoked";
  for (const member of state.users.values()) {
    if (member.email?.toLowerCase() === invite.email) member.invited = false;
  }
  return { status: invite.status, inviteId };
}

export function consumeMagicDidToken(
  token: string,
  challengeId: string,
  identity: { issuer: string; expiresAt: string },
) {
  const now = new Date();
  for (const [existingDigest, use] of state.authTokenUses) {
    if (new Date(use.expiresAt) <= now) state.authTokenUses.delete(existingDigest);
  }
  const digest = createHash("sha256").update(token).digest("hex");
  if (state.authTokenUses.has(digest)) throw new Error("AUTH_REPLAYED");
  state.authTokenUses.set(digest, {
    challengeId,
    issuerDigest: createHash("sha256").update(identity.issuer).digest("hex"),
    usedAt: now.toISOString(),
    expiresAt: identity.expiresAt,
  });
}

export function deleteAccountData(user: UserState) {
  const unresolved = [...state.preparations.values()].some((preparation) =>
    preparation.userId === user.id &&
    ["signed", "submitted", "confirmed", "outcome_unknown"].includes(preparation.status),
  );
  if (unresolved) throw new Error("PENDING_FINANCIAL_OPERATION");
  const deletionReference = createHash("sha256").update(`${user.id}:${randomUUID()}`).digest("hex");
  if (user.records.length > 0) {
    state.retainedFinancialRecords.push({
      deletionReference,
      records: structuredClone(user.records),
      retainedAt: new Date().toISOString(),
    });
  }
  for (const [shareId, share] of state.shares) {
    if (share.userId === user.id) state.shares.delete(shareId);
  }
  for (const [id, draft] of state.allocationDrafts) {
    if (draft.userId === user.id) state.allocationDrafts.delete(id);
  }
  state.consents = state.consents.filter((consent) => consent.userId !== user.id);
  state.lots = state.lots.filter((lot) => lot.userId !== user.id);
  for (const [id, preparation] of state.preparations) {
    if (preparation.userId === user.id) state.preparations.delete(id);
  }
  for (const reservation of state.sponsorReservations) {
    if (reservation.userId === user.id) reservation.userId = deletionReference;
  }
  for (const [orderId, order] of state.orders) {
    if (order.userId === user.id) state.orders.delete(orderId);
  }
  for (const [intentKey, orderId] of state.intents) {
    if (!state.orders.has(orderId)) {
      state.intents.delete(intentKey);
      state.intentHashes.delete(intentKey);
    }
  }
  for (const [sessionId, session] of state.sessions) {
    if (session.userId === user.id) state.sessions.delete(sessionId);
  }
  for (const [challengeId, challenge] of state.authChallenges) {
    if (challenge.userId === user.id) state.authChallenges.delete(challengeId);
  }
  state.freshAuthorizations.forEach((authorization, tokenHash) => {
    if (authorization.userId === user.id) state.freshAuthorizations.delete(tokenHash);
  });
  state.invites = state.invites.filter((invite) => invite.email !== user.email?.toLowerCase());
  for (const audit of state.audits) {
    if (audit.actorId === user.id) {
      audit.actorId = undefined;
      audit.reference ??= deletionReference;
    }
  }
  state.users.delete(user.id);
  state.audits.push({
    action: "account_deleted",
    reference: deletionReference,
    retained: ["financial_records_without_account_identity", "audit_events"],
    at: new Date().toISOString(),
  });
  return deletionReference;
}

export function userForMagicIdentity(identity: {
  issuer: string;
  email?: string;
  walletAddress: string;
  walletVerifiedAt?: string;
  ownerIssuer?: string;
}): UserState {
  const existing = [...state.users.values()].find(
    (candidate) => candidate.magicIssuer === identity.issuer,
  );
  if (existing) {
    if (existing.walletAddress && existing.walletAddress !== identity.walletAddress) {
      existing.eligible = false;
      state.audits.push({
        action: "wallet:binding_mismatch",
        actorId: existing.id,
        at: new Date().toISOString(),
        reason: "Magic returned a different authoritative Solana wallet",
      });
      throw new Error("WALLET_BINDING_MISMATCH");
    }
    existing.email = identity.email;
    existing.walletAddress = identity.walletAddress;
    if (identity.walletVerifiedAt) {
      existing.walletVerifiedAt = identity.walletVerifiedAt;
    }
    existing.role = identity.ownerIssuer === identity.issuer ? "owner" : "member";
    return existing;
  }

  const id = `user-${createHash("sha256").update(identity.issuer).digest("hex").slice(0, 24)}`;
  const user: UserState = {
    id,
    magicIssuer: identity.issuer,
    email: identity.email,
    walletAddress: identity.walletAddress,
    walletVerifiedAt: identity.walletVerifiedAt,
    sessionVersion: 0,
    role: identity.ownerIssuer === identity.issuer ? "owner" : "member",
    invited: false,
    eligible: false,
    shelfName: "My shelf",
    shelfVersion: 1,
    shelfProductIds: [],
    watchCompanyIds: [],
    cashRaw: "0",
    holdings: [],
    records: [],
    reconciliationRequiredAssets: [],
  };
  state.users.set(id, user);
  return user;
}

export function shelfView(user: UserState) {
  const items = user.shelfProductIds
    .map(productById)
    .filter((product): product is Product => Boolean(product));
  const groups = companies
    .map((company) => ({
      company,
      products: items.filter((item) => item.companyId === company.id),
    }))
    .filter((group) => group.products.length > 0);

  return { name: user.shelfName, version: user.shelfVersion, items, groups };
}

export function updateShelf(
  user: UserState,
  requestedProductIds: string[],
  expectedVersion?: number,
) {
  if (expectedVersion && expectedVersion !== user.shelfVersion) {
    throw new Error("VERSION_CONFLICT");
  }

  user.shelfProductIds = [...new Set(requestedProductIds)]
    .filter((productId) => Boolean(productById(productId)))
    .slice(0, 100);
  user.shelfVersion += 1;
  return shelfView(user);
}

export function watchlistView(user: UserState) {
  return user.watchCompanyIds.map(findCompany).filter(Boolean);
}

export function updateWatchlist(user: UserState, companyId: string, watched: boolean) {
  const company = findCompany(companyId);
  if (!company?.instrument) throw new Error("ASSET_UNSUPPORTED");
  user.watchCompanyIds = watched
    ? [...new Set([...user.watchCompanyIds, companyId])].slice(0, 50)
    : user.watchCompanyIds.filter((id) => id !== companyId);
  return watchlistView(user);
}

function existingOrder(user: UserState, clientIntentId: string): Order | undefined {
  const orderId = state.intents.get(`${user.id}:${clientIntentId}`);
  return orderId ? state.orders.get(orderId) : undefined;
}

const createOrderSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("buy"),
    clientIntentId: z.string().optional(),
    companyId: z.string(),
    amountUsdcRaw: z.string(),
    slippageBps: z.number().optional(),
  }),
  z.object({
    type: z.literal("basket"),
    clientIntentId: z.string().optional(),
    budgetUsdcRaw: z.string(),
    allocations: z.array(z.object({ companyId: z.string(), amountUsdcRaw: z.string() })),
    slippageBps: z.number().optional(),
  }),
  z.object({
    type: z.literal("sell"),
    clientIntentId: z.string().optional(),
    instrumentId: z.string(),
    amountRaw: z.string().optional(),
    sellAll: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("transfer"),
    clientIntentId: z.string().optional(),
    assetId: z.string(),
    inventoryScope: z.enum(["cash", "tracked", "external"]),
    recipientAddress: z.string(),
    amountRaw: z.string().optional(),
    sendMax: z.boolean().optional(),
  }),
]);

type CreateOrderInput = z.infer<typeof createOrderSchema>;
type BasketOrderInput = Extract<CreateOrderInput, { type: "basket" }>;
type SellOrderInput = Extract<CreateOrderInput, { type: "sell" }>;
type TransferOrderInput = Extract<CreateOrderInput, { type: "transfer" }>;

function requestHash(body: CreateOrderInput): string {
  return createHash("sha256").update(JSON.stringify(body)).digest("hex");
}

function buyLeg(companyId: string, amountRaw: string, position = 0): OrderLeg {
  const company = findCompany(companyId);
  if (!company?.instrument) throw new Error("ASSET_UNSUPPORTED");
  if (!company.instrument.capabilities.buy) throw new Error("ISSUER_INSTRUMENT_UNAVAILABLE");

  return {
    id: randomUUID(),
    position,
    side: "buy",
    companyId,
    instrumentId: company.instrument.id,
    inventoryScope: "cash",
    requestedInputRaw: amountRaw,
    status: "draft",
  };
}

function basketLegs(body: BasketOrderInput): OrderLeg[] {
  const allocations = body.allocations;
  if (allocations.length === 0 || allocations.length > 5) {
    throw new Error("INVALID_ALLOCATION");
  }

  const uniqueCompanies = new Set(allocations.map(({ companyId }) => companyId));
  if (uniqueCompanies.size !== allocations.length) {
    throw new Error("DUPLICATE_COMPANY");
  }

  return allocations.map(({ companyId, amountUsdcRaw }, position) => {
    return buyLeg(companyId, amountUsdcRaw, position);
  });
}

function sellLeg(user: UserState, body: SellOrderInput): OrderLeg {
  const instrumentId = body.instrumentId;
  if (user.reconciliationRequiredAssets.includes(instrumentId)) {
    throw new Error("RECONCILIATION_REQUIRED");
  }
  const holding = user.holdings.find((item) => item.instrumentId === instrumentId);
  if (!holding) throw new Error("INSUFFICIENT_ASSET");

  return {
    id: randomUUID(),
    position: 0,
    side: "sell",
    companyId: holding.companyId,
    instrumentId,
    inventoryScope: "tracked",
    requestedInputRaw: body.sellAll ? holding.rawAmount : (body.amountRaw ?? ""),
    status: "draft",
  };
}

function transferLeg(user: UserState, body: TransferOrderInput): OrderLeg {
  const assetId = body.assetId;
  if (assetId !== "usdc" && user.reconciliationRequiredAssets.includes(assetId)) {
    throw new Error("RECONCILIATION_REQUIRED");
  }
  const recipientAddress = body.recipientAddress;
  validateTransferDestinationAddress(user, recipientAddress);
  return {
    id: randomUUID(),
    position: 0,
    side: "transfer",
    instrumentId: assetId === "usdc" ? undefined : assetId,
    inventoryScope: body.inventoryScope,
    requestedInputRaw: body.amountRaw ?? user.cashRaw,
    recipientAddress,
    status: "draft",
  };
}

export function validateTransferDestinationAddress(
  user: Pick<UserState, "walletAddress">,
  recipientAddress: string,
): PublicKey {
  let recipient: PublicKey;
  try {
    recipient = new PublicKey(recipientAddress);
  } catch {
    throw new Error("RECIPIENT_INVALID");
  }
  if (!PublicKey.isOnCurve(recipient.toBytes())) throw new Error("RECIPIENT_INVALID");
  if (recipient.toBase58() === user.walletAddress) throw new Error("RECIPIENT_SELF");
  const forbiddenMints = new Set([
    SOLANA_MAINNET_USDC_MINT,
    ...companies.flatMap((company) => company.instrument?.mint ?? []),
    ...[...state.issuerCompanies.values()].flatMap((company) => company.instrument?.mint ?? []),
  ]);
  if (forbiddenMints.has(recipient.toBase58())) throw new Error("RECIPIENT_ACCOUNT_UNSAFE");
  return recipient;
}

export function reconcileInstrumentBalance(
  user: UserState,
  instrumentId: string,
  totalRaw: string,
): void {
  reconcileMintBalance(user, [instrumentId], totalRaw);
}

export function reconcileMintBalance(
  user: UserState,
  instrumentIds: string[],
  totalRaw: string,
): void {
  const ids = new Set(instrumentIds);
  const holdings = user.holdings.filter((holding) => ids.has(holding.instrumentId));
  const total = BigInt(totalRaw);
  const tracked = holdings.reduce(
    (sum, holding) => sum + BigInt(holding.rawAmount) + BigInt(holding.reservedRaw),
    0n,
  );
  if (total < tracked) {
    for (const holding of holdings) {
      const instrumentId = holding.instrumentId;
      if (!user.reconciliationRequiredAssets.includes(instrumentId)) {
        user.reconciliationRequiredAssets.push(instrumentId);
        state.audits.push({
          action: "wallet:reconciliation_required",
          actorId: user.id,
          reference: instrumentId,
          reason: `Finalized shared-mint balance ${total} is below combined tracked and reserved inventory ${tracked}`,
          at: new Date().toISOString(),
        });
      }
      holding.externalRaw = "0";
    }
    return;
  }

  user.reconciliationRequiredAssets = user.reconciliationRequiredAssets.filter(
    (assetId) => !ids.has(assetId),
  );
  for (const holding of holdings) holding.externalRaw = "0";
  if (holdings[0]) holdings[0].externalRaw = (total - tracked).toString();
}

function orderLegs(
  user: UserState,
  body: CreateOrderInput,
): OrderLeg[] {
  switch (body.type) {
    case "buy":
      return [buyLeg(body.companyId, body.amountUsdcRaw)];
    case "basket":
      return basketLegs(body);
    case "sell":
      return [sellLeg(user, body)];
    case "transfer":
      return [transferLeg(user, body)];
    default:
      throw new Error("INVALID_ORDER_TYPE");
  }
}

function validateAmounts(type: Order["type"], legs: OrderLeg[]): void {
  const invalidAmount = legs.some((leg) => {
    return !/^\d+$/.test(leg.requestedInputRaw) || BigInt(leg.requestedInputRaw) <= 0n;
  });
  if (invalidAmount) throw new Error("INVALID_AMOUNT");

  if (type !== "buy" && type !== "basket") return;

  const total = legs.reduce((sum, leg) => sum + BigInt(leg.requestedInputRaw), 0n);
  const hasSmallLeg = legs.some((leg) => BigInt(leg.requestedInputRaw) < 5_000_000n);
  if (total > 100_000_000n || hasSmallLeg) throw new Error("ORDER_LIMIT");
}

export function createOrder(user: UserState, unvalidatedBody: unknown): Order {
  const parsedBody = createOrderSchema.safeParse(unvalidatedBody);
  if (!parsedBody.success) throw new Error("INVALID_INPUT");
  const body = parsedBody.data;
  if (
    body.type === "sell" &&
    ((body.sellAll === true) === (body.amountRaw !== undefined))
  ) {
    throw new Error("INVALID_INPUT");
  }
  if (
    body.type === "transfer" &&
    ((body.sendMax === true) === (body.amountRaw !== undefined))
  ) {
    throw new Error("INVALID_INPUT");
  }
  const type = body.type;
  const clientIntentId = body.clientIntentId ?? randomUUID();
  const previous = existingOrder(user, clientIntentId);
  const intentKey = `${user.id}:${clientIntentId}`;
  const hash = requestHash(body);
  if (previous) {
    if (state.intentHashes.get(intentKey) !== hash) throw new Error("IDEMPOTENCY_CONFLICT");
    return previous;
  }

  requireFinancialAccess(user);
  if ((type === "buy" || type === "basket") && state.pauses.buys) {
    throw new Error("PURCHASES_PAUSED");
  }

  const legs = orderLegs(user, body);
  validateAmounts(type, legs);
  if (type === "basket") {
    const total = legs.reduce((sum, leg) => sum + BigInt(leg.requestedInputRaw), 0n);
    if (total !== BigInt(body.budgetUsdcRaw)) throw new Error("INVALID_ALLOCATION");
  }

  const order: Order = {
    id: randomUUID(),
    userId: user.id,
    clientIntentId,
    type,
    status: "draft",
    version: 1,
    budgetUsdcRaw: type === "basket" ? body.budgetUsdcRaw : undefined,
    legs,
    createdAt: new Date().toISOString(),
  };
  state.orders.set(order.id, order);
  state.intents.set(intentKey, order.id);
  state.intentHashes.set(intentKey, hash);
  return order;
}

export function ownedOrder(user: UserState, orderId: string): Order {
  const order = state.orders.get(orderId);
  if (!order || order.userId !== user.id) throw new Error("NOT_FOUND");
  return order;
}

export function requireFinancialAccess(user: UserState): void {
  if (!user.invited || !user.eligible) throw new Error("ELIGIBILITY_DENIED");
}

export function expireUnsignedPreparations(userId: string, now = Date.now()): void {
  for (const preparation of state.preparations.values()) {
    if (
      preparation.userId !== userId ||
      !["prepared", "awaiting_signature"].includes(preparation.status) ||
      preparation.signature || preparation.encryptedSignedTransaction ||
      !Number.isFinite(Date.parse(preparation.expiresAt)) ||
      Date.parse(preparation.expiresAt) > now
    ) continue;

    const previousStatus = preparation.status;
    preparation.status = "expired";
    const order = state.orders.get(preparation.orderId);
    const leg = order?.legs.find((candidate) => candidate.id === preparation.legId);
    if (order?.userId === userId && order.status !== "stopped" && leg?.status === previousStatus) {
      leg.status = "draft";
      order.status = "awaiting_user";
      order.version += 1;
    }
  }
}

function quoteableLeg(user: UserState, orderId: string, legId: string) {
  const order = ownedOrder(user, orderId);
  expireUnsignedPreparations(user.id);
  const leg = order.legs.find((item) => item.id === legId);
  if (!leg) throw new Error("NOT_FOUND");
  if (order.status === "stopped") throw new Error("LEG_NOT_QUOTEABLE");
  const latestPreparation = [...state.preparations.values()].reverse().find((preparation) =>
    preparation.userId === user.id && preparation.orderId === orderId && preparation.legId === legId,
  );
  const retryableFailure = ["failed", "expired"].includes(leg.status) &&
    Boolean(latestPreparation?.signature) &&
    ((latestPreparation?.status === "failed" && latestPreparation.terminalErrorCode === "CHAIN_TRANSACTION_FAILED") ||
      (latestPreparation?.status === "expired" && latestPreparation.terminalErrorCode === "BLOCKHASH_EXPIRED_UNSEEN"));
  if (leg.status !== "draft" && leg.status !== "quoted" && !retryableFailure) {
    throw new Error("LEG_NOT_QUOTEABLE");
  }

  const previousLegIsUnresolved = order.legs.some((item) => {
    return item.position < leg.position && item.status !== "finalized";
  });
  if (previousLegIsUnresolved) throw new Error("PREVIOUS_LEG_UNRESOLVED");

  return { order, leg };
}

function saveQuote(order: Order, leg: OrderLeg, quote: Quote) {
  leg.quote = quote;
  leg.status = "quoted";
  order.status = "awaiting_user";
  order.version += 1;
  return quote;
}

export function quoteLegFromJupiter(
  user: UserState,
  orderId: string,
  legId: string,
  input: {
    outputRaw: string;
    minOutputRaw: string;
    priceImpactBps: number;
    routeDigest: string;
    routeLabels: string[];
    transactionMessageHash: string;
    feeBps: number;
  },
): Quote {
  if (!Number.isFinite(input.priceImpactBps) || input.priceImpactBps < 0 || input.priceImpactBps > 100) {
    throw new Error("PRICE_IMPACT_EXCEEDED");
  }
  const { order, leg } = quoteableLeg(user, orderId, legId);
  if (leg.side === "transfer") throw new Error("ASSET_UNSUPPORTED");

  const feeBps = input.feeBps;
  const output = BigInt(input.outputRaw);
  const fee =
    leg.side === "buy"
      ? feeFor(BigInt(leg.requestedInputRaw), feeBps)
      : (output * BigInt(feeBps)) / BigInt(10_000 - feeBps);
  const reviewText = [
    leg.id,
    leg.requestedInputRaw,
    input.outputRaw,
    input.minOutputRaw,
    fee.toString(),
    input.routeDigest,
    input.transactionMessageHash,
  ].join(":");
  const quote: Quote = {
    id: randomUUID(),
    version: (leg.quote?.version ?? 0) + 1,
    inputRaw: leg.requestedInputRaw,
    estimatedOutputRaw: input.outputRaw,
    minimumOutputRaw: input.minOutputRaw,
    feeRaw: fee.toString(),
    feeBps,
    slippageBps: 50,
    priceImpactBps: input.priceImpactBps,
    expiresAt: new Date(Date.now() + 20_000).toISOString(),
    reviewDigest: createHash("sha256").update(reviewText).digest("hex"),
    routeLabel: `Jupiter${input.routeLabels.length ? ` · ${input.routeLabels.join(" + ")}` : ""}`,
    estimatedLamports: "sponsored at activation",
    source: "jupiter",
    executionAvailable: false,
    executionBlockReason: "SPONSOR_ACTIVATION_PENDING",
    transactionMessageHash: input.transactionMessageHash,
  };

  return saveQuote(order, leg, quote);
}

function recordBuy(user: UserState, leg: OrderLeg, input: FinalizedLegInput): void {
  const spend = BigInt(input.actualInputRaw);
  const received = BigInt(input.actualOutputRaw);
  if (BigInt(user.cashRaw) < spend) throw new Error("INSUFFICIENT_USDC");
  user.cashRaw = (BigInt(user.cashRaw) - spend).toString();
  state.lots.push({
    userId: user.id,
    instrumentId: leg.instrumentId!,
    remainingRaw: received.toString(),
    costRemainingUsdcRaw: spend.toString(),
  });

  const holding = user.holdings.find((item) => item.instrumentId === leg.instrumentId);
  if (holding) {
    holding.rawAmount = (
      BigInt(holding.rawAmount) + received
    ).toString();
    holding.totalCostUsdcRaw = (BigInt(holding.totalCostUsdcRaw) + spend).toString();
    return;
  }

  const company = findCompany(leg.companyId!);
  user.holdings.push({
    instrumentId: leg.instrumentId!,
    companyId: leg.companyId!,
    symbol: company!.instrument!.symbol,
    rawAmount: received.toString(),
    reservedRaw: "0",
    externalRaw: "0",
    decimals: company!.instrument!.decimals,
    multiplier: "1",
    totalCostUsdcRaw: spend.toString(),
  });
}

function disposeTrackedLots(user: UserState, instrumentId: string, rawAmount: bigint): bigint {
  const lots = state.lots.filter((lot) => {
    return (
      lot.userId === user.id && lot.instrumentId === instrumentId && BigInt(lot.remainingRaw) > 0n
    );
  });
  const available = lots.reduce((sum, lot) => sum + BigInt(lot.remainingRaw), 0n);
  if (available < rawAmount) throw new Error("RECONCILIATION_REQUIRED");

  let remaining = rawAmount;
  let attributedCost = 0n;
  for (const lot of lots) {
    if (remaining === 0n) break;
    const lotRaw = BigInt(lot.remainingRaw);
    const disposed = remaining < lotRaw ? remaining : lotRaw;
    const lotCost = BigInt(lot.costRemainingUsdcRaw);
    const cost = disposed === lotRaw ? lotCost : (lotCost * disposed) / lotRaw;
    lot.remainingRaw = (lotRaw - disposed).toString();
    lot.costRemainingUsdcRaw = (lotCost - cost).toString();
    remaining -= disposed;
    attributedCost += cost;
  }
  if (remaining > 0n) throw new Error("RECONCILIATION_REQUIRED");
  return attributedCost;
}

function recordSell(user: UserState, leg: OrderLeg, input: FinalizedLegInput): void {
  const holding = user.holdings.find((item) => item.instrumentId === leg.instrumentId);
  const amount = BigInt(input.actualInputRaw);
  if (!holding || BigInt(holding.rawAmount) < amount) throw new Error("INSUFFICIENT_ASSET");

  const attributedCost = disposeTrackedLots(user, holding.instrumentId, amount);
  holding.rawAmount = (BigInt(holding.rawAmount) - amount).toString();
  if (attributedCost > 0n) {
    holding.totalCostUsdcRaw = (BigInt(holding.totalCostUsdcRaw) - attributedCost).toString();
  }
  user.cashRaw = (BigInt(user.cashRaw) + BigInt(input.actualOutputRaw)).toString();
}

function recordTransfer(user: UserState, leg: OrderLeg): void {
  const amount = BigInt(leg.requestedInputRaw);
  if (!leg.instrumentId) {
    if (BigInt(user.cashRaw) < amount) throw new Error("INSUFFICIENT_USDC");
    user.cashRaw = (BigInt(user.cashRaw) - amount).toString();
    return;
  }

  const holding = user.holdings.find((item) => item.instrumentId === leg.instrumentId);
  if (!holding) throw new Error("INSUFFICIENT_ASSET");
  const field = leg.inventoryScope === "external" ? "externalRaw" : "rawAmount";
  const available = BigInt(holding[field]);
  if (available < amount) throw new Error("INSUFFICIENT_ASSET");
  if (field === "rawAmount") {
    const attributedCost = disposeTrackedLots(user, holding.instrumentId, amount);
    if (attributedCost > 0n) {
      holding.totalCostUsdcRaw = (BigInt(holding.totalCostUsdcRaw) - attributedCost).toString();
    }
  }
  holding[field] = (available - amount).toString();
}

function addRecord(user: UserState, leg: OrderLeg, input: FinalizedLegInput): void {
  const usdcRaw =
    leg.side === "buy"
      ? `-${input.actualInputRaw}`
      : leg.side === "sell"
        ? input.actualOutputRaw
        : "0";

  const record: FinancialRecord = {
    id: randomUUID(),
    type: leg.side,
    status: "finalized",
    recordedAt: new Date().toISOString(),
    asset: leg.instrumentId ?? "USDC",
    rawAmount: leg.side === "buy" ? input.actualOutputRaw : input.actualInputRaw,
    usdcRaw,
    feeRaw: input.actualFeeRaw,
    signature: leg.signature,
    multiplier: "1",
  };
  user.records.unshift(record);
}

type FinalizedLegInput = {
  reviewDigest: string;
  signature: string;
  actualInputRaw: string;
  actualOutputRaw: string;
  actualFeeRaw: string;
};

export function recordFinalizedLeg(
  user: UserState,
  orderId: string,
  legId: string,
  input: FinalizedLegInput,
): Order {
  const order = ownedOrder(user, orderId);
  const leg = order.legs.find((item) => item.id === legId);
  if (!leg?.quote) throw new Error("QUOTE_REQUIRED");
  if (leg.status === "finalized") return order;
  if (leg.quote.reviewDigest !== input.reviewDigest) throw new Error("REVIEW_CHANGED");
  if (!input.signature.trim()) throw new Error("SIGNATURE_INVALID");
  if (input.actualInputRaw !== leg.requestedInputRaw) throw new Error("SETTLEMENT_MISMATCH");
  if (BigInt(input.actualOutputRaw) < BigInt(leg.quote.minimumOutputRaw)) {
    throw new Error("SETTLEMENT_MISMATCH");
  }
  const actualFee = BigInt(input.actualFeeRaw);
  const feeBasis = leg.side === "sell"
    ? BigInt(input.actualOutputRaw) + actualFee
    : BigInt(input.actualInputRaw);
  if (actualFee < 0n || actualFee !== feeFor(feeBasis, leg.quote.feeBps)) {
    throw new Error("SETTLEMENT_MISMATCH");
  }

  if (leg.side === "buy") recordBuy(user, leg, input);
  if (leg.side === "sell") recordSell(user, leg, input);
  if (leg.side === "transfer") recordTransfer(user, leg);

  leg.status = "finalized";
  leg.signature = input.signature;
  addRecord(user, leg, input);

  const allFinalized = order.legs.every((item) => item.status === "finalized");
  order.status = allFinalized ? "complete" : "partially_complete";
  order.version += 1;
  return order;
}

export function markLegConfirmed(
  user: UserState,
  orderId: string,
  legId: string,
  signature: string,
): Order {
  const order = ownedOrder(user, orderId);
  const leg = order.legs.find((item) => item.id === legId);
  if (!leg || !["signed", "submitted", "confirmed", "outcome_unknown"].includes(leg.status)) {
    throw new Error("PREPARATION_STATE_INVALID");
  }
  leg.status = "confirmed";
  leg.signature = signature;
  order.status = "in_progress";
  order.version += 1;
  return order;
}

export function markLegTerminal(
  user: UserState,
  orderId: string,
  legId: string,
  status: "failed" | "expired",
  signature?: string,
): Order {
  const order = ownedOrder(user, orderId);
  const leg = order.legs.find((item) => item.id === legId);
  if (!leg) throw new Error("NOT_FOUND");
  if (leg.status === "finalized") return order;
  leg.status = status;
  if (signature) leg.signature = signature;

  const finalized = order.legs.filter((item) => item.status === "finalized").length;
  const terminal = order.legs.every((item) =>
    ["finalized", "failed", "expired", "cancelled"].includes(item.status),
  );
  order.status = finalized > 0 && terminal ? "partially_complete" : "failed";
  order.version += 1;
  return order;
}

export function stopOrder(user: UserState, orderId: string): Order {
  const order = ownedOrder(user, orderId);
  order.legs.forEach((leg) => {
    if (["draft", "quoted", "prepared", "awaiting_signature"].includes(leg.status)) {
      leg.status = "cancelled";
      for (const preparation of state.preparations.values()) {
        if (
          preparation.orderId === order.id &&
          preparation.legId === leg.id &&
          ["prepared", "awaiting_signature"].includes(preparation.status)
        ) {
          preparation.status = "cancelled";
          const reservation = state.sponsorReservations.find(
            (item) => item.preparationId === preparation.id && item.status === "reserved",
          );
          if (reservation) {
            reservation.status = "released";
            reservation.releaseReason = "order_stopped_before_submission";
          }
        }
      }
    }
  });
  order.status = order.legs.some((leg) =>
    ["signed", "submitted", "confirmed", "outcome_unknown"].includes(leg.status))
    ? "outcome_unknown"
    : "stopped";
  order.version += 1;
  return order;
}

export function equalAllocations(totalRaw: string, companyIds: string[]) {
  return [...splitBudget(BigInt(totalRaw), companyIds)].map(([companyId, amount]) => ({
    companyId,
    amountUsdcRaw: amount.toString(),
  }));
}

export function createShare(
  user: UserState,
  requestedProductIds: string[],
  requestedCompanyIds: string[] = [],
): CreatedShare {
  const token = randomBytes(24).toString("base64url");
  const productIds = requestedProductIds.filter((productId) => {
    return user.shelfProductIds.includes(productId);
  });
  const share: Share = {
    id: randomUUID(),
    userId: user.id,
    tokenHash: createHash("sha256").update(token).digest("hex"),
    productIds,
    companyIds: requestedCompanyIds.filter((companyId) => user.watchCompanyIds.includes(companyId)),
    expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    revoked: false,
  };
  state.shares.set(share.id, share);
  return { id: share.id, token, expiresAt: share.expiresAt };
}

export function readShare(token: string) {
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const share = [...state.shares.values()].find((item) => {
    const isCurrent = new Date(item.expiresAt) > new Date();
    return item.tokenHash === tokenHash && !item.revoked && isCurrent;
  });
  if (!share) throw new Error("NOT_FOUND");

  return {
    productIds: share.productIds,
    products: share.productIds.map(productById).filter(Boolean),
    companies: share.companyIds.map(findCompany).filter(Boolean),
    expiresAt: share.expiresAt,
  };
}
