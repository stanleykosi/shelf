CREATE TABLE "allocation_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"company_amounts" jsonb NOT NULL,
	"budget_raw" numeric(78, 0) NOT NULL,
	"source_ids" jsonb NOT NULL,
	"policy_version" text NOT NULL,
	"model_run_id" uuid,
	"status" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purpose" text NOT NULL,
	"nonce_hash" text NOT NULL,
	"session_binding_hash" text NOT NULL,
	"return_path" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_challenges_nonce_hash_unique" UNIQUE("nonce_hash")
);
--> statement-breakpoint
CREATE TABLE "auth_token_uses" (
	"token_digest" text PRIMARY KEY NOT NULL,
	"challenge_id" uuid NOT NULL,
	"issuer_hash" text NOT NULL,
	"provider_expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "backup_manifests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"encrypted_object_key" text NOT NULL,
	"digest" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"schema_version" text NOT NULL,
	"restore_tested_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "buy_budgets" (
	"user_id" uuid NOT NULL,
	"utc_date" text NOT NULL,
	"limit_usdc_raw" numeric(78, 0) NOT NULL,
	"finalized_spend_usdc_raw" numeric(78, 0) DEFAULT '0' NOT NULL,
	CONSTRAINT "buy_budgets_user_id_utc_date_pk" PRIMARY KEY("user_id","utc_date")
);
--> statement-breakpoint
CREATE TABLE "buy_spends" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"leg_id" uuid NOT NULL,
	"reserved_usdc_raw" numeric(78, 0) NOT NULL,
	"reserved_at" timestamp with time zone NOT NULL,
	"status" text NOT NULL,
	"actual_usdc_raw" numeric(78, 0),
	"chain_utc_date" text,
	"resolved_at" timestamp with time zone,
	CONSTRAINT "buy_spends_leg_id_unique" UNIQUE("leg_id")
);
--> statement-breakpoint
CREATE TABLE "catalog_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storage_path_or_safe_url" text NOT NULL,
	"alt_text" text NOT NULL,
	"source_id" uuid NOT NULL,
	"license" text NOT NULL,
	"attribution" text,
	"dimensions" jsonb NOT NULL,
	"reviewed_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"subject_hmac" text,
	"product_id" uuid,
	"relationship_id" uuid,
	"reason_code" text NOT NULL,
	"safe_note" text,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chain_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"network" text NOT NULL,
	"signature" text NOT NULL,
	"instruction_index" integer NOT NULL,
	"event_kind" text NOT NULL,
	"wallet_id" uuid NOT NULL,
	"mint" text DEFAULT '' NOT NULL,
	"raw_delta" numeric(78, 0),
	"slot" bigint NOT NULL,
	"block_time" timestamp with time zone,
	"transaction_digest" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "corporate_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instrument_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"type" text NOT NULL,
	"announced_at" timestamp with time zone,
	"effective_at" timestamp with time zone NOT NULL,
	"status" text NOT NULL,
	"old_multiplier" text,
	"new_multiplier" text,
	"source_id" uuid NOT NULL,
	"description_version" text NOT NULL,
	"last_checked_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deletion_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"pending_financial_reason" text,
	"completed_at" timestamp with time zone,
	"retention_policy_version" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fee_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"leg_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"fee_mint" text NOT NULL,
	"expected_raw" numeric(78, 0) NOT NULL,
	"actual_raw" numeric(78, 0) NOT NULL,
	"recipient_token_account" text NOT NULL,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"approved_body" text NOT NULL,
	"source_ids" jsonb NOT NULL,
	"version" integer NOT NULL,
	"reviewed_at" timestamp with time zone NOT NULL,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lot_dispositions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lot_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"disposed_raw" numeric(78, 0) NOT NULL,
	"attributed_cost_usdc_raw" numeric(78, 0) NOT NULL,
	"proceeds_usdc_raw" numeric(78, 0)
);
--> statement-breakpoint
CREATE TABLE "market_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instrument_id" uuid NOT NULL,
	"source" text NOT NULL,
	"market_state" text NOT NULL,
	"price" numeric(38, 18),
	"currency" text NOT NULL,
	"unit" text NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"source_as_of" timestamp with time zone,
	"normalization_version" text NOT NULL,
	"usable" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mint_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instrument_id" uuid NOT NULL,
	"slot" bigint NOT NULL,
	"raw_supply" numeric(78, 0),
	"decimals" integer NOT NULL,
	"token_program" text NOT NULL,
	"freeze_authority" text,
	"extensions" jsonb NOT NULL,
	"active_multiplier_decimal" text NOT NULL,
	"multiplier_bits" text,
	"next_multiplier_decimal" text,
	"effective_at" timestamp with time zone,
	"observed_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "multiplier_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instrument_id" uuid NOT NULL,
	"source" text NOT NULL,
	"value_decimal" text NOT NULL,
	"value_bits" text,
	"valid_from" timestamp with time zone NOT NULL,
	"valid_to" timestamp with time zone,
	"observed_at" timestamp with time zone NOT NULL,
	"source_reference" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_barcodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"gtin" text NOT NULL,
	"region_scope" text NOT NULL,
	"source_id" uuid NOT NULL,
	"verified_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_windows" (
	"subject_hmac" text NOT NULL,
	"operation" text NOT NULL,
	"bucket_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"reserved_cost_microusd" bigint DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "rate_windows_subject_hmac_operation_bucket_start_pk" PRIMARY KEY("subject_hmac","operation","bucket_start"),
	CONSTRAINT "rate_windows_count_nonnegative" CHECK ("rate_windows"."count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" uuid NOT NULL,
	"leg_id" uuid NOT NULL,
	"mint" text NOT NULL,
	"raw_amount" numeric(78, 0) NOT NULL,
	"state" text NOT NULL,
	"expires_at" timestamp with time zone,
	"release_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shelf_merges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"merge_id" uuid NOT NULL,
	"request_hash" text NOT NULL,
	"result_ids" jsonb NOT NULL,
	"completed_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sponsor_budgets" (
	"scope" text NOT NULL,
	"scope_id" text NOT NULL,
	"utc_date" text NOT NULL,
	"limit_lamports" bigint NOT NULL,
	"reserved_lamports" bigint DEFAULT 0 NOT NULL,
	"spent_lamports" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "sponsor_budgets_scope_scope_id_utc_date_pk" PRIMARY KEY("scope","scope_id","utc_date")
);
--> statement-breakpoint
CREATE TABLE "sponsor_spends" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"preparation_id" uuid NOT NULL,
	"status" text NOT NULL,
	"reserved_lamports" bigint NOT NULL,
	"network_fee_lamports" bigint,
	"rent_lamports" bigint,
	"refunded_lamports" bigint,
	"finalized_at" timestamp with time zone,
	CONSTRAINT "sponsor_spends_preparation_id_unique" UNIQUE("preparation_id")
);
--> statement-breakpoint
CREATE TABLE "wallet_balance_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" uuid NOT NULL,
	"mint" text NOT NULL,
	"token_account" text NOT NULL,
	"raw_amount" numeric(78, 0) NOT NULL,
	"slot" bigint NOT NULL,
	"commitment" text NOT NULL,
	"observed_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet_operation_locks" (
	"wallet_id" uuid PRIMARY KEY NOT NULL,
	"active_leg_id" uuid NOT NULL,
	"fence_version" integer NOT NULL,
	"state" text NOT NULL,
	"acquired_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_runs" ADD COLUMN "provider_id" text;--> statement-breakpoint
ALTER TABLE "ai_runs" ADD COLUMN "input_tokens" integer;--> statement-breakpoint
ALTER TABLE "ai_runs" ADD COLUMN "output_tokens" integer;--> statement-breakpoint
ALTER TABLE "eligibility_checks" ADD COLUMN "asset_scope" text NOT NULL;--> statement-breakpoint
ALTER TABLE "eligibility_checks" ADD COLUMN "evidence_reference" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "image_asset_id" uuid;--> statement-breakpoint
ALTER TABLE "relationships" ADD COLUMN "verified_by" uuid;--> statement-breakpoint
ALTER TABLE "relationships" ADD COLUMN "review_due_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "content_hash" text;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "license_notes" text;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "observed_slot" bigint;--> statement-breakpoint
ALTER TABLE "allocation_drafts" ADD CONSTRAINT "allocation_drafts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocation_drafts" ADD CONSTRAINT "allocation_drafts_model_run_id_ai_runs_id_fk" FOREIGN KEY ("model_run_id") REFERENCES "public"."ai_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_token_uses" ADD CONSTRAINT "auth_token_uses_challenge_id_auth_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."auth_challenges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buy_budgets" ADD CONSTRAINT "buy_budgets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buy_spends" ADD CONSTRAINT "buy_spends_leg_id_order_legs_id_fk" FOREIGN KEY ("leg_id") REFERENCES "public"."order_legs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_assets" ADD CONSTRAINT "catalog_assets_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_reports" ADD CONSTRAINT "catalog_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_reports" ADD CONSTRAINT "catalog_reports_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_reports" ADD CONSTRAINT "catalog_reports_relationship_id_relationships_id_fk" FOREIGN KEY ("relationship_id") REFERENCES "public"."relationships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chain_events" ADD CONSTRAINT "chain_events_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corporate_actions" ADD CONSTRAINT "corporate_actions_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corporate_actions" ADD CONSTRAINT "corporate_actions_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deletion_requests" ADD CONSTRAINT "deletion_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_records" ADD CONSTRAINT "fee_records_leg_id_order_legs_id_fk" FOREIGN KEY ("leg_id") REFERENCES "public"."order_legs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lot_dispositions" ADD CONSTRAINT "lot_dispositions_lot_id_acquisition_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."acquisition_lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_snapshots" ADD CONSTRAINT "market_snapshots_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mint_snapshots" ADD CONSTRAINT "mint_snapshots_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "multiplier_snapshots" ADD CONSTRAINT "multiplier_snapshots_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_barcodes" ADD CONSTRAINT "product_barcodes_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_barcodes" ADD CONSTRAINT "product_barcodes_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_leg_id_order_legs_id_fk" FOREIGN KEY ("leg_id") REFERENCES "public"."order_legs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shelf_merges" ADD CONSTRAINT "shelf_merges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsor_spends" ADD CONSTRAINT "sponsor_spends_preparation_id_preparations_id_fk" FOREIGN KEY ("preparation_id") REFERENCES "public"."preparations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_balance_snapshots" ADD CONSTRAINT "wallet_balance_snapshots_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_operation_locks" ADD CONSTRAINT "wallet_operation_locks_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_operation_locks" ADD CONSTRAINT "wallet_operation_locks_active_leg_id_order_legs_id_fk" FOREIGN KEY ("active_leg_id") REFERENCES "public"."order_legs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "chain_event_identity_idx" ON "chain_events" USING btree ("network","signature","instruction_index","event_kind","mint","wallet_id");--> statement-breakpoint
CREATE UNIQUE INDEX "corporate_action_external_idx" ON "corporate_actions" USING btree ("instrument_id","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fee_leg_event_idx" ON "fee_records" USING btree ("leg_id","event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "learning_article_version_idx" ON "learning_articles" USING btree ("slug","version");--> statement-breakpoint
CREATE UNIQUE INDEX "lot_disposition_event_idx" ON "lot_dispositions" USING btree ("lot_id","event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mint_snapshot_slot_idx" ON "mint_snapshots" USING btree ("instrument_id","slot");--> statement-breakpoint
CREATE UNIQUE INDEX "barcode_gtin_region_idx" ON "product_barcodes" USING btree ("gtin","region_scope");--> statement-breakpoint
CREATE UNIQUE INDEX "shelf_merge_user_idx" ON "shelf_merges" USING btree ("user_id","merge_id");--> statement-breakpoint
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;