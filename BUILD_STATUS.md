# Shelf build status

Updated: 2026-09-22

## Current release

Shelf is deployed at https://shelf-one-phi.vercel.app as a production-only Next.js application. Vercel deployment `dpl_73Yuk7J5Kwnu2aqR5ex6V3anvqzw` is Ready and owns the production alias. Railway PostgreSQL is the only runtime store. Railway Function deployment `bdc6a9f0-f81d-42a2-a1fc-34be7b9d1851` runs the production-only issuer-data worker.

`/readyz` reports Magic, OpenRouter, Jupiter, Helius, PostgreSQL, and `tradeExecution: disabled`. A production mutation persisted the one-way cleanup of any legacy user without a verified Magic issuer and any order without a Jupiter quote.

## Implemented product

- Guest discovery across seven inputs and five categories, reviewed product/company relationships, public learning, and distinct xStocks and PreStocks market lanes
- Magic email/Google identity, signed HttpOnly sessions, wallet binding, recovery, global logout, owner binding, signing approval and cancellation
- One private shelf, watchlist, revocable bearer shares, reports, exports, deletion controls, and privacy boundaries
- OpenRouter recognition and grounded education using `z-ai/glm-5.3-flash`, strict schemas, no-data-collection routing, zero-data-retention routing, quotas, and spend caps
- Live PreStocks issuer reference data and stored history; live xStocks reviewed symbol/mint metadata
- Jupiter exact-input quote/build inspection with exact terms, fee account, signer, program, and no-tip validation; Helius chain identity and mint inspection
- Exact-integer order, fee, lot, record, idempotency, and confirmed-chain accounting logic
- Owner health, pauses, persisted invitations tied to Magic email, audit records, budgets, diagnostics, and catalog reports
- Railway scheduled issuer refresh that records only completed PreStocks and xStocks work

There are no runtime substitutes for identity, balances, provider data, signatures, persistence, or transactions. Missing providers fail closed. Investment approval and deposit controls remain disabled.

## Verification

- `npm run lint` — passed with no warnings
- `npm run typecheck` — passed
- `npm test` — 8 files, 28 focused tests passed
- `npm run build` — passed with Next.js 16.3.5
- Production `/readyz` — passed against the deployment
- Production PreStocks endpoint — returned current reviewed listings
- Anonymous `/api/v1/me` — returned 401
- Production Chromium — desktop and Pixel 7 projects, 2/2 passed
- Railway scheduled run — completed with PreStocks and xStocks, one checked job, zero failures
- No sponsor funding, fee-account creation, simulation, investment signing, submission, broadcast, or money movement was performed

## Open gates

The remaining application activation work is the owner-approved live-money run: create and verify the fee USDC account, fund the sponsor within a fixed limit, simulate reviewed buy/sell/transfer transactions, verify user approval and rejection, submit one bounded transaction, prove finality and ambiguous-result recovery, reconcile after restart, and complete one small-value buy/sell cycle.

Operational launch decisions still remain outside application implementation: approve the jurisdiction policy, complete a database restore drill, complete the final source/catalog review, approve private beta, and separately approve public launch. Eligibility fails closed under `FINANCIAL_POLICY_VERSION=pre-activation-v1` until the policy decision is recorded.

## Next task

Frontend refactor Phases 0–2 are complete. The next frontend task may begin Phase 3 only after the planned visual/product concept is supplied. Live-money activation remains a separate owner-authorized workflow and is unchanged.

## Recent maintenance

- 2026-09-22: Completed Product Design Guide refactor Phases 0–2 without beginning page redesign. Replaced the optional catch-all/`ScreenRouter` with 35 explicit canonical App Router pages, added reviewed public slugs and a derived Brand read model, implemented one-way legacy redirects and safe auth return-state filtering, enforced versioned AI image-processing consent, and migrated the shell to Discover/Saved/Portfolio with promoted Scan and route-aware mobile state. Existing screen styling remains scaffolding. ESLint, TypeScript, 9 Vitest files/35 tests, the Next.js production build, and all 4 local desktop/Pixel 7 public-route browser checks pass. Local authenticated browser checks remain environment-gated by unavailable PostgreSQL; no provider, deployment, or money action was performed. See `docs/PHASE_0_2_IMPLEMENTATION_SUMMARY.md`.
- 2026-09-22: Completed the integrated eight-track code-quality review. The final tree passes ESLint, strict TypeScript, 8 Vitest files/28 tests, the Next.js 16.3.5 Webpack production build, and Madge cycle checks across application and ancillary entrypoints. Knip reports only documented intentional package/entrypoint findings plus the specification-required unused `SponsorSigner` activation interface; no unused application file or removable implementation export remains. No external provider call, deployment, or financial operation was performed.
- 2026-09-22: Audited AI-style filler, stubs, comments, and mock/live wording; detailed findings are in `docs/quality/08-slop-comments.md`. Replaced invalid support links and repeated learning filler, implemented one-way audited catalog-report review, removed generic prefilled admin reasons, corrected provider-status labels, and made unimplemented wallet refresh/reconciliation/admin mutations return explicit 501 errors instead of fabricated success. Useful security/provenance comments and required activation-gate copy remain. Lint, type checking, all 8 test files and 28 tests, and the Webpack production build pass.
- 2026-09-21: Audited deprecated, legacy, compatibility, and fallback paths; detailed findings are in `docs/quality/07-legacy-fallbacks.md`. Removed alternate Magic wallet authority/repair paths, the implicit browser devnet RPC, missing-price-impact-as-zero behavior, and old runtime-state field backfills. Retained labeled stale data and fail-closed stored-state cleanup. Lint, type checking, all 29 tests, and the Webpack production build pass; Turbopack could not be evaluated because the execution environment denied the local PostCSS port it attempted to bind.
- 2026-09-21: Audited weak and asserted types; detailed findings are in `docs/quality/05-strong-types.md`. Replaced broad in-memory records and double-cast persistence with concrete models, added runtime schemas for OpenRouter/Jupiter/Helius and signed session claims, validated order inputs and route array/integer fields, and narrowed worker/provider JSON only after checks. Lint and type checking pass; all 9 test files and 29 tests pass. A production-build attempt was deferred because another concurrent Next build held the build lock.
- 2026-09-21: Audited all exception, rejection, cleanup, retry, and fallback paths; detailed findings are in `docs/quality/06-error-handling.md`. Removed three no-op catch/rethrow blocks, closed the Magic Admin wallet fail-open fallback, made unexpected API failures generic 500 responses with safe request-ID correlation, normalized malformed JSON, and exposed previously silent wallet/account/holding/watchlist/clipboard failures. Strengthened focused OpenRouter retry/privacy tests; lint, type checking, all 26 tests, and the production build pass.
- 2026-09-21: Audited circular dependencies across source, tests, scripts, and the Railway worker; detailed results are in `docs/quality/04-circular-dependencies.md`. Madge and an independent TypeScript-resolved runtime/type-only SCC pass found no cycles, so no speculative refactor was made. The audit records three acyclic relationships to watch and the two external imports skipped by Madge.
- 2026-09-21: Audited duplication and documented findings in `docs/quality/01-dedup-dry.md`. Consolidated production Solana network, mint and program identities in `src/providers/solana-constants.ts` and unified the duplicated stale-feed cache policy after concurrent route work completed. Full lint, type checking and all 23 tests passed at the audit milestone; final integrated results appear above.
- 2026-09-21: Consolidated the test suite from 16 files and 65 reported cases to 8 files and 23 focused cases. Repeated table cases and one-assertion files now share readable contract tests. All security, exact-money, provider-boundary, Solana-policy, order-accounting, route-inventory, and production-browser assertions remain covered. Lint, type checking, all tests, and the production build pass.
