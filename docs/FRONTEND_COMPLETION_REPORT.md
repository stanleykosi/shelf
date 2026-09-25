# Concept 2 frontend implementation report

Date: 2026-09-24. Scope: the remaining frontend, not production deployment or real-money activation.
Final verification result: **PASS — all six remaining frontend workstreams completed locally.**

## Workstreams and routes

| Workstream | Implemented destinations | Responsibility |
|---|---|---|
| A — Research | `/products/[slug]`, `/brands/[slug]`, `/companies/[slug]` | Distinct entity identity, existing Relationship Explorer, progressive source evidence, research-first continuation, separate issuer exposure |
| B — Saved and learning | `/saved`, `/saved/share`, `/share/[token]`, `/learn`, `/learn/[slug]`, `/assistant` | Real collection state, explicit merge, selection-based private sharing, editorial library and consent-gated research questions |
| C — Ownership | `/portfolio`, `/portfolio/[instrumentId]`, `/portfolio/[instrumentId]/sell`, `/portfolio/activity`, `/portfolio/activity/[recordId]` | Holding/Company/Instrument separation, exact quantities, honest valuation limits, scoped exits, URL-filtered records |
| D — Account | `/account`, `/account/wallet`, `/account/wallet/deposit`, `/account/wallet/send`, `/sign-in`, `/auth/callback`, `/onboarding`, `/onboarding/availability` | Operational settings, safe returns, explicit setup/merge, wallet independence and unavailable funding states |
| E — Transactions | `/invest/[companySlug]`, `/invest/basket`, `/orders/[id]/review`, `/orders/[id]` | Deliberate amount/review/status flow, expiry, budget arithmetic, fresh approval and unknown-outcome safety |
| F — Admin | `/admin`, `/admin/catalog`, `/admin/access`, `/admin/operations`, `/admin/audit` | Five real workspaces, owner guards, reasons/acknowledgement/fresh authentication and redacted diagnostics |

Existing `/assets/[provider]/[symbol]` and `/buy` use the same functional foundation while
preserving the newer issuer backend. Approved Home/Discover/Scan/Results compositions remain.
The accepted Home is the sole canonical landing design; the historical comparison is removed.

## Shared primitives

`research-workspace.css` centrally extends the existing PageIntro, Card, Field, button,
status and table primitives. A single ruled section/row/grid vocabulary serves all remaining
routes. Mobile tables retain semantic markup and add visible cell labels. ProductArtwork and
CapitalRelationship are reused rather than independently reimplemented. Product images now have
bounded grid widths, smaller requests to the same reviewed source and explicit failure fallback.
The Discover filter sheet uses Shelf's native modal pattern, including background inertness,
Escape, initial focus and return focus. Its URL updates preserve search and filter context.

No new typeface, palette, animation library, component dependency, generated imagery, shadow
system, graph language or speculative financial visualization was introduced.

## Guide and phase decisions

`PRODUCT_DESIGN_GUIDE.md` now marks Concept 2 FINAL, supersedes historical visual studies,
records DD-026 and adds finalized page-family decisions. Existing financial/security/provider
contracts still take precedence. The product-design-architect audit drove restoration of real
Brand/Company destinations, separation of research from execution, explicit state recovery and
the six-workstream ownership plan. Animation accessibility and UI-library reviews preserved the
existing reduced-motion/native-control patterns rather than creating parallel systems.

Phases 0–2 remain foundations. Phases 3–8 have their requested frontend implementations;
Phase 9 is complete with the rendered/accessibility/regression evidence below.

## Responsive and accessibility coverage

The authenticated matrix covers 27 representative routes at **390, 430, 768, 1280 and 1440px**:
135 route/viewport combinations, plus public/empty-state captures and existing approved-surface
responsive tests. Screenshots include real 390×844 viewports and scrolled-bottom clearance,
not only full-page output. The initial pass found and corrected intrinsic image-width overflow.

Automated WCAG 2A/AA and 2.1AA checks run across the 27 remaining route examples at 390 and 1440.
The first pass identified low-contrast entity labels; they were corrected within the same palette.
Browser checks exercise keyboard focus, native modal containment/return/Escape, labeled controls,
disabled actions, status announcements, reduced motion and mobile navigation clearance. This is
not a claim of an independent assistive-technology certification or exhaustive device testing.

## Verification

Commands used:

```sh
npm run lint
npm run typecheck
npm test
npm run build
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3300 FRONTEND_QA_FIXTURES=true npx playwright test
git diff --check
```

- ESLint: passed with no remaining warnings/errors.
- TypeScript: passed; production build also completed its TypeScript check.
- Unit/contract tests: **120 passed across 21 files**.
- Production build: **passed**, including canonical and legacy route generation.
- Consolidated browser run: **90 passed, 14 intentional project-specific skips, zero failures**
  (`test-results/frontend-final`, 104 configured cases). The five-width matrix and automated
  accessibility sweep are included; the sweep found zero WCAG violations after fixes.
- Final investment-route contract audit added the guide-required member boundary. After the
  final rebuild, **four additional desktop/mobile checks passed** for guest 307 return-to-intent,
  authenticated investment access and owner controls (`test-results/final-access-guard`).
- Image-ready desktop/mobile recapture: **two matrix tests passed**. All 76 linked screenshots
  exist; captures wait for actual reviewed media or its explicit failure fallback.
- Phase 0–2: exact 307/308/404, safe return paths, entity canonicalization, access boundaries,
  navigation and Scan privacy/session tests are included in the browser/unit regression suites.

## Screenshots and data provenance

[Screenshot index](../artifacts/frontend-refactor/README.md) links all representative page families.
Catalog identities, relationships, evidence and approved imagery are existing repository data.
Private account/financial renders are explicitly synthetic local QA fixtures, never real balances,
Holdings, orders or successful financial execution. Issuer outages are deliberately represented as
unavailable rather than filled with invented prices or instruments. Paid providers and real-money
flags were disabled; no wallet was signed, funded, sent from or deployed.

## Known technical compromises

- Reviewed remote image hosts can time out; the UI now degrades explicitly and keeps identity
  text. Screenshots are not evidence of permanent image-host availability.
- Unused legacy combined screen modules were removed after canonical routes were restored.
- Financial screenshots review genuine unavailable/draft states. Live quotes, wallet-provider
  authentication and real transactions were not exercised as part of a frontend refactor.
- Browser tests run on desktop Chromium and the configured mobile Chromium emulation. Physical
  camera devices, Safari/Firefox and full screen-reader sessions remain external validation.

## Deferred backend/product limitations — guards preserved

- Real trading, funding and launch remain governed by the existing activation gates and separate
  user authorization. This report is not production or real-money readiness approval.
- The existing Company-save API is instrument-restricted. Unsupported research remains readable;
  the frontend does not fabricate persistence or infer an investable instrument.
- Portfolio marks/P&L and per-record historical display decimals are not supplied by current APIs.
  Acquisition cost is not called current value; missing unit metadata stays explicitly raw.
- Research Assistant is non-streaming, with best-effort provider cancellation. The frontend
  records consent before submission; the existing Assistant endpoint's independent server-side
  consent enforcement remains a backend follow-up. Scan's explicit server consent contract is
  unchanged and regression-tested.
- Onboarding acknowledgements are local setup gates, not persisted policy-consent records.
  Eligibility decisions remain server-authoritative.
- Admin reconciliation may explicitly return unavailable. There is no invented directory,
  arbitrary catalog editor, role editor, balance editor or forced chain-success control.
- Existing article records have version/review metadata but no per-article source list. No
  citations were invented to decorate the library.

## Final visual / product audit

One light functional canvas, editorial typography, low-radius controls, thin rules and restrained
green/mint selection span the workstreams. Admin is denser but not a different theme. Saved is
research; Portfolio is ownership; Wallet is cash/external inventory. Product→Brand→Company uses
the same Relationship Explorer as Home/Scan, then exposes Instrument research separately.
No generic AI/chat decoration, neon/glow, gradient cards, meaningless charts, invented return
figures or heavy shadows were added.

**Is the full frontend now consistently implemented according to Concept 2 — Capital Research
Direction? Yes.** The active canonical frontend uses that accepted direction; explicit historical
comparison remains archival. This is frontend completion, not deployment, backend-gap closure,
real-money activation or public-launch approval.

## Local QA reproducibility

The fixture seeder refuses every database except the explicit isolated local QA target:
`postgresql://shelf_scan_qa@127.0.0.1:55439/postgres`, with `FRONTEND_QA_FIXTURES=true`.
Migrate that disposable database before running `scripts/seed-frontend-qa.ts`; never use a shared
database. The server uses the synthetic issuer `did:qa:frontend-owner` and test-only HMAC key
`frontend-qa-local-only-not-a-secret`. These are not production credentials. Set them only in the
isolated QA process, alongside empty paid-provider keys, `ENABLE_REAL_TRADING=false`,
`ENABLE_DEPOSITS=false`, and `DATABASE_SSL=false`. The browser fixture creates a normal signed
session backed by that database; no application authentication bypass is added.
