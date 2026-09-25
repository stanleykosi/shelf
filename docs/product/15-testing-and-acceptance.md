# Verification and release acceptance

This is a test specification, not a report of tests already run. All implementation and executable tests belong in the destination repository. Live purchases, account funding and paid calls need the owner's subsequent authorization.

## Test system

Use Vitest for pure domain/service tests; a real disposable PostgreSQL database for migration, transaction, constraint and concurrency tests; deterministic provider adapters plus MSW where useful at HTTP boundaries; Playwright for browser journeys; axe-core for automated accessibility checks. Add property-based tests for amount/allocation/ledger invariants. Pin compatible versions in the build repository rather than copying unverified version numbers.

CI defaults to mocks and synthetic data, no mainnet credentials, no paid inference and outbound-network deny except package installation in the trusted build step. Production startup refuses a mock adapter. Mock startup refuses mainnet signing credentials. Test-only auth and clock controls must not compile into an accessible production route.

Require lint, strict type checking, production build, unit/contract/integration tests, browser critical paths, accessibility checks, dependency/secret scanning and migration checks. A skipped financial safety test is a release blocker, not a pass. Coverage targets: every financial guard and state transition exercised; ≥90% branches for money/state modules and ≥80% statements overall as quality aids, not security proof.

## Acceptance cases

| ID | Test and expected evidence |
|---|---|
| T01 | All seven input paths: camera capture, barcode, photo, screenshot, receipt, approved URL and text; each reaches the same correctable result cards. Permission denied/missing camera supports upload/text. Stop camera tracks on close/navigation. |
| T02 | Multi-product image produces independently confirmable cards, no duplicate exposure from duplicated results; 12-card cap and receipt overflow are explained. Unknown/blurred items do not become confident matches. |
| T03 | Verified product/brand/company/source graph displayed; region ambiguity, stale relationship and unreviewed mapping disable investment. No supplier substitution. All five categories have reviewed discovery entries. |
| T04 | One shelf supports save/remove/rename, stable company grouping, 100-item limit and version conflicts. Removing a discovery item cannot sell or hide an actual holding. |
| T05 | Guest scans/browses/saves without authentication. Explicit login merge is idempotent, survives retry and preserves items until acknowledged. Guest storage contains only allowed normalized data and clears on request. |
| T06 | Magic email/Google flows and backend identity verification; invalid/expired/wrong-app/replayed DID rejected, challenge bound once, Solana address verified rather than generic EVM address. Email collision does not merge accounts. |
| T07 | Session expiry, logout, logout-all, fixation/CSRF defense, fresh authorization for transfer/export/admin; two users cannot read or mutate each other's records at any endpoint. Genuine reauthentication is proved, not inferred from a fresh cookie. |
| T08 | Deposit screen shows canonical USDC/Solana/wallet address; clipboard failures recover; wrong mint/network never credited. “I've sent USDC” only refreshes. Pending cash not overstated as finalized spendable cash. |
| T09 | Single buy completes quote→review→user signature→sponsor→chain→final record with exact actual deltas. UI success never comes from a quote or browser callback alone. Reload at every state resumes the same operation. |
| T10 | Amount parser rejects negatives, exponent syntax, extra precision, NaN/infinity, overflow, zero and locale ambiguity. Buy min/max, daily caps, unique parents and exact budget enforced on server. Raw integers beyond Number.MAX_SAFE_INTEGER retain precision. |
| T11 | Basket deduplication, equal-split remainder, custom sums, sequential approvals and per-leg results. Next signing flow remains blocked until previous leg finalizes. Failure/stop after one leg shows actual spent/unspent amounts; no whole-basket success/refund claim. |
| T12 | Quote expiry, changed fee/minimum/output/unit/message, stale mint, bad lookup table, wrong chain/mint/program, halt, unsupported extension, high impact and no route block signing. New terms require new review. |
| T13 | Fee collected exactly once in USDC on successful buy/sell only; no buy debit above displayed budget; correct gross/net sell meaning and minimum received. Failed swap has no app fee; separate sponsor network cost still recorded. |
| T14 | Rejected signature, modified instruction/recipient/fee payer, stale preparation, cross-user preparation, forged user signature and extra sponsor transfer all rejected before cosign. No arbitrary transaction signing endpoint exists. |
| T15 | Simultaneous tabs, duplicate submit, retried HTTP response and repeated jobs produce one transaction/fee/lot. Same idempotency key with changed body rejects. Wallet and budget reservations are transactional across processes. |
| T16 | Broadcast timeout→unknown; crash before/after send and before/after ledger commit recover without replacement trade. Confirmed fork/rollback returns to pending/unknown rather than immutable success. Expiry uses block height plus sufficient signature history. |
| T17 | Sell fixed quantity, percentages, sell-all and dust. Actual tracked spendable raw balance limits sale. Cannot sell external inventory through normal holding sale. FIFO cost allocations preserve total basis exactly. |
| T18 | Transfer tracked stock, external supported stock and USDC with full recipient review. Wrong-chain-looking address, self, mint, executable/off-curve destination and unknown asset reject. Correct Token-2022 destination account/rent; no account closure; no app fee. |
| T19 | Portfolio includes Shelf lots only; external deposit separate, external-first unexplained outflow attribution, tracked transfer disposition without proceeds, internal token-account moves not disposal. Gapped history freezes affected spend. Replay reproduces balances. |
| T20 | Multiplier/split/reinvested-dividend fixture changes display quantity correctly, preserves historical snapshots/cost and never invents cash. Price-unit mismatch hides value. Upcoming/corrected/cancelled issuer event handled without duplicate action. |
| T21 | History distinguishes submitted/unknown/failed/finalized states; exports match journal, include units/fees/sources, escape spreadsheet formulas and enforce owner/fresh-auth/row limits. Missing mark is unavailable, not zero or fake return. |
| T22 | Token-detail AI chat gives source-backed answers from the exact current issuer record; unknown facts abstain. Bare `/assistant` and unscoped `/ai/answer` requests reject. Invalid/missing source IDs, invented mint/ticker, model instructions hidden in packaging or webpage, unrelated investment claims rejected or constrained. |
| T23 | Allocation output only approved unique company IDs; backend verifies eligibility, budget, exact amounts, min/max/count and privacy consent. Draft has no signing authority. Applying proposal only fills editable form; no order auto-submitted. |
| T24 | Shelf summary counts/parent grouping agree with database; proposed sort is a permutation of current items and requires confirmation. Stale shelf version rejects application; undo restores previous nonfinancial ordering. |
| T25 | OpenRouter outbound request includes required training/ZDR controls on primary and fallback. Unsupported privacy/schema endpoint, timeout, provider 429 and exhausted app budget fail closed with manual alternatives. No silent cheaper nonprivate fallback. |
| T26 | Scan bytes/OCR/receipt PII and chat contents absent from logs, DB, object storage, browser persistence, crash reports and backups after success/error/cancel. EXIF stripped; temporary buffers released; no session replay/third-party ad requests. |
| T27 | Share preview excludes identity, holdings, amounts, wallet, private labels and receipt context. Secret entropy adequate, stored hashed, referrers/logs redacted; expiry/revoke immediate; private pages no-store/noindex. Only intentionally shared products visible. |
| T28 | SSRF: localhost/private/link-local/IPv6, encoded host, credential URL, redirects and DNS rebinding fail. Malicious HTML/script prompt injection harmless. Image bombs, false MIME, huge bodies and malformed metadata fail before expensive processing. |
| T29 | Keyboard-only and screen-reader critical journey; focus restoration and readable errors; contrast, 200% zoom, 360px width, sticky CTA clearance, touch targets; camera denied and Google popup blocked recover. No unlabeled icon-only financial action. |
| T30 | Owner review/invites/limits/pauses require role and fresh auth with audit. Pausing buys need not hide records or permitted exits. Resume requires readiness; no admin can rewrite transaction status without chain evidence. |
| T31 | Sponsor rent/compute/user/global/day caps and AI token/concurrency budgets hold under parallel requests. Midnight does not release unresolved reservations. Low balance/429 pauses coherently; no automatic treasury refill. |
| T32 | Cron restart/lease overlap, provider outage and database disconnect preserve operations. Backup encrypts privately; restore into isolated DB reproduces journal and pending work; no mock→mainnet leakage. |
| T33 | Unknown/expired jurisdiction policy, revoked invite, minor/failed eligibility or asset restriction denies financial capability server-side. Discovery remains appropriately available. Location manipulation does not override maintained policy. |
| T34 | Data export/deletion revokes sessions/shares and deletes permitted app data; retained records explained; wallet access is not destroyed; no claim to erase public chain or provider-retained data. |
| T35 | Every screen S01–S27 and CTA C01–C109 has loading, success, disabled/denied and error behavior where applicable. No dead buttons, placeholder balances, unimplemented stubs or “coming soon” hiding an in-scope feature. |
| T36 | Company browse/articles and return learning journeys work with no wallet balance and AI disabled. Familiarity is not framed as investment suitability; discovery-only clothing/private brands do not produce counterfeit invest buttons. |

## Required browser scenarios

Run Chromium, Firefox and WebKit desktop suites where applicable, plus emulated mobile widths. Actual iOS Safari and Android Chrome camera/OAuth/wallet checks require physical-device manual testing; emulation is not evidence of camera-provider interoperability.

1. Guest photographs several products → corrects one → saves → learns duplicate parent → signs in → deliberately merges.
2. Invited eligible member deposits simulated canonical USDC → buys one company → reloads → sees finalized holding/fee/history.
3. Three-company basket → leg one succeeds → leg two fails → user stops → exact partial outcome.
4. Submitted transaction times out → user reloads/double-clicks → same signature → reconciliation succeeds once.
5. Holding quantity changes through a verified multiplier event → user reads explanation → sells all in raw units.
6. Member transfers tracked stock and separately external supported stock; neither mislabeled a sale.
7. AI provides draft → user edits → reviews new quote → cancels; no financial mutation from suggestion.
8. Owner publishes mapping, pauses buys, revokes a share, investigates unknown outcome without overriding chain truth.
9. Second user tries guessed URLs/API IDs for shelf, order, export, preparation, draft and share admin → generic denial.
10. Scanner privacy-provider outage → typed search and catalog remain usable; no forbidden provider fallback.

## AI evaluation dataset

Before beta, create at least 100 rights-cleared/synthetic cases: 10 recognizable items per requested category (50); 15 multi-product scenes; 10 receipts with fake names/payment strings; 10 ambiguous/unsupported brands; 5 region/license ambiguities; 10 adversarial prompts or deliberately poor inputs. Keep the benchmark synthetic/public and separate from user uploads.

Annotate true catalog candidates, relation evidence, expected abstention and prohibited claims. Report recognition precision/recall separately from company-resolution precision. Target ≥95% precision for high-confidence catalog suggestions and 100% valid source/company/instrument IDs after deterministic validation. Do not claim 100% real-world recognition from a small benchmark. Any incorrect investable ownership match or unauthorized tool attempt that reaches execution is release-blocking.

Run a small paid-model benchmark only after authorization. Record model/provider ID, privacy settings, prompt/schema revision, cost, p50/p95 latency, schema-valid rate and error counts. Choose the cheaper candidate only if it passes; store evaluation metadata, not private user scans.

## Release levels

**R0: implementation-complete local prototype.** All in-scope flows work with mocks; automated tests pass; documented mock label everywhere; no funding request/mainnet instructions. This can be completed without provider accounts.

**R1: connected staging.** Magic identity/recovery and synthetic AI provider calls verified with authorized credentials; isolated test assets/network; financial transaction composition and privacy capabilities tested. No representation that devnet fake stocks are issued xStocks.

**R2: invite-only real-money beta.** G01–G07 in document00 satisfied and evidence recorded; exact real mint buy/sell/fee/sponsor combination independently tested; owner approves eligibility and budgets; restore/incident runbooks checked. Later authorized minimum-value mainnet buy, sell and transfer tests are needed; do not run them merely because implementation finishes.

**R3: public launch.** Separate product, legal, security, support and capacity review. Passing beta tests does not authorize public rollout.

## Evidence format

For each T case record code/test path, environment, date, commit, result, sanitized screenshot/log where useful, and limitation. Provider capabilities get a matrix of method/version/network/result. A failed or not-run gate stays visible. Never substitute “documentation says supported” for an executed interoperability test.
