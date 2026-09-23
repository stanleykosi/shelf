# Frontend Refactor Phases 0–2 — Implementation Summary

Date: 2026-09-22

Scope: structural frontend migration only. Phase 3 page redesign and the future visual system were not started.

## Phase 0 findings

- All user-facing pages were owned by `src/app/[[...path]]/page.tsx` and an internal `ScreenRouter`; that catch-all was the routing source of truth.
- Protected-route redirects preserved only a pathname. The auth challenge accepted any slash-prefixed return path and did not filter query state.
- Product and Company records already had reviewed slugs, but public links and screen props used implementation IDs. Buy and Sell screens contained default-entity fallbacks.
- Brand existed only as Product text. The reviewed Product data contains enough Company, relationship, region, Product, and source information to derive a non-invented Brand read model.
- The local Scan screen disclosed temporary processing but did not require the explicit AI-processing acknowledgement visible in the deployed experience. The approved privacy/product contract confirms that explicit consent is canonical.
- Guest Saved data uses session storage; member Product saves and Company watchlist persistence remain separate behind the existing APIs. The existing seeded guest examples remain a known Phase 4 content-model issue and were not redesigned in this structural phase.
- Wallet, Portfolio, orders, History, Settings, onboarding, and admin access were protected by path classification in the catch-all route. Owner routes returned not-found to non-owners.
- Local PostgreSQL was not available during the browser pass, so authenticated runtime screens could not be exercised locally. Their route/access/return contracts are covered by focused unit tests; no provider, money, or deployment operation was performed.

## Route and entity foundation

- Replaced the optional catch-all and removed `ScreenRouter`.
- Added explicit App Router pages for all 35 canonical routes in the approved guide.
- Added canonical Product, Brand, and Company slug resolvers. Legacy Product/Company ID URLs issue one-way 308 redirects; unknown values render the application not-found state.
- Added a first-class derived Brand read model and `/brands/[slug]`. It preserves reviewed Product IDs, Company relationships, relationship types, regional statements, and source IDs.
- Private resources retain opaque IDs. Order, Holding, Sell, and Activity Record pages verify ownership server-side before rendering; invalid or foreign IDs return not-found.
- Removed silent fallback from invalid Buy and Sell identifiers.
- Added shared route helpers for access classification, safe query preservation, safe `returnTo`, legacy redirects, and primary-navigation state.

## Redirects and compatibility

Explicit one-way redirect pages now cover:

- `/markets*` → Company-filtered `/discover`
- `/shelf*` → `/saved*`
- `/wallet*` → `/account/wallet*`
- `/history*` → `/portfolio/activity*`
- `/settings` → `/account`
- `/welcome` and `/eligibility` → onboarding routes using staged temporary redirects
- `/invest/suggest` → `/invest/basket?source=ai`
- `/invest/buy?companyId=` → `/invest/[companySlug]`
- `/invest/sell?assetId=` → `/portfolio/[instrumentId]/sell`
- known admin aliases → their canonical admin work areas

Redirects preserve only approved browse, market, Activity, asset/scope, and validated relative return state. Amounts, recipients, scan contents, transcripts, quotes, signatures, and unknown query keys are discarded.

## Authentication and consent

- Both sign-in page input and server-created Magic challenges now normalize `returnTo` through the same same-origin application-route allowlist.
- Protected canonical pages return guests to `/sign-in?returnTo=…`; owner pages still return not-found to non-owners.
- No sign-in route performs approval, signing, quote reuse, or order creation.
- Added a versioned AI-processing consent contract. Image recognition controls stay disabled until accepted, the client sends the current version, and the server rejects image recognition without it.
- Barcode recognition and the current deterministic approved-link resolver do not claim to invoke AI and therefore do not request AI-processing consent.

The data model still lacks a persisted onboarding-completion/terms-version state that can decide whether every newly authenticated user must visit `/onboarding` before the safe requested destination. Existing authentication returns directly to the validated destination. Adding that persistence is a later identity/onboarding contract change, not something this structural refactor fabricated.

## Shell and navigation

- Desktop primary navigation is Discover, Saved, and Portfolio.
- Scan is a promoted global action; Search and Account remain utilities.
- Mobile navigation is Discover, Scan, Saved, Portfolio and derives `aria-current` from the actual pathname.
- Markets is no longer a primary destination. Public/private distinctions remain available through Company discovery filters and existing Instrument presentation.
- Account now links canonically to `/account`; Wallet belongs under `/account/wallet`; Activity belongs under `/portfolio/activity`.
- Existing colors, typography, controls, cards, spacing, and screen layouts remain temporary scaffolding.

## Tests and verification

- Added `tests/routing-architecture.test.ts` for explicit route ownership, access boundaries, redirects, safe `returnTo`, slug resolution, Brand resolution, invalid entities, navigation state, and AI consent.
- Updated browser coverage for canonical redirects, Brand routing, Saved migration, Markets migration, and mobile route-active state.
- `npm run lint` — passed.
- `npm run typecheck` — passed after regenerating route types and removing the stale generated catch-all type cache.
- `npm test` — 9 files, 35 tests passed.
- `npm run build` — compiled, type-checked, generated all canonical and legacy route pages, and completed. Magic emitted its pre-existing network-unavailable service message while page data was collected; the build still completed and no paid/provider operation was initiated.
- Local Playwright Chromium — public route/navigation checks passed on desktop and Pixel 7 after test-environment corrections. Local readiness correctly remained 503 because PostgreSQL was not running.
- The final route quality-gate pass confirmed that fixed legacy Markets classifications override conflicting legacy query values rather than creating ambiguous duplicate filters.

## Temporary UI compromises

- Existing page components are rendered inside the new route owners; Phase 3 visual/page redesign was intentionally not attempted.
- The five canonical Admin routes temporarily render the existing combined owner screen.
- Saved still uses existing “shelf/watchlist” internal API and some page copy; only route/navigation ownership changed. Full Saved unification and seeded-empty-state removal remain Phase 4.
- Discover reuses the current search/browse screen with URL-backed query/category/entity/market state. Home and discovery composition remain unchanged.
- Account, Wallet, investment, order, Portfolio, and Activity screens retain their existing visual hierarchy.

## Stop condition

Phases 0, 1, and 2 are implemented. Phase 3 has not begun.
