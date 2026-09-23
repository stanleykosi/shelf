export type PrivacyPolicy = { dataCollection: "deny"; zdr: true; requireParameters: true };
export const REQUIRED_AI_PRIVACY: PrivacyPolicy = {
  dataCollection: "deny",
  zdr: true,
  requireParameters: true,
};

export interface IdentityProvider {
  verifyToken(token: string, challengeId: string): Promise<{
    issuer: string;
    email?: string;
    issuedAt: string;
    expiresAt: string;
  }>;
  getSolanaWallet(
    issuer: string,
    expectedAddress: string,
  ): Promise<{ address: string; network: string }>;
  freshAuthEvidence(token: string): Promise<{ verifiedAt: string }>;
  revokeSessions(issuer: string): Promise<void>;
}

export interface VisionProvider {
  recognize(
    input: Uint8Array,
    mediaType: "image/jpeg" | "image/png" | "image/webp",
    task: "photo" | "screenshot" | "receipt",
    policy: PrivacyPolicy,
  ): Promise<{ candidates: OwnershipCandidate[]; usageMicrousd: number }>;
}

export type OwnershipCandidate = { productName: string; companyNames: string[] };

export interface EducationProvider {
  answer(
    input: {
      question: string;
      approvedFacts: Array<{ id: string; title: string; claim: string }>;
    },
    policy: PrivacyPolicy,
  ): Promise<{
    answer: string;
    sourceIds: string[];
    uncertainty: string[];
    usageMicrousd: number;
  }>;
  draftAllocation(
    input: { companyIds: string[] },
    policy: PrivacyPolicy,
  ): Promise<{
    companyIds: string[];
    rationales: Record<string, string>;
    usageMicrousd: number;
  }>;
}

export type ExactInputQuoteRequest = {
  inputMint: string;
  outputMint: string;
  rawAmount: string;
  taker: string;
  payer: string;
  feeAccount: string;
  feeBps: number;
  tokenProgramsByMint?: Record<string, string>;
};

type ExactInputQuote = {
  outputRaw: string;
  minOutputRaw: string;
  priceImpactBps: number;
  routeDigest: string;
};

export interface QuoteProvider {
  buildExactInput(input: ExactInputQuoteRequest): Promise<ExactInputQuote>;
}

export interface ChainProvider {
  networkIdentity(): Promise<{ network: string; genesisHash: string }>;
  balances(address: string): Promise<Record<string, string>>;
  blockHeight(commitment?: "confirmed" | "finalized"): Promise<number>;
  simulate(bytes: Uint8Array): Promise<{ unitsConsumed: number | null }>;
  broadcast(bytes: Uint8Array): Promise<{ signature: string }>;
  signatureStatus(signature: string): Promise<
    "not_found" | "processed" | "confirmed" | "finalized" | "pending_failure" | "failed"
  >;
}

export interface SponsorSigner {
  signOnlyValidatedPreparation(preparationId: string): Promise<Uint8Array>;
}
