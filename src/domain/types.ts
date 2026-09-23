export type Category = "groceries" | "beauty" | "electronics" | "clothing" | "household";

export type Source = {
  id: string;
  title: string;
  publisher: string;
  url: string;
  verifiedAt: string;
};

export type Company = {
  id: string;
  slug: string;
  name: string;
  aliases?: string[];
  ticker: string;
  exchange: string;
  description: string;
  instrument: null | {
    id: string;
    symbol: string;
    issuer: string;
    provider: "xstocks" | "prestocks";
    assetClass: "public_equity_token" | "pre_ipo_exposure";
    referenceUrl: string;
    mint: string;
    tokenProgram: "spl-token" | "token-2022";
    decimals: number;
    capabilities: { buy: boolean; sell: boolean; transfer: boolean };
    lifecycle?: {
      state: "active" | "transition";
      title: string;
      description: string;
      deadline?: string;
      successorSymbol?: string;
      sourceUrl: string;
    };
  };
};

export type MarketHistoryPoint = {
  observedAt: string;
  markPriceUsd?: string;
  tokenPriceUsd?: string;
  referencePriceUsd?: string;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: Category;
  companyId: string;
  relationship: "global_parent" | "subsidiary_owner" | "licensee";
  sourceIds: string[];
  region: string;
};

export type Brand = {
  slug: string;
  name: string;
  productIds: string[];
  companyRelationships: Array<{
    companyId: string;
    relationship: Product["relationship"];
    region: string;
    productIds: string[];
    sourceIds: string[];
  }>;
};

export type RecognitionMatch = {
  candidateId: string;
  displayLabel: string;
  productId: string | null;
  companyId: string | null;
  ownerName?: string;
  matchedIssuerName?: string;
  issuer?: "xstocks" | "prestocks";
  symbol?: string;
  mint?: string;
  feedStale?: boolean;
  feedUnavailable?: boolean;
  productIdentitySource?: string;
  state: "matched" | "unlisted";
  confidenceBand: "high" | "low";
  sourceIds: string[];
  requiresConfirmation: true;
};

export const userRoles = ["member", "owner"] as const;
export type UserRole = (typeof userRoles)[number];

export const legStates = [
  "draft",
  "quoted",
  "prepared",
  "awaiting_signature",
  "signed",
  "submitted",
  "confirmed",
  "finalized",
  "failed",
  "outcome_unknown",
  "cancelled",
  "expired",
] as const;
type LegState = (typeof legStates)[number];
export const orderStates = [
  "draft",
  "in_progress",
  "awaiting_user",
  "complete",
  "partially_complete",
  "failed",
  "stopped",
  "outcome_unknown",
] as const;
type OrderState = (typeof orderStates)[number];

type OrderType = "buy" | "basket" | "sell" | "transfer";

type InventoryScope = "cash" | "tracked" | "external";

export type OrderLeg = {
  id: string;
  position: number;
  companyId?: string;
  instrumentId?: string;
  side: "buy" | "sell" | "transfer";
  inventoryScope: InventoryScope;
  requestedInputRaw: string;
  recipientAddress?: string;
  status: LegState;
  quote?: Quote;
  signature?: string;
};

export type Quote = {
  id: string;
  version: number;
  inputRaw: string;
  estimatedOutputRaw: string;
  minimumOutputRaw: string;
  feeRaw: string;
  feeBps: number;
  slippageBps: number | null;
  priceImpactBps: number | null;
  expiresAt: string;
  reviewDigest: string;
  routeLabel: string;
  estimatedLamports: string;
  source: "jupiter";
  executionAvailable: boolean;
  executionBlockReason?: "SPONSOR_ACTIVATION_PENDING";
  transactionMessageHash?: string;
};

export type Order = {
  id: string;
  userId: string;
  clientIntentId: string;
  type: OrderType;
  status: OrderState;
  version: number;
  budgetUsdcRaw?: string;
  legs: OrderLeg[];
  createdAt: string;
};

export type Holding = {
  instrumentId: string;
  companyId: string;
  symbol: string;
  rawAmount: string;
  reservedRaw: string;
  externalRaw: string;
  decimals: number;
  multiplier: string;
  totalCostUsdcRaw: string;
};

export type FinancialRecord = {
  id: string;
  type: "buy" | "sell" | "transfer" | "deposit" | "corporate_action";
  status: "pending" | "failed" | "finalized";
  recordedAt: string;
  asset: string;
  rawAmount: string;
  usdcRaw: string;
  feeRaw: string;
  signature?: string;
  multiplier: string;
};
