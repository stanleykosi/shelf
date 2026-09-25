import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  articles,
  corporateActions,
  productById,
} from "@/data/catalog";
import {
  createOrder,
  createShare,
  consumeMagicDidToken,
  deleteAccountData,
  equalAllocations,
  findCompany,
  ownedOrder,
  quoteLegFromJupiter,
  requireFinancialAccess,
  readShare,
  reviewCatalogReport,
  revokeInvite,
  shelfView,
  state,
  stopOrder,
  updateShelf,
  updateWatchlist,
  userForMagicIdentity,
  validateTransferDestinationAddress,
  watchlistView,
} from "@/domain/store";
import { acceptWalletSignature, storeExecutionPreparation, transactionForWalletSignature } from "@/domain/execution";
import { broadcastStoredPreparation, reconcileOrderPreparations } from "@/domain/transaction-orchestration";
import { hasPendingChainWork, refreshVerifiedWalletBalances } from "@/domain/wallet-refresh";
import type {
  AllocationDraft,
  CatalogReport,
  ConsentRecord,
} from "@/domain/store";
import { OpenRouterProvider } from "@/providers/openrouter";
import { REQUIRED_AI_PRIVACY } from "@/providers/contracts";
import { env } from "@/lib/env";
import { productNameForApprovedUrl } from "@/lib/product-url";
import { safeReturnTo } from "@/lib/routes";
import { isValidGtin } from "@/domain/gtin";
import { issuerChatFact, readChatHistory } from "@/domain/ai-chat";
import type {
  AccountSummary,
  AuthenticationMethod,
  LoginChallenge,
  StepUpChallenge,
  WalletSigningChallenge,
  WalletSigningVerification,
  WalletSummary,
} from "@/domain/identity";
import type { MarketFeed } from "@/domain/market-data";
import { selectHomeHighlights } from "@/domain/home-highlights";
import { buildIssuerDirectory } from "@/domain/issuer-spotlight";
import { readIssuerDirectory } from "@/db/issuer-directory";
import type { RecognitionMatch } from "@/domain/types";
import {
  companyFromIssuerListing,
  corporateActionsForIssuerInstrument,
  matchOwnershipCandidates,
  resolveDiscoveryQuery,
  reviewedCompanyForListing,
  reviewedIssuerLinks,
  searchIssuerListings,
  type IssuerListing,
} from "@/domain/issuer-assets";
import type { OwnershipCandidate } from "@/providers/contracts";
import { readMarketHistory, runWithRuntimeState } from "@/db/runtime-store";
import { LivePreStocksProvider } from "@/providers/prestocks";
import type { PreStocksListing } from "@/providers/prestocks";
import { LiveXStocksProvider } from "@/providers/xstocks";
import { LiveDexScreenerProvider } from "@/providers/dexscreener";
import { fetchPoolCandles, marketRanges, type MarketRange } from "@/providers/geckoterminal";
import type { IssuerMarketView } from "@/domain/issuer-market";
import { lookupBarcodeProduct } from "@/providers/product-identity";
import { verifyCurrentIssuerInstrument, verifyLegacyOrderInstrument } from "@/providers/issuer-verification";
import type { XStocksListing, XStocksMetadata } from "@/providers/xstocks";
import { MagicIdentityProvider } from "@/providers/magic";
import { HeliusChainProvider, JupiterBuildProvider } from "@/providers/live";
import {
  SOLANA_MAINNET_USDC_MINT,
  SOLANA_TOKEN_2022_PROGRAM_ID,
  SOLANA_TOKEN_PROGRAM_ID,
} from "@/providers/solana-constants";
import {
  createSessionToken,
  readSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/session";
import { authenticatedUser } from "@/lib/authentication";
import {
  isSolanaPublicKey,
  verifyWalletSigningTransaction,
  walletSigningMessage,
} from "@/lib/solana-signing";
import { SystemProgram } from "@solana/web3.js";

export const maxDuration = 60;

const ai = env.OPENROUTER_API_KEY
  ? new OpenRouterProvider({
        apiKey: env.OPENROUTER_API_KEY!,
        visionModel: env.OPENROUTER_VISION_MODEL,
        textModel: env.OPENROUTER_TEXT_MODEL,
      })
  : undefined;
const preStocks = new LivePreStocksProvider(env.PRESTOCKS_API_URL);
const xStocks = new LiveXStocksProvider(env.XSTOCKS_API_BASE_URL);
const dexMarkets = new LiveDexScreenerProvider();
const magicIdentity = env.MAGIC_SECRET_KEY
  ? new MagicIdentityProvider({
        secretKey: env.MAGIC_SECRET_KEY!,
        network: env.SOLANA_NETWORK,
      })
  : undefined;
const jupiter = env.JUPITER_API_KEY
  ? new JupiterBuildProvider({ apiKey: env.JUPITER_API_KEY })
  : undefined;
const chain =
  env.SOLANA_RPC_URL && env.SOLANA_GENESIS_HASH
    ? new HeliusChainProvider({
        rpcUrl: env.SOLANA_RPC_URL,
        expectedNetwork: env.SOLANA_NETWORK,
        expectedGenesisHash: env.SOLANA_GENESIS_HASH,
      })
    : undefined;
type ListingCache<Listing> = {
  value?: { listings: Listing[]; fetchedAt: number };
};

const preStocksCache: ListingCache<PreStocksListing> = {};
const xStocksCache: ListingCache<XStocksListing> = {};

async function cachedListings<Listing>(
  cache: ListingCache<Listing>,
  load: () => Promise<Listing[]>,
  unavailableCode: string,
): Promise<MarketFeed<Listing>> {
  const now = Date.now();
  if (cache.value && now - cache.value.fetchedAt < 5 * 60_000) {
    return { state: "current", listings: cache.value.listings };
  }

  try {
    const listings = await load();
    cache.value = { listings, fetchedAt: now };
    return { state: "current", listings };
  } catch {
    if (cache.value) return { state: "stale", listings: cache.value.listings };
    throw new Error(unavailableCode);
  }
}

async function preStocksListings(): Promise<MarketFeed<PreStocksListing>> {
  return cachedListings(preStocksCache, () => preStocks.listings(), "PRESTOCKS_UNAVAILABLE");
}

async function xStocksListings(): Promise<MarketFeed<XStocksListing>> {
  return cachedListings(xStocksCache, () => xStocks.listings(), "XSTOCKS_UNAVAILABLE");
}

async function issuerListings(): Promise<{
  listings: IssuerListing[];
  unavailable: string[];
  stale: string[];
}> {
  const [publicFeed, privateFeed] = await Promise.allSettled([
    xStocksListings(),
    preStocksListings(),
  ]);
  const listings: IssuerListing[] = [
    ...(privateFeed.status === "fulfilled"
      ? privateFeed.value.listings.map((asset) => ({ provider: "prestocks" as const, asset }))
      : []),
    ...(publicFeed.status === "fulfilled"
      ? publicFeed.value.listings.map((asset) => ({ provider: "xstocks" as const, asset }))
      : []),
  ];
  const unavailable = [
    ...(publicFeed.status === "rejected" ? ["xStocks"] : []),
    ...(privateFeed.status === "rejected" ? ["PreStocks"] : []),
  ];
  const stale = [
    ...(publicFeed.status === "fulfilled" && publicFeed.value.state === "stale" ? ["xStocks"] : []),
    ...(privateFeed.status === "fulfilled" && privateFeed.value.state === "stale" ? ["PreStocks"] : []),
  ];
  if (unavailable.length === 2) throw new Error("ISSUER_FEEDS_UNAVAILABLE");
  return { listings, unavailable, stale };
}

async function registerIssuerCompany(companyId: string) {
  if (!companyId.startsWith("issuer:")) return;
  if (!chain) throw new Error("CHAIN_PROVIDER_UNAVAILABLE");
  const [, provider, symbol] = companyId.split(":");
  let listing: IssuerListing | undefined;
  if (provider === "xstocks") {
    const asset = await xStocks.listing(symbol);
    if (asset?.companyId === companyId) listing = { provider: "xstocks", asset };
  } else if (provider === "prestocks") {
    const asset = (await preStocks.listings()).find((item) => item.companyId === companyId);
    if (asset) listing = { provider: "prestocks", asset };
  }
  if (!listing) throw new Error("ISSUER_INSTRUMENT_UNAVAILABLE");
  const previous = state.issuerCompanies.get(companyId);
  if (previous?.instrument?.mint && previous.instrument.mint !== listing.asset.mint) {
    throw new Error("ISSUER_INSTRUMENT_CHANGED");
  }
  const [mint] = await chain.inspectMints([listing.asset.mint]);
  if (!mint?.exists) throw new Error("ISSUER_MINT_INVALID");
  const company = companyFromIssuerListing(listing, mint);
  state.issuerCompanies.set(companyId, company);
}

async function prepareOrderCompany(companyId: string) {
  if (companyId.startsWith("issuer:")) {
    await registerIssuerCompany(companyId);
    return;
  }
  const company = findCompany(companyId);
  if (!company?.instrument) throw new Error("ASSET_UNSUPPORTED");
  if (!chain) throw new Error("CHAIN_PROVIDER_UNAVAILABLE");
  await verifyLegacyOrderInstrument(company, { prestocks: preStocks, xstocks: xStocks },
    (mints) => chain.inspectMints(mints));
}

async function exactIssuerAsset(provider: string, symbol: string) {
  if (!/^[a-zA-Z0-9.-]{1,32}$/.test(symbol)) throw new Error("INVALID_INPUT");
  let listing: IssuerListing | undefined;
  let metadata: XStocksMetadata | undefined;
  if (provider === "xstocks") {
    const detail = await xStocks.detail(symbol);
    if (detail?.listing.symbol.toLowerCase() === symbol.toLowerCase()) {
      listing = { provider, asset: detail.listing };
      metadata = detail.metadata;
    }
  } else if (provider === "prestocks") {
    const detail = await preStocks.detail(symbol);
    if (detail) listing = { provider, asset: detail.listing };
  } else {
    throw new Error("INVALID_INPUT");
  }
  return {
    listing: listing ?? null,
    metadata,
    lifecycle: listing ? reviewedCompanyForListing(listing)?.instrument?.lifecycle : undefined,
  };
}

async function exactIssuerChatContext(provider: unknown, symbol: unknown) {
  if (
    (provider !== "xstocks" && provider !== "prestocks") ||
    typeof symbol !== "string" ||
    !/^[A-Za-z0-9.-]{1,32}$/.test(symbol)
  ) {
    throw new Error("INVALID_INPUT");
  }

  let listing: IssuerListing;
  let sourceData: unknown;
  if (provider === "xstocks") {
    const detail = await xStocks.detail(symbol);
    if (!detail) throw new Error("NOT_FOUND");
    listing = { provider, asset: detail.listing };
    sourceData = detail.sourceData;
  } else {
    const detail = await preStocks.detail(symbol);
    if (!detail) throw new Error("NOT_FOUND");
    listing = { provider, asset: detail.listing };
    sourceData = detail.sourceData;
  }
  const lifecycle = reviewedCompanyForListing(listing)?.instrument?.lifecycle;
  return { listing, fact: issuerChatFact(listing, sourceData, lifecycle) };
}

function verifyIssuerForExecution(company: NonNullable<ReturnType<typeof findCompany>>) {
  return verifyCurrentIssuerInstrument(company, { prestocks: preStocks, xstocks: xStocks });
}

async function marketHistory(companyId: string) {
  const company = findCompany(companyId);
  if (!company?.instrument) throw new Error("NOT_FOUND");

  const observed = await readMarketHistory(company.instrument.mint);
  if (observed.length) return { mode: "observed", points: observed };

  return { mode: "unavailable", points: [] };
}

function currentUser(request: NextRequest) {
  const user = authenticatedUser(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!user) throw new Error("AUTH_REQUIRED");
  return user;
}

function currentSession(request: NextRequest, userId: string) {
  if (!env.SESSION_TOKEN_HMAC_KEY) throw new Error("AUTH_REQUIRED");
  const claims = readSessionToken(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
    env.SESSION_TOKEN_HMAC_KEY,
  );
  const session = claims ? state.sessions.get(claims.sessionId) : undefined;
  if (!session || session.userId !== userId || session.revokedAt) throw new Error("AUTH_REQUIRED");
  return session;
}

function authenticationMethod(value: unknown): AuthenticationMethod {
  if (value !== "email" && value !== "google") throw new Error("AUTH_INVALID");
  return value;
}

type AuthSessionResult = {
  sessionToken: string;
  data: {
    userId: string;
    wallet: string;
    verifiedAt: string;
  };
};

type PersistedFailure = { persistedError: string };

function isAuthSessionResult(value: unknown): value is AuthSessionResult {
  return Boolean(
    value &&
    typeof value === "object" &&
    "sessionToken" in value &&
    typeof value.sessionToken === "string",
  );
}

function isPersistedFailure(value: unknown): value is PersistedFailure {
  return Boolean(
    value &&
    typeof value === "object" &&
    "persistedError" in value &&
    typeof value.persistedError === "string",
  );
}

function setSessionCookie(response: NextResponse, value: string, maxAge: number) {
  response.cookies.set(SESSION_COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.APP_ORIGIN.startsWith("https://"),
    path: "/",
    maxAge,
    priority: "high",
  });
}

function requireOwner(request: NextRequest) {
  const user = currentUser(request);
  if (user.role !== "owner") throw new Error("NOT_FOUND");
  return user;
}

function success(data: unknown, status = 200) {
  return NextResponse.json(
    {
      data,
      meta: { requestId: randomUUID(), serverTime: new Date().toISOString() },
    },
    {
      status,
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}

const statusByError: Record<string, number> = {
  NOT_FOUND: 404,
  AUTH_REQUIRED: 401,
  AUTH_INVALID: 401,
  AUTH_AUDIENCE_MISMATCH: 401,
  AUTH_CHALLENGE_REQUIRED: 401,
  AUTH_ISSUER_MISMATCH: 401,
  AUTH_REPLAYED: 409,
  AUTH_UNAVAILABLE: 503,
  FRESH_AUTH_REQUIRED: 401,
  ELIGIBILITY_DENIED: 403,
  PURCHASES_PAUSED: 403,
  VERSION_CONFLICT: 409,
  PREVIOUS_LEG_UNRESOLVED: 409,
  QUOTE_EXPIRED: 409,
  PRICE_IMPACT_EXCEEDED: 422,
  PENDING_FINANCIAL_OPERATION: 409,
  QUOTE_REQUIRED: 409,
  INVALID_AMOUNT: 422,
  INVALID_ALLOCATION: 422,
  INVALID_INPUT: 422,
  INVALID_CONSENT: 422,
  INVALID_EMAIL: 422,
  INVALID_ORDER_TYPE: 422,
  INVALID_PAUSE_SCOPE: 422,
  INVALID_REVIEW_DECISION: 422,
  REVIEW_ALREADY_COMPLETED: 409,
  WALLET_REFRESH_UNAVAILABLE: 501,
  RECONCILIATION_UNAVAILABLE: 501,
  ADMIN_MUTATION_UNAVAILABLE: 501,
  ACKNOWLEDGEMENT_REQUIRED: 422,
  REASON_REQUIRED: 422,
  IMAGE_TOO_LARGE: 413,
  IDEMPOTENCY_CONFLICT: 409,
  DUPLICATE_COMPANY: 422,
  ASSET_UNSUPPORTED: 422,
  ORDER_LIMIT: 422,
  INSUFFICIENT_USDC: 422,
  INSUFFICIENT_ASSET: 422,
  UNSUPPORTED_PRODUCT_URL: 422,
  INVALID_BARCODE: 422,
  RECIPIENT_INVALID: 422,
  RECIPIENT_SELF: 422,
  RECIPIENT_ACCOUNT_UNSAFE: 422,
  RECIPIENT_VERIFICATION_UNAVAILABLE: 503,
  LEG_NOT_QUOTEABLE: 409,
  AI_GROUNDING_REQUIRED: 422,
  AI_CONTEXT_TOO_LARGE: 422,
  REVIEW_CHANGED: 409,
  RECONCILIATION_REQUIRED: 409,
  SIGNATURE_INVALID: 422,
  SUBMISSIONS_PAUSED: 503,
  PRESTOCKS_UNAVAILABLE: 503,
  XSTOCKS_UNAVAILABLE: 503,
  DEX_MARKET_UNAVAILABLE: 503,
  ISSUER_INSTRUMENT_UNAVAILABLE: 503,
  SIGNING_UNAVAILABLE: 503,
  TRADE_EXECUTION_DISABLED: 503,
  QUOTE_CONFIGURATION_INVALID: 503,
  QUOTE_PROVIDER_UNAVAILABLE: 503,
  QUOTE_PROVIDER_INVALID: 502,
  JUPITER_BUILD_INVALID: 502,
  JUPITER_TERMS_CHANGED: 409,
  JUPITER_TIP_FORBIDDEN: 502,
  JUPITER_PROGRAM_NOT_ALLOWED: 502,
  JUPITER_TOKEN_INSTRUCTION_FORBIDDEN: 502,
  JUPITER_SIGNERS_CHANGED: 502,
  JUPITER_FEE_ACCOUNT_MISSING: 502,
  JUPITER_BLOCKHASH_INVALID: 502,
  PREPARATION_REQUIRED: 409,
  PREPARATION_STATE_INVALID: 409,
  DATA_ENCRYPTION_KEY_INVALID: 503,
  SPONSOR_SECRET_KEY_INVALID: 503,
  SPONSOR_KEY_MISMATCH: 503,
  SPONSOR_POLICY_INVALID: 422,
  SPONSOR_SYSTEM_TRANSFER_FORBIDDEN: 422,
  SPONSOR_BUDGET_EXHAUSTED: 429,
  SPONSOR_TRANSACTION_LIMIT_EXCEEDED: 422,
  SPONSOR_RESERVATION_INVALID: 409,
  WALLET_OPERATION_IN_PROGRESS: 409,
  CHAIN_PROVIDER_UNAVAILABLE: 503,
  TRANSACTION_SIMULATION_FAILED: 409,
  SIGNATURE_CHANGED: 409,
  SETTLEMENT_MISMATCH: 409,
  FINALIZED_TRANSACTION_INVALID: 409,
  TRANSACTION_NOT_AVAILABLE: 409,
  AI_PROVIDER_UNAVAILABLE: 503,
  AI_PRIVACY_UNAVAILABLE: 503,
  AI_INVALID_RESPONSE: 502,
  AI_DAILY_LIMIT_REACHED: 429,
  AI_MONTHLY_LIMIT_REACHED: 429,
  AI_USER_LIMIT_REACHED: 429,
  AI_ALLOCATION_DISABLED: 403,
  SOLANA_WALLET_INVALID: 409,
  SOLANA_WALLET_UNAVAILABLE: 409,
  WALLET_BINDING_MISMATCH: 409,
  SOLANA_BLOCKHASH_INVALID: 502,
  UNSUPPORTED_MEDIA_TYPE: 415,
  ORIGIN_FORBIDDEN: 403,
};

function failure(error: unknown) {
  const reportedCode = error instanceof Error ? error.message : "UNEXPECTED_ERROR";
  const code = reportedCode in statusByError ? reportedCode : "UNEXPECTED_ERROR";
  const status = statusByError[code] ?? 500;
  const retryable = status === 503 || status === 429;
  const requestId = randomUUID();

  if (code === "UNEXPECTED_ERROR") {
    console.error(JSON.stringify({
      event: "api_request_failed",
      requestId,
      code,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
    }));
  }

  return NextResponse.json(
    {
      error: {
        code,
        message: code.replaceAll("_", " ").toLowerCase(),
        retryable,
      },
      meta: { requestId, serverTime: new Date().toISOString() },
    },
    { status, headers: { "Cache-Control": "private, no-store" } },
  );
}

function isRequestBody(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error("INVALID_INPUT");
  }
  return value;
}

function optionalInteger(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isInteger(value)) throw new Error("INVALID_INPUT");
  return value;
}

async function jsonBody(request: NextRequest): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await request.json();
    if (!isRequestBody(body)) throw new Error("INVALID_INPUT");
    return body;
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_INPUT") throw error;
    throw new Error("INVALID_INPUT");
  }
}

function assertMutationRequest(request: NextRequest) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    throw new Error("UNSUPPORTED_MEDIA_TYPE");
  }
  const origin = request.headers.get("origin");
  const allowedOrigins =
    env.APP_ENV === "local"
      ? new Set([
          env.APP_ORIGIN,
          request.nextUrl.origin,
          "http://localhost:3000",
          "http://127.0.0.1:3000",
        ])
      : new Set([env.APP_ORIGIN]);
  if (origin && !allowedOrigins.has(origin)) throw new Error("ORIGIN_FORBIDDEN");
  if (
    env.APP_ENV === "private-beta" &&
    (!origin || request.headers.get("x-csrf-token") !== "session-bound")
  ) {
    throw new Error("ORIGIN_FORBIDDEN");
  }
}

function requireFreshAuthorization(request: NextRequest, userId: string, purpose: string) {
  const token = request.headers.get("x-shelf-step-up");
  if (!token) throw new Error("FRESH_AUTH_REQUIRED");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const authorization = state.freshAuthorizations.get(tokenHash);
  const valid =
    authorization?.userId === userId &&
    authorization.purpose === purpose &&
    new Date(authorization.expiresAt) > new Date();
  if (!valid) throw new Error("FRESH_AUTH_REQUIRED");
  state.freshAuthorizations.delete(tokenHash);
}

async function verifyTransferDestination(user: ReturnType<typeof currentUser>, address: string) {
  const recipient = validateTransferDestinationAddress(user, address);
  if (!env.SOLANA_RPC_URL) throw new Error("RECIPIENT_VERIFICATION_UNAVAILABLE");
  let response: Response;
  try {
    response = await fetch(env.SOLANA_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: randomUUID(),
        method: "getAccountInfo",
        params: [recipient.toBase58(), { encoding: "base64", commitment: "finalized" }],
      }),
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    throw new Error("RECIPIENT_VERIFICATION_UNAVAILABLE");
  }
  if (!response.ok) throw new Error("RECIPIENT_VERIFICATION_UNAVAILABLE");
  const payload: unknown = await response.json();
  if (!isRequestBody(payload) || !isRequestBody(payload.result)) {
    throw new Error("RECIPIENT_VERIFICATION_UNAVAILABLE");
  }
  const account = payload.result.value;
  if (account === null) return;
  if (!isRequestBody(account) || account.executable === true || account.owner !== SystemProgram.programId.toBase58()) {
    throw new Error("RECIPIENT_ACCOUNT_UNSAFE");
  }
}

function pathIs(path: string[], ...segments: string[]) {
  return path.length === segments.length && path.every((part, index) => part === segments[index]);
}

async function quoteOrderLeg(user: ReturnType<typeof currentUser>, orderId: string, legId: string) {
  requireFinancialAccess(user);
  if (!jupiter) throw new Error("QUOTE_PROVIDER_UNAVAILABLE");

  const order = ownedOrder(user, orderId);
  const leg = order.legs.find((item) => item.id === legId);
  if (!leg) throw new Error("NOT_FOUND");
  if (leg.side === "transfer") throw new Error("TRADE_EXECUTION_DISABLED");
  if (leg.side === "buy" && state.pauses.buys) throw new Error("PURCHASES_PAUSED");
  if (!user.walletAddress || !user.walletVerifiedAt || !isSolanaPublicKey(user.walletAddress)) {
    throw new Error("SOLANA_WALLET_UNAVAILABLE");
  }
  const company = leg.companyId ? findCompany(leg.companyId) : undefined;
  if (!company?.instrument) throw new Error("ASSET_UNSUPPORTED");
  if (!env.SPONSOR_PUBLIC_KEY || !env.FEE_USDC_TOKEN_ACCOUNT) {
    throw new Error("QUOTE_CONFIGURATION_INVALID");
  }

  if (hasPendingChainWork(user.id)) throw new Error("WALLET_OPERATION_IN_PROGRESS");
  await refreshWalletBalances(user);
  if (leg.instrumentId && user.reconciliationRequiredAssets.includes(leg.instrumentId)) {
    throw new Error("RECONCILIATION_REQUIRED");
  }
  if (leg.side === "buy" && BigInt(user.cashRaw) < BigInt(leg.requestedInputRaw)) {
    throw new Error("INSUFFICIENT_USDC");
  }

  // Recheck the exact issuer mint immediately before asking Jupiter for executable terms.
  // This prevents an obsolete registry entry from silently becoming a different asset purchase.
  await verifyIssuerForExecution(company);

  const isBuy = leg.side === "buy";
  const build = await jupiter.buildValidatedExactInput({
    inputMint: isBuy ? SOLANA_MAINNET_USDC_MINT : company.instrument.mint,
    outputMint: isBuy ? company.instrument.mint : SOLANA_MAINNET_USDC_MINT,
    rawAmount: leg.requestedInputRaw,
    taker: user.walletAddress,
    payer: env.SPONSOR_PUBLIC_KEY,
    feeAccount: env.FEE_USDC_TOKEN_ACCOUNT,
    feeBps: env.APP_FEE_BPS,
    tokenProgramsByMint: {
      [SOLANA_MAINNET_USDC_MINT]: SOLANA_TOKEN_PROGRAM_ID,
      [company.instrument.mint]: company.instrument.tokenProgram === "token-2022"
        ? SOLANA_TOKEN_2022_PROGRAM_ID : SOLANA_TOKEN_PROGRAM_ID,
    },
  });

  const quote = quoteLegFromJupiter(user, orderId, legId, {
    outputRaw: build.outputRaw,
    minOutputRaw: build.minOutputRaw,
    priceImpactBps: build.priceImpactBps,
    routeDigest: build.routeDigest,
    routeLabels: build.routeLabels,
    transactionMessageHash: build.messageHash,
    feeBps: env.APP_FEE_BPS,
  });
  const preparation = storeExecutionPreparation(user, orderId, legId, {
    transactionBase64: build.transactionBase64,
    messageHash: build.messageHash,
    expectedSigners: build.requiredSigners,
    lastValidBlockHeight: build.lastValidBlockHeight,
  });
  if (env.ENABLE_REAL_TRADING && preparation) {
    quote.executionAvailable = true;
    delete quote.executionBlockReason;
  }
  return quote;
}

async function refreshWalletBalances(user: ReturnType<typeof currentUser>) {
  if (!chain) throw new Error("CHAIN_PROVIDER_UNAVAILABLE");
  return refreshVerifiedWalletBalances(chain, user);
}

async function broadcastPreparation(user: ReturnType<typeof currentUser>, preparationId: string) {
  if (!chain) throw new Error("CHAIN_PROVIDER_UNAVAILABLE");
  return broadcastStoredPreparation(chain, user, preparationId);
}

async function prepareWalletSignature(
  user: ReturnType<typeof currentUser>,
  orderId: string,
  legId: string,
  reviewDigest: string,
) {
  requireFinancialAccess(user);
  if (!chain) throw new Error("CHAIN_PROVIDER_UNAVAILABLE");
  if (hasPendingChainWork(user.id)) throw new Error("WALLET_OPERATION_IN_PROGRESS");
  const leg = ownedOrder(user, orderId).legs.find((candidate) => candidate.id === legId);
  if (!leg) throw new Error("NOT_FOUND");
  if (leg.side === "buy" && state.pauses.buys) throw new Error("PURCHASES_PAUSED");
  const company = leg.companyId ? findCompany(leg.companyId) : undefined;
  if (company) await verifyIssuerForExecution(company);
  await refreshWalletBalances(user);
  const prepared = transactionForWalletSignature(user, orderId, legId, reviewDigest);
  if ((await chain.blockHeight()) > prepared.lastValidBlockHeight) throw new Error("QUOTE_EXPIRED");
  return prepared;
}

async function reconcileOrder(user: ReturnType<typeof currentUser>, orderId: string) {
  if (!chain || !env.FEE_USDC_TOKEN_ACCOUNT) throw new Error("CHAIN_PROVIDER_UNAVAILABLE");
  return reconcileOrderPreparations(chain, user, orderId);
}

async function getResponse(request: NextRequest, path: string[]) {
  const url = request.nextUrl;

  if (pathIs(path, "catalog", "prestocks")) return preStocksListings();
  if (pathIs(path, "catalog", "xstocks")) return xStocksListings();
  if (pathIs(path, "issuer", "reviewed")) return reviewedIssuerLinks(await issuerListings());
  if (path.length === 4 && path[0] === "issuer" && path[1] === "asset") {
    return exactIssuerAsset(path[2], path[3]);
  }
  if (pathIs(path, "issuer", "search")) {
    const query = url.searchParams.get("q")?.trim() ?? "";
    if (query.length > 120) throw new Error("INVALID_INPUT");
    const offset = Number(url.searchParams.get("offset") ?? "0");
    const provider = url.searchParams.get("provider");
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 10_000) {
      throw new Error("INVALID_INPUT");
    }
    if (provider && provider !== "xstocks" && provider !== "prestocks") {
      throw new Error("INVALID_INPUT");
    }
    let feeds: Awaited<ReturnType<typeof issuerListings>>;
    if (provider === "xstocks") {
      const feed = await xStocksListings();
      feeds = {
        listings: feed.listings.map((asset) => ({ provider: "xstocks", asset })),
        unavailable: [],
        stale: feed.state === "stale" ? ["xStocks"] : [],
      };
    } else if (provider === "prestocks") {
      const feed = await preStocksListings();
      feeds = {
        listings: feed.listings.map((asset) => ({ provider: "prestocks", asset })),
        unavailable: [],
        stale: feed.state === "stale" ? ["PreStocks"] : [],
      };
    } else {
      feeds = await issuerListings();
    }
    const matches = searchIssuerListings(query, feeds.listings);
    return {
      listings: matches.slice(offset, offset + 50),
      total: matches.length,
      unavailable: feeds.unavailable,
      stale: feeds.stale,
    };
  }
  // History reads are handled before the runtime-state transaction in GET.
  // Keeping the route out of other methods makes the database boundary explicit.
  if (path[0] === "products" && path[1]) return productById(path[1]);
  if (path[0] === "companies" && path[1]) return findCompany(path[1]);
  if (pathIs(path, "learn")) return articles;
  if (path[0] === "learn" && path[1]) return articles.find((item) => item.slug === path[1]);
  if (path[0] === "shares" && path[1]) return readShare(path[1]);

  const user = currentUser(request);
  if (pathIs(path, "shelf")) return shelfView(user);
  if (pathIs(path, "watchlist")) return watchlistView(user);
  if (pathIs(path, "shelf", "shares")) {
    return [...state.shares.values()]
      .filter((share) => share.userId === user.id)
      .map(({ id, expiresAt, revoked }) => ({ id, expiresAt, revoked }));
  }
  if (pathIs(path, "wallet")) {
    return {
      address: user.walletAddress,
      network: env.SOLANA_NETWORK,
      cashRaw: user.cashRaw,
      reservedRaw: "0",
      reconciliationRequiredAssets: user.reconciliationRequiredAssets,
      externalInventory: user.holdings.filter((item) => BigInt(item.externalRaw) > 0n),
    } satisfies WalletSummary & { externalInventory: typeof user.holdings };
  }
  if (pathIs(path, "wallet", "deposit")) {
    return {
      asset: "USDC",
      network: env.SOLANA_NETWORK,
      address: user.walletAddress,
      depositsEnabled: false,
    };
  }
  if (pathIs(path, "portfolio")) return { cashRaw: user.cashRaw, holdings: user.holdings };
  if (path[0] === "portfolio" && path[1]) {
    return user.holdings.find((item) => item.instrumentId === path[1]);
  }
  if (pathIs(path, "history")) return user.records;
  if (path[0] === "history" && path[1]) return user.records.find((item) => item.id === path[1]);
  if (pathIs(path, "corporate-actions")) {
    const instrumentId = url.searchParams.get("instrumentId");
    if (!instrumentId) return corporateActions;
    const company = findCompany(user.holdings.find((item) => item.instrumentId === instrumentId)?.companyId ?? "");
    if (company?.instrument?.id !== instrumentId) return [];
    return corporateActionsForIssuerInstrument(company);
  }
  if (path[0] === "corporate-actions" && path[1]) {
    return corporateActions.find((item) => item.id === path[1]);
  }
  if (path[0] === "orders" && path[1]) return ownedOrder(user, path[1]);
  if (pathIs(path, "capabilities")) {
    return {
      learn: true,
      scan: true,
      suggest: !state.pauses.suggestions,
      deposit: false,
      buy: user.eligible && !state.pauses.buys,
      sell: user.eligible,
      transfer: user.eligible,
      tradePreview: "jupiter",
      tradeExecution: env.ENABLE_REAL_TRADING,
      reasonCodes: env.ENABLE_REAL_TRADING
        ? []
        : ["SPONSOR_ACTIVATION_PENDING", "LIVE_MONEY_GATE_CLOSED"],
    };
  }
  if (pathIs(path, "me")) {
    const session = currentSession(request, user.id);
    return {
      id: user.id,
      role: user.role,
      invited: user.invited,
      eligible: user.eligible,
      email: user.email,
      walletAddress: user.walletAddress,
      identityProvider: "magic",
      authMethod: session.authMethod,
      ownerBindingId: user.magicIssuer,
    } satisfies AccountSummary & {
      id: string;
      role: typeof user.role;
      invited: boolean;
      eligible: boolean;
    };
  }
  if (pathIs(path, "account", "export")) {
    requireFreshAuthorization(request, user.id, "account_export");
    return {
      account: { id: user.id, role: user.role, invited: user.invited, eligible: user.eligible },
      shelf: shelfView(user),
      watchlist: watchlistView(user),
      records: user.records,
      publicChainDataErasure: false,
    };
  }
  if (path[0] === "ai" && path[1] === "allocation-drafts" && path[2]) {
    const draft = state.allocationDrafts.get(path[2]);
    if (!draft || draft.userId !== user.id) throw new Error("NOT_FOUND");
    return draft;
  }
  if (pathIs(path, "admin", "health")) {
    if (user.role !== "owner") throw new Error("NOT_FOUND");
    const providersConfigured = Boolean(
      env.MAGIC_SECRET_KEY &&
        env.OPENROUTER_API_KEY &&
        env.JUPITER_API_KEY &&
        env.SOLANA_RPC_URL &&
        env.SOLANA_GENESIS_HASH,
    );
    return {
      environment: env.APP_ENV,
      providerStatus: providersConfigured ? "configured" : "incomplete",
      network: env.SOLANA_NETWORK,
      realTrading: env.ENABLE_REAL_TRADING,
      pendingOrders: [...state.orders.values()].filter((order) => order.status !== "complete")
        .length,
      openGates: ["G01", "G02", "G03", "G04", "G05", "G06", "G07", "G08"],
    };
  }
  if (pathIs(path, "admin", "audit")) {
    requireOwner(request);
    return state.audits;
  }
  if (pathIs(path, "admin", "budgets")) {
    requireOwner(request);
    const aiSpentMicrousd = state.aiUsage.reduce((total, entry) => total + entry.costMicrousd, 0);
    const sponsorSpentLamports = state.sponsorReservations
      .filter((item) => item.status === "settled")
      .reduce((total, item) => total + BigInt(item.actualLamports ?? "0"), 0n);
    const sponsorReservedLamports = state.sponsorReservations
      .filter((item) => item.status === "reserved")
      .reduce((total, item) => total + BigInt(item.reservedLamports), 0n);
    return {
      sponsorSpentLamports: sponsorSpentLamports.toString(),
      sponsorReservedLamports: sponsorReservedLamports.toString(),
      aiSpentMicrousd,
    };
  }
  if (pathIs(path, "admin", "orders")) {
    requireOwner(request);
    return [...state.orders.values()].filter((order) => order.status === "outcome_unknown");
  }
  if (pathIs(path, "admin", "catalog", "review")) {
    requireOwner(request);
    return {
      pending: state.catalogReports.filter((report) => report.status === "open"),
      reports: state.catalogReports,
    };
  }
  if (path[0] === "admin" && path[1] === "diagnostics" && path[2]) {
    requireOwner(request);
    const order = state.orders.get(path[2]);
    return {
      orderId: path[2],
      status: order?.status ?? "unknown",
      containsSignedBytes: false,
      containsSecrets: false,
    };
  }
  if (pathIs(path, "exports", "activity")) {
    requireFreshAuthorization(request, user.id, "activity_export");
    return user.records;
  }
  throw new Error("NOT_FOUND");
}

function recognitionMatches(
  candidates: OwnershipCandidate[],
  { listings, stale, unavailable }: Awaited<ReturnType<typeof issuerListings>>,
): RecognitionMatch[] {
  return matchOwnershipCandidates(candidates, listings).map((match) => ({
    ...match,
    feedUnavailable: unavailable.length > 0,
    feedStale: match.issuer === "xstocks"
      ? stale.includes("xStocks")
      : match.issuer === "prestocks"
        ? stale.includes("PreStocks")
        : stale.length > 0,
  }));
}

function imageBytesFromDataUrl(value: unknown) {
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(value ?? ""));
  if (!match) throw new Error("UNSUPPORTED_MEDIA_TYPE");
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > 3 * 1024 * 1024) throw new Error("IMAGE_TOO_LARGE");

  const mediaType = `image/${match[1]}` as "image/jpeg" | "image/png" | "image/webp";
  const hasExpectedSignature =
    (mediaType === "image/jpeg" && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) ||
    (mediaType === "image/png" &&
      bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) ||
    (mediaType === "image/webp" &&
      bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
      bytes.subarray(8, 12).toString("ascii") === "WEBP");
  if (!hasExpectedSignature) throw new Error("UNSUPPORTED_MEDIA_TYPE");

  return { bytes, mediaType };
}

const AI_REQUEST_RESERVE_MICROUSD = 1_000_000;
const CHAT_REQUEST_RESERVE_MICROUSD = 20_000;
const GUEST_AI_REQUESTS_PER_DAY = 5;
const MEMBER_AI_REQUESTS_PER_DAY = 25;
const GUEST_NETWORK_REQUESTS_PER_DAY = 500;
const GUEST_AI_COOKIE_NAME = "shelf_guest_ai";
const GUEST_AI_COOKIE_AGE_SECONDS = 30 * 24 * 60 * 60;

function guestQuotaSignature(id: string) {
  return createHmac("sha256", env.SESSION_TOKEN_HMAC_KEY!)
    .update(`guest-ai:${id}`)
    .digest("base64url");
}

function guestQuotaId(token: string | undefined) {
  if (!token || !env.SESSION_TOKEN_HMAC_KEY) return null;
  const [id, signature] = token.split(".");
  if (!/^[0-9a-f-]{36}$/.test(id ?? "") || !signature) return null;
  const received = Buffer.from(signature, "base64url");
  const expected = Buffer.from(guestQuotaSignature(id), "base64url");
  return received.length === expected.length && timingSafeEqual(received, expected) ? id : null;
}

function guestAiSessionResponse(request: NextRequest) {
  const response = success({ ready: true });
  if (!env.SESSION_TOKEN_HMAC_KEY ||
    guestQuotaId(request.cookies.get(GUEST_AI_COOKIE_NAME)?.value)) return response;
  const id = randomUUID();
  response.cookies.set(GUEST_AI_COOKIE_NAME, `${id}.${guestQuotaSignature(id)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.APP_ORIGIN.startsWith("https://"),
    path: "/",
    maxAge: GUEST_AI_COOKIE_AGE_SECONDS,
  });
  return response;
}

function aiQuotaSubject(request: NextRequest) {
  const user = authenticatedUser(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (user) return { hash: `user:${user.id}`, dailyLimit: MEMBER_AI_REQUESTS_PER_DAY };

  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const userAgent = request.headers.get("user-agent") ?? "unknown";
  const key = env.SESSION_TOKEN_HMAC_KEY ?? "shelf-local-ai-quota";
  const networkHash = createHmac("sha256", key).update(`network:${forwardedFor}`).digest("hex");
  const guestId = guestQuotaId(request.cookies.get(GUEST_AI_COOKIE_NAME)?.value);
  const guestHash = guestId ?? createHmac("sha256", key)
    .update(`${forwardedFor}:${userAgent}`).digest("hex");
  return { hash: `guest:${guestHash}`, networkHash, dailyLimit: GUEST_AI_REQUESTS_PER_DAY };
}

function reserveAiBudget(
  subject: { hash: string; dailyLimit: number; networkHash?: string },
  reserveMicrousd = AI_REQUEST_RESERVE_MICROUSD,
) {
  if (!ai) throw new Error("AI_PROVIDER_UNAVAILABLE");
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
  const usedSince = (start: number) =>
    state.aiUsage
      .filter((entry) => new Date(entry.at).getTime() >= start)
      .reduce((total, entry) => total + entry.costMicrousd, 0);
  if (usedSince(dayAgo) + reserveMicrousd > env.AI_DAILY_LIMIT_USD * 1_000_000) {
    throw new Error("AI_DAILY_LIMIT_REACHED");
  }
  if (usedSince(monthAgo) + reserveMicrousd > env.AI_MONTHLY_LIMIT_USD * 1_000_000) {
    throw new Error("AI_MONTHLY_LIMIT_REACHED");
  }

  const subjectRequestsToday = state.aiUsage.filter((entry) => {
    return entry.subjectHash === subject.hash && new Date(entry.at).getTime() >= dayAgo;
  }).length;
  if (subjectRequestsToday >= subject.dailyLimit) throw new Error("AI_USER_LIMIT_REACHED");
  if (subject.networkHash) {
    const networkRequestsToday = state.aiUsage.filter((entry) =>
      entry.networkHash === subject.networkHash && new Date(entry.at).getTime() >= dayAgo).length;
    if (networkRequestsToday >= GUEST_NETWORK_REQUESTS_PER_DAY) {
      throw new Error("AI_USER_LIMIT_REACHED");
    }
  }

  const reservation = {
    id: randomUUID(),
    at: new Date(now).toISOString(),
    costMicrousd: reserveMicrousd,
    subjectHash: subject.hash,
    networkHash: subject.networkHash,
  };
  state.aiUsage.push(reservation);
  return reservation;
}

function settleAiUsage(
  reservation: { id: string } | null,
  costMicrousd?: number,
) {
  if (!reservation || costMicrousd === undefined) return;
  const usage = state.aiUsage.find((entry) => entry.id === reservation.id);
  if (usage) usage.costMicrousd = costMicrousd;
}

async function reserveDiscoveryAiBudget(
  request: NextRequest,
  reserveMicrousd = AI_REQUEST_RESERVE_MICROUSD,
) {
  return runWithRuntimeState(true, async () =>
    reserveAiBudget(aiQuotaSubject(request), reserveMicrousd));
}

async function settleDiscoveryAiUsage(reservation: { id: string }, costMicrousd: number) {
  await runWithRuntimeState(true, async () => settleAiUsage(reservation, costMicrousd));
}

async function releaseDiscoveryAiBudget(reservation: { id: string }) {
  await runWithRuntimeState(true, async () => {
    state.aiUsage = state.aiUsage.filter((entry) => entry.id !== reservation.id);
  });
}

async function recognizeWithIssuerFeeds(
  request: NextRequest,
  recognize: () => Promise<{ candidates: OwnershipCandidate[]; usageMicrousd: number }>,
): Promise<RecognitionMatch[]> {
  const reservation = await reserveDiscoveryAiBudget(request);
  const [recognition, feeds] = await Promise.allSettled([recognize(), issuerListings()]);

  // Settle provider usage even when an issuer feed fails after the AI request.
  if (recognition.status === "rejected") throw recognition.reason;
  await settleDiscoveryAiUsage(reservation, recognition.value.usageMicrousd);
  if (feeds.status === "rejected") throw feeds.reason;
  return recognitionMatches(recognition.value.candidates, feeds.value);
}

async function discoveryResponse(
  request: NextRequest,
  path: string[],
  body: Record<string, unknown>,
) {
  if (pathIs(path, "discovery", "query")) {
    const query = String(body.query ?? "").trim();
    if (!query || query.length > 120) throw new Error("INVALID_INPUT");
    const feeds = await issuerListings();

    return resolveDiscoveryQuery(query, feeds, async () => {
      if (!ai) throw new Error("AI_PROVIDER_UNAVAILABLE");
      const reservation = await reserveDiscoveryAiBudget(request);
      const result = await ai.resolveOwnership(query, REQUIRED_AI_PRIVACY);
      await settleDiscoveryAiUsage(reservation, result.usageMicrousd);
      return result.candidates;
    });
  }
  if (pathIs(path, "discovery", "barcode")) {
    const gtin = String(body.gtin ?? "");
    if (!isValidGtin(gtin)) throw new Error("INVALID_BARCODE");
    const product = await lookupBarcodeProduct(gtin);
    if (!product) return [{
      candidateId: "barcode-unresolved",
      displayLabel: `Barcode ${gtin}`,
      productId: null,
      companyId: null,
      state: "unlisted",
      confidenceBand: "low",
      sourceIds: [],
      requiresConfirmation: true,
    }] satisfies RecognitionMatch[];
    if (!ai) throw new Error("AI_PROVIDER_UNAVAILABLE");
    const matches = await recognizeWithIssuerFeeds(request, () => ai.resolveOwnership(
      [product.brand, product.name].filter(Boolean).join(" "),
      REQUIRED_AI_PRIVACY,
    ));
    return matches.map((match) => ({
      ...match,
      productIdentitySource: product.sourceUrl,
    }));
  }
  if (pathIs(path, "discovery", "link")) {
    if (!ai) throw new Error("AI_PROVIDER_UNAVAILABLE");
    const query = productNameForApprovedUrl(String(body.url));
    if (!query || query.length > 120) throw new Error("INVALID_INPUT");
    return recognizeWithIssuerFeeds(request, () => ai.resolveOwnership(query, REQUIRED_AI_PRIVACY));
  }
  if (pathIs(path, "discovery", "image")) {
    if (!ai) throw new Error("AI_PROVIDER_UNAVAILABLE");
    const mode = String(body.mode ?? "photo") as "photo" | "screenshot" | "receipt";
    if (!["photo", "screenshot", "receipt"].includes(mode)) throw new Error("INVALID_INPUT");
    const image = imageBytesFromDataUrl(body.imageDataUrl);
    return recognizeWithIssuerFeeds(request, () =>
      ai.recognize(image.bytes, image.mediaType, mode, REQUIRED_AI_PRIVACY));
  }
  return undefined;
}

async function answerResponse(request: NextRequest, body: Record<string, unknown>) {
  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question || question.length > 2_000) throw new Error("INVALID_INPUT");
  const history = readChatHistory(body.history);
  if (!body.issuer || typeof body.issuer !== "object" || Array.isArray(body.issuer)) {
    throw new Error("INVALID_INPUT");
  }
  if (!ai) throw new Error("AI_PROVIDER_UNAVAILABLE");
  const reference = body.issuer as Record<string, unknown>;
  const reservation = await reserveDiscoveryAiBudget(request, CHAT_REQUEST_RESERVE_MICROUSD);
  let context: Awaited<ReturnType<typeof exactIssuerChatContext>>;
  try {
    context = await exactIssuerChatContext(reference.provider, reference.symbol);
  } catch (error) {
    await releaseDiscoveryAiBudget(reservation);
    throw error;
  }

  const result = await ai.answer({ question, approvedFacts: [context.fact], history }, REQUIRED_AI_PRIVACY);
  await settleDiscoveryAiUsage(reservation, result.usageMicrousd);
  return {
    answer: result.answer,
    sourceIds: result.sourceIds,
    uncertainty: result.uncertainty,
    issuer: context.listing,
  };
}

async function aiResponse(path: string[], body: Record<string, unknown>, userId: string) {
  if (path[0] !== "ai") return undefined;
  if (!ai) throw new Error("AI_PROVIDER_UNAVAILABLE");
  if (pathIs(path, "ai", "shelf-summary")) {
    const user = state.users.get(userId)!;
    if (Number(body.shelfVersion) !== user.shelfVersion) throw new Error("VERSION_CONFLICT");
    const shelf = shelfView(user);
    return {
      summary: `Your shelf has ${shelf.items.length} products across ${shelf.groups.length} parent companies. Repeated brands can point to the same company.`,
      duplicateParents: shelf.groups
        .filter((group) => group.products.length > 1)
        .map((group) => group.company.id),
      categoryCounts: Object.fromEntries(
        shelf.items.map((item) => [
          item.category,
          shelf.items.filter((candidate) => candidate.category === item.category).length,
        ]),
      ),
      proposedSortIds: shelf.items.map((item) => item.id).sort(),
      sourceIds: [],
    };
  }
  if (pathIs(path, "ai", "allocation-drafts")) {
    if (!env.ENABLE_AI_ALLOCATION_SUGGESTIONS) {
      throw new Error("AI_ALLOCATION_DISABLED");
    }
    const requestedCompanyIds =
      body.companyIds === undefined
        ? state.users.get(userId)?.watchCompanyIds.slice(0, 5) ?? []
        : stringArray(body.companyIds);
    const companyIds = [...new Set(requestedCompanyIds)].filter((id) => {
      return Boolean(findCompany(id)?.instrument);
    });
    if (companyIds.length !== requestedCompanyIds.length || companyIds.length > 5) {
      throw new Error("INVALID_ALLOCATION");
    }
    const budgetRaw = String(body.budgetUsdcRaw);
    if (!/^\d+$/.test(budgetRaw)) throw new Error("INVALID_AMOUNT");
    const budget = BigInt(budgetRaw);
    if (budget > 100_000_000n || budget < BigInt(companyIds.length) * 5_000_000n) {
      throw new Error("ORDER_LIMIT");
    }
    const reservation = reserveAiBudget({
      hash: `user:${userId}`,
      dailyLimit: MEMBER_AI_REQUESTS_PER_DAY,
    });
    const proposal = await ai.draftAllocation({ companyIds }, REQUIRED_AI_PRIVACY);
    settleAiUsage(reservation, proposal.usageMicrousd);
    const id = randomUUID();
    const draft: AllocationDraft = {
      id,
      userId,
      budgetUsdcRaw: budgetRaw,
      allocations: equalAllocations(budgetRaw, proposal.companyIds),
      warnings: ["familiarity_not_valuation", "limited_universe", "token_issuer_risk"],
      status: "draft",
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    };
    state.allocationDrafts.set(id, draft);
    return draft;
  }
  return undefined;
}

async function postResponse(request: NextRequest, path: string[]) {
  const body = await jsonBody(request);

  if (pathIs(path, "auth", "challenges") || pathIs(path, "auth", "step-up-challenge")) {
    const returnPath = safeReturnTo(String(body.returnPath ?? "/"), "/");
    const challengeId = randomUUID();
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();
    const stepUpUser = pathIs(path, "auth", "step-up-challenge") ? currentUser(request) : undefined;
    const stepUpSession = stepUpUser ? currentSession(request, stepUpUser.id) : undefined;
    const purpose = String(body.purpose ?? "login");
    if (stepUpUser && ![
      "account_export",
      "activity_export",
      "account_deletion",
      "transfer",
      "admin_action",
      "logout_all",
    ].includes(purpose)) throw new Error("AUTH_INVALID");
    if (stepUpUser) {
      if (stepUpSession?.authMethod !== "email" && stepUpSession?.authMethod !== "google") {
        throw new Error("FRESH_AUTH_REQUIRED");
      }
      if (!magicIdentity || !stepUpUser.magicIssuer) throw new Error("AUTH_UNAVAILABLE");
      // Invalidating the provider session before issuing the challenge makes a new
      // OTP/MFA ceremony mandatory. A token minted from the formerly unlocked
      // Magic session can no longer satisfy this step-up.
      await magicIdentity.revokeSessions(stepUpUser.magicIssuer);
    }
    state.authChallenges.set(challengeId, {
      consumed: false,
      createdAt,
      expiresAt,
      purpose,
      userId: stepUpUser?.id,
      authMethod: stepUpSession?.authMethod,
    });
    const result = {
      challengeId,
      expiresAt,
      returnPath,
      oauthRedirectUri: env.MAGIC_GOOGLE_REDIRECT_URI,
    } satisfies LoginChallenge;
    if (stepUpSession) {
      return {
        challengeId,
        expiresAt,
        authMethod: stepUpSession.authMethod,
      } satisfies StepUpChallenge;
    }
    return result;
  }
  if (pathIs(path, "auth", "session")) {
    const challenge = state.authChallenges.get(String(body.challengeId));
    if (!challenge || new Date(challenge.expiresAt) <= new Date()) throw new Error("AUTH_INVALID");
    if (challenge.consumed) throw new Error("AUTH_REPLAYED");
    if (challenge.purpose !== "login") throw new Error("AUTH_INVALID");

    if (!magicIdentity || !env.SESSION_TOKEN_HMAC_KEY) throw new Error("AUTH_UNAVAILABLE");
    const didToken = String(body.didToken);
    const identity = await magicIdentity.verifyToken(didToken, String(body.challengeId));
    if (new Date(identity.issuedAt) < new Date(challenge.createdAt)) throw new Error("AUTH_INVALID");
    const browserWalletAddress = String(body.walletAddress ?? "");
    if (!isSolanaPublicKey(browserWalletAddress)) throw new Error("SOLANA_WALLET_INVALID");
    const adminWallet = await magicIdentity.getSolanaWallet(identity.issuer, browserWalletAddress);
    if (adminWallet.address !== browserWalletAddress) {
      throw new Error("WALLET_BINDING_MISMATCH");
    }
    consumeMagicDidToken(didToken, String(body.challengeId), identity);
    const existingUser = [...state.users.values()].find(
      (candidate) => candidate.magicIssuer === identity.issuer,
    );
    if (existingUser?.walletAddress && existingUser.walletAddress !== adminWallet.address) {
      existingUser.eligible = false;
      challenge.consumed = true;
      state.audits.push({
        action: "wallet:binding_mismatch",
        actorId: existingUser.id,
        at: new Date().toISOString(),
        reason: "Magic returned a different authoritative Solana wallet",
      });
      return { persistedError: "WALLET_BINDING_MISMATCH" } satisfies PersistedFailure;
    }
    const walletVerifiedAt = new Date().toISOString();
    const authMethod = authenticationMethod(body.method);
    const user = userForMagicIdentity({
      ...identity,
      walletAddress: adminWallet.address,
      walletVerifiedAt,
      ownerIssuer: env.OWNER_MAGIC_ISSUER,
    });
    user.invited = state.invites.some((invite) => {
      return invite.status === "active" && invite.email === identity.email?.toLowerCase();
    });
    challenge.consumed = true;
    const sessionId = randomUUID();
    const sessionToken = createSessionToken(
      {
        sessionId,
        userId: user.id,
        issuer: identity.issuer,
        sessionVersion: user.sessionVersion,
      },
      env.SESSION_TOKEN_HMAC_KEY,
    );
    state.sessions.set(sessionId, {
      userId: user.id,
      authMethod,
      expiresAt: new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000).toISOString(),
    });
    return {
      sessionToken,
      data: {
        userId: user.id,
        wallet: adminWallet.address,
        verifiedAt: walletVerifiedAt,
      },
    } satisfies AuthSessionResult;
  }

  const user = currentUser(request);
  if (pathIs(path, "wallet", "signing-challenge")) {
    if (!magicIdentity || !user.magicIssuer) {
      throw new Error("SIGNING_UNAVAILABLE");
    }
    const proposedWalletAddress = String(body.walletAddress ?? "");
    if (!isSolanaPublicKey(proposedWalletAddress)) throw new Error("SOLANA_WALLET_INVALID");
    if (user.walletAddress !== proposedWalletAddress) {
      throw new Error("WALLET_BINDING_MISMATCH");
    }
    const challengeId = randomUUID();
    const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();
    state.authChallenges.set(challengeId, {
      consumed: false,
      createdAt: new Date().toISOString(),
      expiresAt,
      purpose: `wallet_signing:${user.id}`,
      walletAddress: proposedWalletAddress,
    });
    return {
      challengeId,
      expiresAt,
      walletAddress: proposedWalletAddress,
      network: env.SOLANA_NETWORK,
      message: walletSigningMessage(challengeId, expiresAt),
      broadcast: false,
    } satisfies WalletSigningChallenge;
  }
  if (pathIs(path, "wallet", "verify-signing")) {
    const challengeId = String(body.challengeId);
    const challenge = state.authChallenges.get(challengeId);
    const challengeIsCurrent =
      challenge?.purpose === `wallet_signing:${user.id}` &&
      !challenge.consumed &&
      new Date(challenge.expiresAt) > new Date();
    if (!challenge || !challengeIsCurrent || !challenge.walletAddress) {
      throw new Error("AUTH_INVALID");
    }
    verifyWalletSigningTransaction(
      String(body.signedTransactionBase64),
      challenge.walletAddress,
      walletSigningMessage(challengeId, challenge.expiresAt),
    );
    challenge.consumed = true;
    if (user.walletAddress !== challenge.walletAddress) {
      throw new Error("WALLET_BINDING_MISMATCH");
    }
    user.walletVerifiedAt = new Date().toISOString();
    state.audits.push({
      action: "wallet:verify_binding",
      actorId: user.id,
      at: user.walletVerifiedAt,
      reason:
        "Verified control with a one-time Magic Solana transaction signature; nothing was broadcast",
    });
    return {
      verified: true,
      walletAddress: challenge.walletAddress,
      network: env.SOLANA_NETWORK,
      broadcast: false,
    } satisfies WalletSigningVerification;
  }
  if (pathIs(path, "wallet", "cancel-signing")) {
    const challengeId = String(body.challengeId);
    const challenge = state.authChallenges.get(challengeId);
    const challengeIsCurrent =
      challenge?.purpose === `wallet_signing:${user.id}` &&
      !challenge.consumed &&
      new Date(challenge.expiresAt) > new Date();
    if (!challenge || !challengeIsCurrent) throw new Error("AUTH_INVALID");

    challenge.consumed = true;
    state.audits.push({
      action: "wallet:reject_signing",
      actorId: user.id,
      at: new Date().toISOString(),
      reason: "User cancelled the explicit Shelf signing review before Magic was called",
    });
    return { cancelled: true, broadcast: false };
  }
  if (pathIs(path, "auth", "step-up")) {
    const challenge = state.authChallenges.get(String(body.challengeId));
    if (!challenge || new Date(challenge.expiresAt) <= new Date()) throw new Error("AUTH_INVALID");
    if (challenge.consumed) throw new Error("AUTH_REPLAYED");
    const purpose = String(body.purpose);
    if (challenge.purpose !== purpose) throw new Error("AUTH_INVALID");
    if (challenge.userId !== user.id) throw new Error("AUTH_INVALID");
    if (challenge.authMethod !== currentSession(request, user.id).authMethod) {
      throw new Error("AUTH_INVALID");
    }

    if (!magicIdentity) throw new Error("AUTH_UNAVAILABLE");
    const identity = await magicIdentity.verifyToken(
      String(body.didToken),
      String(body.challengeId),
    );
    if (identity.issuer !== user.magicIssuer) throw new Error("AUTH_INVALID");
    if (new Date(identity.issuedAt) < new Date(challenge.createdAt)) {
      throw new Error("FRESH_AUTH_REQUIRED");
    }
    const evidence = await magicIdentity.freshAuthEvidence(String(body.didToken));
    if (Date.now() - new Date(evidence.verifiedAt).getTime() > 5 * 60_000) {
      throw new Error("FRESH_AUTH_REQUIRED");
    }

    consumeMagicDidToken(String(body.didToken), String(body.challengeId), identity);
    challenge.consumed = true;
    const stepUpToken = randomUUID();
    const tokenHash = createHash("sha256").update(stepUpToken).digest("hex");
    state.freshAuthorizations.set(tokenHash, {
      userId: user.id,
      purpose,
      expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
    });
    return { stepUpToken };
  }

  if (path[0] === "admin") {
    requireOwner(request);
    requireFreshAuthorization(request, user.id, "admin_action");
    if (!String(body.reason ?? "").trim()) throw new Error("REASON_REQUIRED");
  }
  if (pathIs(path, "auth", "logout-all")) {
    requireFreshAuthorization(request, user.id, "logout_all");
    if (magicIdentity && user.magicIssuer) {
      await magicIdentity.revokeSessions(user.magicIssuer);
      user.sessionVersion += 1;
      return { revokedSessions: 1, providerRevocation: "magic" };
    }
    throw new Error("AUTH_UNAVAILABLE");
  }
  if (pathIs(path, "consents")) {
    const scope = String(body.scope);
    if (scope !== "ai_processing" && scope !== "shelf_context" && scope !== "terms") {
      throw new Error("INVALID_CONSENT");
    }
    const consent: ConsentRecord = {
      id: randomUUID(),
      userId: user.id,
      scope,
      version: String(body.version),
      accepted: Boolean(body.accepted),
      recordedAt: new Date().toISOString(),
    };
    state.consents.push(consent);
    return consent;
  }
  if (pathIs(path, "catalog", "reports")) {
    const report: CatalogReport = {
      id: randomUUID(),
      productId: body.productId ? String(body.productId) : null,
      relationshipId: body.relationshipId ? String(body.relationshipId) : null,
      reasonCode: String(body.reasonCode),
      safeNote: String(body.note ?? "")
        .trim()
        .slice(0, 500),
      status: "open",
    };
    state.catalogReports.push(report);
    return report;
  }

  const generated = await aiResponse(path, body, user.id);
  if (generated) return generated;

  if (pathIs(path, "shelf", "items") || pathIs(path, "shelf", "merge")) {
    return updateShelf(
      user,
      [...user.shelfProductIds, ...stringArray(body.productIds)],
      optionalInteger(body.expectedVersion),
    );
  }
  if (pathIs(path, "watchlist", "items")) {
    const companyId = String(body.companyId);
    await registerIssuerCompany(companyId);
    return updateWatchlist(user, companyId, true);
  }
  if (pathIs(path, "shelf", "share")) {
    return createShare(
      user,
      body.productIds === undefined ? [] : stringArray(body.productIds),
      body.companyIds === undefined ? [] : stringArray(body.companyIds),
    );
  }
  if (pathIs(path, "orders")) {
    if (body.type === "buy" && typeof body.companyId === "string") {
      await prepareOrderCompany(body.companyId);
    }
    if (body.type === "basket" && Array.isArray(body.allocations)) {
      const companyIds = body.allocations.flatMap((allocation) => {
        if (!allocation || typeof allocation !== "object") return [];
        const id = (allocation as { companyId?: unknown }).companyId;
        return typeof id === "string" ? [id] : [];
      });
      for (const companyId of new Set(companyIds)) await prepareOrderCompany(companyId);
    }
    if (body.type === "transfer") {
      requireFreshAuthorization(request, user.id, "transfer");
      await verifyTransferDestination(user, String(body.recipientAddress ?? ""));
    }
    return createOrder(user, body);
  }
  if (path.length === 5 && path[0] === "orders" && path[2] === "legs" && path[4] === "quote") {
    return quoteOrderLeg(user, path[1], path[3]);
  }
  if (path.length === 5 && path[0] === "orders" && path[2] === "legs" && path[4] === "prepare") {
    return prepareWalletSignature(
      user,
      path[1],
      path[3],
      String(body.reviewDigest ?? ""),
    );
  }
  if (path.length === 3 && path[0] === "preparations" && path[2] === "signature") {
    requireFinancialAccess(user);
    const preparation = state.preparations.get(path[1]);
    if (!preparation || preparation.userId !== user.id) throw new Error("NOT_FOUND");
    const leg = ownedOrder(user, preparation.orderId).legs.find((candidate) => candidate.id === preparation.legId);
    if (!leg) throw new Error("NOT_FOUND");
    if (leg.side === "buy" && state.pauses.buys) throw new Error("PURCHASES_PAUSED");
    const company = leg.companyId ? findCompany(leg.companyId) : undefined;
    if (company) await verifyIssuerForExecution(company);
    return acceptWalletSignature(user, path[1], String(body.signedTransactionBase64 ?? ""));
  }
  if (path.length === 3 && path[0] === "preparations" && path[2] === "broadcast") {
    return broadcastPreparation(user, path[1]);
  }
  if (path.length === 3 && path[0] === "orders" && path[2] === "status") {
    return reconcileOrder(user, path[1]);
  }
  if (path.length === 3 && path[0] === "orders" && path[2] === "stop") {
    return stopOrder(user, path[1]);
  }
  if (pathIs(path, "eligibility", "check")) {
    user.eligible = false;
    return {
      allowed: false,
      policyVersion: env.FINANCIAL_POLICY_VERSION,
      reasonCode: "POLICY_REVIEW_PENDING",
    };
  }
  if (pathIs(path, "wallet", "refresh")) return refreshWalletBalances(user);
  if (pathIs(path, "account", "deletion")) {
    requireFreshAuthorization(request, user.id, "account_deletion");
    if (!body.acknowledgeChainPermanence || !body.acknowledgeWalletIndependence) {
      throw new Error("ACKNOWLEDGEMENT_REQUIRED");
    }
    deleteAccountData(user);
    return {
      status: "completed",
      deleted: ["identity", "email", "wallet_binding", "sessions", "holdings", "shelf", "watchlist", "shares", "allocation_drafts", "consents", "eligibility"],
      retained: ["financial_records_without_account_identity", "anonymized_audit_event"],
      walletDeleted: false,
    };
  }
  if (pathIs(path, "admin", "pauses")) {
    requireOwner(request);
    const scope = String(body.scope);
    if (scope !== "buys" && scope !== "submissions" && scope !== "suggestions") {
      throw new Error("INVALID_PAUSE_SCOPE");
    }
    state.pauses[scope] = Boolean(body.enabled);
    state.audits.push({
      action: "pause_changed",
      scope,
      enabled: Boolean(body.enabled),
      reason: String(body.reason),
      at: new Date().toISOString(),
    });
    return state.pauses;
  }
  if (pathIs(path, "admin", "reconcile")) {
    throw new Error("RECONCILIATION_UNAVAILABLE");
  }
  if (pathIs(path, "admin", "invites")) {
    requireOwner(request);
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("INVALID_EMAIL");
    const invite = {
      id: randomUUID(),
      email,
      status: "active" as const,
      createdAt: new Date().toISOString(),
    };
    state.invites.push(invite);
    return { ...invite, email: email.replace(/(^.).*(@.*$)/, "$1••••$2") };
  }
  if (pathIs(path, "admin", "invites", "revoke")) {
    requireOwner(request);
    return revokeInvite(String(body.inviteId));
  }
  if (
    path.length === 5 &&
    path[0] === "admin" &&
    path[1] === "catalog" &&
    path[2] === "reports" &&
    path[4] === "review"
  ) {
    const decision = String(body.decision);
    if (decision !== "approved" && decision !== "rejected") {
      throw new Error("INVALID_REVIEW_DECISION");
    }
    return reviewCatalogReport(path[3], decision, user.id, String(body.reason).trim());
  }
  if (
    path[0] === "admin" &&
    ["relationships", "instruments"].includes(path[1] ?? "") &&
    path.length >= 4
  ) {
    throw new Error("ADMIN_MUTATION_UNAVAILABLE");
  }
  if (pathIs(path, "admin", "limits")) {
    throw new Error("ADMIN_MUTATION_UNAVAILABLE");
  }
  throw new Error("NOT_FOUND");
}

export async function GET(request: NextRequest, context: RouteContext<"/api/v1/[...path]">) {
  try {
    const { path } = await context.params;
    if (pathIs(path, "ai", "session")) return guestAiSessionResponse(request);
    if (path.length === 5 && path[0] === "issuer" && path[1] === "asset" &&
      path[2] === "xstocks" && path[4] === "market") {
      const requestedRange = request.nextUrl.searchParams.get("range") ?? "1D";
      if (!marketRanges.includes(requestedRange as MarketRange)) throw new Error("INVALID_INPUT");
      const range = requestedRange as MarketRange;
      const { listing } = await exactIssuerAsset("xstocks", path[3]);
      if (!listing || listing.provider !== "xstocks") throw new Error("NOT_FOUND");

      const checkedAt = new Date().toISOString();
      const pool = await dexMarkets.markets([listing.asset.mint])
        .then(({ markets }) => markets[0])
        .catch(() => undefined);
      let candles: IssuerMarketView["candles"] = [];
      if (pool) {
        candles = await fetchPoolCandles(pool.pairAddress, listing.asset.mint, range)
          .catch(() => []);
      }
      const marketView: IssuerMarketView = {
        state: pool ? "available" : "unavailable",
        range,
        checkedAt,
        priceUsd: pool?.priceUsd,
        change24hPct: pool?.change24hPct,
        liquidityUsd: pool?.liquidityUsd,
        venue: pool?.venue,
        poolAddress: pool?.pairAddress,
        candles,
      };
      const response = success(marketView);
      response.headers.set("Cache-Control", "public, max-age=30, s-maxage=180, stale-while-revalidate=300");
      return response;
    }
    if (path.length === 5 && path[0] === "issuer" && path[1] === "asset" &&
      path[2] === "xstocks" && path[4] === "disclosures") {
      const response = success(await xStocks.disclosures(path[3]));
      response.headers.set("Cache-Control", "public, max-age=15, s-maxage=60, stale-while-revalidate=30");
      return response;
    }
    if (pathIs(path, "issuer", "directory")) {
      const snapshot = await readIssuerDirectory().catch(() => null);
      const directory = snapshot ?? buildIssuerDirectory(await issuerListings());
      const response = success(directory);
      if (!directory.unavailable.length && !directory.stale.length) {
        response.headers.set("Cache-Control", "public, max-age=300, s-maxage=300, stale-while-revalidate=600");
      }
      return response;
    }
    if (pathIs(path, "home", "highlights")) {
      const feed = await xStocksListings();
      if (feed.state !== "current") throw new Error("XSTOCKS_UNAVAILABLE");
      const { markets, incomplete } = await dexMarkets.markets(feed.listings.map((listing) => listing.mint));
      const response = success({
        items: selectHomeHighlights(feed.listings, markets),
        checkedAt: new Date().toISOString(),
        incomplete,
      });
      response.headers.set("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=300");
      return response;
    }
    if (path[0] === "markets" && path[1] === "history" && path[2]) {
      return runWithRuntimeState(false, async () => success(await marketHistory(path[2])));
    }
    if (
      pathIs(path, "issuer", "search") ||
      pathIs(path, "issuer", "reviewed") ||
      (path.length === 4 && path[0] === "issuer" && path[1] === "asset") ||
      pathIs(path, "catalog", "prestocks") ||
      pathIs(path, "catalog", "xstocks")
    ) {
      return success(await getResponse(request, path));
    }
    const consumesAuthorization =
      pathIs(path, "account", "export") || pathIs(path, "exports", "activity");
    return await runWithRuntimeState(consumesAuthorization, async () => {
      return success(await getResponse(request, path));
    });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: NextRequest, context: RouteContext<"/api/v1/[...path]">) {
  try {
    const { path } = await context.params;
    if (path[0] === "discovery") {
      assertMutationRequest(request);
      const result = await discoveryResponse(request, path, await jsonBody(request));
      if (!result) throw new Error("NOT_FOUND");
      return success(result, 201);
    }
    if (pathIs(path, "ai", "answer")) {
      assertMutationRequest(request);
      return success(await answerResponse(request, await jsonBody(request)), 201);
    }
    return await runWithRuntimeState(true, async () => {
      assertMutationRequest(request);
      const result = await postResponse(request, path);
      if (isPersistedFailure(result)) return failure(new Error(result.persistedError));
      if (isAuthSessionResult(result)) {
        const response = success(result.data, 201);
        setSessionCookie(response, result.sessionToken, SESSION_MAX_AGE_SECONDS);
        return response;
      }
      if (pathIs(path, "auth", "logout-all")) {
        const response = success(result, 201);
        setSessionCookie(response, "", 0);
        return response;
      }
      if (pathIs(path, "account", "deletion")) {
        const response = success(result, 201);
        setSessionCookie(response, "", 0);
        return response;
      }
      return success(result, 201);
    });
  } catch (error) {
    return failure(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext<"/api/v1/[...path]">) {
  try {
    return await runWithRuntimeState(true, async () => {
      assertMutationRequest(request);
      const { path } = await context.params;
      const user = currentUser(request);
      const body = await jsonBody(request);
      if (!pathIs(path, "shelf")) throw new Error("NOT_FOUND");
      if (body.name) user.shelfName = String(body.name).trim().slice(0, 60);
      return success(
        updateShelf(
          user,
          body.itemOrderIds === undefined
            ? user.shelfProductIds
            : stringArray(body.itemOrderIds),
          optionalInteger(body.expectedVersion),
        ),
      );
    });
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext<"/api/v1/[...path]">) {
  try {
    return await runWithRuntimeState(true, async () => {
      assertMutationRequest(request);
      const { path } = await context.params;
      if (pathIs(path, "auth", "session")) {
        const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
        const claims = env.SESSION_TOKEN_HMAC_KEY
          ? readSessionToken(sessionToken, env.SESSION_TOKEN_HMAC_KEY)
          : undefined;
        if (claims) {
          const session = state.sessions.get(claims.sessionId);
          if (session) session.revokedAt = new Date().toISOString();
        }
        const response = success({ revoked: true });
        setSessionCookie(response, "", 0);
        return response;
      }
      const user = currentUser(request);
      if (path[0] === "shelf" && path[1] === "items" && path[2]) {
        return success(
          updateShelf(
            user,
            user.shelfProductIds.filter((id) => id !== path[2]),
          ),
        );
      }
      if (path[0] === "watchlist" && path[1] === "items" && path[2]) {
        return success(updateWatchlist(user, path[2], false));
      }
      if (path[0] === "shelf" && path[1] === "shares" && path[2]) {
        const share = state.shares.get(path[2]);
        if (!share || share.userId !== user.id) throw new Error("NOT_FOUND");
        share.revoked = true;
        return success({ revoked: true });
      }
      if (path[0] === "admin" && path[1] === "invites" && path[2]) {
        requireOwner(request);
        requireFreshAuthorization(request, user.id, "admin_action");
        return success(revokeInvite(path[2]));
      }
      throw new Error("NOT_FOUND");
    });
  } catch (error) {
    return failure(error);
  }
}
