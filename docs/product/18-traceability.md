# Requirements traceability

Use this as the completion checklist in the application repository. References identify required coverage; they are not assertions of completed code/tests. U IDs correspond directly to the user's answers and latest instruction in document00.

| User choice | Product requirement | Main screen / API area | Acceptance |
|---|---|---|---|
| U01 newcomers + experienced | PR03, PR16, PR24 | S05/S06/S17; sources + details disclosures | T03,T22,T29,T35 |
| U24 live issuer-feed discovery | PR01–PR04, PR09, PR16 | /issuer/search, /discovery/query, /discovery/image, /assets/*, /orders; AI owner suggestion → exact issuer mint → Helius inspection → Jupiter | issuer pagination, AI schema/privacy, name join, changed mint rejection, browser purchase path |
| U25 live issuer Discover UX, reconciled with required categories and shelf | PR01–PR05, PR16, PR24 | Historical separate search paths are superseded by U27, and U30 retires reviewed category browse tables from Discover; canonical reviewed product and shelf pages remain | guest/member save work; issuer links require a current feed match |
| U26 instant AI-to-issuer linking | PR01–PR04, PR16 | historical consent step superseded by U29; AI ownership joins current xStocks and PreStocks listings in the same response | Disney → The Walt Disney DISx, ambiguous names stay unlisted, no asset link for unsupported owners, desktop/mobile flow |
| U27 unified reviewed-and-live Discover | PR01–PR05, PR16, PR24 | default Discover search checks both feeds first; U29 makes AI fallback automatic; U30 replaces the reviewed browse tables with live company listings | direct company without AI, Spiderman → AI owner → DISx, PreStocks fallback, unsupported owner, desktop/mobile |
| U28 provider-supplied issuer images | PR01, PR03, PR04 | optional xStocks `logo` and PreStocks `image` URLs pass through strict source validation to issuer search, AI match, scan and asset detail views | provider URL validation, issuer-logo fallback, both feeds' images in desktop/mobile search results |
| U29 automatic Discover ownership lookup | PR01–PR04, PR16, PR21 | one Discover request checks xStocks and PreStocks first, then automatically uses the privacy-controlled OpenRouter lookup for unmatched terms; no search consent checkbox or `consent_required` state | direct company never invokes AI, product suggestion joins the current issuer mint, unsupported owner stays unlinked, desktop/mobile search without a second action |
| U30 live company spotlight | PR01–PR04, PR24 | U31 replaces the 27-entry pool with /issuer/directory, preserving the logo-led table, sector/market filters and issuer detail links | current feed records only, per-visit rotation, clear xStocks/PreStocks distinction and no-result/feed-error states |
| U31 full issuer directory and fast browsing | PR01–PR04, PR24 | Railway refreshes validated full-feed snapshots; Vercel serves a slim cached directory; Discover picks ten featured assets per visit and paginates every current issuer listing by ten | full xStocks/PreStocks coverage, no extra fetch on page changes, provider grouping and sector filters, cache/stale warnings, desktop/mobile pagination and measured warm-load latency |
| U33 direct Scan submissions | PR01–PR04, PR16, PR21 | camera, barcode, upload, screenshot, receipt and link submit without a consent checkbox or consent fields; server retains OpenRouter ZDR/no-data-collection policy, transient image handling and quota checks | desktop/mobile browser submissions for all scan inputs; exact request bodies; no consent gate or paid provider call in tests |
| U34 issuer-scoped multi-turn chat | PR03, PR16, PR21, PR24 | /assets/[provider]/[symbol] → /assets/[provider]/[symbol]/chat → /ai/answer; server refetches the complete bounded public issuer response for every turn, with no server transcript; signed guest quota cookie | xStocks and PreStocks browser journeys, no automatic AI call, follow-up history, source validation, context outage, simultaneous-user isolation and privacy/budget contract tests |
| U36 retired research paths, amended by U37 | PR03, PR16, PR24 | Home has Scan/search/token guidance; `/markets*`, `/companies/[slug]` and `/invest/suggest` return 404; `/assistant` is restored as reviewed general chat; `/ai/answer` requires issuer context or explicit general scope | Home browser contract, route 404 checks, missing-scope API rejection, token and general chat regression |
| U37 shared chat and local history | PR03, PR16, PR21, PR24 | asset and general chats share layout, scope and browser history; account keys and guest tabs remain separate; users can delete threads; no server message log | desktop/mobile chat journeys, reload and cross-scope history, source grounding, storage isolation, clear/delete controls |
| U35 useful token details | PR03, PR09, PR16, PR24 | exact /issuer/asset plus optional /issuer/asset/xstocks/{symbol}/disclosures; issuer-specific exposure, identifiers, session, reserves, multiplier and PreStocks reference metrics | adapter contract, desktop/mobile issuer pages, optional disclosure outage, real read-only provider response |
| U02 English/global ambition | PR03, PR23 | S13 /eligibility/check, /capabilities | T03,T33 |
| U03 private real-money prototype | PR07–PR15, PR22–PR26 | financial routes, invites, release gates | T06–T21,T30–T35; R0–R2 |
| U04 mobile-first web | PR01, PR24 | S01–S27 responsive contract | T01,T29,T35 |
| U05 embedded/email/social | PR07 | S11/S12/S26; /auth/*,/me | T06,T07 |
| U06 USDC/direct deposit | PR08, PR12 | S14; /wallet/* | T08,T18 |
| U07 single/basket/sell/transfer | PR09–PR12 | S15–S22; /orders/*,/preparations/* | T09–T18 |
| U08 transaction fees | PR20 | S17/S24; quotes/fee records | T13 |
| U09 Shelf portfolio/history/actions | PR13–PR15 | S19/S20/S23/S24; /portfolio/*,/history/*,/exports/* | T19–T21 |
| U10 all AI jobs | PR01, PR02, PR03, PR16–PR18 | S03/S04/S09/S10; /discovery/*,/ai/* | T01,T02,T22–T26 |
| U11 all inputs/multi-product/categories | PR01–PR04 | Seven discovery inputs and five reviewed product categories remain in scan, product and shelf records; U30 replaces Discover category browsing with company sectors | T01–T03,T28,T36 |
| U12 smaller verified catalog | PR03, PR04, PR22 | Reviewed product rows support category discovery and shelf saves; they do not limit AI or issuer search and do not assert a live token listing | T03,T30,T36 |
| U13 paid OpenRouter/privacy | PR16–PR18, PR21 | AI adapter/privacy policy | T22–T26,T31 |
| U14 guests/scan-first | PR01, PR06, PR25 | S01–S08; local shelf + /shelf/merge | T01,T05,T36 |
| U15 private/link-share | PR05, PR19, PR21 | S07/S25; /shelf/share,/shares/* | T04,T27 |
| U16 working name/team visual design | PR24 | native UX contract, semantic style hooks | T29,T35 |
| U17 discovery/learning retention | PR25 | S02/S06/S08/S09; /learn/* and issuer-scoped chat | T22,T36 |
| U18 economical choices | PR23 | adapters, document13 budgets | T25,T31,T32 |
| U19 prototype/private scale | PR22, PR23 | invite cap, owner controls, R0–R2 | T30–T33 |
| U20 single owner | PR22 | S27; owner-authenticated /admin/* | T07,T30 |
| U21 no stored images/private data | PR21 | ingestion, logs, sharing, deletion | T26–T28,T34 |
| U22 appropriate tests/live later | PR26 | document15; G07 explicit gate | T01–T36 |
| U23 no UI/UX skill | PR24 | native reasoning; visual ownership retained | design review; no generated skill style adopted |

## CTA coverage ledger

Each range references explicit actions in document03. In the build repository map each action to a component, handler/route, loading guard and test. Repeated mobile/desktop presentations must share behavior.

Canonical S05 product pages retain C18–C19 shelf save/remove for reviewed products. S06 token details are the company and stock-token research destination; unified Discover handles product ownership lookup and exact issuer selection. Brand pages redirect to Discover search. Saving a product and watching an issuer are distinct actions. General assistant C34 and its chat allocation actions C38–C39 are retired; allocation remains in the editable basket flow. The separate S10 draft screen and C40–C42 are retired in favor of the editable basket draft action C62.

| Screen | CTA IDs | Action family | Tests |
|---|---|---|---|
| S01 | C01–C02 | Enter scanning/search | T01,T35 |
| S02 | C03–C04 | Open result/reset filters | T03,T36 |
| S03 | C05–C12 | Capture/retake/use/upload/barcode/receipt/URL | T01,T02,T28 |
| S04 | C13–C17 | Confirm/correct/exclude/explain/save | T02,T03,T04 |
| S05 | C18–C20 | Product save/remove/company | T03,T04 |
| S06 | C21–C24 | Amount/education/sources/token detail | T03,T09,T22 |
| S07 | C25–C32 | Shelf CRUD/companies/summary/share/sign-in/sort | T04,T05,T24,T27 |
| S08 | C33 | Learn/explore; C34 retired | T22,T36 |
| S09 | C35–C37 | Exact issuer chat send/stop/clear; C38–C39 retired | T22–T26 |
| S10 | C40–C42 retired | Separate allocation draft route retired; S16 owns editable suggestions | T10,T23 |
| S11 | C43–C46 | Email/Google/guest/recovery | T05–T07 |
| S12 | C47–C49 | Onboard/merge/skip | T05,T07 |
| S13 | C50 | Eligibility + contextual learning/support exits | T33,T36 |
| S14 | C51–C56 | Fund/send/refresh/copy/return; external-token send uses C52 variant | T08,T18,T19 |
| S15 | C57–C58 | Buy review/fund | T09,T10 |
| S16 | C59–C62 | Split/remove/review/AI basket | T10,T11,T23 |
| S17 | C63–C67 | Buy/sell approve/edit/cancel/requote | T09,T12–T17 |
| S18 | C68–C72 | Explorer/status/next/stop/retry | T11,T15,T16 |
| S19 | C73–C75 | Portfolio holding/history/discover | T19,T21,T36 |
| S20 | C76–C79 | Sell/send/company/corporate action | T17–T20 |
| S21 | C80–C81 | Sell all/review | T17 |
| S22 | C82–C84 | Transfer review/approve/edit | T07,T14,T18 |
| S23 | C85–C87 | Record/CSV/JSON | T21 |
| S24 | C88–C89 | Explorer/support | T16,T21 |
| S25 | C90–C94 | Share create/copy/revoke/renew/save | T27 |
| S26 | C95–C99 | Export/delete/logout/logout-all/support | T07,T34 |
| S27 | C100–C109 | Catalog/pause/resume/reconcile/invite/budgets/diagnostic | T30–T32 |

Generic close/back/cancel/accordion/permission-help controls inherit document03's global accessibility and safe-cancellation contract; they must work even though not individually assigned commercial-action IDs.

## Cross-layer invariants

- PR03 requires matching database provenance, source-card UI, AI allowed-context validation and financial relation checks.
- PR20 requires quote normalization, transaction fee instruction, actual chain delta, accounting record and review/receipt copy to agree.
- PR21 requires browser storage, API transport, image processing, provider privacy routing, logging, backup and share sanitizer to agree.
- PR23 requires frontend duplicate guard, backend idempotency/locks, persisted signature, chain finality and restart-safe reconciliation to agree.
- PR13/PR15 require raw-unit arithmetic, historical snapshots, lot attribution and valuation to agree.

A feature is incomplete if one of these layers is only a placeholder. No requirement is satisfied merely by adding a button with its name.
