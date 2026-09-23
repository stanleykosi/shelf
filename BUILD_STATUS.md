# Shelf build status

Updated: 2026-09-23

## U28 issuer-provided logos — production

The current xStocks asset response includes a `logo` URL and the PreStocks feed includes an
`image` URL. Their adapters now expose optional `logoUrl` fields only after checking HTTPS,
the provider-owned image host and its expected PNG path. PreStocks `www` URLs are normalized to
its canonical host. Missing, malformed or failed images fall back to company initials. Direct
issuer results, AI-matched product results, scan matches and issuer detail pages show the same
source logo; no logo is treated as ownership evidence or kept in Shelf's catalog.

Read-only provider checks found publicly fetchable DISx and OPENAI logos. Both passed through
the local Next.js image optimizer as HTTP 200 PNGs; an unexpected query URL returned HTTP 400.
Desktop/mobile screenshots showed the logo in the search card. The xStocks and PreStocks
exact-asset API responses carried the validated URLs. ESLint, strict TypeScript, all 99 unit
tests in 15 files and the final Next.js 16.3.5 production build passed. The final local
`live-discovery.spec.ts` browser run passed all eight desktop/mobile checks. An earlier combined
22-case run passed 16 checks, skipped five project-specific checks and exposed one older
Discover test that depended on an unmocked live feed; its focused desktop/mobile rerun passed
after the test received deterministic reviewed-issuer data. `git diff --check` passed. No
trading or paid AI call was made for this image work.

Vercel deployment `dpl_An5eDmgNq4RhTEiTgaZnsiNSCvcx` is Ready on
`https://shelf-one-phi.vercel.app`. Production `/readyz` still reports PostgreSQL, Magic,
OpenRouter, Jupiter and Helius with trade execution disabled. Exact xStocks DISx and PreStocks
OPENAI asset APIs returned their validated `logoUrl` values. Both production optimized image
requests returned HTTP 200 PNGs, and a real production Chromium search for Disney and OpenAI
loaded each matching logo at a nonzero natural width. This release was deployed directly from
the local working tree and still needs a remote Git push to survive future Git deployments.

## U27 unified live and reviewed Discover — production

Home and Discover now use one company-or-product search. The server checks current xStocks and
PreStocks issuer listings first. A direct company or symbol result needs no AI request. When
neither feed matches, the same query can continue through OpenRouter after the user explicitly
opts in; the suggested owner is joined to current issuer listings before an asset link appears.
Unknown owners, unsupported assets, stale feeds and unavailable feeds have distinct states.
The old `/discover?source=issuer` bookmark redirects into this unified search.

PR #3's reviewed product and brand examples remain in Home and Discover. Their company/product
paths now check current issuer data. A reviewed instrument receives a direct asset link only
when its provider, symbol and mint still match the feed; otherwise it stays a research example.
Product pages and the reviewed company table show that status without using the static catalog
as the live asset source. Brand and company URLs open the unified search. Scan results also link
there. Real trading and deposits remain disabled.

`npm run check` passed on the final implementation: ESLint, strict TypeScript, 99 Vitest tests
in 15 files and the Next.js 16.3.5 production build. `git diff --check` passed. Local Chromium
checks against the built app and an isolated migrated PostgreSQL 16 database passed: six route
and shelf checks plus 21 Home/Discover/scan/identity checks on desktop and mobile (five
suite-specific skips). An earlier route run used the stale local database password and got
HTTP 500; the same exact route suite passed against the isolated database. Issuer and AI browser
responses were intercepted. Read-only local API checks found Disney → DISx and put Spiderman at
the AI-consent step without calling OpenRouter.

Vercel deployment `dpl_3EpyWSpTFzb2C4JdRi952JqTCFq8` was Ready on
`https://shelf-one-phi.vercel.app` at the U27 release and is superseded by U28.
Production `/readyz` reported Magic, OpenRouter, Jupiter,
Helius and PostgreSQL with trade execution disabled. A production feed query returned The Walt
Disney / DISx with the expected mint and no unavailable or stale feed. A Spiderman query without
consent returned `consent_required`, with no paid AI call. Production reviewed-link data mapped
PepsiCo to PEPx and OpenAI to the PreStocks OPENAI token with no feed warnings. All eight
desktop/mobile production Chromium discovery checks passed with issuer and AI responses
intercepted. One previously authorized, consented production OpenRouter query for synthetic
“Spiderman” returned “Spider-Man” with owner “The Walt Disney Company”; Shelf joined it to the
current xStocks DISx mint `Xsg93jDV656ULQ5u9yT2x5DS9b4xGD8aDCtfESSW6Bb`, with no feed
warnings. That call used AI only and made no trade. This release was originally deployed
directly from the local working tree; its U27 commit is now on `origin/main`.

## PR #3 and earlier local discovery integration — historical

PR #3 introduced the research-led Home and Discover screens. The five reviewed product
categories and canonical product/shelf journeys were restored there. At that release, the live
issuer directory and consent-based product-owner search from U25/U26 were separate at
`/discover?source=issuer`. U27 above supersedes that route and search behavior. Real trading and
deposits remained disabled.
The catalog filter URL uses Next.js-supported native history updates, and navigation out of
Discover cancels pending filter updates so result links cannot be reversed by a delayed update.
`npm run check` passed: ESLint, strict TypeScript, 98 Vitest tests in 15 files, and the
Next.js 16.3.5 production build. All four local Playwright suites passed against that build
and an isolated migrated PostgreSQL 16 database: 27 desktop/mobile checks passed and five
project-specific checks were intentionally skipped. AI and issuer responses were intercepted
where those browser tests required them. `git diff --check` passed. The verified commits were
pushed non-force to `origin/main` on top of PR #3. No real-money operation, paid AI request,
manual deployment, or production activation was performed; any automatic deployment from the
push still needs separate confirmation.

## Review follow-up — category and product shelf restoration

The reviewed five-category product collections are accessible through Discover. Canonical
product pages again save reviewed product IDs to a guest session or member shelf, while current
issuer searches remain separate from reviewed relationships. Legacy product IDs redirect to their
canonical product pages, and legacy company IDs redirect through the canonical company URL before
the instrument destination. Brand URLs continue to open live product search. Route and journey
browser contracts now cover category browsing, guest/member product saves and the brand redirect.
`npm run check` passed: ESLint, strict TypeScript, 98 Vitest tests in 15 files and the
Next.js 16.3.5 production build. The focused local browser run passed live discovery and
identity journeys on desktop and mobile (12 checks). The route suite passed all six checks on
desktop and mobile against that build with a disposable PostgreSQL 16 database, including the
category, guest-save, member-save and exact redirect contracts. The first route-suite run used
an invalid local database password and returned HTTP 500 for `/account`; connecting the
disposable migrated database resolved that setup failure. Browser API responses for issuer,
AI and member shelf writes were intercepted where the test required them. No live-money action,
paid AI request or external deployment was part of this review fix. The local implementation
still needs a separately authorized deployment before production reflects these changes.

## U26 AI ownership to live issuer asset — deployed

Discover now keeps a failed direct-search query when a user chooses consent-based product
search. AI ownership and both live issuer feeds are fetched concurrently, and the response
includes the matching issuer asset, symbol and mint without a second user action. Exact
normalized company names take priority; a unique issuer name ending in the AI's shorter
company name may also match. Ambiguous or unrelated names remain unlisted and receive no
asset or purchase link. A product with an identified owner but no matching issuer asset now
shows a distinct no-available-asset message. This fixes `Disney` joining the observed
`The Walt Disney` xStocks listing (`DISx`, Solana mint
`Xsg93jDV656ULQ5u9yT2x5DS9b4xGD8aDCtfESSW6Bb`) while preserving the different AI
owner and issuer names in the UI. A read-only production issuer search confirmed the listing.

`npm run check` passed: lint, strict TypeScript, 98 Vitest tests across 15 files and the
Next.js 16.3.5 production build. The eight Discover Chromium checks passed on desktop and
mobile against the local server with intercepted AI/feed responses. The first cold run had
one asset-page navigation timeout during initial Next.js compilation; the same case passed
on rerun after compilation. No paid AI request, funding, trade or onchain write was made.
Vercel deployment `dpl_8SFbMLfeoZ4UaaskdgKtXWTdt4Np` is Ready and owns the production
alias. Production `/readyz` reports PostgreSQL, Magic, OpenRouter, Jupiter and Helius with
trade execution disabled. The product-search page returned HTTP 200; read-only issuer search
returned The Walt Disney / DISx with the expected mint and no unavailable or stale feed.
The linked `/assets/xstocks/DISx` page returned HTTP 200.
The consent-based Spiderman → Disney → DISx and unsupported-owner states passed on the
production desktop and mobile browser with AI/issuer responses intercepted. No paid
production AI call was made in this milestone. A real AI response can still vary in its
ownership suggestion, which the UI labels as unverified; the deterministic issuer join
only links a sufficiently specific, unambiguous current listing.

## U25 live-only Discover flow — deployed

Discover now has two explicit paths. Company search reads the current xStocks and PreStocks
issuer feeds without an AI request; product search requires OpenRouter consent, asks for the
current controlling parent, and joins that answer to both live issuer feeds. Results show the AI
owner separately from the matched issuer name, source, symbol and mint, with a direct link to
the exact issuer asset page. Missing, stale and unavailable feed states remain distinct, and
an unconfirmed AI suggestion has no issuer asset or purchase link.

The home and Discover pages no longer show saved product examples or category filters. Historical
product, brand and company detail URLs redirect to consent-based product search, direct live
company search, or an issuer asset. Previously saved user product rows remain readable only on
that user's shelf and invite a fresh lookup; they no longer assert a presaved ownership path.
The unused static allocation screen was removed; editable basket allocation remains.

The OpenRouter ownership prompt now uses a system instruction, asks for a single current
controlling parent, rejects investor/partner/subsidiary shortcuts and token-driven guesses,
and explicitly abstains on uncertainty. The server keeps the AI owner and issuer name
separate. npm run check passed: ESLint, strict TypeScript, 98 tests in 15 files, and the
Next.js 16.3.5 production build. Eight desktop/mobile Chromium checks passed using intercepted
AI and issuer responses; no paid AI call, live trade, funding or onchain write was made.
The xStocks full feed now fetches pages in small ordered batches, retries transient page failures,
and fails closed on a missing required page. A read-only local run returned 1,124 Solana listings
and the expected AAPLx mint in about 20 seconds. The issuer documents a 100-asset maximum page
size at https://docs.xstocks.fi/apis/openapi/assets/list_public_assets.

Production deployment dpl_B7TmAdtULiRCLLjY3hMVMwFn3Ee1 is Ready on the Shelf alias.
Production /readyz reports PostgreSQL, Magic, OpenRouter, Jupiter and Helius configured, with
tradeExecution disabled. The revised product Discover page serves HTTP 200 and no saved examples;
read-only issuer search returned AAPLx and OPENAI with the expected mints and no unavailable feeds.
The cold xStocks search took about 20 seconds, down from about 48 seconds before batching; the
private-only search took about two seconds after it stopped fetching xStocks unnecessarily.
Historical product and brand URLs redirect to live product search. No paid AI call was made for
this release. Two residual UI references to the old catalog were replaced with saved-product
and relationship-report wording in the final deployment; lint, TypeScript and production build
passed again after that copy change. Issuer mints in result cards now wrap on narrow screens;
lint, TypeScript and production build passed after this final UI edit. The funded activation
test and operational launch decisions remain separate gates.

## U24 live issuer-feed discovery — deployed

The application now replaces presaved-catalog matching in typed search and image scans. The
OpenRouter structured response identifies a product and suggests likely owner names; the server
joins only those names to current full xStocks and PreStocks feeds. AI ownership is visibly
unverified. Barcode mode obtains a product-name clue from public Open Food/Beauty/Products Facts
before the same AI and issuer join; unknown barcodes stay unresolved. If one feed is unavailable,
results say that a token may have been missed. The UI has issuer asset and purchase pages with
source-specific disclosures and the current PreStocks valuation and supply fields. Order creation
re-fetches the issuer mint, inspects its Solana token program and decimals through Helius, and
persists the selected company.
Jupiter quoting continues to recheck the unchanged mint immediately before a build. Wallet
reconciliation now includes dynamically registered assets. Halted xStocks assets can still be
saved, while new purchases fail closed. Historical saved product rows remain readable, but the old
catalog search endpoints were removed.

Public read-only checks returned 1,026 xStocks Solana listings and eight PreStocks listings; a
public barcode lookup resolved a product name. `npm run lint`, `npm run typecheck`, 93 Vitest
tests in 15 files, `npm run build`, and `git diff --check` pass. Local search/image browser flows
and protected-route HTTP contracts pass on desktop and mobile using a disposable PostgreSQL
cluster. The same four mocked search/image browser checks pass on production. No paid AI call,
onchain transaction, funding, or mainnet write was made at that U24 deployment milestone.

## OpenRouter recognition verification — 2026-09-23

User-authorized real production requests returned `iPhone → Apple → xStocks AAPLx` for typed
search and a synthetic image. A ChatGPT request then returned one HTTP 500, and a repeat returned
the incorrect AI suggestion `ChatGPT → Microsoft`. Direct OpenRouter isolation returned the legal
name `OpenAI Group PBC`, which the previous exact-name issuer join missed. The recognition prompt
now asks for one actual product operator and excludes investors and partners; issuer matching
normalizes ordinary legal suffixes such as `Group PBC`. Direct real text and image retests returned
`ChatGPT → OpenAI` and `iPhone → Apple`. Discovery AI reservations and usage settlement now use
separate short database transactions instead of holding a transaction through the provider and
issuer-feed calls.

Deployment `dpl_GJjdYAkaAVxaJov4mFaMz3phbWmf` is Ready on the production alias. Two consecutive
real ChatGPT requests on it returned HTTP 201 and matched PreStocks OPENAI with mint
`PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF`. A further production image attempt hit the
expected five-request guest quota (HTTP 429) before reaching OpenRouter. The revised image prompt
passed a real direct OpenRouter call; the deployed image UI passed both desktop and mobile
browser checks with AI mocked. Automatic approval review rejected using a new guest identity to
evade the quota, so no further paid production image request was made. The earlier transient 500
could not be conclusively diagnosed from historical Vercel logs; it did not recur in the two
post-fix ChatGPT requests. No trading, funding, or onchain write occurred.

## Current release

Shelf is deployed at https://shelf-one-phi.vercel.app as a production-only Next.js application. Vercel deployment `dpl_An5eDmgNq4RhTEiTgaZnsiNSCvcx` is Ready and owns the production alias. Railway PostgreSQL is the only runtime store. Railway worker deployment `f0d24072-dd94-4450-9772-295dc450c1a4` refreshes issuer data and calls Shelf's narrowly authenticated transaction reconciler.

The current deployment contains the merged frontend, execution-safety work, corrected Magic wallet parser, U24 live issuer-feed discovery, U26 instant AI-to-issuer linking, U27 unified Discover and U28 issuer-provided logos. It has not been exercised with funded wallets. PR #2's exact route-response contracts passed locally against the production build and disposable PostgreSQL database.

`/readyz` reports Magic, OpenRouter, Jupiter, Helius, PostgreSQL, and `tradeExecution: disabled`. Read-only production issuer search returns AAPLx and OPENAI with their issuer Solana mints and no unavailable feeds. Anonymous `/api/v1/me` returns 401. A prior production mutation persisted the one-way cleanup of any legacy user without a verified Magic issuer and any order without a Jupiter quote.

## Implemented product

- Guest discovery across seven inputs and five categories, AI owner suggestions joined to full live issuer feeds, public learning, and distinct xStocks and PreStocks market lanes
- Magic email/Google identity, signed HttpOnly sessions, wallet binding, recovery, global logout, owner binding, signing approval and cancellation
- One private shelf, watchlist, revocable bearer shares, reports, exports, deletion controls, and privacy boundaries
- OpenRouter recognition and grounded education using `z-ai/glm-5.3-flash`, strict schemas, no-data-collection routing, zero-data-retention routing, quotas, and spend caps
- Live PreStocks issuer reference data and stored history; the full paginated xStocks public directory and exact-symbol mint metadata
- Direct buy paths from both market lanes; each executable quote fetches fresh issuer listings (bypassing the five-minute display cache) and rechecks the selected company and exact mint before asking Jupiter for a route
- Jupiter exact-input transaction assembly with exact terms, fee account, signer, program, and no-tip validation; encrypted preparations and signed bytes; exact-message Magic signing; bounded sponsor co-signing; Helius simulation, broadcast, finality checks, and exact token-delta accounting
- Restart-safe, deadline-bounded reconciliation through the Railway scheduler; signed transactions can only be rebroadcast byte-for-byte, non-final chain errors retain the wallet lock, and finalized holdings come from finalized Helius transaction facts
- Exact-integer order, fee, lot, record, idempotency, and confirmed-chain accounting logic
- Owner health, pauses, persisted invitations tied to Magic email, audit records, budgets, diagnostics, and catalog reports
- Railway scheduled issuer refresh that records only completed PreStocks and xStocks work

There are no runtime substitutes for identity, balances, provider data, signatures, persistence, or transactions. Missing providers fail closed. Investment approval and deposit controls remain disabled.

## Verification

- `npm run lint` — passed with no warnings
- `npm run typecheck` — passed
- `npm run check` — ESLint, strict TypeScript, 15 Vitest files/98 tests, and the Next.js 16.3.5 Webpack production build passed on the final U25 tree
- `npm run build` — passed with Next.js 16.3.5
- Local production-build browser verification with disposable PostgreSQL — search/image flows passed on desktop and Pixel 7; exact 307/308/404 route contracts passed on both projects
- Local production-build browser verification for the review fixes — `live-discovery.spec.ts` passed 3/3 desktop Chromium and 3/3 Pixel 7 tests with issuer/API responses mocked; no live provider call was made by these checks
- Production `/readyz` — passed on deployment `dpl_4qf4YjBAzJ1f3kixhEJxaiVigTBM`, with trading disabled
- Production issuer search — AAPLx from xStocks and OPENAI from PreStocks, with the expected Solana mints and no unavailable feeds
- Anonymous `/api/v1/me` — returned 401
- Production Chromium — four mocked search/image flow checks passed on desktop and Pixel 7; those browser checks made no paid OpenRouter request
- U25 local Chromium — four Discover/scan checks passed on desktop and Pixel 7, including the xStocks and PreStocks product-result links; issuer and AI responses were intercepted
- U25 production read-only — both issuer searches returned current mints, the new Discover page served HTTP 200, historical product/brand routes redirected to live search, and /readyz reported trading disabled
- Real OpenRouter recognition — typed iPhone and synthetic-image iPhone passed before the prompt fix; revised prompt passed direct text and image calls; two post-fix production ChatGPT requests passed and matched PreStocks OPENAI
- Post-fix production image request — expected HTTP 429 guest-quota block; no provider call made. Desktop and Pixel 7 image browser checks passed with AI mocked.
- Railway scheduled run at 2026-09-22 11:45 UTC — completed issuer refresh and Shelf reconciliation, two checked jobs, zero failures
- No sponsor funding, fee-account creation, simulation, investment signing, submission, broadcast, or money movement was performed

## Open gates

The remaining financial activation work is the owner-approved live-money run: create and verify the fee USDC account, fund the sponsor within a fixed limit, enable the existing execution gate, verify user approval and rejection with real Magic/Jupiter transactions, submit one bounded transaction, prove finality and ambiguous-result recovery, and complete one small-value buy/sell cycle. Sponsor signing, transaction encryption, Helius, Jupiter, Vercel, and Railway reconciliation secrets/interfaces are already configured; funding does not require another provider integration or code change.

Before activation, recheck real Jupiter builds against the tightened fail-closed policy: direct top-level SPL Token/Token-2022 instructions are rejected, and sponsored ATA creation must match the reviewed owner, mint, token program and derived address. Unsupported legitimate routes need a reviewed manifest extension and tests; do not weaken validation to make a route pass. No paid provider call or real transaction was made for this check during this maintenance.

Operational launch decisions still remain outside application implementation: approve the jurisdiction policy, complete a database restore drill, complete the final source/catalog review, approve private beta, and separately approve public launch. Eligibility fails closed under `FINANCIAL_POLICY_VERSION=pre-activation-v1` until the policy decision is recorded.

## Next task

Preserve U28 in remote Git before a future automatic Git deployment can replace the direct
Vercel release; remote push still needs the owner's approval under AGENTS.md. Do not create
another guest identity to evade the AI quota. If an HTTP 500 appears, use its request ID and
fresh Vercel runtime logs. Paid Jupiter build compatibility and funded execution remain separate
approval gates. Only after separate owner approval for funding and live-money testing, execute
the activation checklist without widening its limits.

## Recent maintenance

- 2026-09-23: Fixed the seven follow-up issuer/discovery findings locally. Wallet refresh now reconciles the combined tracked and reserved holdings of every instrument sharing a mint before assigning external inventory, marking all affected holdings on a shortfall. Legacy buy and basket IDs must pass fresh issuer and on-chain mint/program/decimal checks before an order draft. Dynamically registered issuer companies preserve corporate-action lifecycle context only for an exact reviewed provider/symbol/mint match; holding actions are mapped to the matching reviewed instrument and purchase review displays lifecycle warnings. Exact `/assets/{provider}/{symbol}` and purchase return paths are recognized safely; asset details use a provider-specific exact-symbol endpoint instead of the first mixed search page. All five product categories can again be browsed and filtered, clearly separated from live issuer results. xStocks pagination stops at the first terminal page. Added regression tests and updated browser mocks. `npm run check` passed: ESLint, strict TypeScript, 15 Vitest files/97 tests, and the Next.js 16.3.5 Webpack production build. The local production build also passed 3/3 desktop Chromium and 3/3 Pixel 7 browser checks. `git diff --check` passed. No deployment, paid provider call, signing, broadcast, funding, or money movement occurred; real trading and deposits remain disabled.
- 2026-09-23: Integrated PR #2's Phase 0–2 route-response and strict return-path corrections into local `main`. Preserved the deliberate removal of the global loading boundary, retained its local-production HTTP regression suite, removed documentation trailing spaces, and restored `next-env.d.ts` to production-generated type imports. `npm run check` passed on the combined tree: ESLint, strict TypeScript, 14 Vitest files/90 tests, and the Next.js 16.3.5 Webpack production build. The PR branch's 6/6 isolated PostgreSQL-backed browser result was reviewed but not rerun in this merge; no provider call, deployment confirmation, signing, funding, or money movement occurred.
- 2026-09-23: Audited the complete Phase 0–2 frontend route architecture against the Product Design Guide and recorded fail-first plus final evidence in `docs/PHASE_0_2_ROUTE_VERIFICATION.md`. Corrected two in-scope defects: removed the global loading boundary that committed HTTP 200 before redirects/not-found, and replaced broad auth return-path prefixes with exact canonical shapes and safe segment validation. Added local-production HTTP regression coverage for all 19 guide-listed legacy redirects, invalid entities, guest access, and canonical ID migrations. ESLint, strict TypeScript, 10 Vitest files/44 tests, the Next.js production build, and 6/6 local desktop/Pixel 7 browser checks pass; authenticated probes return 200 for owned resources and indistinguishable 404s for foreign/missing/non-owner resources. No Phase 3 redesign, deployment, provider call, signing, or money action was performed.
- 2026-09-23: Diagnosed the remaining production Magic callback failure against the actual Vercel and Railway instances. Vercel successfully connected to Railway PostgreSQL, loaded a stored Magic issuer, and called Magic Admin. The runtime response contained a valid Solana wallet with `wallet_type` and `public_address`, while Magic Admin 2.8.2 declares camelCase fields but passes the nested API object through unchanged. Normalized both runtime snake_case and declared camelCase shapes while retaining exact browser/server address matching and fail-closed wallet-type checks. Removed the short-lived protected diagnostic before the final deployment. ESLint, strict TypeScript, 14 Vitest files/90 tests, and the Next.js production build pass. Vercel deployment `dpl_GgLXwLwDPD7awf59HDqPz5zzRCQ8` is Ready on the production alias; `/readyz` confirms Magic and PostgreSQL, and the removed diagnostic returns 404. Real trading remains disabled.
- 2026-09-23: Locally merged the execution-safety branch with `origin/main`'s Product Design Guide Phases 0–2. Resolved the two text conflicts by preserving both status histories and updating the production identity browser test for canonical `/discover` routing while retaining the OpenAI PreStocks purchase-path assertion. Removed a trailing whitespace defect in the incoming summary. `npm run check` passed: ESLint, strict TypeScript, 14 Vitest files/90 tests, and the Next.js 16.3.5 Webpack production build. Targeted local Playwright passed 4/4 desktop and Pixel 7 checks. No remote push, deployment, paid provider request, signing, broadcast, funding, or money movement was performed.
- 2026-09-23: Closed the six-item execution follow-up in the local worktree. Signed expiry now requires confirmed height past `lastValidBlockHeight`, finalized height past the same boundary, and a second full-history signature lookup before releasing a sponsor reservation or wallet lock; missing history stays unresolved. Existing orders recheck invite and eligibility before quote, preparation, wallet signature acceptance, and first broadcast; known or previously attempted transactions still reconcile after access is revoked or trading is disabled. The internal worker route no longer skips pending signatures when execution is off. Successful status-triggered broadcasts return the updated order. Abandoned unsigned preparations expire across orders before wallet-lock checks. Sponsor accounting includes reservations from earlier UTC days and charges settled debit on the chain execution day; missing chain time remains conservatively reserved. Worker requests now have a 24-second deadline under a renewed 40-second lease to allow the additional RPC evidence checks. Added endpoint, provider transport, and state-transition regression tests. `npm run check` passed: ESLint, strict TypeScript, 13 Vitest files/83 tests, and the Next.js 16.3.5 Webpack production build; `git diff --check` passed. No deployment, paid provider request, signing, broadcast, funding, or money movement was performed. The deployment-bound browser suite was not rerun against this local patch.
- 2026-09-23: Closed the subsequent seven-item issuer/pause/finality/state/worker review in the local worktree. Execution checks bypass cached issuer listings and fetch current mint data, comparing provider observations to a clock captured after the fetch; an owner buy pause is enforced at preparation, signing, and first broadcast. Non-final signature errors remain unresolved with sponsor reservation and wallet lock until finality. Stopping an ambiguous order preserves `outcome_unknown`; proven failed or expired legs can be newly quoted and approved, but stopped orders remain closed. Pending wallet refresh labels balances as last recorded in a warning rather than a success notice. Reconciliation now selects oldest-check-first, persists one preparation per internal worker request under a three-second RPC limit, heartbeats between at most two requests per scheduled job, and leaves additional work for later runs. Orphaned preparations are audited and rotated so they cannot starve valid work. Added regression tests for these transitions, live RPC status mapping, issuer changes and timestamping, user messaging, and batch fairness. `npm run check` passed: ESLint, strict TypeScript, 12 Vitest files/72 tests, and the Next.js 16.3.5 Webpack production build. `git diff --check` passed. No deployment, paid provider request, wallet signing, broadcast, funding, or money movement was performed. Production still contains the earlier deployment, not these local fixes.
- 2026-09-23: Closed the follow-up execution review in the local worktree. Jupiter builds now reject unreviewed direct token transfers/approvals, enforce positional idempotent ATA creation with the derived address and verified token program, and reject price impact above 100 bps before execution. Finalized sell fees are derived from observed gross/net deltas. Wallet refresh reconciles in-flight fills before importing finalized balances and withholds balance projection while outcomes are unresolved, preventing duplicate buy debits, sell credits and false external inventory. Account deletion blocks signed/unknown work but safely removes unsigned or terminal preparations. Submission pause and the real-trading gate stop first broadcasts and new rebroadcasts while signature-history reconciliation continues. Rejected wallet prompts reuse the same unexpired review; expired unsigned approvals permit a fresh quote. Member status checks target the active basket leg. The bounded worker reconciler isolates preparation errors, retains retry counts and owner-audit escalation, and keeps later finalized results. Added regression tests for these cases; ESLint, strict TypeScript, 10 Vitest files/59 tests, `git diff --check`, and the Next.js 16.3.5 Webpack build pass. No deployment, provider mutation, signing, broadcast, funding or money movement was performed.
- 2026-09-23: Closed the live-execution safety and reconciliation review. Sponsor co-signing now atomically reserves the specification limits (0.005 SOL/transaction, 0.02/user/day, 0.10/global/day), rejects direct System Program spending, excessive priority fees, and unbounded account creation, records actual sponsor debit/network fees, and pauses submissions on any reservation overrun. Persisted wallet locks allow only one unresolved signing/submission, stopped orders invalidate outstanding callbacks, and every signature/broadcast transition rechecks the leg. Reconciliation checks full signature history before rebroadcast, persists confirmed/finalized/failed/expired outcomes, settles or safely releases reservations, and retains unknown work until proven terminal. Finalized wallet shortfalls now enter a visible `reconciliation_required` state and block affected sells/transfers instead of fabricating external inventory. Added regression coverage for cancellation races, wallet exclusion, sponsor exhaustion, history-first recovery, terminal chain failures, expiry, and inventory shortfalls. ESLint, strict TypeScript, 10 Vitest files/47 tests, and the Next.js 16.3.5 Webpack production build pass. No deployment, provider mutation, signing, broadcast, funding, or money movement was performed.
- 2026-09-22: Fixed the production Magic login regression caused by Magic SDK v30+ wallet metadata nesting. Server-side wallet verification now accepts the authoritative Solana entry from Magic's `wallets` collection as well as the older flat field, and requires the browser-selected Solana address to match that server metadata. Non-Solana entries, missing addresses, and mismatches still fail closed. ESLint, strict TypeScript, 9 Vitest files/40 tests, and the Next.js production build pass. Vercel deployment `dpl_BFJvtQmim2VCvAQbKr867Ugvc72c` is Ready and owns the live alias; its first post-deploy readiness request passed and anonymous `/api/v1/me` returned 401. Two subsequent Chromium smoke attempts were inconclusive because the test runner timed out before page navigation, followed by a direct request timeout from the same environment. A real Magic OTP login remains the final production check.
- 2026-09-22: Connected the private PreStocks market cards directly to the purchase flow. The amount screen identifies PreStocks as the private-asset source, Jupiter as the execution route, and shows the exact mint. Quote creation requires a current issuer-feed match for the selected company and exact mint before building the Jupiter USDC route; stale or missing issuer data fails closed. Added encrypted preparation storage, unchanged-message Magic and sponsor signing, block-height expiry, Helius simulation/broadcast/finality reads, exact finalized token-delta accounting, finalized wallet balance refresh, and authenticated Railway reconciliation of persisted signed work. The dormant sponsor, encryption, and worker secrets are installed in their production stores while `ENABLE_REAL_TRADING=false`. The public PreStocks endpoint returned all eight reviewed instruments and the expected OpenAI mint. ESLint, strict TypeScript, 9 Vitest files/40 tests, the Next.js production build, production Chromium, and Vercel readiness pass. No signing, submission, broadcast, funding, or money movement was performed.
- 2026-09-22: Completed Product Design Guide refactor Phases 0–2 without beginning page redesign. Replaced the optional catch-all/`ScreenRouter` with 35 explicit canonical App Router pages, added reviewed public slugs and a derived Brand read model, implemented one-way legacy redirects and safe auth return-state filtering, enforced versioned AI image-processing consent, and migrated the shell to Discover/Saved/Portfolio with promoted Scan and route-aware mobile state. Existing screen styling remains scaffolding. ESLint, TypeScript, 9 Vitest files/35 tests, the Next.js production build, and all 4 local desktop/Pixel 7 public-route browser checks pass. Local authenticated browser checks remain environment-gated by unavailable PostgreSQL; no provider, deployment, or money action was performed. See `docs/PHASE_0_2_IMPLEMENTATION_SUMMARY.md`.
- 2026-09-22: Resolved the full authentication, privacy, unit-conversion, state-machine, and scheduler review plus follow-up edge cases. Magic DID proofs are challenge-attached and replay-persisted; sensitive actions force a new authentication using the session's original email or Google method; per-session server revocation, persisted one-time export authorization, changed-wallet fail-closed auditing, and full account identity/session removal are enforced. Image recognition requires informed per-request OpenRouter consent, educational prompts receive reviewed claims and reject forged citations, token parsing covers verified scales including zero decimals, sells/transfers use instrument decimals, transfer destinations are curve/self/mint/account-type checked, and cancelled legs remain terminal. Railway claims before provider work, heartbeats owned work, atomically reclaims expired leases with fenced completion and attempt limits, and both invite revoke contracts share the persisted mutation. Lint, strict type checking, 9 Vitest files/37 tests, and the Next.js 16.3.5 Webpack production build pass. No external provider call, deployment, or financial operation was performed.
- 2026-09-22: Completed the integrated eight-track code-quality review. The final tree passes ESLint, strict TypeScript, 8 Vitest files/28 tests, the Next.js 16.3.5 Webpack production build, and Madge cycle checks across application and ancillary entrypoints. Knip reports only documented intentional package/entrypoint findings plus the specification-required unused `SponsorSigner` activation interface; no unused application file or removable implementation export remains. No external provider call, deployment, or financial operation was performed.
- 2026-09-22: Audited AI-style filler, stubs, comments, and provider wording; detailed findings are in `docs/quality/08-slop-comments.md`. Replaced invalid support links and repeated learning filler, implemented one-way audited catalog-report review, removed generic prefilled admin reasons, corrected provider-status labels, and made unavailable admin mutations return explicit 501 errors instead of fabricated success. Useful security/provenance comments and required activation-gate copy remain. Lint, type checking, all 8 test files and 28 tests, and the Webpack production build pass.
- 2026-09-21: Audited deprecated, legacy, compatibility, and fallback paths; detailed findings are in `docs/quality/07-legacy-fallbacks.md`. Removed alternate Magic wallet authority/repair paths, the implicit browser devnet RPC, missing-price-impact-as-zero behavior, and old runtime-state field backfills. Retained labeled stale data and fail-closed stored-state cleanup. Lint, type checking, all 29 tests, and the Webpack production build pass; Turbopack could not be evaluated because the execution environment denied the local PostCSS port it attempted to bind.
- 2026-09-21: Audited weak and asserted types; detailed findings are in `docs/quality/05-strong-types.md`. Replaced broad in-memory records and double-cast persistence with concrete models, added runtime schemas for OpenRouter/Jupiter/Helius and signed session claims, validated order inputs and route array/integer fields, and narrowed worker/provider JSON only after checks. Lint and type checking pass; all 9 test files and 29 tests pass. A production-build attempt was deferred because another concurrent Next build held the build lock.
- 2026-09-21: Audited all exception, rejection, cleanup, retry, and fallback paths; detailed findings are in `docs/quality/06-error-handling.md`. Removed three no-op catch/rethrow blocks, closed the Magic Admin wallet fail-open fallback, made unexpected API failures generic 500 responses with safe request-ID correlation, normalized malformed JSON, and exposed previously silent wallet/account/holding/watchlist/clipboard failures. Strengthened focused OpenRouter retry/privacy tests; lint, type checking, all 26 tests, and the production build pass.
- 2026-09-21: Audited circular dependencies across source, tests, scripts, and the Railway worker; detailed results are in `docs/quality/04-circular-dependencies.md`. Madge and an independent TypeScript-resolved runtime/type-only SCC pass found no cycles, so no speculative refactor was made. The audit records three acyclic relationships to watch and the two external imports skipped by Madge.
- 2026-09-21: Audited duplication and documented findings in `docs/quality/01-dedup-dry.md`. Consolidated production Solana network, mint and program identities in `src/providers/solana-constants.ts` and unified the duplicated stale-feed cache policy after concurrent route work completed. Full lint, type checking and all 23 tests passed at the audit milestone; final integrated results appear above.
- 2026-09-21: Consolidated the test suite from 16 files and 65 reported cases to 8 files and 23 focused cases. Repeated table cases and one-assertion files now share readable contract tests. All security, exact-money, provider-boundary, Solana-policy, order-accounting, route-inventory, and production-browser assertions remain covered. Lint, type checking, all tests, and the production build pass.
