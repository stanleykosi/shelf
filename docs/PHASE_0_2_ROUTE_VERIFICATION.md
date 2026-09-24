# Phase 0–2 Route Verification

Date: 2026-09-23

Contract: `docs/PRODUCT_DESIGN_GUIDE.md`

Scope: Phase 0–2 routing, entity, access, navigation, and consent structure only. Phase 3 page design was not reviewed or started.

## Overall result

Initial verification result: **FAIL — STRUCTURAL FIXES REQUIRED**.

Final verification result after correction: **PASS WITH NON-BLOCKING ISSUES**.

All 35 canonical route files exist, the optional catch-all and `ScreenRouter` are gone, entity ownership checks conceal foreign resources, and the approved navigation and Scan consent contracts are present. The initial audit found two Phase 0–2 defects that prevented a pass:

1. The root `app/loading.tsx` commits a streamed `200 OK` before route-level `redirect()`, `permanentRedirect()`, or `notFound()` can set the HTTP status. Legacy redirects, auth redirects, canonical ID redirects, invalid entities, and unauthorized resources therefore return an initial HTTP 200 with an embedded client redirect/not-found payload instead of 307/308/404. Browser navigation usually settles correctly, but the response contract is wrong and produced a flaky timeout plus Next development performance errors during verification.
2. `safeReturnTo()` validates dynamic destinations by broad prefix. Unsupported or malformed shapes such as `/products/`, `/products/%`, `/orders/id/approve`, and `/portfolio/id/unknown` are accepted instead of falling back safely.

The initial tables below preserve the fail-first evidence. After this report was created, only those two Phase 0–2 defects and their regression coverage were corrected. The final production build now emits real 307/308/404 responses, strict return-path validation rejects unsupported shapes, and the complete local route/browser verification passes. No Phase 3 page, content, or visual redesign was started.

## Canonical route verification

Every page file explicitly owns its App Router segment and re-exports a named server route owner from `src/components/route-pages.tsx`. That module is a compatibility adapter around existing screens, not a pathname switch or alternate router.

| Route | Actual route file | Exists | Access | Rendering | Initial result | Notes |
| ----- | ----------------- | ------ | ------ | --------- | -------------- | ----- |
| `/` | `src/app/page.tsx` | Yes | Public | Compatibility screen | Pass | Renders Home/Discover directly. |
| `/discover` | `src/app/discover/page.tsx` | Yes | Public | Compatibility screen | Pass | Reads `q`, `category`, `entity`, and `market`. |
| `/scan` | `src/app/scan/page.tsx` | Yes | Public | Compatibility screen | Pass | Consent contract verified separately. |
| `/scan/results` | `src/app/scan/results/page.tsx` | Yes | Public/session-bound | Compatibility screen | Pass | Empty session recovers to Scan. |
| `/products/[slug]` | `src/app/products/[slug]/page.tsx` | Yes | Public | Compatibility screen | Defect | Valid slug renders; invalid and legacy-ID status codes are streamed as 200. |
| `/brands/[slug]` | `src/app/brands/[slug]/page.tsx` | Yes | Public | Compatibility screen | Defect | Valid Brand renders; invalid slug presents not-found under HTTP 200. |
| `/companies/[slug]` | `src/app/companies/[slug]/page.tsx` | Yes | Public | Compatibility screen | Defect | Valid slug renders; invalid and legacy-ID status codes are streamed as 200. |
| `/learn` | `src/app/learn/page.tsx` | Yes | Public | Compatibility screen | Pass | Library route renders. |
| `/learn/[slug]` | `src/app/learn/[slug]/page.tsx` | Yes | Public | Compatibility screen | Defect | Valid article renders; invalid article presents not-found under HTTP 200. |
| `/assistant` | `src/app/assistant/page.tsx` | Yes | Public/capability-aware | Compatibility screen | Pass | No financial authority is granted. |
| `/saved` | `src/app/saved/page.tsx` | Yes | Guest/member | Compatibility screen | Pass with compromise | Guest session state and authenticated persistence both work; Phase 4 content/model compromises remain. |
| `/saved/share` | `src/app/saved/share/page.tsx` | Yes | Member | Compatibility screen | Defect | Browser reaches safe sign-in destination, but initial auth response is 200. |
| `/share/[token]` | `src/app/share/[token]/page.tsx` | Yes | Public | Compatibility screen | Pass | Invalid bearer tokens use the existing generic unavailable state. |
| `/sign-in` | `src/app/sign-in/page.tsx` | Yes | Public | Compatibility screen | Pass | Normalizes `returnTo`; dynamic-shape gap noted below. |
| `/auth/callback` | `src/app/auth/callback/page.tsx` | Yes | Public technical | Compatibility screen | Pass | Callback only completes authentication and replaces navigation. |
| `/onboarding` | `src/app/onboarding/page.tsx` | Yes | Member | Compatibility screen | Defect | Correct browser auth destination; initial redirect status is 200. |
| `/onboarding/availability` | `src/app/onboarding/availability/page.tsx` | Yes | Member | Compatibility screen | Defect | Safe return is filtered; initial redirect status is 200. |
| `/account` | `src/app/account/page.tsx` | Yes | Member | Compatibility screen | Defect | Guest reaches `/sign-in?returnTo=%2Faccount`; initial response is 200. |
| `/account/wallet` | `src/app/account/wallet/page.tsx` | Yes | Member | Compatibility screen | Defect | Guest destination is correct; initial response is 200. |
| `/account/wallet/deposit` | `src/app/account/wallet/deposit/page.tsx` | Yes | Member | Compatibility screen | Defect | Safe return state is filtered; initial response is 200. |
| `/account/wallet/send` | `src/app/account/wallet/send/page.tsx` | Yes | Member | Compatibility screen | Defect | Wallet remains under Account; initial auth response is 200. |
| `/invest/[companySlug]` | `src/app/invest/[companySlug]/page.tsx` | Yes | Member | Compatibility screen | Defect | Valid Company is resolved before auth; guest destination is correct but initial response is 200. |
| `/invest/basket` | `src/app/invest/basket/page.tsx` | Yes | Member | Compatibility screen | Defect | Protected correctly in browser; initial response is 200. |
| `/orders/[id]/review` | `src/app/orders/[id]/review/page.tsx` | Yes | Member/owner resource | Compatibility screen | Defect | Ownership concealment works; redirect/not-found status is 200. |
| `/orders/[id]` | `src/app/orders/[id]/page.tsx` | Yes | Member/owner resource | Compatibility screen | Defect | Owned fixture renders; foreign/missing resources are concealed under HTTP 200. |
| `/portfolio` | `src/app/portfolio/page.tsx` | Yes | Member | Compatibility screen | Defect | Guest reaches safe sign-in destination; initial response is 200. |
| `/portfolio/[instrumentId]` | `src/app/portfolio/[instrumentId]/page.tsx` | Yes | Member/owner resource | Compatibility screen | Defect | Owned fixture renders; foreign/missing resources are concealed under HTTP 200. |
| `/portfolio/[instrumentId]/sell` | `src/app/portfolio/[instrumentId]/sell/page.tsx` | Yes | Member/owner resource | Compatibility screen | Defect | No fallback entity; foreign/missing resources are concealed under HTTP 200. |
| `/portfolio/activity` | `src/app/portfolio/activity/page.tsx` | Yes | Member | Compatibility screen | Defect | Activity is structurally under Portfolio; initial auth response is 200. |
| `/portfolio/activity/[recordId]` | `src/app/portfolio/activity/[recordId]/page.tsx` | Yes | Member/owner resource | Compatibility screen | Defect | Owned fixture renders; foreign/missing resources are concealed under HTTP 200. |
| `/admin` | `src/app/admin/page.tsx` | Yes | Owner | Compatibility screen | Defect | Non-owner receives generic not-found content under HTTP 200. |
| `/admin/catalog` | `src/app/admin/catalog/page.tsx` | Yes | Owner | Compatibility screen | Defect | Dedicated route, temporary shared Admin screen, streamed access status. |
| `/admin/access` | `src/app/admin/access/page.tsx` | Yes | Owner | Compatibility screen | Defect | Dedicated route, temporary shared Admin screen, streamed access status. |
| `/admin/operations` | `src/app/admin/operations/page.tsx` | Yes | Owner | Compatibility screen | Defect | Dedicated route, temporary shared Admin screen, streamed access status. |
| `/admin/audit` | `src/app/admin/audit/page.tsx` | Yes | Owner | Compatibility screen | Defect | Dedicated route, temporary shared Admin screen, streamed access status. |

Final canonical-route result: **all 35 pass their Phase 0–2 ownership, access, and HTTP behavior requirements**. The “Initial result” column intentionally preserves the report-first finding; each status-only defect in that column was resolved by the single root streaming correction and retested below.

## Old router verification

- `src/app/[[...path]]/page.tsx` does not exist.
- `ScreenRouter` has no implementation or reference in `src`.
- No equivalent user-facing pathname switch exists. `activePrimarySection()` only derives navigation state; `legacyRedirectFor()` is an explicit migration map.
- `src/app/api/v1/[...path]/route.ts` remains an API dispatcher and is not a frontend router.
- `src/components/route-pages.tsx` centralizes temporary screen adapters and access/entity resolution, but each actual page segment is explicitly owned by its own App Router file.

## Legacy redirect verification

Before correction, each destination was encoded correctly in Next's redirect payload, but the initial response was HTTP 200 with no `Location` header. The final local production responses are:

| Legacy Route | Expected Destination | Actual Destination | Status | Result |
| ------------ | -------------------- | ------------------ | ------ | ------ |
| `/markets` | `/discover?entity=company` | Same | 308 | Pass |
| `/markets/public` | `/discover?entity=company&market=public` | Same | 308 | Pass |
| `/markets/private` | `/discover?entity=company&market=private` | Same | 308 | Pass |
| `/shelf` | `/saved` | Same | 308 | Pass |
| `/shelf/share` | `/saved/share` | Same | 308 | Pass |
| `/wallet` | `/account/wallet` | Same | 308 | Pass |
| `/wallet/deposit` | `/account/wallet/deposit` | Same | 308 | Pass |
| `/wallet/send` | `/account/wallet/send` | Same | 308 | Pass |
| `/history` | `/portfolio/activity` | Same | 308 | Pass |
| `/history/[id]` | `/portfolio/activity/[recordId]` | Same | 308 | Pass |
| `/settings` | `/account` | Same | 308 | Pass |
| `/welcome` | `/onboarding` | Same | 307 | Pass |
| `/eligibility` | `/onboarding/availability` | Same | 307 | Pass |
| `/invest/suggest` | `/invest/basket?source=ai` | Same | 308 | Pass |
| `/invest/buy?companyId=company-pepsico` | `/invest/pepsico` | Same | 308 | Pass |
| `/invest/sell?assetId=instrument-pepx` | `/portfolio/instrument-pepx/sell` | Same | 308 | Pass |
| `/admin/status` | `/admin` | Same | 308 | Pass |
| `/admin/invites` | `/admin/access` | Same | 308 | Pass |
| `/admin/orders` | `/admin/operations` | Same | 308 | Pass |

Allowed state was preserved and unsafe state discarded in the resolver and runtime payload. For example, conflicting legacy `entity=product&market=private` cannot override `/markets/public`; `q=apple` remains while `amount=50` is dropped. Wallet Send retains reviewed `asset` and `scope` while discarding `recipient` and `amount`. Canonical targets do not redirect back to legacy routes, so no redirect loop was found.

### Final redirect evidence

After removing the root streaming boundary, all 19 guide-listed legacy routes returned their required initial response in the local production build:

- the 17 permanent migrations returned HTTP 308 with exact `Location` headers;
- `/welcome` and `/eligibility` returned HTTP 307 with exact `Location` headers;
- query-state allowlisting remained intact;
- legacy Product/Company identifiers returned 308 to their reviewed canonical slugs;
- canonical destinations remained stable and no loop was introduced.

This matrix is now exercised through `tests/e2e/route-architecture.spec.ts` against a local production server rather than inferred only from resolver output or the browser's settled URL.

## Entity-route verification

| Case | Final evidence | Result |
| ---- | -------------- | ------ |
| Valid Product slug | `/products/doritos-snack` renders “Doritos snack” | Pass |
| Valid Brand slug | `/brands/doritos` renders “Doritos” and links to `/companies/pepsico` | Pass |
| Valid Company slug | `/companies/pepsico` renders “PepsiCo” | Pass |
| Legacy Product ID | HTTP 308 to `/products/doritos-snack` | Pass |
| Legacy Company ID | HTTP 308 to `/companies/pepsico` | Pass |
| Invalid Product | Application not-found state with HTTP 404 | Pass |
| Invalid Brand | Application not-found state with HTTP 404 | Pass |
| Invalid Company | Application not-found state with HTTP 404 | Pass |
| Invalid legacy Buy ID | Application not-found state; no fallback Company | Pass |
| Invalid legacy Sell ID | Application not-found state; no fallback Instrument | Pass |

The old Buy/Sell default-entity fallback is absent. `LegacyBuyPage` resolves only a reviewed Company ID; `LegacySellPage` resolves only a reviewed Instrument ID. Invalid values call `notFound()`.

## Brand routing verification

Brand is a first-class `Brand` type, resolver, slug index, canonical route, and rendered screen. The read model is derived from reviewed Product records rather than hardcoded page data. It preserves Product IDs, Company IDs, relationship type, regional statement, and source IDs.

The integrity audit found 17 Brands, 17 unique slugs, no broken Product/Company/source references, and no duplicate slugs. The current catalog supports only `global_parent` plus one family-level regional caveat; licensing, joint-venture, and historical edge cases are not present in the source data and were not fabricated.

## Authentication verification

With the isolated local PostgreSQL stack running, guest browser navigation reached these safe final destinations:

- `/account` → `/sign-in?returnTo=%2Faccount`
- `/account/wallet` → `/sign-in?returnTo=%2Faccount%2Fwallet`
- `/saved/share` → `/sign-in?returnTo=%2Fsaved%2Fshare`
- `/portfolio` → `/sign-in?returnTo=%2Fportfolio`
- `/portfolio/activity?status=failed&recipient=secret` → `/sign-in?returnTo=%2Fportfolio%2Factivity%3Fstatus%3Dfailed`
- `/invest/pepsico` → `/sign-in?returnTo=%2Finvest%2Fpepsico`
- `/orders/order-fixture/review` → `/sign-in?returnTo=%2Forders%2Forder-fixture%2Freview`

Absolute external URLs, protocol-relative URLs, callback loops, unknown top-level routes, control characters, and unsafe query keys are rejected or removed. After correction, each tested guest boundary returns HTTP 307 with the exact safe sign-in `Location`.

Dynamic return destinations are now matched by exact canonical shapes and safe, decodable single segments. `/products/`, `/products/%`, encoded separators, extra segments, `/orders/id/approve`, and `/portfolio/id/unknown` fall back to `/onboarding`. Sign-in/callback code does not submit orders, sign payloads, reuse quotes, or approve transactions; it only establishes the authenticated session and navigates to the normalized destination.

## Private-resource authorization verification

Runtime verification used an isolated temporary PostgreSQL database and a non-production test-only session. No external provider or real-money action was invoked.

| Resource | Owned fixture | Missing fixture | Foreign fixture | Leakage result |
| -------- | ------------- | --------------- | --------------- | -------------- |
| Order review/status | Rendered | Generic not-found | Generic not-found | No existence leakage |
| Holding | Rendered | Generic not-found | Generic not-found | No existence leakage |
| Holding sell | Rendered | Generic not-found | Generic not-found | No existence leakage |
| Activity record | Rendered | Generic not-found | Generic not-found | No existence leakage |
| Admin as non-owner | Not applicable | Generic not-found | Generic not-found | Owner role concealed |

Authorization logic is verified by runtime, not only unit tests. In the corrected production build, owned Order, Holding, Sell, and Activity fixtures returned 200; the corresponding foreign and missing resources returned indistinguishable 404 responses. A signed-in non-owner also received 404 for `/admin`.

## Desktop navigation verification

- Primary labels are exactly Discover, Saved, and Portfolio.
- Scan is a promoted labeled action; Search and Account are header utilities.
- Markets is absent from primary navigation.
- “Shelf” is not used as the Saved navigation label.
- Discover is active for `/`, `/discover`, Product, Brand, and Company routes.
- Scan is active for `/scan` and `/scan/results` via the promoted action.
- Saved and Portfolio are active only for their route families.
- Account resolves to `/account` for the authenticated fixture.

## Mobile navigation verification

- Labels are exactly Discover, Scan, Saved, Portfolio.
- Account remains in the header rather than the four-item bottom navigation.
- Route-derived active state passed for `/`, `/discover`, `/scan`, `/scan/results`, Product, Brand, Company, `/saved`, `/portfolio`, and `/portfolio/activity`.
- Scan, not Markets, is active throughout `/scan*`.
- Safe-area padding and app-shell bottom clearance are present in CSS.

## Discover market-filter verification

Against the isolated local database:

- `/discover?entity=company` rendered all 12 reviewed Companies, including discovery-only NIKE.
- `market=public` rendered the three xStocks Companies.
- `market=private` rendered the eight PreStocks Companies.
- `/markets`, `/markets/public`, and `/markets/private` reached those exact browser states.

Public/private distinctions therefore remain structurally intact. The corrected legacy entry routes return their real 308 responses before navigation.

## Saved-route verification

- `/saved` is the canonical navigation destination.
- Guest `sessionStorage` state survives reload and renders the selected Product.
- Authenticated add/read persistence succeeded against the isolated PostgreSQL runtime store.
- `/shelf` returns 308 to `/saved`.
- Existing `shelf` and `watchlist` API names remain, as explicitly allowed until Phase 4.

The existing seeded guest examples and “My shelf” page copy remain an expected Phase 4 compromise. They were not treated as a Phase 0–2 correction.

## Account / Wallet hierarchy verification

Account owns `/account`; Wallet, Deposit, and Send are nested below `/account/wallet`. The application shell links Account independently from Portfolio. Legacy `/wallet*` destinations return exact 308 redirects, with unsafe amount/recipient state removed.

## Portfolio / Activity hierarchy verification

Portfolio, Holding, Sell, Activity, and Activity Record all have explicit nested canonical routes. `/history*` resolves only toward `/portfolio/activity*`. Runtime ownership checks conceal foreign resources. Wallet is not nested under Portfolio.

## Scan consent verification

- The image-processing consent text is visible for Camera, Upload, Screenshot, and Receipt.
- The image-recognition action is disabled until consent is checked.
- The client sends `AI_PROCESSING_CONSENT_VERSION` plus explicit acceptance.
- The server returned `AI_CONSENT_REQUIRED` for missing consent and a stale version before any provider call.
- Barcode returned a deterministic unlisted candidate without AI consent.
- The approved Apple link returned the reviewed iPhone Product/Company match without AI consent.
- Barcode and approved-link UI do not display the image-processing consent claim.

## Automated test results

Pre-fix complete check:

- ESLint: passed.
- TypeScript: passed.
- Vitest: 10 files, 44 tests passed.
- Existing route architecture, resolver, access, navigation-state, and AI-consent unit tests passed.
- Existing local Playwright suite against the isolated PostgreSQL-backed production build: 4/4 passed.

The unit suite validates resolver outputs, not emitted HTTP statuses. The browser suite validates final URLs after client redirects, not the initial response contract.

Final check after correction:

- `npm run check`: passed.
- ESLint: passed with no warnings.
- TypeScript: passed.
- Vitest: 10 files, 44 tests passed, including accepted and rejected canonical return-path shapes.
- Next.js production build: passed and generated all explicit canonical and legacy routes.
- Local production Playwright: 6/6 passed across desktop Chromium and Pixel 7 projects.
- The runtime route suite asserts every guide-listed legacy redirect's initial 307/308 status and exact `Location`, canonical Product/Company ID migration, invalid entity 404s, unknown-route 404, and guest access redirect.
- Authenticated runtime probes additionally verified 200 for owned private resources and indistinguishable 404 for foreign, missing, and non-owner Admin resources.

## Build result

The Next.js 16.3.5 Webpack production build passed and generated all 35 canonical pages plus explicit legacy pages. Magic emitted its known network-unavailable initialization message while collecting page data; the build completed successfully and no provider purchase, wallet signing, deployment, or money action occurred.

## Browser verification

Public Home, Discover, Scan, Scan Results recovery, Product, Brand, Company, Saved, Portfolio auth state, Markets migration, and Shelf migration were inspected at desktop and 412×915 mobile viewports.

The corrected PostgreSQL-backed production build passed all 6 desktop/mobile browser tests, including the new exact HTTP contract suite. The pre-fix development-server run passed 3/4 and timed out once while settling `/shelf`; it also recorded negative performance timestamp errors around streamed redirect pages. Removing the global loading boundary corrected the underlying response-order problem. A later design phase may add route-local loading UI after status-setting validation, but Phase 0–2 no longer starts a global stream before route resolution.

## Issues discovered

| Severity / status | Area | Issue | Disposition |
| ----------------- | ---- | ----- | ----------- |
| ROUTING DEFECT — resolved | Redirects and not-found | Root streaming changed route-level 307/308/404 responses into HTTP 200 client fallbacks. | Removed the root boundary and verified exact production HTTP responses. |
| AUTH DEFECT — resolved | Safe `returnTo` | Dynamic prefixes accepted unsupported/malformed path shapes. | Replaced prefix matching with exact canonical shapes and safe segment validation. |
| TEST GAP — resolved for Phase 0–2 | Browser/runtime routing | Tests asserted resolver output and settled browser URLs but not the initial HTTP contract. | Added local-production runtime coverage for the full legacy matrix, access redirect, and public not-found paths; authenticated ownership responses were also probed directly. |
| EXPECTED TEMPORARY COMPROMISE | Route rendering | Canonical pages reuse existing screens through `route-pages.tsx`; five Admin routes share `AdminScreen`. | Leave until their approved later phases. |
| EXPECTED TEMPORARY COMPROMISE | Saved | Seeded guest examples, “My shelf,” and separate watchlist internals remain. | Leave until Phase 4. |

## Fixes made during verification

The initial fail report above was written before any correction. The subsequent changes were limited to Phase 0–2:

1. Removed `src/app/loading.tsx`. Next.js documents that a `loading.tsx` fallback starts streaming and commits HTTP 200, preventing later `redirect()` and `notFound()` calls from setting response headers/status. This restores server-visible 307/308/404 behavior. No replacement visual loading treatment was designed.
2. Replaced broad dynamic-prefix `returnTo` acceptance in `src/lib/routes.ts` with exact canonical route-shape matching and safe decoded-segment checks.
3. Extended `tests/routing-architecture.test.ts` with accepted canonical and rejected malformed/unsupported return destinations.
4. Added `tests/e2e/route-architecture.spec.ts`, gated to an explicitly selected local server, to verify the real production HTTP contract without changing live production or later-phase frontend behavior.

## Remaining known compromises

- Existing page visuals and screen responsibilities remain temporary scaffolding.
- Admin route ownership is real, but all five canonical routes temporarily render the combined Admin screen.
- Saved still exposes some “shelf/watchlist” page and API language and fabricated guest examples; the canonical route/navigation label is Saved.
- The current catalog has no reviewed Brand licensing, joint-venture, or historical relationship fixtures beyond `global_parent`.
- Real provider activation and live-money gates remain disabled and were not exercised.

## Product Design Architect quality gate

| Gate | Result | Evidence |
| ---- | ------ | -------- |
| Canonical information architecture | Pass | All 35 approved routes have explicit App Router owners; no catch-all or internal pathname router controls the experience. |
| Route migration and recovery | Pass | All 19 legacy routes are one-way, preserve only approved state, emit exact 307/308 responses, and do not loop. |
| Entity model integrity | Pass | Product, Brand, Company, Instrument exposure, and Holding remain distinct; reviewed slugs and relationships resolve without default-entity fallbacks. |
| Access and ownership boundaries | Pass | Guest redirects are safe; owned resources render; foreign, missing, and non-owner resources are concealed with 404. |
| Navigation and responsive structure | Pass | Desktop and mobile destinations, labels, active states, Scan promotion, Account placement, and safe-area behavior match the guide. |
| State, failure, and recovery behavior | Pass | Invalid entities, unsafe return paths, empty Scan results, consent failures, and legacy query migration have explicit outcomes. |
| Consent and financial safety | Pass | Image AI requires current explicit consent; deterministic methods do not claim AI use; auth routes perform no transaction authority. |
| Verification completeness | Pass | Static inspection, unit tests, production build, direct HTTP probes, authenticated runtime probes, and desktop/mobile browser checks agree. |
| Scope discipline | Pass | No Phase 3 work, page redesign, design-system change, external provider purchase, deployment, signing, or money action occurred. |

## Final recommendation

**Are Phases 0–2 structurally complete enough to deploy and begin Concept #1 / Phase 3 work?**

**Yes.** Phases 0–2 are structurally complete enough to deploy and to begin Concept #1 / Phase 3 work. The canonical route inventory, one-way migration matrix, entity resolution, access boundaries, navigation, consent behavior, real HTTP statuses, and safe return paths pass the Product Design Architect route quality gate. The remaining items are documented later-phase product/design compromises, not blockers to the routing architecture.
