# Shelf Product Design & Experience Guide

Status: initial refactor architecture contract
Last updated: 2026-09-22
Current refactor phase: architecture complete; implementation not started
Source-of-truth status: authoritative for the frontend/product-experience refactor, subordinate to approved financial, privacy, security, and provider contracts in `docs/product/`
Scope: product experience, information architecture, routes, journeys, page responsibilities, interaction behavior, and visual direction. This is not a design system.

## How to use this guide

This guide bridges Shelf's approved product strategy and a future frontend refactor. It does not specify color tokens, spacing scales, component APIs, Tailwind mappings, or Storybook variants. The approved product pack in `docs/product/` remains authoritative for financial, privacy, data, provider, and security behavior. If this guide and a domain contract conflict, the domain contract wins until both are deliberately reconciled.

Audit evidence used:

- Repository routes, screen router, app shell, screens, API route handlers, state model, catalog, database schema, provider boundaries, tests, runbooks, and product specifications 00–19.
- Live desktop views of Home, Markets, Scan, Shelf, and Company; live mobile views of Home and Scan at `https://shelf-one-phi.vercel.app/`.
- Existing production browser tests and protected-route rules.

Known audit limitation: the recommended `agent-browser` executable was unavailable, so live inspection used the repository's installed Playwright Chromium. The deployed Scan screen showed an OpenRouter consent control not present in the inspected local `ScanScreen`, indicating a small deployment/source divergence. Recommendations are based on the repository for functional truth and the live deployment for rendered-experience evidence. Authenticated and owner-only screens were audited from code and product contracts; no credentials, paid calls, deposits, or financial transactions were used.

The product model is validated, with one necessary extension:

> A person starts with a product or company they recognize. Shelf verifies the path from Product → Brand → Company, explains the Company's market status, distinguishes the available Instrument from the Company itself, lets the person save research or deliberately invest, and tracks any resulting Holding separately from saved interest.

The essential chain is therefore **Product → Brand → Company → Market context → Instrument → Holding**. “Investment” is an action; “Instrument” and “Holding” are entities. Not every product resolves cleanly, not every company has an instrument, and not every instrument is currently executable.

# 1. Product Model

## Product in human words

Shelf helps a person start with a familiar real-world product, verify the Brand and Company behind it, understand whether a separate investment Instrument exists, and either save that research or deliberately acquire and track a Holding. It is a recognition and research product first, with a carefully gated investment workflow—not a token marketplace organized around provider inventory.

## Primary users

- **Curious consumer:** recognizes products but may not know their corporate ownership; wants a fast, credible explanation without finance jargon.
- **Researching saver:** wants to keep Products and Companies to revisit, compare context, or share without implying ownership.
- **Eligible member/investor:** understands the Company/Instrument distinction and wants to fund, review, approve, and track supported exposure with exact terms.
- **Portfolio owner:** wants an accurate account of Shelf-origin Holdings, cash, records, corporate actions, exits, and transfer scope.
- **Shelf owner/operator:** needs safe catalog, access, risk, reconciliation, budget, incident, and audit controls without consumer concepts leaking into operations.

These are task modes, not mutually exclusive personas. A person may move from curiosity to research to ownership, but the UI must never imply that progression is required.

## Core user jobs

1. Identify a Product from camera, barcode, image, screenshot, receipt, approved link, or search.
2. Verify Product → Brand → Company with sources, region, relationship type, and effective context.
3. Research a Company and understand whether no, public, or private exposure is available.
4. Save Products or Companies for later without confusing interest with ownership.
5. Understand the exact Instrument, its issuer, rights, restrictions, pricing meaning, and current availability.
6. Deliberately fund and approve a single purchase or multi-company budget, then recover safely from partial or unknown outcomes.
7. Review, sell, or transfer a Shelf-origin Holding and inspect immutable Activity records.
8. Control identity, wallet, privacy, exports, deletion, and sharing.

## Core value loop

```text
Recognize something familiar
  → verify its Product / Brand / Company relationship
  → understand the Company and any distinct Instrument
  → save research OR take a deliberate financial action
  → receive persistent feedback and recover safely
  → revisit Saved research or an owned Holding with better context
```

The first meaningful decision is **how to identify something: Scan or Search**. The principal nonfinancial success is a verified relationship understood or saved. The principal financial success is a finalized, reconciled Holding plus an immutable record—not a submitted transaction.

## Core entities and relationships

```text
Product ──belongs to──▶ Brand ──has a reviewed legal relationship──▶ Company
                                                                  │
                                                                  ├── may have no supported exposure
                                                                  └── may be referenced by one active v1 Instrument
                                                                                                  │
Saved Product / Saved Company ◀── research intent                         finalized Shelf buy ──▶ Holding
                                                                                                  │
Wallet cash / external assets ── account infrastructure             Portfolio groups Holdings + Activity
```

- **Product** is the recognizable item; **Brand** is the consumer-facing identity; **Company** is the reviewed legal/operating entity.
- **Instrument** is the exact issuer-defined asset used for exposure. It is never the Company itself.
- **Holding** is Shelf-attributed tracked inventory created only by a finalized Shelf acquisition.
- **Saved item** is research intent and carries no quantity, value, rights, or ownership claim.
- **Market context** describes public/private status and data semantics; it is not a separate user-owned entity.

## Product experience principles

1. Start with recognition, then reveal finance progressively.
2. Keep Product, Brand, Company, Instrument, Saved item, and Holding visibly distinct.
3. Put evidence, source dates, availability, and uncertainty before promotion.
4. Make saving feel lightweight and ownership feel exact.
5. Treat public and private exposure as materially different, not visual variants.
6. Preserve intent through auth, provider failure, stale data, and transaction recovery.
7. Keep one obvious next action per state and place alternatives in context.
8. Treat unavailable, unsupported, stale, paused, and restricted as useful information—not zero or absence.

# 2. Current Product Audit

## Current primary navigation

Desktop and mobile currently expose four destinations:

| Label | Route | Current role | Audit observation |
|---|---|---|---|
| Discover | `/` | Home, product catalog, categories, learning, and market promotion | Correct starting concept, but the page tries to be home, catalog, markets landing, and learning hub at once. |
| Markets | `/markets` | Public xStocks/private PreStocks comparison and company watchlisting | Over-promoted relative to Shelf's recognition-first promise. It replaces Scan in global navigation. |
| Shelf | `/shelf` | Guest/member saved products plus member watchlisted companies | Combines two saved concepts without a clear unified model. Guest empty state currently renders seeded items. |
| Portfolio | `/portfolio` | Shelf-origin holdings and cash | Correctly separate from saved research, but authenticated-only behavior is mostly a redirect rather than a value preview. |

The header adds an environment badge and an icon-only account/sign-in entry. Scan is a prominent home CTA but not global navigation. On mobile, the special emphasized nav item is Markets; it remains visually selected even on `/scan` because emphasis is label-based rather than route-state-based.

## Existing routes

The UI is implemented through one optional catch-all App Router page and an internal `ScreenRouter`. “Dynamic route” below describes user-visible behavior, not filesystem segments.

| Current Route | Page | Purpose | Key Functionality | Problems/Observations |
|---|---|---|---|---|
| `/` | Discover/home | Explain Shelf and start exploration | Scan/search CTAs, five categories, market promotion, instrument cards, product cards, learning cards | Strong headline; too many competing content lanes; market products appear before the familiar-product catalog. |
| `/discover?category=&focus=search` | Explore/search | Search reviewed products and instrument-bearing companies | Debounced query, category filter, product and company results | `focus=search` is not used by the screen; no entity grouping beyond two sections; companies without instruments are filtered out. |
| `/markets` | Markets comparison | Compare public and private exposure | Market education, xStocks and PreStocks feeds, watchlist | Creates a finance-first top-level concept that competes with discovery. Live async feeds can leave large “Loading…” areas. |
| `/markets/public` | Public market lane | Browse xStocks companies | Issuer/underlying metadata, research/watch actions | Duplicates company discovery and elevates provider taxonomy into navigation. |
| `/markets/private` | Private market lane | Browse PreStocks companies | Marks, premium/discount, lifecycle, research/watch actions | Useful distinction, but provider-led structure is too prominent and can imply comparable liquidity/rights. |
| `/scan` | Input chooser/scanner | Start one of seven discovery capabilities | Camera, barcode, upload, screenshot, receipt, approved link, search; image preparation | Seven equal tabs overload the decision; screenshot duplicates upload; camera card shows several premature controls; mobile bottom nav highlights Markets. |
| `/scan/results` | Recognition results | Confirm/correct matches | Candidate confirmation, correction, removal, company link, temporary save | Ephemeral state is appropriate, but correction leaves the result context; no obvious selected state or post-save confirmation destination. |
| `/products/[id]` | Product detail | Explain a product-to-company relationship | Source, region caveat, save/remove, company link | Good conceptual bridge; uses implementation IDs; no Brand destination; save path behaves differently for guest versus authenticated user. |
| `/companies/[id]` | Company detail | Research company and exposure | Brands, sources, public/private instrument, live metadata, history, token details, watch, buy, ask AI | Best candidate for the core product page, but company, market, instrument, and transaction CTAs compete in one card; uses implementation IDs. |
| `/shelf` | My shelf | Revisit saved products and watched companies | Guest session saves, member shelf, watchlist, AI summary, share, basket start | “Shelf,” “watchlist,” and “saved” overlap. Guest empty state displays Doritos/Olay defaults, falsely implying user action. |
| `/shelf/share` | Share builder | Create/revoke a sanitized bearer snapshot | Select saved products/watched companies, create/copy/revoke | Hard-coded product choices rather than the actual shelf weaken trust; sensitive sharing deserves clearer preview/confirmation. |
| `/share/[token]` | Shared snapshot | View selected research | Products, watched companies, copy to temporary shelf | Valuable guest acquisition loop; “save” overwrites rather than clearly merges current guest state in the current client handler. |
| `/learn` | Learning library | Browse reviewed education | Seven articles | Useful but disconnected from task context and visually uniform. |
| `/learn/[slug]` | Article | Explain a concept | Reviewed body, explore/ask actions | Good deep link; related entities/topics could be more contextual. |
| `/assistant` | AI assistant | Ask grounded questions | Question, stop/clear, allocation CTA | UI claims company/shelf contexts, but current page does not read its query; “Use this draft” appears after any answer. API access and public route access are inconsistent. |
| `/invest/suggest` | AI allocation draft | Produce editable allocation | Budget, optional shelf checkbox, raw-USDC allocations, apply to basket | Separate route overstates AI as a distinct workflow; raw units are unsuitable for ordinary editing; shelf checkbox is not wired into request state. |
| `/sign-in?returnTo=` | Sign in | Magic email/Google authentication | Email OTP, Google, guest exit, support | Appropriate route. Protected-page redirect currently preserves pathname but can lose intended query state. |
| `/auth/callback` | OAuth callback | Finish Google authentication | Challenge recovery, identity/wallet binding, return | Correct technical route; should remain visually calm and recovery-focused. |
| `/welcome` | Onboarding/merge | Consent and guest merge | Terms, adult attestation, save discoveries, skip | Continue is a link that loops when unchecked rather than a clearly disabled/actionable control; account and beta access states need stronger sequencing. |
| `/eligibility` | Financial availability | Evaluate access policy | Country/adult declaration and learning exit | Necessary capability boundary, but should be an onboarding/access step rather than a global destination. |
| `/wallet` | Wallet | Show cash and external received assets | Address, deposit/send/refresh entry points | Current screen mostly shows activation status and address; external inventory is promised but not visibly rendered. |
| `/wallet/deposit` | Deposit instructions | Receive Solana USDC | Address, network warning, refresh, return to purchase | Correctly gated, but still exposes an inert deposit route and fixed PepsiCo return route. |
| `/wallet/send` | Transfer | Send USDC or supported token | Asset, address, amount, local review, step-up/order | Review and approval are on one page before canonical server review; tracked/external scope choice is incomplete. |
| `/invest/buy?companyId=` | Buy amount | Set company buy budget | Amount, presets, fee explanation, deposit link | Company identity is a query parameter and falls back to the first company; insufficient context about saved/portfolio overlap. |
| `/invest/basket?market=` | Basket | Allocate one budget across companies | Equal split, per-company amounts, sequential-order disclosure, AI draft | Selected company list is pre-seeded and lacks an add-company control after removal; provider filter leaks architecture. |
| `/invest/sell?assetId=` | Sell amount | Sell tracked holding | Quantity and Sell all | Asset query can default silently; lacks visible holding context, spendable balance, presets, and exit alternatives. |
| `/orders/[id]/review` | Order review | Obtain/review quote and approve | Instrument classification, quote facts, refresh, edit/cancel | Stable URL is correct. Transfer uses buy/sell CTA anchor logic; quote expiry is not visibly counting down; approval is intentionally disabled in current deployment. |
| `/orders/[id]` | Order status | Recover and progress transaction | Per-leg statuses, explorer, refresh, next/stop/retry, exits | Title collapses most non-complete states into “Partly completed”; retry and next-review can point to the same route without enough state distinction. |
| `/portfolio` | Portfolio | Show Shelf-origin holdings | Cash, holding cards, history, empty discovery CTA | Correct ownership boundary; lacks valuation/freshness/partial-total treatment in current UI. |
| `/portfolio/[assetId]` | Holding | Inspect tracked position | Raw/reserved/external quantities, cost, sell/send/company/action links | Correct data distinctions, but raw units dominate and current value/lots/history are missing from the rendered hierarchy. |
| `/history` | History | Browse/export activity | Table, CSV/JSON export | Important but detached from Portfolio; planned filters are absent; empty state lacks Deposit/Discover actions. |
| `/history/[id]` | Activity record | Inspect immutable financial fact | Exact values, multiplier, explorer, support | Good stable record route; raw-first presentation is hard for newcomers. |
| `/settings` | Settings/privacy | Manage account and data | Identity, wallet proof, export, deletion, logout, support | Too many high-risk actions in one undifferentiated action row; account is icon-only in global navigation. |
| `/admin` | Owner console | Operate private beta | Health, catalog reports, pauses, invites, reconcile, budget, diagnostic | Necessary but one long screen. Several routes under `/admin/*` render the same page rather than distinct deep links. |
| `/admin/*` | Same owner console | Catch-all admin handling | Same as `/admin` | URL suggests hierarchy that does not exist. |
| unknown path | Not found | Recover from invalid link | Global not-found screen | Catch-all architecture centralizes routing and makes route-specific metadata/loading/error behavior harder to reason about. |

Meaningful API-only operational routes are `/healthz`, `/readyz`, and `/api/v1/*`; they are not user navigation destinations.

### Current access, entry, entity, and dependency audit

Dynamic parameters and query-driven variants are shown in the route inventory above. The following cross-route map completes the access/entry/dependency view without repeating each page description.

| Current area/routes | Access | Common entry and primary decision | Main entities | Key dependencies |
|---|---|---|---|---|
| Home, Discover, Scan, Products, Companies, Learn | Guest | External/home/nav → choose Scan/Search/entity → confirm or explore | Product, Company, article; Brand only as embedded data | Reviewed catalog, recognition adapters, source registry, market/reference feeds |
| Shelf, Share | Guest temporary Shelf; member for durable share management | Save action/nav/shared link → revisit, merge, share, or remove | Saved Product, watched Company, snapshot | Browser state, member persistence, catalog, auth for share creation/revocation |
| Assistant, Suggest | Page appears guest-accessible; current API/private context is member-gated | Entity/Learn/Shelf → ask or draft → return to context/Basket | Product, Company, Saved context, allocation draft | OpenRouter policy/consent, quota, reviewed sources, current user |
| Sign-in, callback, welcome, eligibility | Guest entering auth; member during onboarding/access check | Protected intent → authenticate → consent/merge/access decision → return | User, identity, wallet binding, eligibility record | Magic, session/challenge state, invite and policy versions |
| Wallet, deposit, send | Member plus capability/fresh-auth gates | Account/insufficient funds/Holding → fund or choose transfer scope → review | Wallet, USDC, tracked/external asset, transfer order | Helius/RPC, canonical mint registry, step-up, policy and live-money gates |
| Buy, Basket, Sell, Order review/status | Member plus side-specific capability | Company/Saved/Holding → set amount → review exact terms → approve/status | Company, Instrument, order/leg, quote | Jupiter/build adapters, issuer/reference data, exact-integer ledger, signing, reconciliation |
| Portfolio, Holding, History/Record | Member/record owner | Global nav/order completion → inspect owned state, exit, or export | Holding, lot, valuation, Activity record | Finalized Shelf orders, wallet reconciliation, prices/reference data, exports |
| Settings | Member | Account control → inspect identity/privacy or perform a scoped action | User, sessions, wallet relationship, export/deletion job | Auth, privacy/export/delete services, support |
| Admin and `/admin/*` | Owner; fresh auth/reason for mutations | Owner entry/alert → inspect queue → perform audited scoped operation | Catalog evidence, invite, pause, budget, order, audit event | Owner authorization, health/readiness, jobs, immutable audit |

Evidence labels used throughout this guide:

- **CONFIRMED:** directly observed in repository code, approved product documentation, tests, or the live application.
- **INFERRED:** a likely user consequence derived from confirmed behavior; it must be validated during usability testing.
- **ASSUMPTION:** an unresolved condition required to proceed; collected in section 27.
- **RECOMMENDATION:** the target architecture defined by this guide.

## Existing product areas

- **Discovery and recognition:** home, catalog search, seven input paths, correctable matches, five consumer categories, approved URL handling.
- **Entity research:** product details, company details, relationship evidence, issuer/instrument facts, public/private market context.
- **Markets:** xStocks public-equity tracker lane, PreStocks private-company exposure lane, provider feeds and reference data.
- **Saved research:** guest temporary product IDs, member product Shelf, separate company watchlist, AI summary/sort, revocable sanitized sharing.
- **Learning and AI:** editorial articles, grounded assistant, shelf summary, editable allocation proposals.
- **Identity and access:** Magic email/Google, callback, welcome/merge, invite status, eligibility, step-up authorization.
- **Wallet and funding:** Solana wallet binding, canonical USDC deposit instructions, cash/external inventory model, outbound transfer.
- **Investment:** single buy, multi-company basket, sell, quote/review, user signature boundary, status/reconciliation.
- **Ownership and records:** Shelf-origin portfolio, holding, corporate-action context, history, records, exports.
- **Account and privacy:** export, deletion, logout, wallet independence/recovery disclosure.
- **Owner operations:** invites, catalog review, pauses, budgets, unknown orders, diagnostics, audit.

## Existing user journeys

1. Home → Scan/Search → confirm a product → view company → save or choose amount.
2. Browse Home/Markets → company → watchlist → revisit inside Shelf.
3. Product → verified relationship/source → company → instrument.
4. Guest save → sign in → welcome → optional explicit merge.
5. Company → buy amount → order → quote/review; execution currently stops at the activation gate.
6. Shelf/Markets → multi-company basket or AI allocation → sequential order review.
7. Portfolio → holding → sell or transfer → order review/status.
8. Wallet → deposit or send; external assets are conceptually separated from Portfolio.
9. Shelf → share preview → bearer snapshot → recipient saves public catalog items.
10. Learn/company → assistant → education or draft → basket.
11. Portfolio → history → record/export/support.
12. Owner → health/catalog/invites/pauses/reconciliation/budgets.

# 3. Experience Problems & Opportunities

In the table below, each **Problem** is CONFIRMED unless its wording describes user interpretation; each **Why it matters** is INFERRED from that evidence; and each **Proposed direction** is a RECOMMENDATION. The deployment/source divergence is explicitly confirmed in both audit channels. No assumption is used as a current-state fact.

| Problem | Why it matters | Proposed direction |
|---|---|---|
| The product promise is recognition-first, but Markets occupies global navigation and mobile emphasis. | New users can read Shelf as another token marketplace before understanding its distinctive product-to-company value. | Reduce primary navigation to Discover, Saved, and Portfolio; make Scan the persistent action. Move market browsing into company discovery filters. |
| Home promotes instruments before completing the familiar-product story. | It jumps from the core headline into issuer taxonomy and weakens the 10-second explanation. | Show the three-step path, a scan/search action, and familiar products first. Introduce exposure only after Product → Brand → Company is understood. |
| “Shelf,” “watchlist,” and “saved” are overlapping research states. | Users must infer whether saving a product, watching a company, and owning an instrument mean the same thing. | Rename the user area **Saved**. It contains Products and Companies. Use one Save action with explicit entity labels; Portfolio alone means owned. |
| Guest Shelf shows seeded Doritos and Olay when empty. | This falsely represents user intent and damages trust in a privacy-sensitive product. | Remove all fabricated personal state. Use a true empty state with Scan/Search actions and optional clearly labeled examples outside the saved collection. |
| Product IDs, company IDs, and asset IDs appear in public URLs/query parameters. | URLs are hard to read, share, migrate, and debug. Silent default fallbacks can show the wrong company. | Use public slugs for Product/Brand/Company and path parameters for primary context. Never default an invalid financial entity to another one. |
| Seven input methods receive equal prominence. | Most people want camera or search; equal tabs make the scanner look technical and force a decision before value. | Lead with camera on mobile and Search on desktop. Put Upload, Barcode, Receipt, and Link under “Other ways.” Treat Screenshot as guidance within Upload, not a separate conceptual method. Preserve all capabilities. |
| Scan correction exits to generic search. | Users lose the candidate and multi-result context they were validating. | Open an in-flow replacement sheet/drawer scoped to one candidate, then return to results. |
| Company pages combine relationship, market data, instrument terms, watch/save, AI, and buy with limited hierarchy. | The central page feels like a dense endpoint rather than a guided explanation. | Order it as identity → familiar brands/products → relationship evidence → company context → exposure card → risks/sources → actions. Save Company is secondary; Invest appears only when allowed. |
| Public and private instruments are compared as parallel cards and lanes. | Similar presentation can imply similar rights, pricing reliability, and liquidity. | Use a consistent exposure pattern but materially different labels, fact order, warnings, and visual treatment. Never collapse private marks and executable prices. |
| Research and transaction actions compete. | “Choose amount,” “Add to watchlist,” and “Ask” have similar visual weight. | One context-dependent primary action: Explore company on discovery pages; Review investment on amount pages; Approve on review pages. Save/Ask remain secondary. |
| AI is a standalone destination and allocation route. | This overstates AI as a product area and risks making suggestions feel authoritative. | Keep the assistant accessible contextually and as a utility route, but merge allocation drafting into the Basket flow as an optional starting aid. |
| Guest/public access boundaries are inconsistent. | `/assistant` is public at the page layer while its current API requires a member; Shelf is public but sharing is protected. | Define a capability matrix, render guest-safe variants deliberately, and trigger sign-in only at persistence, sharing, AI quota, or financial boundaries. |
| Auth return paths can lose query context. | A user entering from a specific company/asset can return to an incomplete default flow. | Preserve a validated relative pathname plus allowed query parameters through sign-in; never return directly to signing/approval. |
| Wallet, Portfolio, and History are separate peers in the code but not a coherent ownership area. | Cash, external assets, holdings, and records feel fragmented. | Make Portfolio the owned-investment hub. Put Activity within Portfolio. Keep Wallet under Account because it includes address, cash transfer, and external assets beyond Shelf positions. Cross-link clearly. |
| Financial screens expose raw units too early. | Newcomers cannot interpret raw integers; experts still need them. | Lead with human-readable, unit-labeled amounts and place exact raw values/mints in “Technical details.” Use tabular numerals and freshness labels. |
| Order status copy collapses many states. | Pending, failed, stopped, unknown, and partial outcomes have materially different recovery rules. | Map every backend state to specific headline, explanation, allowed action, and persistence behavior. |
| Empty/loading/error behavior is often generic or absent. | In a provider-dependent financial product, unavailable data can be mistaken for zero or absence. | Use capability-specific states: “Issuer data unavailable,” “Price unavailable,” “No route,” “Scan expired,” “Wallet balance unavailable,” each with a relevant recovery. |
| Mobile navigation is visually fixed but not route-aware; long pages place nav across content. | Users lose orientation and controls can appear obscured in screenshots/long content. | Use route-aware active states, safe-area padding, and a central Scan action. Ensure sticky transactional footers stack above—not beneath—the global nav. |
| Admin is one undifferentiated screen. | Catalog evidence, access control, money operations, and audit have different risk and frequency. | Split Admin into Overview, Catalog, Access, Operations, and Audit routes with shared owner navigation. |
| The deployed UI and local scanner source differ. | A refactor based on either alone could regress consent or misdocument current behavior. | Reconcile deployment/source before implementation; treat explicit AI processing consent as required regardless of current render. |

# 4. Target Product Experience

Shelf should feel like an intelligent field guide that can become a careful investment tool—not a trading terminal with a scanner attached. Familiarity opens the door; verified relationships, evidence, and explicit instrument terms build trust; transaction screens become progressively more exact and restrained.

## What a first-time user should understand

Within 10 seconds, a first-time visitor should understand: **“Shelf tells me which company is behind a product I recognize, then shows whether a distinct investment exposure exists. I can research or save without investing.”**

## Primary action

**Identify something** through Scan or Search.

## Secondary actions

Browse verified examples, save research, learn, ask a grounded question, and—only after Company and Instrument context—start an investment review.

## Experience modes

Dominant concepts:

1. The relationship path: Product → Brand → Company.
2. The boundary between Company and Instrument.
3. The boundary between Saved and Owned.
4. Evidence, freshness, and availability.
5. A deliberate review/signing sequence for money.

Exploratory areas should feel visual, familiar, and curiosity-led. Transactional areas should become quieter, denser, and more explicit. Educational content should sit beside the unfamiliar concept rather than becoming a compulsory course. Research can suggest an action; it must never resemble an order confirmation.

## Trust requirements

- A recognition model can propose a candidate but cannot create a verified relationship or tradable identity.
- Relationship evidence and dates precede exposure; Company and Instrument remain visibly separate.
- Saved means interested; Portfolio means owned. Neither styling nor copy may blur them.
- Public and private rights, price sources, liquidity, lifecycle, and restrictions use distinct hierarchies.
- Progressive precision reveals exact mint, units, fee, route, signature, and chain facts before commitment and in records.
- Unsupported, stale, paused, no-route, restricted, and unknown states are named truthfully, never substituted or displayed as zero.

# 5. Information Architecture

```text
Shelf
├── Discover
│   ├── Home
│   ├── Search and browse
│   │   ├── Products
│   │   ├── Brands
│   │   └── Companies (public/private as filters, not destinations)
│   ├── Scan
│   │   └── Correctable results
│   ├── Entity detail
│   │   ├── Product
│   │   ├── Brand
│   │   └── Company + exposure
│   ├── Learn
│   └── Ask Shelf
├── Saved
│   ├── Saved products
│   ├── Saved companies
│   └── Share selected research
├── Portfolio
│   ├── Holdings
│   ├── Holding detail
│   └── Activity and records
├── Invest (contextual, never primary navigation)
│   ├── Single-company amount
│   ├── Basket builder (optional AI draft)
│   ├── Order review
│   └── Order status
├── Account
│   ├── Identity, privacy, and support
│   └── Wallet
│       ├── Deposit USDC
│       └── Send assets
├── Authentication and onboarding
└── Owner administration
```

## Primary navigation

### Discover

Why it exists: the core promise is recognition, verified relationships, and company understanding.
Belongs: search, browse, categories, scan entry, products, brands, companies, contextual market filters, learning entry points.
Does not belong: holdings, wallet balances, order history, admin operations.
Relationship: feeds Saved and, after research, contextual investment.

### Saved

Why it exists: a durable research queue for products and companies.
Belongs: saved products, saved companies, parent overlap, AI summary, sharing.
Does not belong: holdings, cash, performance, transaction state, “diversification” claims.
Relationship: can seed a basket, but no save action spends money.

### Portfolio

Why it exists: the unambiguous home for Shelf-origin ownership and its factual activity.
Belongs: finalized holdings, valuation with freshness, lots/cost, corporate actions, activity and records.
Does not belong: watchlist, guest examples, external/untracked assets, catalog browsing.
Relationship: links back to Company research and out to sell/send flows.

### Scan action

Scan is a globally promoted action, not a fourth information silo. On desktop it is a labeled primary button in the header. On mobile it is the central action in the bottom navigation. It points to `/scan` and is active only within the scan flow.

### Account

Account is always available in the header and under a labeled mobile overflow/profile destination. It owns identity, privacy, support, wallet, and sign-out—not Portfolio.

## Secondary and contextual navigation

- Discover page: Products / Brands / Companies segmented filter; public/private exposure as Company filters.
- Saved page: Products / Companies segmented filter represented by `view=`.
- Company page: Overview / Exposure / Risks & sources as in-page anchors on desktop and a compact sticky section menu on long mobile pages; not separate routes unless future content becomes independently substantial.
- Portfolio: Holdings / Activity subnavigation, with Activity having a stable route.
- Admin: Overview / Catalog / Access / Operations / Audit.

## Mobile navigation

Bottom bar: **Discover · Scan · Saved · Portfolio**. Scan is centered and promoted. Account is accessed from the header/profile control. Signed-out Portfolio opens a guest explanation with sign-in—not a fabricated balance. Labels remain visible; active state follows the current route.

# 6. Routing Architecture

Public entity URLs use reviewed slugs. Private resource URLs use opaque IDs. Filters that materially change browse results remain query-addressable. Sensitive content, raw image/OCR, emails, wallet addresses, amounts in shared links, and signing payloads never enter URLs.

| Proposed Route | Page | Purpose | Auth Requirement | Parent/Context |
|---|---|---|---|---|
| `/` | Home | Explain Shelf and start Scan/Search | Guest | Root |
| `/discover?q=&category=&entity=&market=&availability=&sort=` | Discover | Search and browse reviewed entities | Guest | Discover |
| `/scan?method=` | Scan | Identify a product using all supported inputs | Guest; AI consent for image/link AI | Discover |
| `/scan/results` | Scan results | Confirm/correct ephemeral recognition | Current browser session | Scan |
| `/products/[slug]` | Product detail | Explain Product → Brand → Company | Guest | Discover/entity |
| `/brands/[slug]` | Brand detail | Group products and explain Brand → Company | Guest | Discover/entity |
| `/companies/[slug]` | Company detail | Research company and available exposure | Guest | Discover/entity |
| `/learn` | Learning library | Browse reviewed explainers | Guest | Discover |
| `/learn/[slug]` | Learning Article | Read a reviewed explainer | Guest | Learn/contextual |
| `/assistant?company=&product=&from=` | Ask Shelf | Ask grounded questions with explicit context | Limited guest or member by policy | Contextual utility |
| `/saved?view=` | Saved Research | Revisit saved Products and Companies | Guest temporary/member durable | Primary Saved |
| `/saved/share` | Share builder | Preview and publish sanitized research snapshot | Member | Saved |
| `/share/[token]` | Shared snapshot | Read bearer snapshot and copy public items | Guest | External/shared |
| `/sign-in?returnTo=` | Sign in | Authenticate and return safely | Guest | Auth |
| `/auth/callback` | OAuth callback | Finish provider login | Guest/provider state | Auth |
| `/onboarding` | Onboarding | Consent, account/beta status, guest merge | Member | Auth |
| `/onboarding/availability?returnTo=` | Financial availability | Check policy before money capabilities | Member/invited | Onboarding/access gate |
| `/account` | Account & privacy | Identity, recovery, privacy, export/deletion, support | Member | Account |
| `/account/wallet` | Wallet | Cash, address, and supported external assets | Member | Account |
| `/account/wallet/deposit?returnTo=` | Deposit USDC | Show gated canonical deposit instructions | Member + funding capability | Wallet |
| `/account/wallet/send?asset=&scope=` | Send asset | Create transfer intent | Member + transfer capability + step-up | Wallet/holding |
| `/invest/[companySlug]` | Investment amount | Set amount for one reviewed company exposure | Member + buy capability | Company |
| `/invest/basket?source=&market=` | Basket Builder | Select companies and edit one budget; optional AI draft | Member + applicable capability | Saved/Discover |
| `/orders/[id]/review` | Order review | Review current exact terms and sign | Order owner + capability | Invest |
| `/orders/[id]` | Order status | Recover, progress, and inspect order | Order owner | Invest/Portfolio |
| `/portfolio` | Portfolio | Show Shelf-origin holdings and valuation state | Member; guest explanation variant | Primary Portfolio |
| `/portfolio/[instrumentId]` | Holding detail | Inspect a Shelf-origin position | Position owner | Portfolio |
| `/portfolio/[instrumentId]/sell` | Sell amount | Choose tracked quantity to sell | Position owner + sell capability | Holding |
| `/portfolio/activity?type=&status=&from=&to=&cursor=` | Activity | Filter and export factual activity | Member | Portfolio |
| `/portfolio/activity/[recordId]` | Activity record | Inspect one immutable record | Record owner | Activity |
| `/admin` | Admin overview | Read system readiness and work queues | Owner | Admin |
| `/admin/catalog` | Admin catalog | Review mappings, sources, instruments | Owner + fresh auth for mutations | Admin |
| `/admin/access` | Admin access | Manage beta invitations/access | Owner + fresh auth | Admin |
| `/admin/operations` | Admin operations | Pauses, budgets, unknown outcomes, reconciliation | Owner + fresh auth | Admin |
| `/admin/audit` | Admin audit | Review append-only operational history | Owner | Admin |

### URL-addressable query state

- Discover: query, category, entity type, market classification, availability, sort.
- Scan: chosen method only. Image, OCR, candidates, and consent evidence stay outside the URL.
- Saved: Products/Companies view.
- Assistant: only safe entity slugs and originating context; no transcript.
- Deposit: validated relative return destination.
- Wallet Send: reviewed asset identifier and tracked/external scope; recipient and amount stay in form state.
- Basket: source (`saved`, `discover`, or `ai`) and market filter, not allocations or budget.
- Activity: filters and cursor.

### Contextual overlays that are not routes

- Scan method chooser on mobile; candidate replacement search; camera permission help.
- Save confirmation and undo; remove-from-saved confirmation only when necessary.
- Relationship source panel and token technical details.
- Compact AI context/consent explanation.
- Share-link copy confirmation.
- Filter/sort controls on mobile.
- Non-destructive explanatory tooltips.

### Deep-link requirements

Product, Brand, Company, Article, shared snapshot, Order status, Holding, Activity filters, Activity record, and admin work areas must survive reload and direct entry. Scan results deliberately require ephemeral session state and fall back to Scan when missing. Order review survives reload but never reuses expired approval terms silently.

# 7. Route Migration & Redirect Map

| Existing Route | Decision | New Route | Redirect Type | Reason |
|---|---|---|---|---|
| `/` | KEEP | `/` | None | Remains product introduction, with reduced scope. |
| `/discover` | KEEP + REFACTOR | `/discover` | None; migrate query | Becomes unified entity browse/search. |
| `/markets` | MERGE | `/discover?entity=company` | 308 permanent | Market browsing becomes a company discovery filter. |
| `/markets/public` | MERGE | `/discover?entity=company&market=public` | 308 permanent | Preserve public-market intent without provider-led top level. |
| `/markets/private` | MERGE | `/discover?entity=company&market=private` | 308 permanent | Preserve private-market intent and distinction. |
| `/scan` | KEEP + REDESIGN | `/scan` | None | Core capability remains. |
| `/scan/results` | KEEP + REDESIGN | `/scan/results` | None | Correctable ephemeral result remains useful. |
| `/products/[id]` | RENAME | `/products/[slug]` | Server-resolved 308 | Readable canonical public entity URL. Unknown ID returns 404. |
| `/companies/[id]` | RENAME | `/companies/[slug]` | Server-resolved 308 | Readable canonical public entity URL. |
| none | ADD | `/brands/[slug]` | None | Makes the middle relationship entity explicit. |
| `/shelf` | RENAME | `/saved` | 308 permanent | Removes collision between brand name and ambiguous collection/watchlist language. |
| `/shelf/share` | RENAME | `/saved/share` | 308 permanent | Aligns sharing with Saved research. |
| `/share/[token]` | KEEP | `/share/[token]` | None | Existing bearer links must remain stable until expiry/revocation. |
| `/learn` | KEEP | `/learn` | None | Stable public learning route. |
| `/learn/[slug]` | KEEP | `/learn/[slug]` | None | Stable article deep links. |
| `/assistant` | KEEP + REFACTOR | `/assistant` | None | Remains optional utility, primarily entered contextually. |
| `/invest/suggest` | MERGE | `/invest/basket?source=ai` | 308 permanent after draft migration support | Allocation drafting becomes an optional basket start mode. |
| `/sign-in` | KEEP | `/sign-in` | None | Stable auth entry. |
| `/auth/callback` | KEEP | `/auth/callback` | None | Provider-configured technical route. |
| `/welcome` | RENAME | `/onboarding` | 307 during migration, then 308 | Clear responsibility and safe rollout while OAuth links update. |
| `/eligibility` | RENAME | `/onboarding/availability` | 307 during policy rollout, then 308 | Frames it as a capability gate, not generic profile. |
| `/wallet` | MOVE | `/account/wallet` | 308 permanent | Wallet is account infrastructure, distinct from Portfolio holdings. |
| `/wallet/deposit` | MOVE | `/account/wallet/deposit` | 308 permanent | Same ownership. |
| `/wallet/send` | MOVE | `/account/wallet/send` | 308 permanent; preserve allowed `asset`/`scope` | Same ownership and recovery route. |
| `/invest/buy?companyId=` | RENAME | `/invest/[companySlug]` | Server-resolved 308 | Make company context canonical; invalid IDs do not fall back. |
| `/invest/basket?market=` | KEEP + REFACTOR | `/invest/basket?market=` | None | Stable complex workflow; query remains useful. |
| `/invest/sell?assetId=` | MOVE | `/portfolio/[instrumentId]/sell` | Server-resolved 308 | Selling starts from an owned position. |
| `/orders/[id]/review` | KEEP + REDESIGN | same | None | Stable private review/recovery route. |
| `/orders/[id]` | KEEP + REDESIGN | same | None | Stable persistent operation route. |
| `/portfolio` | KEEP + REDESIGN | same | None | Stable ownership home. |
| `/portfolio/[assetId]` | KEEP + RENAME PARAM | `/portfolio/[instrumentId]` | Canonical redirect only if old alias differs | Existing opaque IDs may remain valid. |
| `/history` | MOVE | `/portfolio/activity` | 308 permanent | Activity belongs with owned investments. |
| `/history/[id]` | MOVE | `/portfolio/activity/[recordId]` | 308 permanent | Preserve record deep links. |
| `/settings` | RENAME | `/account` | 308 permanent | Broader account/privacy responsibility. |
| `/admin` | KEEP + SPLIT | `/admin` | None | Becomes overview. |
| `/admin/status` | RENAME | `/admin` | 308 permanent | Avoid duplicate overview. |
| `/admin/catalog` | KEEP | same | None | Real dedicated page. |
| `/admin/invites` | RENAME | `/admin/access` | 308 permanent | User-facing operational language. |
| `/admin/orders` | MERGE | `/admin/operations` | 308 permanent | Unknown orders belong with reconciliation/pauses. |
| `/admin/audit` | KEEP | same | None | Stable audit deep link. |
| other `/admin/*` | REPLACE | nearest explicit admin route or 404 | 308 only for known legacy paths | Do not keep a catch-all that masks orphan routes. |

## Auth redirects

1. Guest requests a protected route.
2. Server redirects to `/sign-in?returnTo=<validated relative path + allowed query>`.
3. Successful auth goes to `/onboarding` only when required consent/merge/account setup is incomplete.
4. Otherwise it returns to the intended route.
5. If the intended action is financial, return to amount/selection or current order review—not automatic signing or approval.
6. If access is denied after auth, preserve the research context and offer Company/Learn/Support exits.

Owner routes return a generic 404 to non-owners. Expired member sessions preserve safe nonfinancial drafts and return path. Shared links never trigger auth merely to view.

## Legacy URL handling

- Maintain ID-to-slug lookup redirects for Product/Company for at least one release cycle and as long as old shared links have meaningful use.
- Existing `/share/[token]` links are never rewritten; they expire/revoke under their original contract.
- Unknown IDs/slugs return a true not-found state with Search and Scan recovery, never the first catalog entity.
- Log aggregate legacy-route hits without query strings or personal data; remove redirects only after usage is negligible and bookmarks have had a documented migration window.

## Query parameter migration

- Remove `focus=search`; `/discover` already puts search first. Ignore it safely during migration and canonicalize the URL.
- Convert `companyId` to a company slug path through a server lookup.
- Convert `assetId` sell links to a nested holding route.
- Preserve `market=public|private` only where it narrows a browse/basket context; provider names are display metadata, not required URL values.
- Reject unknown query enum values by dropping that filter, not by redirecting repeatedly. Canonicalization must occur once to avoid loops.

## Redirect preservation rules

| Legacy route family | State preserved | State deliberately not preserved |
|---|---|---|
| `/discover` | Valid `q`, `category`; map valid market/entity filters to canonical names | `focus=search`, unknown enums, scroll encoded in URL |
| `/markets*` | Public/private browse intent becomes `entity=company&market=` | Provider feed identity as navigation state |
| `/products/[id]`, `/companies/[id]` | Resolved canonical entity identity and safe originating browse context | Unknown IDs and unreviewed aliases; these return 404 |
| `/shelf*` | Guest/member Saved contents, selected Products/Companies, share draft when still authorized | Fabricated seeded examples and stale share selections |
| `/invest/suggest` | Valid Companies and an explicitly accepted editable draft when migration support can verify it | AI transcript, raw provider output, unaccepted allocations |
| `/welcome`, `/eligibility` | Valid same-origin `returnTo`, guest-merge intent, completed consent/policy records | Direct approval/signing destinations and stale capability results |
| `/wallet*` | Valid `returnTo`, reviewed `asset` and `scope` | Recipient, amount, private wallet facts in URL |
| `/invest/buy`, `/invest/sell` | Server-resolved Company or owned Instrument plus safe form draft in session | Invalid IDs, quotes, signatures, or silent fallback entities |
| `/orders/*` | Opaque order ID and authorized persistent server state | Expired quote approval and cached signature payload |
| `/portfolio/[assetId]`, `/history*` | Authorized opaque resource ID and Activity filters where applicable | Unauthorized resource existence and client-only display state |
| `/settings` | Safe account subsection anchor when mapped | Pending destructive action or fresh-auth proof |
| `/admin/*` | Only known route identity and non-sensitive list filters | Mutation drafts, reasons, secrets, or arbitrary catch-all suffixes |

Permanent redirects are one-way toward the canonical route. Staged `307` rules for onboarding/availability are removed before their eventual `308` replaces them, so no pair can form a loop.

# 8. Navigation Model

## Global navigation

| Item | Visibility | Behavior |
|---|---|---|
| Shelf logo | Always | Home. |
| Discover | Always | Active for `/`, `/discover`, `/products`, `/brands`, `/companies`, `/learn`, and `/assistant` when contextually entered. |
| Scan | Always; promoted CTA | Desktop labeled button; central mobile action. Active only for `/scan*`. |
| Saved | Always | Guest temporary state or member durable research. Badge may show item count, never monetary value. |
| Portfolio | Always | Guest explanation or member holdings. Authenticated only for private data. |
| Search icon/field | Desktop always; mobile on Discover/header | Opens compact search; Enter navigates to canonical `/discover?q=`. |
| Account | Always | Labeled menu where space permits; sign-in state explicit. Wallet is inside. |

Markets is not global navigation. “Public” and “Private” appear as clearly explained filters within Company discovery and as classifications on Company/Instrument views.

## Contextual navigation

- Product: Brand and Company relationship links.
- Brand: Products and Parent company.
- Company: in-page Overview, Exposure, Risks & sources; Invest only when capability permits.
- Saved: Products and Companies.
- Portfolio: Holdings and Activity.
- Admin: dedicated owner-only secondary navigation.

Tabs change peer content within one responsibility. They do not conceal required warnings or turn unrelated pages into tab panels.

## Back navigation

- Browser Back restores browse filters, scroll position, and confirmed scan candidate state within its session.
- Entity pages provide a contextual “Back to results” only when arrival context is known; otherwise no fabricated breadcrumb parent.
- Transaction Back may edit an unsigned draft and invalidates stale quote/preparation. After submission, Back never implies cancellation; a persistent status link remains.
- OAuth callback uses replace navigation so Back does not replay callback processing.

## Breadcrumbs

Use breadcrumbs on desktop for entity chains and admin only:

- Discover / Brand / Product
- Discover / Company
- Portfolio / Holding
- Portfolio / Activity / Record
- Admin / Operations

Do not show a long breadcrumb inside Scan, auth, or step-by-step transactions. Mobile uses a concise back label and the visible relationship path instead.

## Search and scan entry points

Search appears on Home, Discover, scan fallback, no-match, not-found, and empty Saved. Scan appears globally, on Home, Discover, no-results, and empty Saved. Company/financial pages do not interrupt the task with a floating scanner.

## Account, Portfolio, and Saved access

- Account owns identity, wallet, privacy, support, and sessions.
- Portfolio owns holdings and factual activity.
- Saved owns research interest.
- Cross-links are explicit: Wallet cash → Portfolio; Holding → Company; Saved Company → Investment amount; no area silently changes another.

# 9. Core User Journeys

## First-time visitor

**Intent:** understand the product before creating an account.
**Flow:** external entry → Home (“identify a product; learn the company; exposure is separate”) → Scan or Search → result/entity → Company → Save or continue learning → optional sign-in/invest.
**Primary CTAs:** Scan a product → Confirm match → Explore company → Save company or Review investment.
**Required context:** small reviewed catalog, relationship evidence, investment availability separated from recognition.
**Exit points:** Browse examples, Learn, leave with no auth.
**Recovery:** camera denied → Upload/Search; no match → correct/search/report; instrument unavailable → save/learn.

## Product discovery

**Intent:** learn who is behind something familiar.
**Flow:** Product result → Brand → Company → exposure summary. A compact relationship trail stays visible.
**Primary CTAs:** Explore brand/company; then Save company or Review exposure.
**Recovery:** regional ambiguity blocks investment and offers region correction/source/report. Unsupported company remains educational.

## Scan flow

**Intent:** identify a visible item with minimal setup.
**Flow:** global Scan → camera-first surface → capture/preview → explicit AI processing consent when required → processing with cancellable progress → candidate cards → confirm/correct each → summary of Products/Brands/Companies → Save selected or open Company.
**Secondary methods:** Upload (including screenshots), Barcode, Receipt, Link, Search.
**Recovery:** permission denied, unsupported format/domain, unreadable input, quota/privacy outage, expired results all provide Search and retry without losing unrelated confirmed candidates.

## Search flow

**Intent:** find a known Product, Brand, or Company.
**Flow:** search → grouped entity results → filters → select entity → canonical detail → next contextual action.
**Primary CTA:** open the most relevant entity; never “Buy” directly from mixed search results.
**Recovery:** no result → spelling help, clear filters, Scan, report missing item. Stale/unavailable market data does not remove a valid company result.

## Company research

**Intent:** understand the company and what exposure, if any, exists.
**Flow:** Company identity → recognizable brands/products → verified relationship evidence → what the company does → public/private status → distinct Instrument card → pricing/liquidity/rights/risks → Save, Ask, or Review investment.
**Recovery:** paused/unsupported/restricted/no-price/no-route states retain research and Save. No related substitute is suggested as equivalent.

## Investment journey

**Intent:** deliberately acquire a supported exposure.
**Flow:** Company → `/invest/[slug]` amount → access/funds check → exact order review → user approval/signature → persistent status → final Holding/Record.
**Primary CTAs:** Review investment → Approve purchase → View holding.
**Required context:** company versus instrument, issuer, rights, amount, fee, minimum receipt, slippage, price impact, network payer, quote expiry.
**Recovery:** sign-in returns to amount; insufficient cash offers Deposit and returns with amount retained but new quote; changed/expired terms require review; unknown submission stays on status and cannot duplicate.

## Multi-company budget

**Intent:** distribute one budget across distinct companies.
**Flow:** Saved/Discover → select unique companies → budget → equal split or optional AI draft → edit human-readable amounts → basket summary → review/sign each leg sequentially → complete/partial/stopped summary.
**Recovery:** duplicates collapse visibly by Company; minimum/maximum errors are inline; failed/unknown leg pauses; completed legs remain factual; stop releases only unsigned remainder.

## Saved research

**Intent:** remember Products or Companies without implying ownership.
**Flow:** Save Product/Company → Saved with entity type → parent overlap summary → compare/revisit → share selected or seed basket → remove/undo.
**Primary CTA:** empty = Scan/Search; populated = Continue research. “Build a basket” is contextual, not default.
**Recovery:** guest state explains session lifetime; auth merge is explicit/idempotent; version conflict reloads and preserves intended changes for review.

## Portfolio

**Intent:** understand what was actually acquired through Shelf.
**Flow:** Portfolio summary → Holding → quantity/value/cost/freshness → Company or Activity → Sell/Send where allowed.
**Recovery:** missing marks show partial total; reconciliation discrepancy shows last-known state and blocks affected spend; external assets link to Wallet rather than appearing as holdings.

## Sell journey

**Intent:** convert a tracked holding to USDC.
**Flow:** Holding → Sell amount/preset/all → quote → review gross/fee/net/minimum → sign → persistent status → updated holding/record.
**Recovery:** no route/dust offers retry later or permitted Send; external inventory is never included silently.

## Transfer journey

**Intent:** send cash, tracked holdings, or supported external assets.
**Flow:** Wallet/Holding → preselected asset and scope → recipient/amount → step-up → immutable full-address review → sign → status/record.
**Recovery:** invalid/self/program/mint/off-curve destinations explain correction; timeout remains pending; changing recipient/amount invalidates review.

## Share journey

**Intent:** share research without finances.
**Flow:** Saved → select Products/Companies → sanitized preview → acknowledge bearer access/expiry → create/copy → manage/revoke. Recipient → read snapshot → save selected public entities.
**Recovery:** expired/revoked/unknown are indistinguishable; clipboard failure shows selectable path; recipient saves merge rather than overwrite.

## Learning and AI

**Intent:** understand a term or relationship.
**Flow:** contextual Ask/Learn → explicit context chip and privacy scope → grounded answer with sources/uncertainty → related entity/article. Allocation request hands off to Basket; it never creates an order.
**Recovery:** AI privacy/quota/provider failure offers reviewed articles and entity facts.

## Authentication and onboarding

**Intent:** keep research or use a protected capability.
**Flow:** trigger → sign-in → callback → account/beta status → required consent → optional guest merge → availability check only when money capability is requested → safe return.
**Recovery:** provider method failure offers the other method; different issuer explains original method/support; denied beta/eligibility returns to research with temporary saves intact.

## Journey decision, completion, and back contract

| Journey | First meaningful decision | Explicit completion | Browser/back behavior |
|---|---|---|---|
| First-time visitor | Scan or Search | A relationship is understood, an entity is saved, or the user deliberately leaves without auth | Standard history; entity pages return to preserved discovery context when known |
| Product discovery | Confirm/correct Product identity | Verified Product → Brand → Company trail is visible and a next research action is available | Back restores candidate/result and scroll; no fabricated hierarchy |
| Scan | Choose the most suitable capture/input method | Confirmed candidates are opened or saved; transient raw evidence can be discarded | Back within session preserves confirmed candidates; missing session returns to Scan with explanation |
| Search | Choose entity type/result | Canonical entity page opens with the query/filter state preserved | Back restores URL-addressable filters, query, and scroll |
| Company research | Save, continue learning, or open Exposure | User understands Company status and whether a distinct Instrument exists | In-page anchors do not pollute history; Back returns to originating entity/results |
| Investment | Proceed from research to an amount | Order finalizes into a reconciled Holding and immutable record, or a truthful terminal/unknown state persists | Editing invalidates stale terms; after submission Back never implies cancellation |
| Multi-company budget | Select Companies and allocation method | All legs resolve, or a clear partial/stopped summary names completed and remaining legs | Back may edit unsigned draft; signed legs remain factual |
| Saved research | Choose Product or Company to revisit | Research is opened, shared, removed, or used to seed an explicitly reviewed basket | View/filter state survives Back; remove offers local undo |
| Portfolio / Sell / Transfer | Choose a Holding or wallet asset/scope | Owned state and Activity reflect finalized outcome; unknown operations stay recoverable | Back returns to Holding/Wallet; submitted operation retains a stable status route |
| Share | Select exactly what is public | Sanitized bearer link is created/copied or revoked; recipient merge confirms outcome | Back returns to unchanged Saved state; link errors do not expose existence |
| Learning / AI | Ask/read within explicit context | User returns to the entity/task with cited understanding or an editable draft | Back returns to originating context; transcript/draft is not silently put in URL |
| Authentication / onboarding | Select auth method and whether to merge guest research | Required setup finishes and safe original intent resumes | Callback uses replace; protected return is same-origin and approval is never automatic |

# 10. Page Specifications

The order below is the complete proposed page inventory. Global states also follow the matrix in section 19.

## Home

### Route
`/`

### Purpose
Explain Shelf in one glance and start recognition-led discovery.

### User intent
Understand what Shelf does and try it without commitment.

### Entry points
Logo, external links, direct visit, post-logout.

### Primary action
Scan a product.

### Secondary actions
Search; browse a few familiar examples; read “How Shelf works.”

### Information hierarchy
1. Product → Company promise and Scan/Search.
2. Three-step explanation: identify, verify, explore exposure.
3. Familiar product examples across categories.
4. Trust statement: small reviewed catalog, sources, saving is not owning.
5. Selected learning links.

### Section responsibilities
The hero establishes value; steps explain the model; examples prove breadth; trust copy sets limits; learning supports hesitant users.

### Data displayed
Reviewed example Products/Brands/Companies, category, relationship status, no personalized or live financial data.

### Interaction model
Fast links; no carousel, automatic camera prompt, live ticker, or personalization before consent.

### Related pages
Scan, Discover, Product, Learn.

### Mobile behavior
Single-column hero; Scan sticky only near initial viewport; examples become a short list with “Browse all,” not the entire catalog.

### States
Default; lightweight skeleton for examples; catalog unavailable with Scan/Search/Learn still usable; offline shows cached educational shell if available.

### Things explicitly NOT shown here
Market provider comparison, watchlist, portfolio values, investment performance, wallet balance, transaction CTAs.

## Discover

### Route
`/discover?q=&category=&entity=&market=&availability=&sort=`

### Purpose
Unified search and browse for Products, Brands, and Companies.

### User intent
Find a known entity or explore the verified catalog.

### Entry points
Global navigation/search, Home categories, Scan correction/no-match, empty Saved.

### Primary action
Open an entity result.

### Secondary actions
Filter, sort, clear, Scan instead.

### Information hierarchy
1. Search field with current query.
2. Entity-type and category filters.
3. Active-filter summary.
4. Grouped results: Products, Brands, Companies.
5. No-result recovery and catalog-coverage note.

### Section responsibilities
Search accepts everyday language; grouping prevents entity conflation; filters expose public/private only in Company context; results disclose type and relationship/availability.

### Data displayed
Entity name/type, product category, Brand/Company relation, public/private classification, availability label, verification date where relevant.

### Interaction model
Debounced suggestions aid typing; submitted query/filter state updates URL; result cards navigate to canonical detail. Save may appear only after entity type is unmistakable.

### Related pages
Product, Brand, Company, Scan.

### Mobile behavior
Sticky search; filters in bottom sheet with active count; results are compact lists rather than large card grids.

### States
Initial browse, loading, no results, filtered empty, partial company data, stale classification, error, offline cached catalog.

### Things explicitly NOT shown here
Executable quotes, buy buttons, holdings, raw mints, AI-generated unknown matches.

## Scan

### Route
`/scan?method=`

### Purpose
Capture or supply product evidence for recognition.

### User intent
Identify one or more products quickly.

### Entry points
Global Scan, Home, Discover, empty Saved, no-match retry.

### Primary action
Camera: Capture/Use photo; other methods: Identify products.

### Secondary actions
Switch method, retake/crop/rotate, Search instead, permission help.

### Information hierarchy
1. Plain privacy/processing statement.
2. Primary capture/search surface.
3. Preview and edit controls.
4. Explicit third-party processing consent when required.
5. “Other ways” methods and limits.

### Section responsibilities
Primary surface matches device context; preview gives control; consent explains Shelf versus provider retention; alternate methods preserve all seven requested capabilities.

### Data displayed
Local preview only, method-specific guidance, accepted formats/limits, no catalog result until processed.

### Interaction model
Mobile defaults to camera; desktop may lead with Upload/Search while retaining camera. Screenshot is a labeled Upload use case. Barcode uses live decode with manual fallback. No upload on file selection.

### Related pages
Scan results, Discover.

### Mobile behavior
Full-width camera, reachable capture control, safe-area clearance, camera switch only when supported. Other methods open a sheet.

### States
Permission prompt/denied, preview, processing, cancelled, unreadable, oversized/unsupported, quota/privacy unavailable, offline, success.

### Things explicitly NOT shown here
Company investment CTA, market prices, saved state, persistent user photo, QR-payment execution.

## Scan Results

### Route
`/scan/results`

### Purpose
Let the user validate each transient recognition candidate.

### User intent
Confirm what Shelf saw and correct mistakes.

### Entry points
Successful Scan only.

### Primary action
Continue with confirmed matches.

### Secondary actions
Replace match, exclude, rescan, view a confirmed Company.

### Information hierarchy
1. Progress/summary of candidates.
2. Candidate list with confidence wording and state.
3. In-flow correction control.
4. Confirmed relationship preview.
5. Continue/save choices.

### Section responsibilities
Each candidate is independently confirmable; correction never loses other results; investment availability is a separate line after relationship validation.

### Data displayed
Transient thumbnail/bounding context if available, proposed Product/Brand, confidence band, match state, verified Company relation only after deterministic resolution.

### Interaction model
Explicit selected/confirmed state; replacement search is a drawer/sheet; continue opens a summary or first entity. Save only normalized IDs.

### Related pages
Product, Brand, Company, Saved, Scan.

### Mobile behavior
One candidate at a time with progress for large sets; multi-select summary stays reachable without covering content.

### States
Matched, needs confirmation, ambiguous, unlisted, private company, relationship unverified, overflow, all removed, expired, processing error.

### Things explicitly NOT shown here
Executable mint inferred from AI, automatic selection of ambiguous candidates, retained receipt text, immediate buy.

## Product Detail

### Route
`/products/[slug]`

### Purpose
Explain one reviewed Product and its path through Brand to Company.

### User intent
Verify the match and understand who is behind it.

### Entry points
Discover, Scan results, Saved, Company products, shared snapshot.

### Primary action
Explore the Company.

### Secondary actions
Save/unsave Product, open Brand, view source, report mismatch.

### Information hierarchy
1. Product identity/category/image or honest placeholder.
2. Product → Brand → Company trail.
3. Relationship type, region, source, verification date.
4. What this relationship does and does not imply.
5. Company preview and exposure availability summary.

### Section responsibilities
Identity confirms the object; trail teaches entity boundaries; evidence builds trust; Company preview advances the journey.

### Data displayed
Reviewed image/license, name, Brand, category, regional scope, relationship, source, Company, availability label.

### Interaction model
Save is reversible/optimistic with server rollback; source expands inline; mismatch opens structured report.

### Related pages
Brand, Company, Saved, Discover.

### Mobile behavior
Trail becomes a vertical linked path; primary action sits after relationship explanation, not fixed over content.

### States
Loading, partial/no image, stale relationship, ambiguous region, retired product, save unauthenticated/member, error/offline.

### Things explicitly NOT shown here
Quote, portfolio position, token price as though it belongs to the Product, supplier substitute.

## Brand Detail

### Route
`/brands/[slug]`

### Purpose
Make Brand a distinct, understandable layer between Product and Company.

### User intent
See related Products and verify the Brand's company relationship.

### Entry points
Product trail, Discover Brand results, Company brand list.

### Primary action
Explore the parent/related Company.

### Secondary actions
Browse Brand products, view evidence, save a Product or Company.

### Information hierarchy
1. Brand identity and category coverage.
2. Brand → Company relationship with type/region/effective dates.
3. Products in the reviewed catalog.
4. Ambiguity/license notes.
5. Company preview.

### Section responsibilities
The page prevents a logo from being treated as a listed entity and handles licensed/regional relationships honestly.

### Data displayed
Brand name/aliases, category, reviewed products, relationship type/status/sources, Company.

### Interaction model
No independent “invest in Brand” action; Company link is explicit.

### Related pages
Product, Company, Discover.

### Mobile behavior
Compact product list; evidence progressively disclosed.

### States
Loading, no reviewed products, regional ambiguity, disputed/retired relation, error/offline.

### Things explicitly NOT shown here
Ticker as Brand identity, Instrument/holding actions, unsupported inferred parent.

## Company Detail

### Route
`/companies/[slug]`

### Purpose
Serve as Shelf's central research page and the handoff from recognition to exposure.

### User intent
Understand the Company, familiar connections, and whether/how exposure exists.

### Entry points
Product/Brand, Discover, Scan results, Saved, Holding, shared snapshot.

### Primary action
One per state: default **Save company**; after the user deliberately opens an available Exposure, **Review investment** replaces it as that section's primary action. They never compete as simultaneous primary CTAs.

### Secondary actions
Ask Shelf, view sources, browse products, save/unsave, open technical instrument details.

### Information hierarchy
1. Company identity, listing/private status, concise description.
2. “You may know” Brands/Products and saved overlap.
3. Verified relationship evidence.
4. Company context and reviewed learning.
5. Exposure card: Instrument, issuer, classification, rights, availability.
6. Pricing meanings/liquidity/lifecycle.
7. Risks, sources, and actions.

### Section responsibilities
Familiarity anchors understanding; evidence validates; exposure card visibly starts a different layer; risks precede transaction initiation.

### Data displayed
Legal/display name, ticker/exchange if public, Brands/Products, sources, classification, Instrument symbol/mint/program/issuer, capabilities/reasons, pricing source/timestamp/unit, lifecycle.

### Interaction model
In-page anchors for long content; Save Company is reversible; technical details expand; Review investment navigates to amount, never directly to approval.

### Related pages
Product, Brand, Saved, Assistant, Invest, Holding.

### Mobile behavior
Single narrative column; exposure card cannot sit side-by-side with evidence; optional sticky action appears only after exposure section has been reached.

### States
Discovery-only, public/private, supported, paused, restricted, stale/unavailable price, no route, lifecycle transition, unauthenticated, error/offline.

### Things explicitly NOT shown here
Personal holding as Company fact, blended issuer/DEX price, implied endorsement, direct voting-share claim, one-click purchase.

## Learning Library

### Route
`/learn`

### Purpose
Organize reviewed education around actual Shelf decisions.

### User intent
Understand relationships, instruments, wallet/funding, fees, pricing, and corporate actions.

### Entry points
Discover, Company, financial help, AI fallback.

### Primary action
Read an explainer.

### Secondary actions
Search topics, return to context, Ask Shelf.

### Information hierarchy
1. Topic groups by journey.
2. Recommended starting articles.
3. All reviewed explainers with dates.
4. Scope/educational disclaimer.

### Section responsibilities
Topic groups match real decisions in the Shelf journey; reviewed dates establish freshness; the library remains useful without a wallet or purchase intent.

### Data displayed
Title, summary, topic, review date/version, related entities.

### Interaction model
Simple list; no completion gamification or investment nudge.

### Related pages
Article, Discover, Assistant, Company.

### Mobile behavior
Grouped list with concise summaries.

### States
Loading, empty/update in progress, error, offline cached articles.

### Things explicitly NOT shown here
Personal recommendations, market ranking, required course progress.

## Learning Article

### Route
`/learn/[slug]`

### Purpose
Explain one reviewed concept with sources and contextual exits.

### User intent
Resolve a specific question.

### Entry points
Library, contextual help, AI citations, Company/Holding.

### Primary action
Return to the originating task or explore a related entity.

### Secondary actions
View sources, Ask Shelf.

### Information hierarchy
1. Title/summary/review status.
2. Plain-language explanation.
3. Example/caveat.
4. Sources.
5. Related next steps.

### Section responsibilities
Teach without selling; preserve exact reviewed facts and distinguish examples from live data.

### Data displayed
Versioned article, sources, review date, related entity links.

### Interaction model
Readable document; anchored headings for longer articles.

### Related pages
Learn, Assistant, originating entity/workflow.

### Mobile behavior
Comfortable reading measure; source URLs wrap; contextual return stays visible at end.

### States
Loading, stale review notice, unavailable/not found, error, offline cached.

### Things explicitly NOT shown here
Disguised buy CTA, AI-rewritten facts, live quote.

## Ask Shelf

### Route
`/assistant?company=&product=&from=`

### Purpose
Provide grounded, scoped education and clarification.

### User intent
Ask a question without granting action authority.

### Entry points
Company, Product, Article, Saved, direct utility access.

### Primary action
Send question.

### Secondary actions
Remove context, stop, clear, open cited source/entity; start Basket only after an explicit allocation request.

### Information hierarchy
1. AI limitation/privacy statement.
2. Removable context chip and exactly what is sent.
3. Conversation.
4. Source/uncertainty cards.
5. Validated suggested next action.

### Section responsibilities
Context controls scope; answers teach; sources support claims; actions are allowlisted and nonfinancial.

### Data displayed
Session-local transcript, safe entity context, answer, source IDs, uncertainty, usage/limit state.

### Interaction model
Streaming with visible stop; transcript clears locally; allocation intent routes to Basket setup, never an order.

### Related pages
Company, Product, Learn, Basket.

### Mobile behavior
Composer stays above keyboard; source cards collapse; no bottom-nav overlap.

### States
Intro, streaming, stopped, empty, rate-limited, privacy unavailable, provider error, unsupported question, offline.

### Things explicitly NOT shown here
Wallet/email/receipt context, signing tools, arbitrary URLs, automatic “Use draft” after ordinary answers.

## Saved Research

### Route
`/saved?view=products|companies`

### Purpose
Unify saved Products and watched Companies as research—not ownership.

### User intent
Revisit, organize, compare, share, or act on prior research.

### Entry points
Primary navigation, save confirmation, shared snapshot.

### Primary action
Empty: Scan/Search. Populated: Continue research on a selected entity.

### Secondary actions
Switch view, remove/undo, summarize, share, select Companies for Basket, sign in to keep.

### Information hierarchy
1. “Saved research—not investments” definition.
2. Products/Companies switch and counts.
3. Parent-company overlap summary.
4. Saved entity list.
5. Optional share/basket/AI organization tools.

### Section responsibilities
Definition prevents ownership confusion; overlap explains repeated brands; list enables return use; tools remain secondary.

### Data displayed
Saved Product/Company type, relation, public/private/unsupported status, date only if useful and private, no holding values.

### Interaction model
One Save vocabulary with entity-specific feedback; guest saves in session; member sync/merge; remove is undoable and cannot affect holdings.

### Related pages
Product, Company, Share builder, Basket, Sign in.

### Mobile behavior
Compact segmented control; selection mode is explicit; no dense nested cards.

### States
True empty, guest temporary, member, merge prompt, loading, version conflict, partial company data, error/offline.

### Things explicitly NOT shown here
Owned quantity, performance, cash, “diversified” scoring, fabricated examples inside personal state.

## Share Builder

### Route
`/saved/share`

### Purpose
Create and manage a sanitized snapshot of selected research.

### User intent
Verify exactly what another person will see before sharing.

### Entry points
Saved member tools.

### Primary action
Create private link.

### Secondary actions
Select/deselect, copy, revoke, create new snapshot, return to Saved.

### Information hierarchy
1. Bearer-link/expiry explanation.
2. Exact preview.
3. Excluded-data checklist.
4. Link creation confirmation.
5. Existing active snapshots and revoke.

### Section responsibilities
Preview proves the privacy boundary; exclusions reinforce it; management supports revocation.

### Data displayed
Actual selected saved Products/Companies only, public relationship fields, expiry/status; never raw secret after creation except displayed URL once.

### Interaction model
Selection from current Saved state; creation requires explicit confirmation; clipboard fallback; regeneration does not mutate old snapshot silently.

### Related pages
Saved, Shared snapshot.

### Mobile behavior
Preview first; link actions in safe sticky footer after confirmation.

### States
Loading, no selectable items, preview, creating, success, clipboard error, expired/revoked, auth/fresh-state error.

### Things explicitly NOT shown here
Holdings, amounts, wallet, identity, scan dates, receipts, notes, view tracking.

## Shared Snapshot

### Route
`/share/[token]`

### Purpose
Present a read-only, privacy-safe research snapshot.

### User intent
Understand what someone chose to share and optionally save public entities.

### Entry points
Bearer URL.

### Primary action
Save selected discoveries.

### Secondary actions
Open Product/Company, start own Scan/Search.

### Information hierarchy
1. Read-only snapshot explanation.
2. Shared Products/Companies grouped by entity.
3. Relationship context.
4. Save/select action.
5. Privacy/expiry note.

### Section responsibilities
The page makes absence of financial/profile data explicit without revealing owner identity.

### Data displayed
Allowlisted public entity fields and sources only.

### Interaction model
Recipient selects what to merge into temporary/member Saved; no automatic import.

### Related pages
Product, Company, Saved, Sign in.

### Mobile behavior
Compact grouped list; no owner-specific chrome.

### States
Loading, available, expired/revoked/unknown generic unavailable, partial retired entity, offline.

### Things explicitly NOT shown here
Owner identity, holdings, wallet, dates, analytics, personal OG preview, comments/social metrics.

## Sign In

### Route
`/sign-in?returnTo=`

### Purpose
Authenticate with Magic while preserving safe intent.

### User intent
Keep research or access a protected feature.

### Entry points
Account, Save persistence, Share, Portfolio, Wallet, investment action.

### Primary action
Continue with the chosen method.

### Secondary actions
Alternate method, continue as guest, support.

### Information hierarchy
1. Contextual benefit/reason for sign-in.
2. Email and Google methods.
3. Wallet/provider explanation.
4. Guest exit and help.

### Section responsibilities
Explain identity/wallet creation without overselling; preserve temporary research.

### Data displayed
No invite lookup disclosure; safe return context only.

### Interaction model
Email OTP or Google; provider errors are method-specific; double submission blocked.

### Related pages
Callback, Onboarding, intended destination.

### Mobile behavior
Single-column form, keyboard-friendly, popup-blocked recovery.

### States
Default, pending, email invalid, OTP/provider error, Google unavailable/popup blocked, already signed in, offline.

### Things explicitly NOT shown here
Password field, external-wallet login, public invite enumeration, financial promises.

## OAuth Callback

### Route
`/auth/callback`

### Purpose
Finish Google authentication safely.

### User intent
Wait for verification or recover from callback failure.

### Entry points
Magic OAuth only.

### Primary action
Automatic verified continuation.

### Secondary actions
Try again, support.

### Information hierarchy
1. Stable “Finishing sign-in” status.
2. Current verification step.
3. Recovery on failure.

### Section responsibilities
Prevent duplicate processing and explain delay without exposing tokens.

### Data displayed
No DID token or wallet details in DOM/logs.

### Interaction model
Single-run effect, replace navigation, safe stored challenge.

### Related pages
Sign in, Onboarding/intended route.

### Mobile behavior
Centered calm status; no competing nav actions.

### States
Verifying, success redirect, missing/expired challenge, provider error, wallet-binding mismatch.

### Things explicitly NOT shown here
Manual token fields, transaction signing, provider secrets.

## Onboarding

### Route
`/onboarding`

### Purpose
Clarify account status, capture required consent, and optionally merge guest research.

### User intent
Finish setup and return to the task.

### Entry points
First successful sign-in or incomplete account state.

### Primary action
Continue after required acknowledgements.

### Secondary actions
Merge selected discoveries, skip merge, continue learning if beta access absent.

### Information hierarchy
1. Account created versus beta access status.
2. Terms/privacy/adult acknowledgements.
3. Guest merge preview.
4. Wallet/recovery disclosure.
5. Continue destination.

### Section responsibilities
Separate identity success from financial access; merge is explicit and idempotent.

### Data displayed
Masked account, invite state, count/list of normalized guest items, consent versions.

### Interaction model
Required controls are genuinely disabled with reasons; skip preserves guest draft until explicit discard/session end.

### Related pages
Availability, Account, intended route.

### Mobile behavior
Step-based single column, but no artificial multi-page wizard for one decision.

### States
New/returning, invited/pending, merge/no guest items, version conflict, provider unavailable, success.

### Things explicitly NOT shown here
Deposit address before readiness, forced investment setup, identity-document collection.

## Financial Availability

### Route
`/onboarding/availability?returnTo=`

### Purpose
Evaluate versioned policy before financial promotion/funding/trading.

### User intent
Learn whether a requested money capability is available.

### Entry points
Invest, Deposit, Transfer, suggestion actions; onboarding when appropriate.

### Primary action
Check availability.

### Secondary actions
View restrictions, continue learning, support.

### Information hierarchy
1. Why Shelf asks.
2. Required declarations.
3. Privacy/scope explanation.
4. Capability-specific result.
5. Safe return/alternatives.

### Section responsibilities
Avoid implying global availability; deny unknown policy honestly while preserving education.

### Data displayed
Policy version, expiry, capability results/reason codes; no unsupported KYC fields.

### Interaction model
Server-authoritative check; return only to a non-signing stage.

### Related pages
Company, Invest, Wallet, Learn.

### Mobile behavior
Plain form and readable restriction detail.

### States
Unchecked, checking, allowed, partially allowed, unknown, denied, policy unavailable/expired.

### Things explicitly NOT shown here
VPN bypass help, legal-clearance claim, deposit address when unavailable.

## Account & Privacy

### Route
`/account`

### Purpose
Manage identity, recovery, privacy, sessions, data controls, and support.

### User intent
Understand/manage the account safely.

### Entry points
Account menu.

### Primary action
Review security & privacy. Any unresolved recovery or security alert replaces it as the single primary action until resolved or dismissed.

### Secondary actions
Wallet, signing check, export, deletion, logout, logout all, support.

### Information hierarchy
1. Identity and beta status.
2. Wallet/recovery link and public-chain disclosure.
3. Privacy/consent/data retention.
4. Session/security controls.
5. Export, deletion, support.

### Section responsibilities
Separate reversible account actions from destructive deletion; owner binding appears only to owner and is visually isolated.

### Data displayed
Masked email, auth method, wallet address, consent/policy versions, invite/access status.

### Interaction model
Destructive/export/session-wide actions require step-up and explicit confirmation; deletion explains blockers/retention/wallet independence.

### Related pages
Wallet, Sign in, Support.

### Mobile behavior
Section list with dedicated detail expansions; dangerous actions at end.

### States
Loading, partial provider info, step-up, pending operation blocker, export/deletion success/error, offline.

### Things explicitly NOT shown here
Arbitrary wallet replacement, identity merge, editable role, holdings performance.

## Wallet

### Route
`/account/wallet`

### Purpose
Show the verified Solana wallet, cash, and supported external assets distinct from Portfolio.

### User intent
Fund, send, refresh, or understand externally received assets.

### Entry points
Account, Portfolio cash card, deposit/send returns.

### Primary action
One per state: **Deposit USDC** when funding is enabled; otherwise the specific blocking-state recovery action.

### Secondary actions
Send USDC, send supported external asset, copy address, open Portfolio.

### Information hierarchy
1. Spendable/pending/unavailable USDC.
2. Funding capability status.
3. Verified address/network/recovery disclosure.
4. Supported external inventory labeled “not bought through Shelf.”
5. Recent wallet activity/reconciliation status.

### Section responsibilities
Cash is not a holding; external tokens remain outside Portfolio; capability status explains gates.

### Data displayed
Actual/reserved/spendable cash, freshness, address/network, external asset raw/display units and status.

### Interaction model
Refresh is async and never credits from user assertion; copy has fallback; external Send preselects `scope=external`.

### Related pages
Deposit, Send, Portfolio, Account.

### Mobile behavior
Address truncates visually with full copy/accessibility text; balances never depend on horizontal tables.

### States
Loading, empty, pending deposit, RPC unavailable, stale, reconciliation required, funding disabled, unsupported external asset, error/offline.

### Things explicitly NOT shown here
External assets as Shelf holdings, fabricated zero during outage, fee/sponsor addresses.

## Deposit USDC

### Route
`/account/wallet/deposit?returnTo=`

### Purpose
Provide gated canonical Solana USDC deposit instructions.

### User intent
Add spendable cash safely.

### Entry points
Wallet, insufficient-cash investment flow.

### Primary action
Copy wallet address.

### Secondary actions
Show QR, “I’ve sent USDC” refresh, return to amount page.

### Information hierarchy
1. Network/asset warning.
2. Verified address and QR.
3. Canonical USDC identity.
4. Public-chain/recovery disclosure.
5. Refresh/pending status and return.

### Section responsibilities
Prevent wrong-network/token deposits and distinguish deposit from purchase.

### Data displayed
Verified user address, Solana network, canonical mint/decimals, capability/freshness.

### Interaction model
No credit based on button press/receipt; refresh queues reconciliation; valid return path restores amount but requires new quote.

### Related pages
Wallet, Invest amount.

### Mobile behavior
Large QR/address copy target; warning precedes QR.

### States
Capability denied/disabled, loading, ready, clipboard error, refresh queued, pending/confirmed/unavailable, RPC error.

### Things explicitly NOT shown here
Sponsor/fee address, fiat onramp, wrong-chain alternatives, fake countdown.

## Send Asset

### Route
`/account/wallet/send?asset=&scope=`

### Purpose
Create and complete an outbound transfer intent.

### User intent
Send supported cash, tracked, or external inventory to a Solana wallet.

### Entry points
Wallet, Holding.

### Primary action
Review transfer. Approval belongs only to the canonical Order Review page.

### Secondary actions
Max, edit, cancel.

### Information hierarchy
1. Asset and inventory-source label.
2. Spendable amount.
3. Recipient and amount.
4. Full-address/network/irreversibility preview.
5. Fees/sponsor/account-creation details.

### Section responsibilities
Keep tracked versus external scope explicit and make recipient immutable once reviewed.

### Data displayed
Asset/mint/program, scope, exact amount, recipient, app fee zero, sponsor/rent estimate, restrictions.

### Interaction model
Step-up before preparation; changing asset/recipient/amount clears review; actual signing occurs through Order review/status architecture.

### Related pages
Wallet, Holding, Order review/status, Record.

### Mobile behavior
Full address wraps/copies; sticky Review only when validation passes.

### States
Loading assets, invalid/self/mint/program/off-curve recipient, insufficient balance, restricted asset, step-up required, reviewing, pending/unknown/success/error.

### Things explicitly NOT shown here
Email/username send, cross-chain/bridge, QR payment authorization, app fee.

## Investment Amount

### Route
`/invest/[companySlug]`

### Purpose
Turn researched Company context into a single-company budget intent.

### User intent
Choose how much USDC to consider investing.

### Entry points
Company exposure card, Saved Company.

### Primary action
Review investment.

### Secondary actions
Deposit, return to Company, learn about instrument.

### Information hierarchy
1. Company and distinct Instrument summary.
2. Public/private rights/liquidity warning.
3. Spendable cash and amount input.
4. Limits/fee meaning.
5. Review CTA.

### Section responsibilities
Maintain research context while making clear that no order exists until review.

### Data displayed
Company, issuer/symbol, classification, balance, min/max/daily cap, configured fee policy, capability reasons.

### Interaction model
Human-readable decimal input; presets; server validation; no quote on every keypress.

### Related pages
Company, Deposit, Order review.

### Mobile behavior
Sticky Review CTA with keyboard-safe layout; summary remains visible.

### States
Unauthenticated, onboarding/availability required, funding insufficient, unsupported/paused/stale metadata/no route, valid, error/offline.

### Things explicitly NOT shown here
Performance prediction, automatic max spend, raw mint as primary label, approval/signing.

## Basket Builder

### Route
`/invest/basket?source=&market=`

### Purpose
Select up to five unique Companies and allocate one USDC budget into sequential purchases.

### User intent
Plan several deliberate company investments.

### Entry points
Saved Companies, Discover Company selection, optional AI allocation request.

### Primary action
Review basket.

### Secondary actions
Add/remove Company, split equally, generate/apply/edit AI draft, save draft, cancel.

### Information hierarchy
1. Sequential/partial-outcome explanation.
2. Selected unique Companies with classifications.
3. Total budget and per-company human-readable amounts/weights.
4. Validation/remainder/fees estimate note.
5. Review summary.

### Section responsibilities
Selection prevents duplicate parents; allocation makes arithmetic transparent; AI remains an optional editable proposal.

### Data displayed
Company/Instrument labels, public/private mix warning, amounts/percentages, min/max/count, cash, estimated fees only until fresh quotes.

### Interaction model
Equal split deterministic; custom sums must match; AI context consent explicit; Apply fills form only. Each leg later gets its own review/signature.

### Related pages
Saved, Discover, Order review/status.

### Mobile behavior
One Company row at a time; total/remainder sticky summary; add-company sheet.

### States
Empty selection, invalid minimum/sum/count, mixed availability, AI disabled/quota/privacy failure, draft applied/expired, insufficient cash, error.

### Things explicitly NOT shown here
Pooled fund language, guaranteed simultaneous price, automatic execution, raw-USDC editing by default.

## Order Review

### Route
`/orders/[id]/review`

### Purpose
Present exact current terms for one buy/sell/transfer leg before user approval.

### User intent
Decide whether to sign the exact transaction.

### Entry points
Investment, Basket next leg, Sell, Send, retry after proven failure.

### Primary action
Approve purchase, Approve sale, or Approve transfer—exactly one side-specific action for the order being reviewed.

### Secondary actions
Refresh quote, edit, cancel/stop unsigned work, technical details.

### Information hierarchy
1. Action + Company/Instrument/recipient identity.
2. You pay/send and estimated/minimum receive.
3. Shelf fee, market/routing costs, network payer.
4. Slippage/impact/quote countdown and warnings.
5. Exact issuer/mint/program/route details.
6. “Nothing has happened yet” and approval.

### Section responsibilities
Identity prevents wrong-asset signing; economics support informed approval; technical details serve experts; action boundary is unmistakable.

### Data displayed
Immutable QuoteView/Preparation terms, balance, policy version, unit snapshots, warnings, expiry, review digest reference (not raw hash prominently).

### Interaction model
Quote fetched explicitly; expiration disables approval; material change is visually compared and requires new approval; Magic prompt follows a deliberate click.

### Related pages
Order status, originating amount/edit page, Company/Holding.

### Mobile behavior
Sticky approval above global-nav safe area; key terms remain visible without opening technical disclosure.

### States
Loading order, no quote, quoting/queued, current, expiring, expired/changed, blocked, insufficient, sponsor unavailable, awaiting signature, rejected, error/offline.

### Things explicitly NOT shown here
Invented quote values, silent refresh approval, success before chain evidence, unrelated upsells.

## Order Status

### Route
`/orders/[id]`

### Purpose
Provide the stable truth and recovery surface for a transaction/order.

### User intent
Know what happened and what is safe to do next.

### Entry points
Submission, reload, Portfolio pending banner, Activity, support link.

### Primary action
Exactly one action derived from the persisted state: Review next leg, Check status, View holding/record, or Retry after proven terminal failure.

### Secondary actions
Stop unsigned remainder, view explorer, support, keep discovering.

### Information hierarchy
1. Exact aggregate state headline.
2. What moved/did not move.
3. Per-leg timeline and amounts.
4. Pending/unknown explanation.
5. Safe next actions and records.

### Section responsibilities
State headline maps backend semantics; timeline preserves partial outcomes; recovery prevents duplicate actions.

### Data displayed
Order type/status, leg status, spent/unspent, signature, timestamps, failure reason, next safe action.

### Interaction model
Poll with backoff/visibility awareness; manual refresh respects Retry-After; no automatic replacement order. Closing does not cancel submitted work.

### Related pages
Order review, Portfolio/Holding, Activity/Record.

### Mobile behavior
Vertical leg timeline and persistent status; actions ordered by safety.

### States
Draft, awaiting user/signature, sending, submitted, confirmed-finalizing, finalized, failed, expired, unknown, partial, stopped, offline.

### Things explicitly NOT shown here
Generic “Partly completed” for every non-complete state, fake rollback/refund, enabled duplicate send.

## Portfolio

### Route
`/portfolio`

### Purpose
Be the unambiguous home for Shelf-origin ownership.

### User intent
See holdings, current context, and pending activity.

### Entry points
Primary navigation, order success, Wallet link.

### Primary action
Open a Holding; in the true empty state, Discover companies replaces it.

### Secondary actions
View Activity, Wallet cash, pending order.

### Information hierarchy
1. Definition: Shelf-origin holdings only.
2. Pending/unknown operation banner.
3. Portfolio value with completeness/freshness, or quantity-only fallback.
4. Holdings grouped by Company/Instrument.
5. Cash link and Activity.

### Section responsibilities
Definition separates ownership; valuation communicates data quality; holdings lead to management; external assets stay in Wallet.

### Data displayed
Tracked quantity, estimated value, acquisition cost, classification, mark source/time, partial-total reason, pending reservations.

### Interaction model
No optimistic holding update; cards open Holding. Guest variant explains value and asks for sign-in.

### Related pages
Holding, Activity, Wallet, Discover.

### Mobile behavior
Summary first, compact position rows, value/quantity progressive disclosure.

### States
Guest explanation, empty, loading, partial/stale/missing values, pending operation, reconciliation issue, error/offline.

### Things explicitly NOT shown here
Saved Companies, external tokens, fabricated total/P&L, universal wallet aggregation.

## Holding Detail

### Route
`/portfolio/[instrumentId]`

### Purpose
Explain one tracked position and connect it back to Company/Instrument context.

### User intent
Understand quantity, value, cost, events, and available actions.

### Entry points
Portfolio, Order success, Activity record.

### Primary action
One per state: Sell when the tracked amount is safely spendable; otherwise Resolve reconciliation.

### Secondary actions
Send, view Company, view Activity, explain quantity change.

### Information hierarchy
1. Company + Instrument classification.
2. Human-readable tracked/spendable/reserved quantities.
3. Value/cost with source/freshness.
4. Pending/reconciliation status.
5. Lots and related activity.
6. Corporate actions.
7. Technical raw units/mint.

### Section responsibilities
Readable ownership comes first; accounting detail and corporate actions explain changes; technical facts remain available.

### Data displayed
Tracked/actual/reserved/external distinction, decimals/multiplier snapshot, cost, mark, lots, records, action sources.

### Interaction model
Sell uses tracked spendable only; Send preselects tracked scope; event explanation expands with before/after and source.

### Related pages
Company, Sell, Send, Activity/Record.

### Mobile behavior
Action bar after status; lots/technical details collapse; warnings never collapse.

### States
Loading, active, zero after disposition, stale/no value, reserved, reconciliation required, action transition, restricted exit, error/offline.

### Things explicitly NOT shown here
External tokens as lots, unknown cost as zero, multiplier change as cash/gain.

## Sell Amount

### Route
`/portfolio/[instrumentId]/sell`

### Purpose
Choose a tracked raw-safe quantity to sell to USDC.

### User intent
Exit all or part of a Shelf holding.

### Entry points
Holding.

### Primary action
Review sale.

### Secondary actions
25/50/100%, Sell all, Send instead, cancel.

### Information hierarchy
1. Holding/Instrument identity.
2. Spendable versus reserved quantity.
3. Quantity input/presets.
4. Route/liquidity caveat.
5. Review action.

### Section responsibilities
Ensure displayed percentages map conservatively to raw inventory and do not mix external assets.

### Data displayed
Human-readable and technical quantity, tracked spendable raw amount, current mark as context only, capability reason.

### Interaction model
Sell all uses authoritative raw balance; server validates; quote occurs after Review.

### Related pages
Holding, Order review, Send.

### Mobile behavior
Large presets and clear remaining estimate; sticky Review.

### States
Loading, no spendable amount, reserved, dust/no route, restricted, reconciliation required, valid, error.

### Things explicitly NOT shown here
External inventory, guaranteed proceeds, original price as promised return.

## Activity

### Route
`/portfolio/activity?type=&status=&from=&to=&cursor=`

### Purpose
Browse and export factual financial activity.

### User intent
Find a purchase, sale, transfer, deposit, or corporate event.

### Entry points
Portfolio, Holding, Account export context.

### Primary action
Open a record.

### Secondary actions
Filter, clear, download CSV/JSON with fresh auth.

### Information hierarchy
1. Filters and result count/range.
2. Pending/unknown items first when relevant.
3. Chronological activity list/table.
4. Export controls and limits.

### Section responsibilities
Filters support retrieval; states distinguish chain progress; exports remain exact and private.

### Data displayed
Time, type, status, Company/asset, human-readable amount, fee, signature indicator, corporate-action label.

### Interaction model
Filters update URL; cursor pagination; mobile rows open detail; exports require step-up and never rely on current rendered subset.

### Related pages
Record, Order status, Holding.

### Mobile behavior
Card-like rows; filters in sheet; critical amount/status visible without horizontal scroll.

### States
Loading, empty overall, no filtered results, partial/pending/unknown, export too large, fresh-auth required, error/offline.

### Things explicitly NOT shown here
Editable facts, tax-report claim, missing value as zero.

## Activity Record

### Route
`/portfolio/activity/[recordId]`

### Purpose
Present one immutable, explainable financial record.

### User intent
Verify exactly what happened and get help if needed.

### Entry points
Activity, Holding, Order status.

### Primary action
View on Solana when a signature exists; otherwise return to the filtered Activity context.

### Secondary actions
View source order/Company/Holding, technical details, support.

### Information hierarchy
1. Plain-language action/status summary.
2. Human-readable money/asset effects.
3. Fee and network facts.
4. Timeline/source order/signature.
5. Unit/multiplier/raw technical details.
6. Support reference.

### Section responsibilities
Summary serves newcomers; exact detail serves audit/support; record remains immutable.

### Data displayed
Final/pending facts, amounts/units, fee, issuer/instrument, signature, timestamps, multiplier snapshot, correction references.

### Interaction model
Read-only; copy safe reference/signature; source links noreferrer.

### Related pages
Activity, Order status, Holding, Company.

### Mobile behavior
Definition-list rows wrap; raw values copy without truncation.

### States
Loading, pending/unknown/finalized/failed/corrected, not found/unauthorized generic, error/offline cached reference.

### Things explicitly NOT shown here
Edit/delete completed record, pre-quote as realized amount, secrets/signed bytes.

## Admin Overview

### Route
`/admin`

### Purpose
Summarize readiness, incidents, queues, budgets, and required owner attention.

### User intent
Know whether the beta is healthy and what needs action.

### Entry points
Owner account menu.

### Primary action
Open the highest-priority work item.

### Secondary actions
Navigate Catalog, Access, Operations, Audit.

### Information hierarchy
1. Environment/network/trading state.
2. Critical incident/unknown outcome alerts.
3. Provider/capability health.
4. Budget/backup/freshness summaries.
5. Work queues and readiness gates.

### Section responsibilities
Prioritize safety, not vanity metrics; link every count to an actionable page.

### Data displayed
Coarse health, timestamps, counts, budget state, open gates; no user content/photos/chat.

### Interaction model
Read-first; no dangerous bulk action on dashboard.

### Related pages
All admin pages.

### Mobile behavior
Usable for incident checks, but dense evidence review may recommend desktop without blocking emergency pause access.

### States
Loading, partial provider outage, critical alert, stale health, empty queues, unauthorized 404, error.

### Things explicitly NOT shown here
Secrets, signed bytes, raw user content, unaudited mutation shortcuts.

## Admin Catalog

### Route
`/admin/catalog`

### Purpose
Review Product/Brand/Company relationships, sources, reports, and Instrument readiness.

### User intent
Publish or pause only evidence-backed mappings/capabilities.

### Entry points
Admin navigation/queue.

### Primary action
Approve/reject selected evidence with reason.

### Secondary actions
Inspect sources/history, pause instrument, filter overdue/disputed.

### Information hierarchy
1. Review queue and filters.
2. Entity relationship/evidence comparison.
3. Region/effective dates/conflicts.
4. Instrument/mint readiness separately.
5. Decision/reason/audit preview.

### Section responsibilities
Separate catalog truth from trading readiness and model suggestions.

### Data displayed
Reports, source claims, review dates, relationship status, exact instrument checks/capabilities.

### Interaction model
Fresh auth for mutation; explicit reason; compare original/current; no model-only approval.

### Related pages
Admin overview/audit, public entities.

### Mobile behavior
Queue triage possible; evidence comparison uses stacked sections, never squeezed tables.

### States
Loading, empty, disputed/stale, action pending/success/conflict/error, unauthorized.

### Things explicitly NOT shown here
User balances, generic mint input, retrospective history rewrite.

## Admin Access

### Route
`/admin/access`

### Purpose
Manage private-beta invitations and access state.

### User intent
Invite/revoke deliberately without exposing a public list.

### Entry points
Admin navigation.

### Primary action
Create invitation.

### Secondary actions
Revoke, filter status, inspect audit reference.

### Information hierarchy
1. Beta capacity/status.
2. Invite form.
3. Masked invitation list.
4. Revocation consequences.

### Section responsibilities
Keep identity data minimal and distinguish access revocation from wallet/record destruction.

### Data displayed
Masked email, status, expiry, accepted account reference, timestamps.

### Interaction model
Fresh auth/reason for mutation; revoke does not alter settled facts.

### Related pages
Admin overview/audit.

### Mobile behavior
Simple list/forms; confirmation sheet for revoke.

### States
Loading, empty, invalid/duplicate/expired, success/error, capacity reached.

### Things explicitly NOT shown here
Full public email list, role-by-domain, customer-fund controls.

## Admin Operations

### Route
`/admin/operations`

### Purpose
Manage pauses, budgets, unknown outcomes, reconciliation, jobs, and incidents.

### User intent
Keep the system safe without rewriting chain facts.

### Entry points
Admin alert/overview/navigation.

### Primary action
Exactly one highest-priority safe action for the selected work item: pause, inspect unknown order, or run scoped reconciliation.

### Secondary actions
Review budget/job/backup/provider detail, resume after checks, export redacted diagnostic.

### Information hierarchy
1. Emergency state/pauses.
2. Unknown/pending operations.
3. Sponsor/AI/provider budgets.
4. Jobs, issuer freshness, backup age.
5. Diagnostics/runbook links.

### Section responsibilities
Emergency control remains reachable; resume requires evidence; reconciliation never fabricates outcome.

### Data displayed
Redacted operation facts, signatures where public and necessary, leases/attempts, limits/spend, timestamps.

### Interaction model
Fresh auth and reason; scoped confirmation; persistent success/error; no optimistic resume.

### Related pages
Admin overview/audit, Order status/Record by authorized support context.

### Mobile behavior
Emergency pause optimized; investigation detail progressively disclosed.

### States
Healthy, paused, budget low/exhausted, unknown outcome, job/provider/backup failure, mutation unavailable, success/error.

### Things explicitly NOT shown here
Generic arbitrary signing, direct balance edit, auto-top-up, “mark complete” without chain evidence.

## Admin Audit

### Route
`/admin/audit`

### Purpose
Review append-only owner/system changes.

### User intent
Trace who changed what, why, and when.

### Entry points
Admin navigation and operation confirmations.

### Primary action
Inspect an audit event.

### Secondary actions
Filter/export redacted records.

### Information hierarchy
1. Filters.
2. Chronological event list.
3. Event detail with redacted before/after/reason/reference.

### Section responsibilities
Support accountability and incident review without creating an edit surface.

### Data displayed
Actor reference, action, entity, time, reason, redacted changes.

### Interaction model
Read-only; cursor pagination; safe export.

### Related pages
All admin pages.

### Mobile behavior
Event summary rows; detail sheet/page-like panel without URL unless a future audit-event deep link is justified.

### States
Loading, empty, filtered empty, partial/redacted, error, unauthorized.

### Things explicitly NOT shown here
Delete/edit, secrets, raw photos/chat, private keys.

# 11. Entity & Terminology Model

| Entity | Meaning to the user | UI name | Detail-view information | Permitted actions | Relationships |
|---|---|---|---|---|---|
| Product | A specific reviewed product family/SKU the user recognizes | Product | Name, Brand, category, region, source, relationship path | Save Product, correct/report, explore Brand/Company | Belongs to Brand; resolves through a reviewed relation to Company |
| Brand | The consumer-facing identity on products; not necessarily a legal/listed entity | Brand | Aliases, products, relationship type/region/effective dates | Browse Products, view evidence, explore Company | Has Products; relates to Company as parent/subsidiary/licensee/etc. |
| Company | The legal/operating entity behind reviewed Brand relationships | Company | Identity, description, listing/private status, Brands/Products, evidence, exposure availability | Save Company, Ask, review Instrument, start investment if allowed | Owns/relates to Brands; may have zero or one active v1 Instrument |
| Public company | A Company with exchange-listed equity context | Public company | Ticker/exchange, session/reference context, sources | Same Company actions | May map to an xStocks tracker Instrument; is not the Instrument |
| Private company | A Company without ordinary public listing in the Shelf context | Private company | Private status, limited information, verified source context | Save/learn; invest only through separately explained eligible exposure | May map to a PreStocks exposure Instrument; not direct shares |
| Investment instrument/token | The exact issuer-defined onchain asset through which exposure may be available | Exposure / instrument; specific label “Public equity tracker” or “Pre-IPO exposure token” | Issuer, symbol, mint, program, rights, pricing sources, capabilities, lifecycle, restrictions | Review buy; sell/transfer only from owned inventory and when allowed | References one Company; produces a Holding only after finalized Shelf buy |
| Saved item | A Product or Company intentionally kept for research | Saved Product / Saved Company | Entity preview and why/type | Open, remove/undo, share/select; Companies can seed basket | Lives in Saved; never implies ownership |
| Watchlisted company | Current implementation term for Saved Company | Rename to Saved Company | Same as saved-company preview | Save/unsave, research, basket | Absorbed into Saved; “watchlist” removed from consumer language |
| Holding | Shelf-attributed tracked inventory from finalized Shelf acquisitions | Holding / position | Company + exact Instrument, tracked/spendable/reserved, value/cost, lots/events | Sell, send tracked amount, view record/company | Lives in Portfolio; backed by lots and actual-wallet reconciliation |
| Portfolio position | Presentation grouping of open lots for one Company + Instrument | Position or Holding (choose Holding in copy) | Aggregate of tracked lots, not all wallet tokens | Open Holding, sell/send | A view over Holding/lots; not a separate asset |

Rules:

- Never label a Brand ticker or let a Brand have a buy action.
- Never use a Company logo/name alone to imply the legal rights of its Instrument.
- Never let an Instrument card inherit “shareholder” language from the underlying Company.
- Never show Saved state in a way that resembles quantity/value.
- Never add externally received tokens to Portfolio without Shelf acquisition provenance.

# 12. Discovery Strategy

## Entry hierarchy

1. **Camera** is the primary mobile recognition entry.
2. **Search** is co-primary on desktop and the universal fallback.
3. **Upload** includes ordinary photos and screenshots.
4. **Barcode** is a compact alternate method with manual entry fallback.
5. **Receipt** is a privacy-sensitive specialized mode.
6. **Product link** is a constrained specialized mode with approved-host explanation.

All seven requested capabilities remain: camera, barcode, image upload, screenshot, receipt, URL/link, and typed search. They do not require seven equal navigation tabs. Screenshot is a distinct supported input type in processing/analytics but a use case of Upload in the chooser.

## Scanner behavior

- Never request camera permission on page load.
- Preview/crop/rotate/retake precedes upload.
- Show AI/provider processing consent at the moment it becomes relevant, not as a large permanent warning before all methods.
- Processing shows stages in plain language: Preparing image → Looking for products → Checking Shelf's reviewed catalog.
- Cancel is best effort and says so.
- Multiple products produce independent cards and no default investment selection.

## Confidence and ambiguity

- Use High/Medium/Low only with a short reason (“brand and package matched”; “text unclear”). It is not an investment probability.
- Confirmed identity and verified Company relationship are separate indicators.
- Ambiguous candidates are unselected and offer in-flow replacement.
- Unsupported item: preserve recognized text locally for correction, explain that Shelf's reviewed catalog is intentionally limited, and offer Search/report—not a guessed ticker.
- Incorrect match: “Change match” opens scoped catalog results; the corrected catalog ID replaces only that candidate.
- No match: Search, scan a clearer view, try barcode, or report a missing product.

## Browse and return discovery

Categories remain Groceries, Beauty, Electronics, Clothing, Household. Company browse can filter public/private/discovery-only, but not default to “investable only.” Recently viewed may be local/session-based and private; suggestions must be labeled editorial or based on explicit Saved context. “Trending” is omitted until Shelf has honest, privacy-safe aggregate evidence; fabricated popularity is prohibited.

# 13. Market / Exposure / Transaction Experience

“Markets” should not remain a top-level destination. Its useful functions move to:

- Discover Companies, filtered by `market=public|private`.
- Company exposure card, where the classification is meaningful.
- A reviewed learning article comparing public and private exposure.
- Basket selection, where mixed exposure receives a warning.

## Public exposure presentation

Label: **Public equity tracker · xStocks**. Show underlying public Company/ticker/exchange, issuer, exact Instrument, underlying session/reference, secondary token mark, and executable quote as three separate facts. State that it is not an ordinary voting share. Do not imply exchange hours equal token liquidity or issuer redemption is the user's route.

## Private exposure presentation

Label: **Pre-IPO exposure token · PreStocks**. Lead with absence of direct company-share ownership/voting/information/dividend rights, issuer/SPV terms, valuation-mark source, token reference, premium/discount, lifecycle and liquidity limitations. An issuer mark is not an executable quote or fair value.

## Shared rules

- Issuer, underlying Company, and Instrument are always separately named.
- Price labels include source, timestamp, unit, and meaning.
- Availability is capability-specific: learn, view promotion, suggest, buy, sell, transfer.
- A paused buy does not automatically hide records or permitted exits.
- Transaction state has explicit stages: draft → quote → review → signature → submitted → confirmed → finalized, plus failed/unknown/expired/cancelled.
- No public/private comparison card should use parallel fact rows where the facts are not equivalent.

# 14. Saved / Watch / Owned Model

## Recommendation

Use **Saved** for all research interest and **Portfolio** for ownership.

- “Shelf” remains the product name, not the collection noun in navigation.
- Saved Products and Saved Companies coexist in one area with explicit tabs/entity labels.
- Current watchlist is renamed Saved Companies and absorbed into Saved.
- “Save to Shelf,” “Add to watchlist,” and “On watchlist” become “Save product,” “Save company,” and “Saved.”
- A user can save a Company without saving every Product and vice versa.
- Parent-overlap summaries explain relationships but never score diversification.
- Portfolio contains only finalized Shelf-origin Holdings; Wallet contains cash and supported external assets.

The core copy contract:

- Saved: “You want to research or revisit this.”
- Portfolio: “You acquired this Instrument through Shelf.”
- Wallet external: “This supported token is in your wallet but was not bought through Shelf.”

Removing a Saved item never sells, hides, or changes a Holding. Selling a Holding never automatically removes the Company from Saved.

# 15. Visual Experience Direction

## Character

Shelf should feel editorial, evidence-led, and contemporary: part field guide, part research notebook, with a restrained financial layer that becomes more formal as commitment increases. Keep the existing warmth and approachable green direction as a possible starting character, not a locked palette. Avoid a generic exchange, crypto terminal, or neobank dashboard.

## Density and whitespace

- Discovery pages: generous space, recognizable imagery, short explanations, compact lists rather than endless equal cards.
- Company pages: medium density with a clear narrative and evidence/exposure sections.
- Financial review/records/admin: higher information density, aligned facts, fewer decorative surfaces.
- Whitespace separates conceptual layers, especially Company from Instrument and Saved from Portfolio.

## Typography personality

Use an assured, highly legible sans-serif with editorial display moments on discovery headings. Financial values use tabular numerals. Avoid oversized headlines that push the first useful action below the fold on small devices. Technical identifiers use a readable mono treatment only where needed.

## Surfaces and borders

Prefer page structure, dividers, and a few meaningful surfaces over a card around every item. Cards are for discrete entities, exposure summaries, and decisions—not nested wrappers. Borders should clarify grouping; shadows remain subtle and rare. No glassmorphism or glowing token effects.

## Imagery and identity

- Product imagery has the highest discovery value; use only licensed/reviewed assets or honest text/neutral placeholders.
- Brand and Company logos support recognition but never replace text labels.
- Company imagery should be factual/editorial, not lifestyle hype.
- Never reuse user scans as catalog imagery.

## Iconography

One coherent, restrained icon family. Icons support Scan methods, entity types, state, and navigation. Financial actions always include text. Public/private distinctions rely on wording and structure, not color/icon alone.

## Charts and data visualization

Charts are optional and secondary to exact text values. Every chart states series meaning, source, timestamp, unit, and unavailable gaps. Public underlying, private issuer mark, token reference, and executable quote are never merged into one unlabeled line. Do not plot invented history or smooth sparse data into confidence.

## Motion and transitions

Motion explains continuity: candidate confirmation, Save/undo, filter result update, transaction timeline, and drawer entry. Use short, restrained transitions; no celebratory trading effects, parallax, token spins, or FOMO animation. Reduced-motion mode keeps instant state changes and complete status text.

## Hover and focus

Hover may add a subtle affordance but never reveal the only action or information. Keyboard focus is stronger and persistent. Cards do not lift so dramatically that they imply clickability when only an inner control is actionable.

## Cards, lists, and tables

- Cards: featured examples, exposure summary, decision review.
- Lists: search results, Saved, holdings, activity on mobile.
- Tables: desktop activity/admin comparisons only, with a non-horizontal-scroll priority view on mobile.

## Mobile and desktop

Mobile is task-first: camera, search, entity trail, one-column financial review, bottom navigation. Desktop uses wider relationship/exposure composition and denser evidence/records, but does not simply stretch mobile cards into four columns.

# 16. Content & UX Writing Guidance

## Voice

Clear, calm, specific, and honest about limits. Use familiar language first and exact terminology on demand. Do not sound promotional at the point of financial risk.

## Preferred terminology

| Use | Avoid / rename | Reason |
|---|---|---|
| Saved | My shelf as collection label; watchlist | One research concept; avoids product-name collision. |
| Saved product / Saved company | Saved investment | Saving is not ownership. |
| Company | Stock/brand when referring to legal entity | Preserves hierarchy. |
| Public equity tracker | Tokenized stock/share as shorthand without qualification | Does not imply ordinary share rights. |
| Pre-IPO exposure token | Private stock/share | Does not imply direct private-company ownership. |
| Holding | Saved company; token in wallet | Shelf-origin ownership only. |
| Wallet cash | Cash balance where bank-deposit meaning could be inferred | It is canonical USDC in a Solana wallet. |
| Review investment | Buy now / Get exposure | Emphasizes deliberate review. |
| Approve purchase/sale/transfer | Confirm | Names the irreversible action. |
| Price unavailable | $0.00 | Unknown is not zero. |
| Checking transaction outcome | Failed after timeout | Timeout is ambiguous. |

## Navigation and headings

Use nouns for destinations: Discover, Saved, Portfolio, Account. Use verbs for actions: Scan a product, Save company, Review investment, Approve purchase, Stop remaining purchases.

## Relationship language

Say “Doritos is a PepsiCo brand in Shelf's reviewed catalog” or the exact relation (“licensed by,” “manufactured by”) with region/effective date. Avoid “buying Doritos means investing in PepsiCo” and “your purchase supports this stock.”

## Risk and financial messaging

- Put the relevant limitation near the action, not only in a footer.
- State what an Instrument is and is not.
- Explain issuer, liquidity, public/private distinction, and pricing source in plain language.
- Avoid “safe,” “guaranteed,” “instant,” “best,” “diversified,” “real stock,” and countdown/FOMO copy.

## Errors and empty states

Name the failed capability and recovery:

- “Camera access is blocked. Upload a photo or search instead.”
- “Shelf could not verify a company relationship for this item. Correct the match or keep learning.”
- “Current token pricing is unavailable. Company research and saved items are still available.”
- “This transaction's outcome is still being checked. Do not submit it again.”
- “No saved research yet. Scan a product or search the catalog.”

## Confirmation and saved/owned copy

- Save: “Company saved for research.”
- Remove: “Removed from Saved. Your holdings did not change.” with Undo.
- Purchase review: “Nothing has been purchased yet.”
- Submitted: “Submitted on Solana. Shelf is checking the result.”
- Finalized: “Purchase finalized. The holding and record are now available.”

# 17. Interaction Philosophy

## Choosing a container

| Pattern | Use when | Shelf examples |
|---|---|---|
| Full page | The task benefits from URL, reload recovery, substantial reading, or irreversible/financial decisions | Entity detail, investment amount, order review/status, Portfolio, Activity, Account, Share builder |
| Modal dialog | A short blocking decision must be acknowledged without changing task context | Destructive account deletion confirmation; discard unsaved nonfinancial edits |
| Drawer | Contextual detail benefits from staying beside a desktop page | Sources, technical Instrument details, candidate replacement search |
| Bottom sheet | Mobile equivalent for short contextual selection | Scan method chooser, filters, add Company, sources |
| Popover | Small nonessential choice/help anchored to control | Sort menu, definition preview |
| Inline expansion | Detail is directly tied to current fact and does not need navigation | Risk explanation, mint/program, corporate-action detail |
| Tooltip | Brief term definition; never required information/action | “Minimum received,” “issuer mark” |
| Tabs/segmented control | Peer views under the same page responsibility | Saved Products/Companies; Discover entity types |

Do not use a modal merely to avoid a page. Sign-in may be presented as an intercepting route later, but `/sign-in` remains the canonical reloadable destination.

## Permanent URL state

Persist identity/detail pages, meaningful browse filters, Saved view, Activity filters, order/record IDs, and admin areas. Do not persist open tooltips, consent checkbox state, image data, raw questions/transcripts, recipient/amount, or transient success toasts.

## Actions and validation

- Destructive actions state the object and consequence; account deletion/share revocation require confirmation, Saved removal uses Undo.
- Optimistic updates are allowed for Save/unsave and benign ordering with rollback. Never optimistically update balances, holdings, order finality, eligibility, or revocation status without server confirmation.
- Unsaved form changes are preserved through recoverable errors. Leaving a financial form may discard a stale quote but not a submitted order.
- Disabled actions include an adjacent reason. Prefer validation text over unexplained disabled buttons.
- Validation occurs inline and again on the server; focus the first error and retain input.

## Async and transaction progress

- Scans/AI: cancellable progress; cancellation is best effort.
- Quotes: explicit request, visible expiry, no background auto-approval.
- Signing: one clear browser-wallet transition with cancellation.
- Submission: persistent order route, timeline, polling/backoff, reload recovery.
- Retries: reuse idempotency for the same HTTP operation; new financial attempt only after proven terminal state and fresh review.

# 18. Responsive Strategy

## Mobile (360–767)

- Bottom navigation: Discover, Scan, Saved, Portfolio; Account in header.
- Camera and search lead discovery; secondary methods in a sheet.
- Entity relationship paths stack vertically.
- Company page is narrative; exposure follows Company context.
- Financial actions use a safe-area sticky footer only on decision pages.
- Activity/holdings use compact rows; technical detail expands inline.
- Tables convert to priority rows/cards; exact values remain accessible/copyable.
- Charts are optional and can collapse to latest values plus accessible data summary.

## Tablet (768–1023)

- Header navigation may replace bottom nav when labels fit reliably; otherwise retain mobile shell.
- Two-column entity/product grids are acceptable.
- Company relationship and exposure may sit side-by-side only when both headings and warnings remain readable.
- Basket uses master list plus allocation summary where space permits.

## Laptop (1024–1439)

- Full header with persistent Scan button/search.
- Company uses a main research column and contained exposure sidebar that does not outrank identity/evidence.
- Portfolio uses summary plus position table/list; Activity is a table.
- Financial review uses a centered decision column with technical sidebar/disclosure.

## Large desktop (1440+)

- Constrain reading width; do not fill space with extra columns or larger hero type.
- Use side space for contextual navigation, source summary, or status—not advertisements/tickers.
- Admin may use a stable secondary sidebar and detailed work pane.

## Experience-specific adaptations

- Search suggestions become full-width mobile results, anchored desktop panel.
- Scanner preview uses available viewport height without placing capture beneath bottom nav.
- Comparisons on mobile become labeled sequential sections, not horizontally scrolling equivalence tables.
- Dense financial facts prioritize action, input/output, fee, minimum, expiry; technical identifiers move to disclosure.
- Charts always have text equivalents and never require hover.

# 19. Product State Matrix

| Experience | Loading | Empty | Error | Partial / stale | Success | Recovery |
|---|---|---|---|---|---|---|
| Discovery | Reserved result rows | Browse examples/categories | “Catalog unavailable”; keep Scan/Learn | Some entity types unavailable/labeled | Grouped verified results | Retry affected source, Search, Scan, or Learn without clearing context |
| Search | Inline result skeleton | Initial browse or no query | Retry without clearing query | Company market data missing; entity still shown | URL reflects query/filters | Clear one filter, correct query, Scan, or report missing item |
| Scanning | Method-specific progress | No capture yet | Permission/format/quota/provider-specific message | Some candidates unresolved/overflow | Correctable candidates ready | Grant permission, switch input, retake, Search, or retry only unresolved candidates |
| Product lookup | Identity skeleton | Not applicable; retired/unknown is 404 | Source/relation unavailable | Image missing, relation stale/ambiguous | Verified trail displayed | Retry evidence, Search, change region, or report; never guess Company |
| Company lookup | Identity/exposure skeletons separately | Discovery-only Company | Company or feed-specific error | Price/lifecycle/source partial/stale | Research plus truthful exposure state | Continue research/save; retry only affected feed; use Learn for unavailable exposure |
| Market data | Value placeholder with label | No supported Instrument | Source unavailable, never zero | Stale timestamp/unit unusable | Source/time/unit visible | Refresh; keep financial CTA blocked when required facts are unsafe |
| Saved | Header/list skeleton | True “No saved research” | Retry; retain local/server state | Products load but Company summaries unavailable | Saved/removed with undo | Retry sync, review version conflict, restore removal, Scan/Search |
| AI | Streaming indicator | Intro prompts | Privacy/quota/provider/validation-specific fallback | Uncertainty/missing sources labeled | Grounded answer/draft, sources shown | Retry with consent, shorten scope, or fall back to reviewed entity/article facts |
| Investment amount | Capability/balance loading | Not applicable | Policy/asset/amount-specific | Price context stale; Review blocked | Valid intent proceeds to review | Correct amount, finish access check, Deposit, or return to Company without losing safe draft |
| Quote/review | “Getting current terms” | No quote yet | No route, expired, changed, sponsor unavailable | Terms expiring; warning visible | Exact current terms ready | Refresh terms, edit amount, Deposit, or exit; never approve stale terms |
| Order status | Persisted operation skeleton | Not applicable | Proven failure with effect stated | Submitted/confirmed/unknown/partial | Finalized once, links available | Check status, review next leg, stop unsigned remainder, or retry only proven terminal failure |
| Portfolio | Summary/rows skeleton | No Shelf holdings | Private read error | Missing marks/partial total/reconciliation warning | Holdings with freshness | Refresh/reconcile, inspect unaffected Holdings, Discover from true empty state |
| Wallet | Balance/address skeleton | Zero confirmed cash/external assets | RPC/binding unavailable, never zero | Pending/stale/reconciliation required | Confirmed spendable values | Refresh, reauthenticate/rebind through approved flow, or contact support; block unsafe spend |
| Activity | Row skeleton | No activity or no filtered results | Read/export error | Pending/unknown/corrected records | Factual list/export | Clear filters, retry export, open persistent order/record, contact support with request ID |
| Authentication | Method-specific pending | Not applicable | Provider/challenge/binding-specific | One method unavailable | Safe return/onboarding | Retry chosen method, use allowed alternative, recover original issuer, or contact support |
| Sharing | Preview/link pending | No items to share | Clipboard/create/revoke error | Retired entity omitted and explained | Sanitized snapshot created/revoked | Reselect, copy manually, retry mutation, or return to unchanged Saved state |
| Admin | Section skeletons | No work items | Capability/job-specific, request ref | Some providers stale/unavailable | Action audited and reflected | Retry scoped read/job, pause affected capability, reconcile, or escalate with audit context |

No state uses only “Something went wrong” when the app knows the affected capability. Every private-state error includes a safe request reference where useful, never provider secrets.

# 20. Authentication Boundaries

## Guests can

- Understand Shelf, browse/search all approved public Products/Brands/Companies.
- Scan through all input types within guest/privacy/rate limits.
- Confirm/correct results and keep temporary normalized Saved items.
- Read learning content and shared snapshots.
- Use limited grounded AI only if the product intentionally supports a guest endpoint and privacy/quota policy; otherwise the UI must not promise it.
- View a truthful Portfolio explanation without balances.

## Authentication is required for

- Durable Saved sync/merge, Saved Company state, AI shelf summary/organization.
- Creating/revoking share links.
- Account, wallet, funding, eligibility records.
- Allocation drafts using private Saved context.
- Orders, Portfolio/Holdings, Activity/Records/exports.
- Owner administration.

## Fresh authorization is required for

Transfers, sensitive exports, logout-all, account deletion, and admin mutations, plus any additional action required by the authoritative security contract.

## When sign-in appears

Let the user experience discovery value first. Trigger sign-in when they choose persistence/share/private context or initiate a protected financial step. Saving as a guest should succeed temporarily before suggesting sign-in. “Review investment” can trigger sign-in, then return to amount—not approval.

## Protected routes

Protected: `/saved/share`, `/onboarding*`, `/account*`, `/invest/*`, `/orders/*`, private `/portfolio*`, and `/admin*`. `/saved` has deliberate guest/member variants. `/assistant` has a capability-aware guest/member variant. Public entity/learning/share pages stay public.

## Post-auth behavior

Preserve a validated same-origin return path plus allowed query. Complete required onboarding once. Offer explicit guest merge. Reevaluate invite/eligibility/capability server-side. Do not auto-create orders, fetch/sign a stale quote, or discard guest items on failed auth.

# 21. Refactor Decision Matrix

| Existing Feature/Page | Decision | Destination | Reason |
|---|---|---|---|
| Discover/home | KEEP + REDESIGN | Home | Strong promise; reduce competing content. |
| Explore/search | REFACTOR | Discover | Unified entity search and browse. |
| Seven discovery inputs | KEEP + REFACTOR | Scan | Preserve capability, prioritize by intent. |
| Separate Screenshot tab | MERGE | Upload with Screenshot use case | Same capture mechanism; less chooser noise. |
| Scan results | KEEP + REDESIGN | Scan Results | Preserve correction context. |
| Product detail | KEEP + REDESIGN | Product | Strengthen trail/evidence. |
| Brand as text only | REPLACE | Brand detail/entity model | Prevent Product/Brand/Company conflation. |
| Company detail | KEEP + REDESIGN | Company | Central research page. |
| Markets top-level/pages | MERGE | Discover Company filters + exposure patterns | Market is classification/context, not primary intent. |
| Product Shelf | RENAME | Saved Products | Clear research state. |
| Watchlist | MERGE + RENAME | Saved Companies | Remove duplicate saved concepts. |
| Seeded guest Shelf examples | REMOVE | True empty Saved; examples stay on Home | Fabricated personal state is misleading. |
| AI shelf summary/sort | KEEP + REFACTOR | Saved tool | Explicit preview/apply/undo. |
| Sharing | KEEP + REDESIGN | Saved Share / Shared Snapshot | Strong privacy-safe capability. |
| Learning | KEEP + REDESIGN | Learn/contextual links | Useful without funding. |
| Standalone AI assistant | KEEP + REFACTOR | Ask Shelf utility/contextual entry | AI supports journeys rather than leading product IA. |
| Standalone AI allocation page | MERGE | Basket Builder | Draft is an optional input, not a separate authority. |
| Sign-in/callback | KEEP + REDESIGN | Same routes | Stable provider integration. |
| Welcome | RENAME + REFACTOR | Onboarding | Clarify status/merge/consent. |
| Eligibility | MOVE + RENAME | Financial Availability | Capability gate. |
| Wallet | MOVE + REDESIGN | Account / Wallet | Distinct from ownership portfolio. |
| Deposit | MOVE + REDESIGN | Account / Wallet / Deposit | Preserve gated funding. |
| Transfer | MOVE + REDESIGN | Account / Wallet / Send | Preserve tracked/external scope and review. |
| Single buy | RENAME + REFACTOR | `/invest/[companySlug]` | Canonical Company context. |
| Basket | KEEP + REDESIGN | Basket Builder | Preserve multi-company budget and partial outcomes. |
| Order review/status | KEEP + REDESIGN | Same stable routes | Reload-safe financial contract. |
| Portfolio | KEEP + REDESIGN | Portfolio | Ownership home. |
| Holding | KEEP + REDESIGN | Holding | Progressive precision and events. |
| Sell | MOVE + REDESIGN | Nested under Holding | Ownership-origin action. |
| History | MOVE + RENAME | Portfolio Activity | Factual ownership history belongs with Portfolio. |
| Settings | RENAME + REFACTOR | Account & Privacy | Broader and safer hierarchy. |
| Admin single page | SPLIT | Five admin routes | Risk/frequency-specific work areas and real deep links. |

## New Additions

| Addition | Why / problem solved | Location | Timing |
|---|---|---|---|
| Brand entity/detail | Makes Product → Brand → Company explicit; handles licensing/region ambiguity | `/brands/[slug]` | Required for MVP refactor |
| Unified Saved model | Eliminates Shelf/watchlist overlap and saved/owned confusion | `/saved` | Required |
| Discover entity grouping | Prevents Product/Brand/Company conflation | `/discover` | Required |
| Company market filters | Retains Markets capability without finance-first nav | `/discover?entity=company&market=` | Required |
| Route-aware mobile Scan action | Restores core product emphasis and orientation | Global shell | Required |
| True personal empty states | Removes fabricated user state | Saved/Portfolio/Activity | Required |
| Public/private exposure pattern | Enforces materially different rights/pricing hierarchy | Company, Discover, Basket, Portfolio | Required |
| Portfolio Activity subarea | Unifies ownership and records | `/portfolio/activity` | Required |
| Admin subnavigation/routes | Makes operations usable/auditable | `/admin/*` | Required for owner refactor |
| Recently viewed | Helpful return context without saving | Discover, local/private | Later improvement after privacy review |
| Side-by-side saved Company comparison | Could aid research, but requires careful non-ranking model | Saved | Later; not required |

# 22. Shared Experience Patterns

## Entity Preview

Appears in Discover, Saved, shared snapshots, related-entity sections. It leads with entity type, name, one relationship/context line, verification/availability status, and one navigation action. It never uses the same card for Product and Instrument without explicit labels.

## Company Identity Header

Appears on Company, Holding, Invest, records. It communicates Company name, public/private status, ticker/exchange where applicable, and a concise description. Instrument symbol never replaces Company identity.

## Product → Company Relationship

Appears on Product, Brand, Scan results, Company. It is a visible trail with relationship type, region, source, and review date. It behaves as linked steps; ambiguous links are labeled and block investment.

## Exposure Summary

Appears on Company, Invest, Saved Company, Portfolio. It separates Company from Instrument and shows issuer, classification, rights limitations, availability, pricing meaning, and risk. It expands to technical mint/program detail.

## Market Classification

Appears anywhere an Instrument appears. “Public equity tracker” and “Pre-IPO exposure token” use persistent text, different information order, and non-color cues.

## Save Action

Appears on Product/Company previews/details. It always names the entity in feedback, is reversible, and never resembles a purchase. Guest save explains temporary lifetime after success.

## Investment CTA

Appears only after exposure context on Company/Saved Company/Holding. Label is “Review investment,” “Review sale,” or “Review transfer,” not generic “Invest” when the next step is an amount form.

## Risk/Context Disclosure

Appears adjacent to the relevant exposure/transaction. It leads with the most material difference, supports expansion, and cannot be hidden behind a tooltip.

## Search Result

Shows entity type, match text, relationship context, and availability without a direct buy action. Results are keyboard navigable and grouped.

## Scanner Result

Shows transient candidate identity, confidence band/reason, selection state, correction, and verified relationship only when resolved. No mint comes from AI.

## Empty State

Names why the area is empty, preserves trust, and offers one relevant start action plus at most one alternative. It never populates personal examples.

## Transaction Progress

Uses persistent timeline/state text derived from backend state, states what moved, and offers only safe actions. It survives reload and never treats timeout as failure.

## Portfolio Position

Shows Company + Instrument, tracked quantity, value/freshness, cost, pending state, and link to detail. External assets use a different Wallet pattern.

## Educational Callout

Appears where a term first affects a decision. It is short, linked to a reviewed article/source, dismissible only when nonessential, and never doubles as a promotion.

# 23. Concept Integration Protocol

When a new screenshot, reference, concept, moodboard, site, or UI direction is supplied:

1. Identify the valuable qualities: hierarchy, tone, density, navigation, interaction, imagery, motion, or data treatment.
2. Extract principles rather than copying layout, branding, or proprietary expression literally.
3. Map each principle to specific Shelf areas and screen states.
4. Test it against Shelf's entity hierarchy, journeys, auth boundaries, financial safety, accessibility, privacy, and mobile strategy.
5. Update only the relevant sections of this guide.
6. Do not overwrite unrelated decisions or silently revive removed concepts.
7. Add or amend an entry in the Design Decision Log with reason and affected areas.
8. Keep Information Architecture, Routing Architecture, Migration Map, Navigation, Page Specifications, and Target Product Map synchronized.
9. Flag contradictions with the approved product pack or live capability contract before adoption.
10. Prefer Shelf usability, trust, and truthful financial meaning over visual similarity.

Change procedure:

- Mark the concept as **proposed**, **accepted**, **superseded**, or **rejected**.
- Record assumptions and which screen/state was evaluated.
- If a concept changes a route or page responsibility, update sections 5–10 and 26 in the same change.
- If it changes public/private, Saved/Owned, or entity semantics, update sections 11, 13, 14, 16, and 22 together.
- If visual only, do not invent a product capability to justify it.

# 24. Design Decision Log

| ID | Decision | Reason | Areas Affected | Status |
|---|---|---|---|---|
| DD-001 | Shelf is recognition-first, not markets-first. | This is the distinctive validated product thesis. | Home, navigation, Discover, Markets | Accepted |
| DD-002 | Primary navigation is Discover, Saved, Portfolio; Scan is the promoted global action. | Keeps top level small and aligns intent with product value. | Desktop/mobile shell | Accepted |
| DD-003 | Remove Markets as a top-level destination. | Public/private are Company/Instrument context and browse filters. | IA, routes, redirects | Accepted |
| DD-004 | Rename consumer “Shelf” and watchlist concepts to unified Saved research. | Prevents save/own confusion and duplicate concepts. | Saved, Company, sharing | Accepted |
| DD-005 | Portfolio contains only Shelf-origin Holdings; Wallet contains cash and supported external assets. | Preserves provenance/accounting truth. | Portfolio, Wallet, transfers | Accepted |
| DD-006 | Add Brand as a first-class UI entity. | Makes the central relationship chain accurate and handles licensing/region nuance. | Data/read model, Discover, entity pages | Accepted |
| DD-007 | Keep all seven discovery capabilities but do not give them equal prominence. | Reduces scanner choice overload without removing scope. | Scan | Accepted |
| DD-008 | Screenshot is a distinct supported input handled through the Upload choice. | Same user action/mechanism; fewer top-level controls. | Scan, analytics copy | Accepted |
| DD-009 | Company is the central research page; Instrument is a visibly separate section/entity. | Prevents company/token conflation. | Company, Invest, Portfolio | Accepted |
| DD-010 | AI allocation is merged into Basket as an optional editable draft. | AI assists; it does not own a transaction journey. | Assistant, Basket, redirects | Accepted |
| DD-011 | Activity moves under Portfolio. | Records explain ownership and transactions, not generic settings. | Routes/navigation | Accepted |
| DD-012 | Account owns Wallet; Portfolio remains ownership-focused. | External assets and wallet infrastructure are broader than Shelf holdings. | Account, Wallet, Portfolio | Accepted |
| DD-013 | Public and private exposure share a structural pattern but not identical hierarchy/copy. | Their rights, prices, liquidity, and lifecycle materially differ. | Discover, Company, financial screens | Accepted |
| DD-014 | Public entity URLs use slugs; private operations use opaque IDs. | Readability for public research and privacy/stability for private resources. | Routing/migration | Accepted |
| DD-015 | No fabricated personal state, popularity, price, liquidity, or performance. | Trust is foundational for finance/privacy. | Empty states, Saved, Portfolio | Accepted |
| DD-016 | Admin is split into five real routes. | Different risk/frequency areas need distinct responsibility and deep links. | Admin IA/routes | Accepted |
| DD-017 | Explicit AI processing consent remains required even where deployment/source differ. | Product privacy contract is authoritative. | Scan, Assistant | Accepted |
| DD-018 | Scan Results is the only intentionally session-bound page; durable entities, financial operations, and records remain deep-linkable. | Recognition evidence is temporary and privacy-sensitive; financial recovery cannot be. | Scan, routing, state | Accepted |
| DD-019 | Auth preserves safe intent but never returns directly into automatic approval/signing. | Convenience cannot bypass current terms or explicit authorization. | Auth, onboarding, investment | Accepted |
| DD-020 | Each rendered state exposes at most one primary action, even when the page's action changes by capability or transaction state. | Prevents research, recovery, and money actions from competing. | All page specs and states | Accepted |

# 25. Recommended Refactor Sequence

## Phase 0 — Reconcile and freeze contracts

**Scope:** compare deployed/local scanner consent and any other drift; inventory canonical routes, auth rules, entity IDs/slugs, state copy.
**Dependencies:** none.
**Pages/routes:** all current routes; no visual rewrite.
**Must continue working:** public discovery, auth redirects, private authorization, provider gates, all C01–C109 behaviors.
**Safe migration:** documentation/tests first. Add route/redirect and entity-read-model tests before moving UI.

## Phase 1 — Entity and route foundation

**Scope:** add public Brand read model/route, canonical slugs, explicit route registry, redirects, per-route access/metadata/error strategy.
**Dependencies:** Phase 0.
**Pages/routes:** Product, Brand, Company, legacy ID redirects, auth return paths.
**Must continue working:** old bookmarks, share links, server-side authorization, no fallback to wrong entity.
**Safe migration:** ship canonical pages behind redirects one entity type at a time.

## Phase 2 — Application shell and navigation

**Scope:** Discover/Saved/Portfolio shell, route-aware Scan action, account access, mobile safe areas, removal of Markets nav.
**Dependencies:** canonical route registry.
**Pages/routes:** global shell, `/markets*` redirects, guest Portfolio explanation.
**Must continue working:** sign-in visibility, environment labeling in non-production contexts, protected routes.
**Safe migration:** shell can ship before individual page redesigns if legacy routes map correctly.

## Phase 3 — Discovery and entity experience

**Scope:** focused Home, unified Discover, prioritized Scan, in-flow correction, Product/Brand/Company hierarchy, contextual Learn/Ask.
**Dependencies:** entity read models and shell.
**Pages/routes:** `/`, `/discover`, `/scan*`, `/products/*`, `/brands/*`, `/companies/*`, `/learn*`, `/assistant`.
**Must continue working:** seven inputs, five categories, multi-product correction, privacy consent, verified mappings, no retained images.
**Safe migration:** Home/Discover first; Scan flow next; entity pages after shared entity patterns exist.

## Phase 4 — Saved research and sharing

**Scope:** merge product Shelf/watchlist into Saved views, remove seeded personal state, migrate share builder to actual saved items, preserve guest merge.
**Dependencies:** entity patterns and routes.
**Pages/routes:** `/saved`, `/saved/share`, `/share/[token]`, legacy `/shelf*`.
**Must continue working:** temporary guest state, idempotent member merge, sanitized snapshots, expiry/revoke, no holding effects.
**Safe migration:** server may retain separate tables initially; unify the UI/read model first, then storage only if beneficial.

## Phase 5 — Auth, onboarding, account, and wallet

**Scope:** contextual sign-in, reliable return state, onboarding/status/merge, availability route, Account hierarchy, Wallet/external inventory.
**Dependencies:** new shell and Saved model.
**Pages/routes:** `/sign-in`, `/auth/callback`, `/onboarding*`, `/account*`.
**Must continue working:** Magic issuer/wallet binding, session security, fresh auth, funding gates, wallet independence and privacy controls.
**Safe migration:** rename routes with temporary redirects; do not alter provider/security contracts as a visual refactor.

## Phase 6 — Investment planning and review

**Scope:** canonical Company investment route, Basket add/remove/arithmetic, AI draft integration, public/private warnings, exact review hierarchy.
**Dependencies:** Company, Saved, auth/access, Wallet.
**Pages/routes:** `/invest/[slug]`, `/invest/basket`, `/orders/[id]/review`.
**Must continue working:** exact integers, limits, explicit approval, quote expiry/change, sponsor/eligibility gates, sequential basket semantics.
**Safe migration:** amount and basket forms can migrate while keeping existing order APIs; review UI only after state mapping is complete.

## Phase 7 — Order status, Portfolio, exits, and records

**Scope:** exact transaction-state language, Portfolio valuation completeness, Holding detail, nested Sell, Send scope, Activity/Record move.
**Dependencies:** review/state pattern and Wallet.
**Pages/routes:** `/orders/*`, `/portfolio*`, `/account/wallet/send`, legacy `/history*` and `/invest/sell`.
**Must continue working:** restart-safe reconciliation, no optimistic holdings, tracked/external distinction, FIFO/raw units, corporate-action explanations, exact exports.
**Safe migration:** Activity redirects first; Portfolio/Holding; Sell/Send; order-state polish last with full state fixtures.

## Phase 8 — Owner administration

**Scope:** split Admin into Overview, Catalog, Access, Operations, Audit with shared safe patterns.
**Dependencies:** route foundation and shared state/error patterns.
**Pages/routes:** `/admin*`.
**Must continue working:** owner-only 404, fresh auth/reason/audit, no arbitrary signing/fact editing, partial-outage operation.
**Safe migration:** retain current API; move one work area per route and redirect known legacy paths.

## Phase 9 — Responsive, accessibility, content, and whole-product verification

**Scope:** device-specific composition, keyboard/screen reader/zoom, state matrix, UX writing consistency, redirect/orphan/loop audit, visual regression.
**Dependencies:** all page migrations.
**Pages/routes:** entire product.
**Must continue working:** product requirements, security/privacy, live-money gates, no mocked financial success.
**Safe migration:** continuous checks should run earlier; this phase is the final integration pass, not the first accessibility review.

# 26. Target Product Map

## Navigation map

```text
Desktop: Shelf | Discover | Saved | Portfolio | [Scan a product] | Search | Account
Mobile:  Discover | Scan | Saved | Portfolio          Account in header

Context:
Discover → Product → Brand → Company → Exposure
Saved → Products / Companies → Share or Basket
Portfolio → Holding / Activity → Sell, Send, Record
Account → Wallet / Privacy / Sessions / Support
```

## Route map

```text
Public
  /
  /discover
  /scan
  /scan/results                  (ephemeral session)
  /products/[slug]
  /brands/[slug]
  /companies/[slug]
  /learn
  /learn/[slug]
  /assistant
  /saved                         (guest variant)
  /share/[token]
  /sign-in
  /auth/callback

Member
  /saved                         (durable variant)
  /saved/share
  /onboarding
  /onboarding/availability
  /account
  /account/wallet
  /account/wallet/deposit
  /account/wallet/send
  /invest/[companySlug]
  /invest/basket
  /orders/[id]/review
  /orders/[id]
  /portfolio
  /portfolio/[instrumentId]
  /portfolio/[instrumentId]/sell
  /portfolio/activity
  /portfolio/activity/[recordId]

Owner
  /admin
  /admin/catalog
  /admin/access
  /admin/operations
  /admin/audit
```

## Primary user journey

```text
See or search for a familiar Product
  → verify Product → Brand → Company
  → understand the Company
  → see whether a distinct public/private Instrument exists
  → Save for research OR review an investment amount
  → approve exact current terms
  → track persistent transaction status
  → view finalized Holding and Activity record
```

## Page inventory

Home; Discover; Scan; Scan Results; Product; Brand; Company; Learning Library; Learning Article; Ask Shelf; Saved Research; Share Builder; Shared Snapshot; Sign In; OAuth Callback; Onboarding; Financial Availability; Account & Privacy; Wallet; Deposit USDC; Send Asset; Investment Amount; Basket Builder; Order Review; Order Status; Portfolio; Holding Detail; Sell Amount; Activity; Activity Record; Admin Overview; Admin Catalog; Admin Access; Admin Operations; Admin Audit.

## Major removed concepts

- Markets as top-level navigation and standalone product silo.
- Watchlist as separate consumer language/state.
- “My shelf” as the primary saved-area name.
- Seven equal scan-method tabs.
- Separate Screenshot chooser item.
- Standalone AI allocation page.
- Fabricated seeded content inside personal Saved state.
- Catch-all admin URLs that all render one screen.

## Major merged concepts

- Product Shelf + Company watchlist → Saved Research with Products/Companies views.
- Markets public/private lanes → Discover Company filters + distinct exposure summaries.
- AI allocation suggestions → Basket Builder optional draft.
- History → Portfolio Activity.
- Settings + privacy/session/recovery → Account & Privacy.

## Major new concepts

- Brand as a first-class entity.
- Scan as the promoted global action rather than a navigation silo.
- Company as the central research-to-exposure bridge.
- Explicit Company versus Instrument layer.
- Route-aware public slugs and private opaque IDs.
- Truthful valuation completeness/freshness states.
- Dedicated admin work areas.

## Final consistency check

- Every IA page has a proposed route and page specification.
- Every current user-facing route appears in the migration map.
- Every global navigation item points to a valid route.
- All seven discovery inputs, five categories, correction, public/private exposure, Product saving, Company saving (the current watchlist capability), sharing, AI education/summary/allocation, authentication, eligibility, wallet/deposit, buys/baskets/sells/transfers, orders, Portfolio, history/exports, privacy, and owner operations are retained or deliberately relocated.
- Journeys use the proposed routes and auth boundaries.
- Saved and Portfolio are structurally and verbally distinct.
- Product, Brand, Company, Instrument, Saved item, and Holding are never interchangeable.
- Legacy redirects have a single canonical destination and no documented loops.
- Scan Results is the only intentionally ephemeral non-deep-linkable experience; all financial status/records remain reloadable.
- The refactor sequence follows dependencies and does not require a simultaneous rewrite.

# 27. Open Questions & Assumptions

These do not block the target architecture. They are implementation gates or validation questions and must not be presented as current product facts.

## Confirmed constraints carried forward

- The approved catalog and evidence graph—not model output—controls Product/Brand/Company identity and tradability.
- Real-money behavior stays disabled until the applicable G01–G07 gates pass and activation is authorized; this guide does not change that authority.
- Portfolio contains only Shelf-origin finalized acquisitions. Supported externally received assets remain in Wallet.
- Product images/receipts are temporary, AI disclosure/consent is explicit, provider routing is privacy-controlled, and no user signing key is server-custodied.

## Assumptions to validate during implementation discovery

- **A-01 — Brand read model:** the existing data is sufficient to project a stable, region-aware Brand detail surface, even if Brand requires a new canonical read model and slug index. If not, ship the relationship trail first but do not collapse Brand into Company.
- **A-02 — One active v1 instrument per Company:** the current v1 contract is treated as zero-or-one active Instrument for a Company. The route and page model must tolerate multiple historical/retired Instruments without presenting them as alternatives to buy.
- **A-03 — Guest Saved lifetime:** temporary Saved research remains browser/session scoped until authenticated merge. Exact retention duration and cross-device expectations require product copy and test fixtures before implementation.
- **A-04 — Portfolio guest variant:** `/portfolio` may render a public explanation shell while private data remains server-protected. If routing/security constraints require a sign-in redirect instead, navigation copy must still explain ownership before auth.
- **A-05 — Slug migration:** public slugs are unique, reviewed aliases with ID-to-slug resolution. Opaque IDs remain canonical for private resources and authorization.

## Open questions requiring an explicit implementation decision

1. **Guest AI policy:** will `/assistant` provide a deliberately limited guest endpoint, or require sign-in before the first request? The page must not promise one while the API enforces the other.
2. **Scanner source reconciliation:** which deployed consent behavior is canonical, and what uncommitted/deployment delta produced the difference from local `ScanScreen`? Resolve before refactoring Scan.
3. **Legacy redirect lifetime:** after the minimum release window, what usage threshold and product communication are required before removing ID and old-route redirects?
4. **Brand relationship edge cases:** which licensing, regional ownership, joint-venture, and historical relationships require distinct user copy beyond parent/subsidiary?
5. **Recently viewed:** should Shelf add local/private recently viewed history after privacy review, or omit it entirely? It is explicitly later scope and not needed for the refactor baseline.

# 28. Product Design Architect Quality Gate

Quality gate run: 2026-09-22, after the repository, approved specifications, live public application, and this complete guide were audited. Result: **PASS for frontend architecture; implementation remains intentionally not started.**

## A. Product comprehension — pass

- The 10-second proposition, primary Scan/Search decision, and recognition → research → optional investment loop are explicit.
- Discovering, Saved research, financial action, and owned Holdings have separate language, routes, and states.

## B. Entity clarity — pass

- Product, Brand, Company, Instrument, Saved item, Wallet asset, and Holding have one meaning and a canonical surface or explicit embedded role.
- Public and private exposure use different fact hierarchies; Company is never presented as the Instrument.

## C. Navigation — pass

- Top level is limited to Discover, Saved, Portfolio, and promoted Scan; Account is a utility destination.
- Markets, AI allocation, Wallet, Activity, and admin work areas are placed contextually rather than duplicated globally.
- Mobile deliberately promotes Scan and retains labeled access to the three recurring destinations.

## D. Routes and redirects — pass

- Every target page has a canonical route; Scan Results is the only deliberate session-bound exception.
- Every current user-facing route is accounted for in the migration map, including known admin aliases and unknown catch-all handling.
- Redirect state preservation, validated auth return, one-way canonicalization, 404 behavior, and deep-link survival are defined.

## E. Page responsibility — pass

- All 35 target pages have purpose, intent, entry points, one primary action per rendered state, hierarchy, data, interactions, related pages, mobile behavior, state/recovery, and exclusions.
- Page hubs and state machines may change their primary action by state, but never render competing primary CTAs.

## F. Journeys — pass

- Core journeys define entry/intent, flow, first decision, required context where relevant, exit/recovery, completion, and back behavior.
- Auth interruption, partial basket completion, unknown transaction state, stale data, no match, and privacy/provider failure retain context and a safe next action.

## G. Financial and trust surfaces — pass

- Company/Instrument identity, issuer, rights, restrictions, pricing meaning, exact terms, quote expiry, fees, signature, processing, finality, and recovery are progressively disclosed.
- No route or copy assumes a guarantee, treats unknown as zero, fabricates user state, or labels mocked/gated execution as live.

## H. Responsive behavior — pass

- Mobile has task-specific composition, safe-area/sticky-action rules, sequential alternatives to dense comparisons, and persistent Scan/Search recovery.
- Tables, charts, hover, camera, filters, long identifiers, and transaction review each have an intentional mobile/accessible behavior.

## I. Guide integrity — pass after correction

- Current facts, inferences, assumptions, and recommendations are labeled.
- Product model, IA, route map, redirect map, navigation, 35 page specs, journeys, state matrix, decision log, and refactor sequence use the same canonical terminology.
- Corrections made during this gate: added the explicit Product Model; added current access/dependency evidence; documented redirect state preservation; added decision/completion/back contracts; added recovery to the state matrix; resolved multi-primary-action ambiguity; separated assumptions/open questions; and synchronized section references after restructuring.

Any future architecture change must rerun sections A–I and update every affected route, journey, page specification, decision, and migration phase in the same patch.
