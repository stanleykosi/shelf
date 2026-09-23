# Shelf build status

Updated: 2026-09-23

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
- `npm test` — 10 files, 44 focused tests passed
- `npm run build` — passed with Next.js 16.3.5
- Local production route/browser verification — 6/6 desktop and Pixel 7 checks passed, including exact 307/308/404 response contracts
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

- 2026-09-23: Audited the complete Phase 0–2 frontend route architecture against the Product Design Guide and recorded fail-first plus final evidence in `docs/PHASE_0_2_ROUTE_VERIFICATION.md`. Corrected two in-scope defects: removed the global loading boundary that committed HTTP 200 before redirects/not-found, and replaced broad auth return-path prefixes with exact canonical shapes and safe segment validation. Added local-production HTTP regression coverage for all 19 guide-listed legacy redirects, invalid entities, guest access, and canonical ID migrations. ESLint, strict TypeScript, 10 Vitest files/44 tests, the Next.js production build, and 6/6 local desktop/Pixel 7 browser checks pass; authenticated probes return 200 for owned resources and indistinguishable 404s for foreign/missing/non-owner resources. No Phase 3 redesign, deployment, provider call, signing, or money action was performed.
- 2026-09-22: Completed Product Design Guide refactor Phases 0–2 without beginning page redesign. Replaced the optional catch-all/`ScreenRouter` with 35 explicit canonical App Router pages, added reviewed public slugs and a derived Brand read model, implemented one-way legacy redirects and safe auth return-state filtering, enforced versioned AI image-processing consent, and migrated the shell to Discover/Saved/Portfolio with promoted Scan and route-aware mobile state. Existing screen styling remains scaffolding. ESLint, TypeScript, 9 Vitest files/35 tests, the Next.js production build, and all 4 local desktop/Pixel 7 public-route browser checks pass. Local authenticated browser checks remain environment-gated by unavailable PostgreSQL; no provider, deployment, or money action was performed. See `docs/PHASE_0_2_IMPLEMENTATION_SUMMARY.md`.
- 2026-09-22: Resolved the full authentication, privacy, unit-conversion, state-machine, and scheduler review plus follow-up edge cases. Magic DID proofs are challenge-attached and replay-persisted; sensitive actions force a new authentication using the session's original email or Google method; per-session server revocation, persisted one-time export authorization, changed-wallet fail-closed auditing, and full account identity/session removal are enforced. Image recognition requires informed per-request OpenRouter consent, educational prompts receive reviewed claims and reject forged citations, token parsing covers verified scales including zero decimals, sells/transfers use instrument decimals, transfer destinations are curve/self/mint/account-type checked, and cancelled legs remain terminal. Railway claims before provider work, heartbeats owned work, atomically reclaims expired leases with fenced completion and attempt limits, and both invite revoke contracts share the persisted mutation. Lint, strict type checking, 9 Vitest files/37 tests, and the Next.js 16.3.5 Webpack production build pass. No external provider call, deployment, or financial operation was performed.
- 2026-09-22: Completed the integrated eight-track code-quality review. The final tree passes ESLint, strict TypeScript, 8 Vitest files/28 tests, the Next.js 16.3.5 Webpack production build, and Madge cycle checks across application and ancillary entrypoints. Knip reports only documented intentional package/entrypoint findings plus the specification-required unused `SponsorSigner` activation interface; no unused application file or removable implementation export remains. No external provider call, deployment, or financial operation was performed.
- 2026-09-22: Audited AI-style filler, stubs, comments, and mock/live wording; detailed findings are in `docs/quality/08-slop-comments.md`. Replaced invalid support links and repeated learning filler, implemented one-way audited catalog-report review, removed generic prefilled admin reasons, corrected provider-status labels, and made unimplemented wallet refresh/reconciliation/admin mutations return explicit 501 errors instead of fabricated success. Useful security/provenance comments and required activation-gate copy remain. Lint, type checking, all 8 test files and 28 tests, and the Webpack production build pass.
- 2026-09-21: Audited deprecated, legacy, compatibility, and fallback paths; detailed findings are in `docs/quality/07-legacy-fallbacks.md`. Removed alternate Magic wallet authority/repair paths, the implicit browser devnet RPC, missing-price-impact-as-zero behavior, and old runtime-state field backfills. Retained labeled stale data and fail-closed stored-state cleanup. Lint, type checking, all 29 tests, and the Webpack production build pass; Turbopack could not be evaluated because the execution environment denied the local PostCSS port it attempted to bind.
- 2026-09-21: Audited weak and asserted types; detailed findings are in `docs/quality/05-strong-types.md`. Replaced broad in-memory records and double-cast persistence with concrete models, added runtime schemas for OpenRouter/Jupiter/Helius and signed session claims, validated order inputs and route array/integer fields, and narrowed worker/provider JSON only after checks. Lint and type checking pass; all 9 test files and 29 tests pass. A production-build attempt was deferred because another concurrent Next build held the build lock.
- 2026-09-21: Audited all exception, rejection, cleanup, retry, and fallback paths; detailed findings are in `docs/quality/06-error-handling.md`. Removed three no-op catch/rethrow blocks, closed the Magic Admin wallet fail-open fallback, made unexpected API failures generic 500 responses with safe request-ID correlation, normalized malformed JSON, and exposed previously silent wallet/account/holding/watchlist/clipboard failures. Strengthened focused OpenRouter retry/privacy tests; lint, type checking, all 26 tests, and the production build pass.
- 2026-09-21: Audited circular dependencies across source, tests, scripts, and the Railway worker; detailed results are in `docs/quality/04-circular-dependencies.md`. Madge and an independent TypeScript-resolved runtime/type-only SCC pass found no cycles, so no speculative refactor was made. The audit records three acyclic relationships to watch and the two external imports skipped by Madge.
- 2026-09-21: Audited duplication and documented findings in `docs/quality/01-dedup-dry.md`. Consolidated production Solana network, mint and program identities in `src/providers/solana-constants.ts` and unified the duplicated stale-feed cache policy after concurrent route work completed. Full lint, type checking and all 23 tests passed at the audit milestone; final integrated results appear above.
- 2026-09-21: Consolidated the test suite from 16 files and 65 reported cases to 8 files and 23 focused cases. Repeated table cases and one-assertion files now share readable contract tests. All security, exact-money, provider-boundary, Solana-policy, order-accounting, route-inventory, and production-browser assertions remain covered. Lint, type checking, all tests, and the production build pass.
