# Implementation sequence and handoff

Implement in a separate application repository. This file orders work; it does not remove any requirement from scope. The scanner-only slice is a milestone, not completion.

## Stage 0 — establish the build environment and capability matrix

Read the entire pack, inspect destination repository instructions and preserve existing work. Record package/runtime versions and compatibility decisions. Create an implementation checklist referencing PR/T IDs and a gate matrix G01–G08 with status not_started/in_progress/passed/failed and evidence.

Start with mock provider adapters and a mock-only database. Select compatible maintained Next/React/Node, Solana transaction library, Magic Solana/OAuth/Admin, Drizzle/Postgres, OpenRouter adapter/AI SDK, validation and test packages. Review installed package types/docs rather than pasting deprecated examples. Use OpenRouter explicitly; do not silently replace it with another model gateway.

Obtain owner-provided accounts/credentials only through approved secret storage. Missing credentials must not prevent mock implementation. Do not open paid accounts, top up sponsor/AI balances, generate a live funded wallet or deploy without authorization.

Exit: reproducible local app/database, secret-free sample environment, adapter interfaces, tests booting; real-money feature flags off.

## Stage 1 — domain contracts and schema

Implement the schema, unique constraints, migrations and private read/write authorization. Define raw amounts, unit snapshots, relationship states, capability policy, order/leg state transitions, idempotency, wallet locks and journal projection as tested modules.

Implement authentication test adapters and cross-user tests before building private screens. Build the full API schema inventory from document07 and generate implementation OpenAPI/types from one checked source of truth. Domain contracts and database names may differ stylistically but must map explicitly.

Exit: T07/T10/T15/T19 foundations pass with real Postgres, migration up/down or documented forward-repair strategy verified, no route accepts trusted user/mint/role from the browser.

## Stage 2 — catalog and native UX foundation

Implement public discovery, company/source/token details, approved educational articles, small reviewed catalog and draft review tooling. Build responsive navigation and the complete reusable states before visual polish. Teammate can supply typography/palette/assets without changing required behavior.

Implement typed search, manual match correction, one private shelf, guest temporary shelf and deterministic parent grouping. Publish only approved rows; discovery-only clothing is explicitly supported.

Exit: S01/S02/S05–S08 and shelf CRUD usable at mobile/desktop sizes; T03–T05/T29/T36 pass; five-category seed review underway.

## Stage 3 — AI and all ingestion modes

Implement camera lifecycle, local barcode decoding, image normalization, receipt/screenshot mode, bounded URL fetch and shared match correction. Implement OpenRouter privacy enforcement, structured recognition, grounded education, shelf summary/sort and allocation drafts with deterministic validation.

Use synthetic fixtures throughout. Keep image/OCR/chat content out of persistence/logging by construction. Guest quotas and cost reservation must exist before connecting paid models.

Exit: T01/T02/T22–T28 pass in mocks; all AI jobs are implemented, not one generic chatbot placeholder. Authorized real-provider synthetic evaluation can satisfy G04 separately.

## Stage 4 — Magic identity, onboarding and wallet

Implement email OTP, Google, backend DID verification, authoritative Solana binding, secure session/step-up/recovery, consent/eligibility/invite enforcement, explicit guest merge, wallet balances and USDC deposit UX.

Browser SDK compatibility must be tested on supported devices, especially partial signing with a separate fee payer and v0 transactions. If Magic cannot meet the contract, record the precise failure and ask for a provider decision; do not redesign into custodial server signing.

Exit: T06–T08/T33/T34 pass in mocks and authorized staging; G01 evidence captured or specifically blocked. Deposit instructions remain hidden for real assets until live readiness.

## Stage 5 — single buy, accounting and recovery first

Build issuer/mint checks, quote adapter, transaction manifest validation, fee normalization, sponsor policy, preparation/review, user partial signing, server cosigning, persisted signature-before-broadcast and background reconciliation.

Implement actual chain-event journal/lot creation before calling the buy screen complete. Test duplicate/timeouts/crashes/expired blockhash and changed terms early. Build operator pause/unknown-outcome visibility now, not after accepting funds.

Exit: T09/T12–T16/T19/T30–T32 pass; single buy complete with mocks. G02 requires exact real integration evidence later; historical Raydium quote snapshots do not satisfy it.

## Stage 6 — baskets, exits and records

Implement explicit per-leg basket review/finality; sells including tracked sell-all/dust; USDC/stock transfers, external supported-token recovery scope and fresh auth. Complete portfolio, history, exact-unit exports and corporate-action explanations.

After a basket leg completes, the user must deliberately review the next one. Buying multiple product brands owned by one parent does not create multiple company allocations.

Exit: T11/T17–T21 pass; PR09–PR15 all usable; no unsupported “sell later” gap in a real-money beta.

## Stage 7 — sharing, owner operation and privacy controls

Finish link preview/snapshot/expiry/revoke, settings/export/deletion, owner invite/catalog/limits/pauses/diagnostics and jobs. Connect encrypted private backups, restore checks, redacted support records, budget alerts and credential rotation procedures.

Exit: T27/T30–T35 pass, every C01–C109 action implemented; no user profile/holdings leak through sharing or cache.

## Stage 8 — whole-product verification and handoff

Run full automated suites and manual browser/device checks. Review every requirement in document18 against evidence. Record known limitations honestly, including catalog/barcode coverage, untested model/provider combinations and network/privacy limitations.

Deliver code, reproducible setup, migrations/seed provenance, test report, deployment instructions, env inventory and operator runbooks in the destination repository. Keep real-money flags off if any gate fails.

The owner requested live testing to be discussed later. Stop at a fully working mock/staging implementation if credentials or authorization are absent; report exactly what remains. Do not mark financial activation complete from mocked screenshots.

## Stage 9 — separately authorized beta activation

Only after the owner approves controlled live testing and G01–G06 prerequisites are met: run explicitly capped test buy/sell/transfer scenarios, check actual fee recipient and user/sponsor deltas, validate recovery/history and record evidence without secrets. Follow G07, then deliberate invite-only activation; no automatic public launch.

## Change control and implementation decisions

The builder may fill ordinary coding details without a new questionnaire, but must seek direction for wallet/provider replacement, custody changes, new chain, public rollout, removed launch feature, different fee policy, persistent image storage, broader financial advice or spending outside approved limits.

Record changes in a destination decision log with reason, evidence, affected PR/API/schema/tests and migration implications. Prefer a clear unavailable state to inventing a fake provider success. Do not treat an open external gate as a reason to leave unrelated mock features unimplemented.

