import { createHash, randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { PublicKey } from "@solana/web3.js";
import { companies, companyById, productById, products } from "@/data/catalog";
import { SOLANA_MAINNET_USDC_MINT } from "@/providers/solana-constants";
import { feeFor, splitBudget } from "./money";
import type {
  FinancialRecord,
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
  aiUsage: Array<{ at: string; costMicrousd: number; subjectHash?: string }>;
};

const initialState: StoreState = {
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
  };
  state.users.set(id, user);
  return user;
}

export function searchCatalog(query = "", category?: string): Product[] {
  const normalizedQuery = query.trim().toLowerCase();

  return products.filter((product) => {
    const companyName = companyById(product.companyId)?.name ?? "";
    const searchable = `${product.name} ${product.brand} ${companyName}`.toLowerCase();
    const matchesCategory = !category || product.category === category;
    const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);
    return matchesCategory && matchesQuery;
  });
}

export function searchCompanies(query = "", provider?: string) {
  const normalizedQuery = query.trim().toLowerCase();
  return companies.filter((company) => {
    const instrument = company.instrument;
    const matchesProvider = !provider || instrument?.provider === provider;
    const searchable = [
      company.name,
      company.ticker,
      company.exchange,
      ...(company.aliases ?? []),
      instrument?.symbol ?? "",
      instrument?.issuer ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return matchesProvider && (!normalizedQuery || searchable.includes(normalizedQuery));
  });
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
  return user.watchCompanyIds.map(companyById).filter(Boolean);
}

export function updateWatchlist(user: UserState, companyId: string, watched: boolean) {
  const company = companyById(companyId);
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
  const company = companyById(companyId);
  if (!company?.instrument) throw new Error("ASSET_UNSUPPORTED");

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
  ]);
  if (forbiddenMints.has(recipient.toBase58())) throw new Error("RECIPIENT_ACCOUNT_UNSAFE");
  return recipient;
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

  if (!user.invited || !user.eligible) throw new Error("ELIGIBILITY_DENIED");
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

function quoteableLeg(user: UserState, orderId: string, legId: string) {
  const order = ownedOrder(user, orderId);
  const leg = order.legs.find((item) => item.id === legId);
  if (!leg) throw new Error("NOT_FOUND");
  if (leg.status !== "draft" && leg.status !== "quoted") {
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
  const { order, leg } = quoteableLeg(user, orderId, legId);
  if (leg.side === "transfer") throw new Error("ASSET_UNSUPPORTED");

  const feeBps = input.feeBps;
  const output = BigInt(input.outputRaw);
  const fee =
    leg.side === "buy"
      ? feeFor(BigInt(leg.requestedInputRaw))
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

function recordBuy(user: UserState, leg: OrderLeg): void {
  const spend = BigInt(leg.requestedInputRaw);
  if (BigInt(user.cashRaw) < spend) throw new Error("INSUFFICIENT_USDC");
  user.cashRaw = (BigInt(user.cashRaw) - spend).toString();
  state.lots.push({
    userId: user.id,
    instrumentId: leg.instrumentId!,
    remainingRaw: leg.quote!.estimatedOutputRaw,
    costRemainingUsdcRaw: spend.toString(),
  });

  const holding = user.holdings.find((item) => item.instrumentId === leg.instrumentId);
  if (holding) {
    holding.rawAmount = (
      BigInt(holding.rawAmount) + BigInt(leg.quote!.estimatedOutputRaw)
    ).toString();
    holding.totalCostUsdcRaw = (BigInt(holding.totalCostUsdcRaw) + spend).toString();
    return;
  }

  const company = companyById(leg.companyId!);
  user.holdings.push({
    instrumentId: leg.instrumentId!,
    companyId: leg.companyId!,
    symbol: company!.instrument!.symbol,
    rawAmount: leg.quote!.estimatedOutputRaw,
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

function recordSell(user: UserState, leg: OrderLeg): void {
  const holding = user.holdings.find((item) => item.instrumentId === leg.instrumentId);
  const amount = BigInt(leg.requestedInputRaw);
  if (!holding || BigInt(holding.rawAmount) < amount) throw new Error("INSUFFICIENT_ASSET");

  const attributedCost = disposeTrackedLots(user, holding.instrumentId, amount);
  holding.rawAmount = (BigInt(holding.rawAmount) - amount).toString();
  if (attributedCost > 0n) {
    holding.totalCostUsdcRaw = (BigInt(holding.totalCostUsdcRaw) - attributedCost).toString();
  }
  const net = BigInt(leg.quote!.estimatedOutputRaw) - BigInt(leg.quote!.feeRaw);
  user.cashRaw = (BigInt(user.cashRaw) + net).toString();
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

function addRecord(user: UserState, leg: OrderLeg): void {
  const usdcRaw =
    leg.side === "buy"
      ? `-${leg.requestedInputRaw}`
      : leg.side === "sell"
        ? leg.quote!.estimatedOutputRaw
        : "0";

  const record: FinancialRecord = {
    id: randomUUID(),
    type: leg.side,
    status: "finalized",
    recordedAt: new Date().toISOString(),
    asset: leg.instrumentId ?? "USDC",
    rawAmount: leg.requestedInputRaw,
    usdcRaw,
    feeRaw: leg.quote!.feeRaw,
    signature: leg.signature,
    multiplier: "1",
  };
  user.records.unshift(record);
}

export function recordFinalizedLeg(
  user: UserState,
  orderId: string,
  legId: string,
  input: { reviewDigest: string; signature: string },
): Order {
  const order = ownedOrder(user, orderId);
  const leg = order.legs.find((item) => item.id === legId);
  if (!leg?.quote) throw new Error("QUOTE_REQUIRED");
  if (leg.status === "finalized") return order;
  if (leg.quote.reviewDigest !== input.reviewDigest) throw new Error("REVIEW_CHANGED");
  if (!input.signature.trim()) throw new Error("SIGNATURE_INVALID");
  if (new Date(leg.quote.expiresAt).getTime() < Date.now()) throw new Error("QUOTE_EXPIRED");
  if (state.pauses.submissions) throw new Error("SUBMISSIONS_PAUSED");

  if (leg.side === "buy") recordBuy(user, leg);
  if (leg.side === "sell") recordSell(user, leg);
  if (leg.side === "transfer") recordTransfer(user, leg);

  leg.status = "finalized";
  leg.signature = input.signature;
  addRecord(user, leg);

  const allFinalized = order.legs.every((item) => item.status === "finalized");
  order.status = allFinalized ? "complete" : "partially_complete";
  order.version += 1;
  return order;
}

export function stopOrder(user: UserState, orderId: string): Order {
  const order = ownedOrder(user, orderId);
  order.legs.forEach((leg) => {
    if (leg.status !== "finalized") leg.status = "cancelled";
  });
  order.status = "stopped";
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
    companies: share.companyIds.map(companyById).filter(Boolean),
    expiresAt: share.expiresAt,
  };
}
