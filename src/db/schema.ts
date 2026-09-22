import {
  bigint,
  boolean,
  check,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { legStates, orderStates, userRoles } from "@/domain/types";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};
export const userStatus = pgEnum("user_status", [
  "invited",
  "active",
  "suspended",
  "deleting",
  "deleted",
]);
export const userRole = pgEnum("user_role", userRoles);
export const legStatus = pgEnum("leg_status", legStates);
export const orderStatus = pgEnum("order_status", orderStates);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    magicAppId: text("magic_app_id").notNull(),
    magicIssuer: text("magic_issuer").notNull(),
    emailCiphertext: text("email_ciphertext"),
    emailLookupHmac: text("email_lookup_hmac"),
    status: userStatus("status").notNull(),
    role: userRole("role").notNull().default("member"),
    termsVersion: text("terms_version"),
    privacyVersion: text("privacy_version"),
    consentedAt: timestamp("consented_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [uniqueIndex("users_magic_subject_idx").on(table.magicAppId, table.magicIssuer)],
);

export const wallets = pgTable(
  "wallets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    network: text("network").notNull(),
    chainGenesisHash: text("chain_genesis_hash").notNull(),
    address: text("address").notNull(),
    provider: text("provider").notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull(),
    bindingVersion: integer("binding_version").notNull().default(1),
    status: text("status").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("wallet_user_network_idx").on(table.userId, table.network),
    uniqueIndex("wallet_network_address_idx").on(table.network, table.address),
  ],
);
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  tokenHash: text("token_hash").notNull().unique(),
  csrfHash: text("csrf_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull(),
  reauthenticatedAt: timestamp("reauthenticated_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  ...timestamps,
});
export const authChallenges = pgTable("auth_challenges", {
  id: uuid("id").primaryKey().defaultRandom(),
  purpose: text("purpose").notNull(),
  nonceHash: text("nonce_hash").notNull().unique(),
  sessionBindingHash: text("session_binding_hash").notNull(),
  returnPath: text("return_path").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export const authTokenUses = pgTable("auth_token_uses", {
  tokenDigest: text("token_digest").primaryKey(),
  challengeId: uuid("challenge_id")
    .notNull()
    .references(() => authChallenges.id),
  issuerHash: text("issuer_hash").notNull(),
  providerExpiresAt: timestamp("provider_expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }).defaultNow().notNull(),
});
export const betaInvites = pgTable("beta_invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  emailHmac: text("email_hmac").notNull(),
  status: text("status").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  acceptedUserId: uuid("accepted_user_id").references(() => users.id),
  createdBy: uuid("created_by").references(() => users.id),
  ...timestamps,
});
export const eligibilityChecks = pgTable("eligibility_checks", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  policyVersion: text("policy_version").notNull(),
  assetScope: text("asset_scope").notNull(),
  residenceCountry: text("residence_country").notNull(),
  locationCountry: text("location_country"),
  adultAttested: boolean("adult_attested").notNull(),
  declarationCodes: jsonb("declaration_codes").$type<string[]>().notNull(),
  capabilityResults: jsonb("capability_results").notNull(),
  evidenceReference: text("evidence_reference"),
  checkedAt: timestamp("checked_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
export const consents = pgTable("consents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  guestSessionHash: text("guest_session_hash"),
  scope: text("scope").notNull(),
  version: text("version").notNull(),
  decision: boolean("decision").notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).defaultNow().notNull(),
});
export const deletionRequests = pgTable("deletion_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  status: text("status").notNull(),
  requestedAt: timestamp("requested_at", { withTimezone: true }).defaultNow().notNull(),
  pendingFinancialReason: text("pending_financial_reason"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  retentionPolicyVersion: text("retention_policy_version").notNull(),
});
export const rateWindows = pgTable(
  "rate_windows",
  {
    subjectHmac: text("subject_hmac").notNull(),
    operation: text("operation").notNull(),
    bucketStart: timestamp("bucket_start", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(0),
    reservedCostMicrousd: bigint("reserved_cost_microusd", { mode: "bigint" })
      .notNull()
      .default(sql`0`),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.subjectHmac, table.operation, table.bucketStart] }),
    check("rate_windows_count_nonnegative", sql`${table.count} >= 0`),
  ],
);

export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  legalName: text("legal_name").notNull(),
  shortName: text("short_name").notNull(),
  listingTicker: text("listing_ticker"),
  exchange: text("exchange"),
  description: text("description").notNull(),
  status: text("status").notNull(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }).notNull(),
  ...timestamps,
});
export const brands = pgTable("brands", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  normalizedName: text("normalized_name").notNull(),
  aliases: jsonb("aliases").$type<string[]>().notNull(),
  category: text("category").notNull(),
  ...timestamps,
});
export const sources = pgTable("sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  canonicalUrl: text("canonical_url").notNull(),
  publisher: text("publisher").notNull(),
  title: text("title").notNull(),
  type: text("type").notNull(),
  readAt: timestamp("read_at", { withTimezone: true }).notNull(),
  shortClaimSummary: text("short_claim_summary").notNull(),
  contentHash: text("content_hash"),
  licenseNotes: text("license_notes"),
  status: text("status").notNull(),
  ...timestamps,
});
export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  brandId: uuid("brand_id")
    .notNull()
    .references(() => brands.id),
  name: text("name").notNull(),
  productFamily: text("product_family"),
  category: text("category").notNull(),
  regionScope: jsonb("region_scope").$type<string[]>().notNull(),
  imageAssetId: uuid("image_asset_id"),
  status: text("status").notNull(),
  ...timestamps,
});
export const relationships = pgTable("relationships", {
  id: uuid("id").primaryKey().defaultRandom(),
  brandId: uuid("brand_id")
    .notNull()
    .references(() => brands.id),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id),
  type: text("type").notNull(),
  regionScope: jsonb("region_scope").$type<string[]>().notNull(),
  validFrom: timestamp("valid_from", { withTimezone: true }).notNull(),
  validTo: timestamp("valid_to", { withTimezone: true }),
  status: text("status").notNull(),
  sourceIds: jsonb("source_ids").$type<string[]>().notNull(),
  verifiedBy: uuid("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  reviewDueAt: timestamp("review_due_at", { withTimezone: true }),
  ...timestamps,
});
export const productBarcodes = pgTable(
  "product_barcodes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    gtin: text("gtin").notNull(),
    regionScope: text("region_scope").notNull(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id),
    verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull(),
  },
  (table) => [uniqueIndex("barcode_gtin_region_idx").on(table.gtin, table.regionScope)],
);
export const catalogAssets = pgTable("catalog_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  storagePathOrSafeUrl: text("storage_path_or_safe_url").notNull(),
  altText: text("alt_text").notNull(),
  sourceId: uuid("source_id")
    .notNull()
    .references(() => sources.id),
  license: text("license").notNull(),
  attribution: text("attribution"),
  dimensions: jsonb("dimensions").notNull(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }).notNull(),
});
export const instruments = pgTable(
  "instruments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    issuerName: text("issuer_name").notNull(),
    symbol: text("symbol").notNull(),
    underlyingIdentifier: text("underlying_identifier").notNull(),
    mint: text("mint").notNull(),
    tokenProgram: text("token_program").notNull(),
    network: text("network").notNull(),
    decimals: integer("decimals").notNull(),
    extensionAllowlist: jsonb("extension_allowlist").$type<string[]>().notNull(),
    eligibilityPolicyId: text("eligibility_policy_id").notNull(),
    buyEnabled: boolean("buy_enabled").notNull().default(false),
    sellEnabled: boolean("sell_enabled").notNull().default(false),
    transferEnabled: boolean("transfer_enabled").notNull().default(false),
    reviewState: text("review_state").notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("instrument_network_mint_idx").on(table.network, table.mint)],
);
export const mintSnapshots = pgTable(
  "mint_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instrumentId: uuid("instrument_id")
      .notNull()
      .references(() => instruments.id),
    slot: bigint("slot", { mode: "bigint" }).notNull(),
    rawSupply: numeric("raw_supply", { precision: 78, scale: 0 }),
    decimals: integer("decimals").notNull(),
    tokenProgram: text("token_program").notNull(),
    freezeAuthority: text("freeze_authority"),
    extensions: jsonb("extensions").notNull(),
    activeMultiplierDecimal: text("active_multiplier_decimal").notNull(),
    multiplierBits: text("multiplier_bits"),
    nextMultiplierDecimal: text("next_multiplier_decimal"),
    effectiveAt: timestamp("effective_at", { withTimezone: true }),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
  },
  (table) => [uniqueIndex("mint_snapshot_slot_idx").on(table.instrumentId, table.slot)],
);
export const multiplierSnapshots = pgTable("multiplier_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  instrumentId: uuid("instrument_id")
    .notNull()
    .references(() => instruments.id),
  source: text("source").notNull(),
  valueDecimal: text("value_decimal").notNull(),
  valueBits: text("value_bits"),
  validFrom: timestamp("valid_from", { withTimezone: true }).notNull(),
  validTo: timestamp("valid_to", { withTimezone: true }),
  observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
  sourceReference: text("source_reference").notNull(),
});
export const marketSnapshots = pgTable("market_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  instrumentId: uuid("instrument_id")
    .notNull()
    .references(() => instruments.id),
  source: text("source").notNull(),
  marketState: text("market_state").notNull(),
  price: numeric("price", { precision: 38, scale: 18 }),
  currency: text("currency").notNull(),
  unit: text("unit").notNull(),
  observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
  sourceAsOf: timestamp("source_as_of", { withTimezone: true }),
  normalizationVersion: text("normalization_version").notNull(),
  usable: boolean("usable").notNull(),
});
export const corporateActions = pgTable(
  "corporate_actions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instrumentId: uuid("instrument_id")
      .notNull()
      .references(() => instruments.id),
    externalId: text("external_id").notNull(),
    type: text("type").notNull(),
    announcedAt: timestamp("announced_at", { withTimezone: true }),
    effectiveAt: timestamp("effective_at", { withTimezone: true }).notNull(),
    status: text("status").notNull(),
    oldMultiplier: text("old_multiplier"),
    newMultiplier: text("new_multiplier"),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id),
    descriptionVersion: text("description_version").notNull(),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("corporate_action_external_idx").on(table.instrumentId, table.externalId),
  ],
);
export const learningArticles = pgTable(
  "learning_articles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    approvedBody: text("approved_body").notNull(),
    sourceIds: jsonb("source_ids").$type<string[]>().notNull(),
    version: integer("version").notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }).notNull(),
    status: text("status").notNull(),
  },
  (table) => [uniqueIndex("learning_article_version_idx").on(table.slug, table.version)],
);
export const catalogReports = pgTable("catalog_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  subjectHmac: text("subject_hmac"),
  productId: uuid("product_id").references(() => products.id),
  relationshipId: uuid("relationship_id").references(() => relationships.id),
  reasonCode: text("reason_code").notNull(),
  safeNote: text("safe_note"),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const shelves = pgTable("shelves", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id)
    .unique(),
  name: text("name").notNull(),
  version: integer("version").notNull().default(1),
  ...timestamps,
});
export const shelfItems = pgTable(
  "shelf_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shelfId: uuid("shelf_id")
      .notNull()
      .references(() => shelves.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    sortKey: integer("sort_key").notNull(),
    addedAt: timestamp("added_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("shelf_product_idx").on(table.shelfId, table.productId)],
);
export const shelfMerges = pgTable(
  "shelf_merges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    mergeId: uuid("merge_id").notNull(),
    requestHash: text("request_hash").notNull(),
    resultIds: jsonb("result_ids").$type<string[]>().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull(),
  },
  (table) => [uniqueIndex("shelf_merge_user_idx").on(table.userId, table.mergeId)],
);
export const shareLinks = pgTable("share_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id),
  shelfId: uuid("shelf_id")
    .notNull()
    .references(() => shelves.id),
  tokenHash: text("token_hash").notNull().unique(),
  snapshot: jsonb("snapshot").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export const aiRuns = pgTable("ai_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  subjectHmac: text("subject_hmac"),
  task: text("task").notNull(),
  modelId: text("model_id").notNull(),
  providerId: text("provider_id"),
  promptVersion: text("prompt_version").notNull(),
  schemaVersion: text("schema_version").notNull(),
  inputKind: text("input_kind").notNull(),
  candidateCount: integer("candidate_count").notNull(),
  status: text("status").notNull(),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  costMicrousd: bigint("cost_microusd", { mode: "bigint" }),
  latencyMs: integer("latency_ms"),
  errorCode: text("error_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export const allocationDrafts = pgTable("allocation_drafts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  companyAmounts: jsonb("company_amounts").notNull(),
  budgetRaw: numeric("budget_raw", { precision: 78, scale: 0 }).notNull(),
  sourceIds: jsonb("source_ids").$type<string[]>().notNull(),
  policyVersion: text("policy_version").notNull(),
  modelRunId: uuid("model_run_id").references(() => aiRuns.id),
  status: text("status").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    walletId: uuid("wallet_id")
      .notNull()
      .references(() => wallets.id),
    clientIntentId: uuid("client_intent_id").notNull(),
    network: text("network").notNull(),
    type: text("type").notNull(),
    status: orderStatus("status").notNull(),
    budgetUsdcRaw: numeric("budget_usdc_raw", { precision: 78, scale: 0 }),
    policyVersion: text("policy_version").notNull(),
    feeBps: integer("fee_bps").notNull(),
    version: integer("version").notNull().default(1),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [uniqueIndex("order_intent_idx").on(table.userId, table.clientIntentId)],
);
export const orderLegs = pgTable(
  "order_legs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    position: integer("position").notNull(),
    side: text("side").notNull(),
    companyId: uuid("company_id").references(() => companies.id),
    instrumentId: uuid("instrument_id").references(() => instruments.id),
    inventoryScope: text("inventory_scope").notNull(),
    inputMint: text("input_mint").notNull(),
    outputMint: text("output_mint"),
    requestedInputRaw: numeric("requested_input_raw", { precision: 78, scale: 0 }).notNull(),
    allocationUsdcRaw: numeric("allocation_usdc_raw", { precision: 78, scale: 0 }),
    recipientAddress: text("recipient_address"),
    status: legStatus("status").notNull(),
    currentPreparationId: uuid("current_preparation_id"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("leg_position_idx").on(table.orderId, table.position),
    check("leg_requested_nonnegative", sql`${table.requestedInputRaw} >= 0`),
  ],
);
export const quotes = pgTable("quotes", {
  id: uuid("id").primaryKey().defaultRandom(),
  legId: uuid("leg_id")
    .notNull()
    .references(() => orderLegs.id),
  version: integer("version").notNull(),
  provider: text("provider").notNull(),
  inputRaw: numeric("input_raw", { precision: 78, scale: 0 }).notNull(),
  outputRaw: numeric("output_raw", { precision: 78, scale: 0 }).notNull(),
  minOutputRaw: numeric("min_output_raw", { precision: 78, scale: 0 }).notNull(),
  feeMint: text("fee_mint").notNull(),
  feeRaw: numeric("fee_raw", { precision: 78, scale: 0 }).notNull(),
  feeBps: integer("fee_bps").notNull(),
  slippageBps: integer("slippage_bps"),
  priceImpactBps: integer("price_impact_bps"),
  routeDigest: text("route_digest").notNull(),
  mintSnapshotIds: jsonb("mint_snapshot_ids").$type<string[]>().notNull(),
  obtainedAt: timestamp("obtained_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  normalizedResponse: jsonb("normalized_response").notNull(),
});
export const preparations = pgTable(
  "preparations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    legId: uuid("leg_id")
      .notNull()
      .references(() => orderLegs.id),
    quoteId: uuid("quote_id")
      .notNull()
      .references(() => quotes.id),
    version: integer("version").notNull(),
    messageHash: text("message_hash").notNull(),
    canonicalMessageBase64Encrypted: text("canonical_message_base64_encrypted").notNull(),
    expectedSigners: jsonb("expected_signers").$type<string[]>().notNull(),
    accountManifest: jsonb("account_manifest").notNull(),
    blockhash: text("blockhash").notNull(),
    lastValidBlockHeight: bigint("last_valid_block_height", { mode: "bigint" }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    state: text("state").notNull(),
    policyVersion: text("policy_version").notNull(),
    reviewDigest: text("review_digest").notNull(),
  },
  (table) => [uniqueIndex("preparation_version_idx").on(table.legId, table.version)],
);
export const reservations = pgTable("reservations", {
  id: uuid("id").primaryKey().defaultRandom(),
  walletId: uuid("wallet_id")
    .notNull()
    .references(() => wallets.id),
  legId: uuid("leg_id")
    .notNull()
    .references(() => orderLegs.id),
  mint: text("mint").notNull(),
  rawAmount: numeric("raw_amount", { precision: 78, scale: 0 }).notNull(),
  state: text("state").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  releaseReason: text("release_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export const walletOperationLocks = pgTable("wallet_operation_locks", {
  walletId: uuid("wallet_id")
    .primaryKey()
    .references(() => wallets.id),
  activeLegId: uuid("active_leg_id")
    .notNull()
    .references(() => orderLegs.id),
  fenceVersion: integer("fence_version").notNull(),
  state: text("state").notNull(),
  acquiredAt: timestamp("acquired_at", { withTimezone: true }).notNull(),
});
export const submissions = pgTable(
  "submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    preparationId: uuid("preparation_id")
      .notNull()
      .references(() => preparations.id)
      .unique(),
    network: text("network").notNull(),
    signature: text("signature").notNull(),
    messageHash: text("message_hash").notNull(),
    signedBytesEncrypted: text("signed_bytes_encrypted"),
    state: text("state").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    observedSlot: bigint("observed_slot", { mode: "bigint" }),
    finalizedAt: timestamp("finalized_at", { withTimezone: true }),
    errorCode: text("error_code"),
  },
  (table) => [uniqueIndex("submission_signature_idx").on(table.network, table.signature)],
);
export const chainEvents = pgTable(
  "chain_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    network: text("network").notNull(),
    signature: text("signature").notNull(),
    instructionIndex: integer("instruction_index").notNull(),
    eventKind: text("event_kind").notNull(),
    walletId: uuid("wallet_id")
      .notNull()
      .references(() => wallets.id),
    mint: text("mint").notNull().default(""),
    rawDelta: numeric("raw_delta", { precision: 78, scale: 0 }),
    slot: bigint("slot", { mode: "bigint" }).notNull(),
    blockTime: timestamp("block_time", { withTimezone: true }),
    transactionDigest: text("transaction_digest").notNull(),
  },
  (table) => [
    uniqueIndex("chain_event_identity_idx").on(
      table.network,
      table.signature,
      table.instructionIndex,
      table.eventKind,
      table.mint,
      table.walletId,
    ),
  ],
);
export const acquisitionLots = pgTable("acquisition_lots", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  instrumentId: uuid("instrument_id")
    .notNull()
    .references(() => instruments.id),
  buyEventId: uuid("buy_event_id").notNull().unique(),
  acquiredRaw: numeric("acquired_raw", { precision: 78, scale: 0 }).notNull(),
  remainingRaw: numeric("remaining_raw", { precision: 78, scale: 0 }).notNull(),
  totalCostUsdcRaw: numeric("total_cost_usdc_raw", { precision: 78, scale: 0 }).notNull(),
  multiplierSnapshotId: uuid("multiplier_snapshot_id").notNull(),
  acquiredAt: timestamp("acquired_at", { withTimezone: true }).notNull(),
});
export const lotDispositions = pgTable(
  "lot_dispositions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lotId: uuid("lot_id")
      .notNull()
      .references(() => acquisitionLots.id),
    eventId: uuid("event_id").notNull(),
    kind: text("kind").notNull(),
    disposedRaw: numeric("disposed_raw", { precision: 78, scale: 0 }).notNull(),
    attributedCostUsdcRaw: numeric("attributed_cost_usdc_raw", {
      precision: 78,
      scale: 0,
    }).notNull(),
    proceedsUsdcRaw: numeric("proceeds_usdc_raw", { precision: 78, scale: 0 }),
  },
  (table) => [uniqueIndex("lot_disposition_event_idx").on(table.lotId, table.eventId)],
);
export const inventoryJournal = pgTable("inventory_journal", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  instrumentId: uuid("instrument_id").references(() => instruments.id),
  mint: text("mint").notNull(),
  eventId: uuid("event_id").notNull(),
  kind: text("kind").notNull(),
  trackedDeltaRaw: numeric("tracked_delta_raw", { precision: 78, scale: 0 }).notNull(),
  externalDeltaRaw: numeric("external_delta_raw", { precision: 78, scale: 0 }).notNull(),
  cashDeltaRaw: numeric("cash_delta_raw", { precision: 78, scale: 0 }),
  snapshotId: uuid("snapshot_id"),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).defaultNow().notNull(),
});
export const walletBalanceSnapshots = pgTable("wallet_balance_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  walletId: uuid("wallet_id")
    .notNull()
    .references(() => wallets.id),
  mint: text("mint").notNull(),
  tokenAccount: text("token_account").notNull(),
  rawAmount: numeric("raw_amount", { precision: 78, scale: 0 }).notNull(),
  slot: bigint("slot", { mode: "bigint" }).notNull(),
  commitment: text("commitment").notNull(),
  observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
});
export const financialRecords = pgTable("financial_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  orderId: uuid("order_id").references(() => orders.id),
  eventId: uuid("event_id"),
  type: text("type").notNull(),
  status: text("status").notNull(),
  amounts: jsonb("amounts").notNull(),
  signature: text("signature"),
  unitSnapshots: jsonb("unit_snapshots").notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).defaultNow().notNull(),
});
export const feeRecords = pgTable(
  "fee_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    legId: uuid("leg_id")
      .notNull()
      .references(() => orderLegs.id),
    eventId: uuid("event_id").notNull(),
    feeMint: text("fee_mint").notNull(),
    expectedRaw: numeric("expected_raw", { precision: 78, scale: 0 }).notNull(),
    actualRaw: numeric("actual_raw", { precision: 78, scale: 0 }).notNull(),
    recipientTokenAccount: text("recipient_token_account").notNull(),
    status: text("status").notNull(),
  },
  (table) => [uniqueIndex("fee_leg_event_idx").on(table.legId, table.eventId)],
);
export const sponsorBudgets = pgTable(
  "sponsor_budgets",
  {
    scope: text("scope").notNull(),
    scopeId: text("scope_id").notNull(),
    utcDate: text("utc_date").notNull(),
    limitLamports: bigint("limit_lamports", { mode: "bigint" }).notNull(),
    reservedLamports: bigint("reserved_lamports", { mode: "bigint" })
      .notNull()
      .default(sql`0`),
    spentLamports: bigint("spent_lamports", { mode: "bigint" })
      .notNull()
      .default(sql`0`),
  },
  (table) => [primaryKey({ columns: [table.scope, table.scopeId, table.utcDate] })],
);
export const sponsorSpends = pgTable("sponsor_spends", {
  id: uuid("id").primaryKey().defaultRandom(),
  preparationId: uuid("preparation_id")
    .notNull()
    .references(() => preparations.id)
    .unique(),
  status: text("status").notNull(),
  reservedLamports: bigint("reserved_lamports", { mode: "bigint" }).notNull(),
  networkFeeLamports: bigint("network_fee_lamports", { mode: "bigint" }),
  rentLamports: bigint("rent_lamports", { mode: "bigint" }),
  refundedLamports: bigint("refunded_lamports", { mode: "bigint" }),
  finalizedAt: timestamp("finalized_at", { withTimezone: true }),
});
export const buyBudgets = pgTable(
  "buy_budgets",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    utcDate: text("utc_date").notNull(),
    limitUsdcRaw: numeric("limit_usdc_raw", { precision: 78, scale: 0 }).notNull(),
    finalizedSpendUsdcRaw: numeric("finalized_spend_usdc_raw", {
      precision: 78,
      scale: 0,
    })
      .notNull()
      .default("0"),
  },
  (table) => [primaryKey({ columns: [table.userId, table.utcDate] })],
);
export const buySpends = pgTable("buy_spends", {
  id: uuid("id").primaryKey().defaultRandom(),
  legId: uuid("leg_id")
    .notNull()
    .references(() => orderLegs.id)
    .unique(),
  reservedUsdcRaw: numeric("reserved_usdc_raw", { precision: 78, scale: 0 }).notNull(),
  reservedAt: timestamp("reserved_at", { withTimezone: true }).notNull(),
  status: text("status").notNull(),
  actualUsdcRaw: numeric("actual_usdc_raw", { precision: 78, scale: 0 }),
  chainUtcDate: text("chain_utc_date"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: text("kind").notNull(),
    dedupeKey: text("dedupe_key").notNull(),
    payloadReferences: jsonb("payload_references").notNull(),
    state: text("state").notNull(),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }).notNull(),
    attempts: integer("attempts").notNull().default(0),
    leaseUntil: timestamp("lease_until", { withTimezone: true }),
    workerId: text("worker_id"),
    lastErrorCode: text("last_error_code"),
    ...timestamps,
  },
  (table) => [uniqueIndex("jobs_dedupe_idx").on(table.kind, table.dedupeKey)],
);
export const appConfig = pgTable(
  "app_config",
  {
    key: text("key").notNull(),
    version: integer("version").notNull(),
    validatedValue: jsonb("validated_value").notNull(),
    effectiveAt: timestamp("effective_at", { withTimezone: true }).notNull(),
    changedBy: uuid("changed_by").references(() => users.id),
    reason: text("reason").notNull(),
  },
  (table) => [primaryKey({ columns: [table.key, table.version] })],
);
export const runtimeStates = pgTable("runtime_states", {
  key: text("key").primaryKey(),
  version: integer("version").notNull().default(1),
  payload: jsonb("payload").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
export const auditEvents = pgTable("audit_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id").references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  redactedBefore: jsonb("redacted_before"),
  redactedAfter: jsonb("redacted_after"),
  reason: text("reason"),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).defaultNow().notNull(),
});
export const idempotencyRecords = pgTable(
  "idempotency_records",
  {
    scope: text("scope").notNull(),
    endpoint: text("endpoint").notNull(),
    key: uuid("key").notNull(),
    requestHash: text("request_hash").notNull(),
    responseReference: text("response_reference").notNull(),
    state: text("state").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.scope, table.endpoint, table.key] })],
);
export const backupManifests = pgTable("backup_manifests", {
  id: uuid("id").primaryKey().defaultRandom(),
  encryptedObjectKey: text("encrypted_object_key").notNull(),
  digest: text("digest").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  schemaVersion: text("schema_version").notNull(),
  restoreTestedAt: timestamp("restore_tested_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
