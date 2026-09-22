# Persistence and accounting model

PostgreSQL; migrations via Drizzle; schema changes reviewed, versioned and reversible where safe. This is a specification, not executable SQL.

## Conventions

- Primary keys UUID; created_at/updated_at timestamptz UTC. Foreign keys explicit. All listed fields required unless marked nullable/optional. Public slugs unique, never used for authorization.
- Raw token amounts: numeric(78,0), constrained to integer ≥0 for quantities and within token-program limits; signed journal deltas may be negative. Transport as decimal strings. Never JavaScript number for raw monetary values.
- Money values remain denominated: USDC raw amount is not an unlabeled dollar number. Reference USD prices numeric(38,18), positive; unknown = null, never zero.
- Display quantities and multiplier snapshots preserve exact serialized decimal strings plus mint metadata. Onchain floating multiplier representation is retained as 8-byte hex when available; do not recreate raw balances from rounded display strings.
- JSONB fields have versioned application schemas, maximum sizes and explicit allowlists. No arbitrary provider dumps, image/base64/OCR or unchecked model output.
- Financial entities have immutable environment/network fields. Separate databases for mock/devnet/mainnet; enforce network checks again in services.
- Sensitive text fields encrypted at application layer where specified. Encryption keys live outside DB; keyed hashes for lookup use separately scoped secrets.

## Identity, access and privacy tables

| Table | Essential fields | Constraints/indexes |
|---|---|---|
| users | id, magic_app_id, magic_issuer, email_ciphertext?, email_lookup_hmac?, status(invited/active/suspended/deleting/deleted), role(member/owner), terms_version?, privacy_version?, consented_at?, created_at | unique(magic_app_id,magic_issuer); email hash not unique identity; no role from signup body |
| wallets | id, user_id, network, chain_genesis_hash, address, provider, verified_at, binding_version, status | unique(user_id,network), unique(network,address); address replacement requires explicit migration process outside v1 |
| sessions | id, user_id, token_hash, created_at, expires_at, last_seen_at, reauthenticated_at?, revoked_at?, csrf_hash | unique(token_hash); user/revoked/expiry indexes; no DID storage |
| auth_challenges | id, purpose(login/step_up), nonce_hash, session_binding_hash, expires_at, consumed_at?, return_path | atomic one-time consumption; TTL 5 minutes |
| auth_token_uses | token_digest, challenge_id, issuer_hash, provider_expires_at, used_at | keyed digest only, not DID bytes; unique(token_digest); prevents reused token at a different exchange; expiry cleanup |
| beta_invites | id, email_hmac, status, expires_at?, accepted_user_id?, created_by | unique active email_hmac; access review only; no public email list |
| eligibility_checks | id, user_id, policy_version, asset_scope, residence_country, location_country?, adult_attested, declaration_codes[], capability_results JSONB, checked_at, expires_at, evidence_reference? | no identity documents; append history; latest(user_id,checked_at) |
| consents | id, user_id?, guest_session_hash?, scope, version, decision, recorded_at | no receipt/photo payload; scope distinguishes AI processing, shelf context, terms |
| deletion_requests | id, user_id, status, requested_at, pending_financial_reason?, completed_at?, retention_policy_version | user indexed; no deletion of provider wallet as side effect |
| rate_windows | subject_hmac, operation, bucket_start, count, reserved_cost_microusd, expires_at | composite key; atomic increments; raw IP not retained |

## Catalog and market tables

| Table | Essential fields | Constraints/indexes |
|---|---|---|
| companies | id, slug, legal_name, short_name, listing_ticker?, exchange?, description, status, reviewed_at | unique slug; ticker alone not globally unique |
| brands | id, slug, name, normalized_name, aliases[], category | unique slug; indexed normalized names; alias review |
| products | id, slug, brand_id, name, product_family?, category, region_scope[], image_asset_id?, status | no exact GTIN unless verified SKU; stable family vs SKU distinction |
| product_barcodes | id, product_id, gtin, region_scope, source_id, verified_at | unique(gtin,region_scope); preserve leading zero; check digit |
| relationships | id, brand_id, company_id, type(global_parent/subsidiary_owner/licensee/manufacturer/retailer), region_scope[], valid_from, valid_to?, status(draft/verified/disputed/retired), verified_by?, verified_at?, review_due_at?, source_ids[] | positive effective interval; no conflicting active ownership for same role/region without disputed state |
| sources | id, canonical_url, publisher, title, type(corporate/issuer/regulatory/product_database), read_at, short_claim_summary, content_hash?, license_notes?, status | URL HTTPS safe; summary not full copyrighted page; public metadata only |
| catalog_assets | id, storage_path_or_safe_url, alt_text, source_id, license, attribution?, dimensions, reviewed_at | public licensed images only; never user photos |
| instruments | id, company_id, issuer_name, symbol, underlying_identifier, mint, token_program, network, decimals, extension_allowlist[], eligibility_policy_id, buy_enabled, sell_enabled, transfer_enabled, review_state, verified_at | unique(network,mint); v1 one active purchasable instrument per company; symbol not authority |
| mint_snapshots | id, instrument_id, slot, raw_supply?, decimals, token_program, freeze_authority?, extensions JSONB, active_multiplier_decimal, multiplier_bits?, next_multiplier_decimal?, effective_at?, observed_at | unique(instrument_id,slot); schema-limited extension data |
| multiplier_snapshots | id, instrument_id, source, value_decimal, value_bits?, valid_from, valid_to?, observed_at, source_reference | historical index by asset/effective time; no duplicate action on each poll |
| market_snapshots | id, instrument_id, source, market_state, price?, currency, unit(raw_token/scaled_ui/underlying), observed_at, source_as_of?, normalization_version, usable | unknown unit → usable=false |
| corporate_actions | id, instrument_id, external_id, type, announced_at?, effective_at, status, old_multiplier?, new_multiplier?, source_id, description_version, last_checked_at | unique(instrument_id,external_id); revisions retained through audit |
| learning_articles | id, slug, title, approved_body, source_ids[], version, reviewed_at, status | unique(slug,version); content moderation |
| catalog_reports | id, user_id?, subject_hmac?, product_id?, relationship_id?, reason_code, safe_note?, status | safe_note ≤500 chars, redact PII; no attachments |

## Shelf, sharing and AI

| Table | Essential fields | Constraints/indexes |
|---|---|---|
| shelves | id, user_id, name, version | unique(user_id); name ≤60 chars |
| shelf_items | id, shelf_id, product_id, sort_key, added_at | unique(shelf_id,product_id); owner-scope every query |
| shelf_merges | id, user_id, merge_id, request_hash, result_ids[], completed_at | unique(user_id,merge_id), idempotent guest merge |
| share_links | id, owner_id, shelf_id, token_hash, snapshot JSONB, expires_at, revoked_at?, created_at | random token ≥192 bits; store hash only; snapshot public-field allowlist |
| ai_runs | id, user_id?, subject_hmac?, task, model_id, provider_id?, prompt_version, schema_version, input_kind, candidate_count, status, input_tokens?, output_tokens?, cost_microusd?, latency_ms, error_code?, created_at | no messages/images/OCR; index usage/day; retention 30 days |
| allocation_drafts | id, user_id, company_amounts JSONB, budget_raw, source_ids[], policy_version, model_run_id?, status, expires_at | only validated catalog IDs/amounts and approved rationale; max 5 parents; TTL 24 hours |

Recognition results need no server-persistent content table. Process ephemeral inputs in memory; return candidate IDs/clean product labels to current request. Only explicitly saved catalog selections persist. Assistant transcript is session-local; never place it in ai_runs.

## Financial tables

| Table | Essential fields | Constraints/indexes |
|---|---|---|
| orders | id, user_id, wallet_id, client_intent_id, network, type(buy/sell/basket/transfer), status, budget_usdc_raw?, policy_version, fee_bps, version, created_at, completed_at? | unique(user_id,client_intent_id); immutable economic intent after signing; status/version CAS |
| order_legs | id, order_id, position, side, company_id?, instrument_id?, inventory_scope(cash/tracked/external), input_mint, output_mint?, requested_input_raw, allocation_usdc_raw?, recipient_address?, status, current_preparation_id? | unique(order_id,position); partial unique(order_id,company_id) for buy legs; company_id must equal resolved instrument's company; external scope transfer-only |
| quotes | id, leg_id, version, provider, input_raw, output_raw, min_output_raw, fee_mint, fee_raw, fee_bps, slippage_bps?, price_impact_bps?, route_digest, mint_snapshot_ids[], obtained_at, expires_at, normalized_response JSONB | immutable version; swap metrics required for swap, null for direct transfer; normalized fields only |
| preparations | id, leg_id, quote_id, version, message_hash, canonical_message_base64_encrypted, expected_signers[], account_manifest JSONB, blockhash, last_valid_block_height, expires_at, state, policy_version, review_digest | unique(leg_id,version); no user private key; expire/revoke old versions |
| reservations | id, wallet_id, leg_id, mint, raw_amount, state, expires_at?, release_reason? | active wallet/asset index; unresolved submitted operation cannot expire by wall clock alone |
| wallet_operation_locks | wallet_id, active_leg_id, fence_version, state, acquired_at | one unresolved spend per wallet; no timeout release without chain resolution |
| submissions | id, preparation_id, network, signature, message_hash, signed_bytes_encrypted?, state, submitted_at?, last_checked_at?, observed_slot?, finalized_at?, error_code? | unique(network,signature), unique(preparation_id); persist before broadcast; no duplicate intent on timeout |
| chain_events | id, network, signature, instruction_index, event_kind, wallet_id, mint?, raw_delta?, slot, block_time?, transaction_digest | unique(network,signature,instruction_index,event_kind,mint,wallet_id) with explicit null-safe keys |
| acquisition_lots | id, user_id, instrument_id, buy_event_id, acquired_raw, remaining_raw, total_cost_usdc_raw, multiplier_snapshot_id, acquired_at | unique(buy_event_id,instrument_id); 0≤remaining≤acquired |
| lot_dispositions | id, lot_id, event_id, kind(sale/transfer_out/external_outflow/adjustment), disposed_raw, attributed_cost_usdc_raw, proceeds_usdc_raw? | unique(lot_id,event_id); sum dispositions ≤ acquired; immutable |
| inventory_journal | id, user_id, instrument_id?, mint, event_id, kind, tracked_delta_raw, external_delta_raw, cash_delta_raw?, snapshot_id?, recorded_at | append-only; event uniqueness; replayable projection |
| wallet_balance_snapshots | id, wallet_id, mint, token_account, raw_amount, slot, commitment, observed_at | latest index; not authority for acquisition provenance |
| financial_records | id, user_id, order_id?, event_id, type, status, amounts JSONB, signature?, unit_snapshots JSONB, recorded_at | append-only factual record, corrections append references |
| fee_records | id, leg_id, event_id, fee_mint, expected_raw, actual_raw, recipient_token_account, status | unique(leg_id,event_id); collected only from verified chain facts |
| sponsor_budgets | scope(global/user), scope_id, utc_date, limit_lamports, reserved_lamports, spent_lamports | composite key; atomic reserve/reconcile; enforce nonnegative and limit |
| sponsor_spends | id, preparation_id, status, reserved_lamports, network_fee_lamports?, rent_lamports?, refunded_lamports?, finalized_at? | unique(preparation_id); reconcile failed transactions too |
| buy_budgets | user_id, utc_date, limit_usdc_raw, finalized_spend_usdc_raw | composite key; maximum buy cap applies across unresolved reservations from all dates |
| buy_spends | id, leg_id, reserved_usdc_raw, reserved_at, status, actual_usdc_raw?, chain_utc_date?, resolved_at? | one active reservation per leg; reconcile once; new attempts do not duplicate buy commitment |

Sell proceeds are not trusted from the model or quote. Actual finalized account deltas establish the record. Fees are a component of economic execution, not an independent repeatable offchain debit.

financial_records stores settled factual events (including finalized failed-transaction network facts), not mutable estimates. History combines these with current order/submission projections for pending/unknown/expired offchain attempts. Link using stable order/leg IDs; do not invent chain_events for a draft or require a nonexistent signature to show its status.

## Operations tables

- jobs(id, kind, dedupe_key, payload_references, state, next_run_at, attempts, lease_until?, worker_id?, last_error_code?): unique active dedupe key, ready index(kind,state,next_run_at); no images/secrets in payload.
- app_config(key, version, validated_value, effective_at, changed_by, reason): versioned limits/pauses; secrets excluded.
- Financial eligibility policies are versioned, schema-validated app_config records keyed by policy ID; instruments.eligibility_policy_id resolves there. Unknown or missing policy denies access. Do not leave the policy reference as an unenforced free-text assertion.
- audit_events(id, actor_id?, action, entity_type, entity_id, redacted_before?, redacted_after?, reason?, recorded_at): append-only, no deletion through owner UI.
- idempotency_records(user_or_guest_scope, endpoint, key, request_hash, response_reference, state, expires_at): same key/different body → conflict. Financial client_intent_id uniqueness outlives HTTP cache retention.
- backup_manifests(id, encrypted_object_key, digest, created_at, schema_version, restore_tested_at?, expires_at): no decryption secret in DB.

## Consistency rules

1. All private reads and mutations filter by server-resolved user_id; repositories must make scope explicit. Owner access is separate audited service logic.
2. Financial mutation transactions lock wallet-operation and affected lot/reservation/budget rows in a consistent order. No network call while holding a long database lock.
3. CAS order version prevents stale browser tabs preparing over active work.
4. Unique chain-event keys prevent duplicate websocket/polling/backfill application.
5. Finalized journal insertion, lot changes, fee record, reservation release and leg completion share one DB transaction.
6. Sum lot dispositions cannot exceed tracked acquisitions. A detected shortfall creates a reconciliation issue; never silently clamp a negative holding to zero.
7. External inflows do not become acquisitions. Mirror chain balances while keeping provenance classification distinct.
8. Corrections are new journal entries referencing the original, with source evidence and reason. No owner “edit balance” endpoint.
9. Price/multiplier availability is independent of balance. An absent price does not zero holdings.
10. Consumer request headers/IDs never control network, fee recipient, trusted programs, sponsor key or DB role.

## Privacy and retention defaults

- Images, full receipt text, submitted page content, raw user chat: no persistent storage; memory released after request/stream.
- Unsaved normalized recognition results: client memory only; guest confirmed shelf IDs may use session storage.
- Sessions/challenges/rate windows: delete after expiry plus 7-day security window; no raw IP storage.
- ai_runs and operational metrics: 30 days; contain no raw content.
- Signed transaction bytes: encrypted transient persistence only for rebroadcast/reconciliation; purge 24 hours after final resolution. Unknown submissions remain under monitored retention until safely resolved, with escalation after 24 hours.
- Share snapshots: inaccessible immediately on revoke/expiry; delete within 24 hours.
- Catalog/evidence/aggregate anonymous metrics: retained while useful with review history.
- Financial/audit records: proposed engineering retention 90 days for beta, **not a legal retention statement**. Operator must set a reviewed policy before real-money activation; implement configurable retention and legal hold, minimize account linkage upon deletion where permitted.
- Backups: encrypted, 7 daily and 4 weekly generations (maximum 30 days); deletion policy discloses backup aging and restore-time deletion replay.

## Database access

Use a non-superuser application role, least privileges, parameterized queries, SSL and protected schema. Disable browser-facing Supabase Data API for private tables or leave them outside exposed schemas with RLS deny-all to anon/authenticated roles. Magic authentication does not automatically populate Supabase auth.uid().

Do not pretend enabling RLS supplies isolation if every request uses an unrestricted service-role credential. Test effective database privileges and application object authorization independently. Migration/backup roles are distinct from runtime credentials.
