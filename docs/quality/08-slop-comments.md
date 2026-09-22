# AI slop, stubs, comments, and product-wording audit

Date: 2026-09-22

## Scope and method

This audit covered application source, route handlers, provider adapters, database and worker code,
scripts, tests, runtime configuration, and user-visible copy. Product specifications 00–19 were
used to distinguish a prohibited placeholder from a required unavailable state. In particular,
financial activation, provider privacy, eligibility, and issuer-readiness failures must stay
visible and fail closed; deleting those states would make the product less honest.

The review searched for TODO/FIXME/WIP markers, placeholder and mock terminology, unconditional
disabled controls, no-op handlers, invented success responses, generic or repeated prose, static
example destinations, development-history comments, debug output, and claims that providers or
money movement were live. Every source comment was read in context. CTA-bearing controls and API
responses using words such as `queued`, `recorded`, `validated`, `connected`, and `complete` were
also inspected manually.

## Critical assessment

The codebase has very little comment noise. There are no TODO, FIXME, WIP, “coming soon,” or
generated-code narration comments in maintained source. The few handwritten comments explain a
security boundary, data provenance, a build constraint, or why market-history reads sit outside a
state transaction. Those comments are durable and should remain.

Four areas did contain placeholder or misleading behavior:

1. Three production support actions linked to `support@example.invalid`. The controls looked
   operational but could never reach support.
2. Every learning topic rendered the same two generic paragraphs. The database seed was weaker:
   it repeated each title and called the result reviewed content. That made distinct approved
   articles look implemented without actually teaching their subjects.
3. Owner actions C100 and C101 were permanently disabled. The related generic admin mutation
   branch merely appended an audit row and returned `recorded`; it did not review anything.
   The admin reason was prefilled with “Routine local verification,” allowing an operator to submit
   a nominal reason without making a deliberate statement.
4. Several operational endpoints reported success without performing the named operation.
   `/wallet/refresh` returned `queued` without a job, `/admin/reconcile` recorded an audit without
   reconciliation work, and generic relationship/instrument/limit endpoints returned
   `recorded`/`validated` without changing authoritative state. These are more dangerous than a
   visible unavailable state because callers can reasonably infer that work will happen.

Two status labels also overstated evidence. The global header always said “Provider connected,”
and the owner console always returned `providerMode: connected`, even though connection and
readiness depend on runtime configuration and live checks.

## Implemented recommendations

- Added `SUPPORT_CONTACT`, restricted to `https:` or `mailto:`. Support actions now use the
  configured destination; when absent they render a disabled action with an adjacent explanation.
  Record support adds its redacted record reference only to a configured email subject.
- Replaced repeated learning filler with concise topic-specific content for all seven articles.
  The database seed now stores the same substantive reviewed body shown by the application.
- Added a minimal genuine catalog-report review flow. The owner selects an open report, enters an
  explicit reason, and approves or rejects it. The one-way decision, reviewer, time, and reason are
  persisted in runtime state and an audit event is appended. A completed report cannot be reviewed
  again. The default reason is blank.
- Replaced fabricated operational success with explicit 501-style errors:
  `WALLET_REFRESH_UNAVAILABLE`, `RECONCILIATION_UNAVAILABLE`, and
  `ADMIN_MUTATION_UNAVAILABLE`. Existing UI error paths now state failure instead of claiming work
  was queued. Tests guard against reintroducing the former success payloads.
- Replaced the global “Provider connected” badge with the actual application environment. The
  owner console now says whether required provider configuration is complete, without claiming a
  successful connection.

## Deliberately retained

- Financial execution and deposit-disabled copy is required while activation gates remain open.
  It is not placeholder copy and was not weakened.
- “Live Jupiter market route” is retained only where the route is actually fetched from Jupiter;
  the same screen says signing and broadcast are unavailable. It does not represent a transaction
  as executed.
- Synthetic benchmark labels, fixture terminology, and test-only invalid domains remain because
  they prevent test evidence from being mistaken for production data.
- Security and provenance comments in `magic-browser.ts`, `prestocks.ts`, the API history boundary,
  and `next.config.ts` explain non-obvious invariants. Removing them would reduce maintainability.
- Command-line script logging is intentional operator output, not application debug noise.

## Residual risks and required follow-up

The explicit 501 responses expose real release blockers rather than fixing them. Before the
corresponding acceptance cases can pass, wallet refresh and owner reconciliation need durable jobs
consumed by the worker, and relationship/instrument/limit mutations need authoritative persisted
models with version checks and audit. The controls/routes must not return success until that work
exists.

The owner health response still lists G01–G08 as a fixed set instead of deriving each gate from an
evidence record. Runtime configuration is now labeled accurately, but the gate list is not an
auditable readiness registry. Add persisted gate status/evidence before using the console to
authorize activation.

The catalog review flow closes reports; it does not silently rewrite the immutable seed catalog.
Publishing a corrected relationship still requires an authoritative catalog persistence workflow
with source IDs, region scope, effective dates, and versioning. This separation is intentional:
approving a report is evidence for a mapping change, not the mapping change itself.

The repository's large catch-all route and screen modules are readable but difficult to audit.
Breaking them into domain-oriented modules would improve navigation, but doing so solely to reduce
file size would overlap the separate dependency and DRY tracks and was not necessary for this
high-confidence cleanup.

## Verification

- `npm run lint` — passed.
- `npm run typecheck` — passed.
- Focused Vitest run for store and core-safety contracts — 2 files, 6 tests passed before the final
  repository-wide run.
- `npm test` — 8 files, 28 tests passed.
- `npm run build` — passed with Next.js 16.3.5 using the repository's Webpack build path.
