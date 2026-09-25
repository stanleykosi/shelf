# Decisions and assumptions

Version 1.0, 2026-09-20. U = explicit user choice; D = delegated default; G = external readiness gate. Defaults are specific so the builder can proceed without another product questionnaire; they are configurable, not claims of validated economics.

## Confirmed product choices

| ID | Decision |
|---|---|
| U01 | Both investing/crypto newcomers and knowledgeable users are primary audiences. Use one flow with progressive disclosure, not two apps. |
| U02 | English; global product ambition. Financial eligibility remains subject to issuer/provider requirements. |
| U03 | Build a prototype/private real-money beta first, with public release later. Do not design around an event deadline. |
| U04 | Mobile-friendly website first; desktop must support uploads, research and all account/money actions. |
| U05 | Embedded wallet with email/social authentication; Magic is the preferred candidate. |
| U06 | USDC funding through direct wallet deposits. No required fiat funding provider. |
| U07 | Launch includes single-company purchase, budget allocation across companies, sale to USDC and transfers. Recurring purchases/gifts later. |
| U08 | Revenue through transaction fees. |
| U09 | Portfolio tracks Shelf-origin purchases, with history, records and corporate-action explanations. Not an external-wallet portfolio aggregator. |
| U10 | AI recognizes photos, reads packaging/receipts, explains verified relationships, teaches, organizes/summarizes and suggests investments/allocations. |
| U11 | Camera, barcode, upload, screenshot, receipt, product URL and typed search; multiple products per image. Groceries, beauty, electronics, clothing and household categories. |
| U12 | Historical smaller-catalog choice, superseded for active discovery by U24. Existing saved records remain readable. |
| U13 | OpenRouter and paid vision models; prevent training use and enforce privacy controls where supported. |
| U14 | Guest scanning/learning/browsing/temporary shelf; primary action “Scan a product.” |
| U15 | Collections private; deliberate link sharing only. Number of collections was left ambiguous. |
| U16 | Shelf is a working name; frontend teammate owns visual identity, but the product requires fully designed UX. |
| U17 | Return-use emphasis: company education and brand discovery. |
| U18 | Choose economical, suitable prototype infrastructure. No existing stack must be preserved in the future repository unless found there. |
| U19 | No large-scale capacity project; private beta is the operating scope. |
| U20 | One owner operates the beta. |
| U21 | Delete images after processing; user information private by default. |
| U22 | Specify appropriate testing; live testing will be discussed separately with the implementation agent. |
| U23 | Do not use the UI/UX skill. Use native UX judgment. |
| U24 | Active typed search and image discovery use AI to infer likely product ownership, then look up that company in the current full xStocks and PreStocks issuer feeds. A presaved product/company registry is not the discovery or trading universe. AI ownership is a suggestion; issuer symbol and mint come only from the feed. The selected mint is checked on Solana before order creation and rechecked against the issuer before Jupiter quoting. |
| U29 | Discover checks xStocks and PreStocks first, then automatically sends an unmatched search term to OpenRouter for a likely owner. No consent checkbox or second search action. AI ownership remains unverified; OpenRouter privacy controls and spend limits remain enforced. |
| U30 | Replace Discover's reviewed product, brand and company example tables with a live, rotating company spotlight. Use current xStocks listings for recognizable public issuers and include roughly two current PreStocks listings. Show provider logos prominently, editorial sector filters, and links to issuer detail pages. Do not call the selection top-performing without provider performance data; the search continues to cover all issuer listings. |
| U31 | The 27-entry editorial pool is not the directory. Discover must expose every current xStocks and PreStocks listing, ten per page, with market grouping and sector filters. Keep a rotating featured first page generated automatically on each visit; remove the refresh button and 27-company badge. Cache validated feed data so browsing does not refetch upstream pages, while issuer detail and trade checks remain fresh. |
| U33 | Scan camera, barcode, upload, screenshot, receipt and link submissions proceed without a repeated AI-processing consent checkbox or consent fields. Preserve OpenRouter no-data-collection/ZDR routing, transient image handling, input validation and usage limits. |
| U34 | Each current xStocks or PreStocks token detail page opens an AI chat scoped to that exact issuer symbol. The server retrieves the current full public issuer response for each answer; users can ask follow-up questions without an automatic first AI request. Chat turns stay only in page memory until a separate retention decision. Signed guest quota cookies separate users behind one network without storing messages. Keep each request bounded, isolate users and enforce shared AI spend limits. |
| U35 | Token detail pages should prioritize the meaning of the instrument, verified issuer references, market context and exact Solana identity. xStocks details add underlying identifiers, a Solana multiplier and timestamped issuer reserve disclosure. PreStocks details clearly separate token reference, mark, premium and private-company valuations. Omit unverified web-only company figures and an xStocks indicative price without a source timestamp; Jupiter quotes remain amount-specific purchase-review data. |
| U36 | Retire the Home product-led company-research presentation, its product/brand/company research tables and links, and the standalone general AI assistant. AI chat is available only from an exact token detail page and requires that issuer symbol on every answer request. Keep product scanning and live issuer discovery, and place company/stock-token research on the token detail and its scoped chat page. Retire `/markets*`, `/companies/[slug]` and the old `/invest/suggest` redirect without replacement redirects. A general assistant may be considered in a future decision. |
| U37 | Restore a general assistant grounded in Shelf's reviewed learning and product relationships. Use the same conversation design as exact-asset chat. Show one history list across both chat scopes; retain messages only in browser storage, separated by signed-in account or guest tab, with delete controls. The answer API requires either an exact issuer reference or explicit `scope:general`; no ungrounded question route. Asset chat remains issuer scoped and refetches that issuer for every answer. |

## Delegated defaults

| ID | Default and reason |
|---|---|
| D01 | One named personal shelf, initially “My shelf”; up to 100 saved catalog items. It is a discovery collection, not a fund or brokerage account. |
| D02 | Email OTP and Google sign-in through Magic. No password database, SMS, external-wallet login or arbitrary account linking in v1. |
| D03 | Guest state stays in session storage; authenticated shelf syncs to Postgres. Explicit, idempotent guest merge after login. |
| D04 | Private beta capped initially at 50 invited accounts. Anonymous educational use is rate-limited; sign-in/funding/trading require invite approval. |
| D05 | Next.js App Router + TypeScript, Node runtime, one modular application; PostgreSQL through Drizzle; no independent microservices. |
| D06 | Supabase Free for prototype Postgres; Magic handles identity, not Supabase Auth. Render paid small web service + one periodic job for a real-money beta. Free sleeping hosting is allowed only for development previews. |
| D07 | Jupiter Swap v2 /build for primary swap composition, server-held API key, controlled instruction assembly; Helius RPC for simulation, broadcast and chain verification. xStocks supplies issuer metadata, not guaranteed retail liquidity. |
| D08 | Server gas sponsor pays SOL costs under hard limits; user assets remain user-signed. No network fee is secretly deducted from USDC. |
| D09 | Shelf fee: 50 basis points (0.50%) on successful buys/sells, collected in USDC within the swap. No Shelf fee for deposits, saves, failed swaps, or outbound transfers. Routing/pool costs still exist; sponsor pays failed-transaction network fees within its budget. |
| D10 | Order minimum 5 USDC per buy leg; maximum 100 USDC per buy/basket total; maximum 5 distinct underlying companies per basket; buy spend cap 250 USDC per account per UTC day. These are beta safeguards, not issuer minimums. |
| D11 | Sell accepts positive spendable raw quantities including “Sell all”; no 5-USDC sell minimum that would strand dust. Route feasibility and cost controls still apply. |
| D12 | Basket allocation defaults equal-weight across unique parents; user edits dollar amounts. Sequential quotes/confirmations, not an all-or-nothing basket or background auto-trader. |
| D13 | Transfer supports USDC and supported stock tokens to another Solana wallet. No cross-chain transfer, contacts import, address book or “send by email.” |
| D14 | Default slippage 50 bps, hard maximum 100 bps; price-impact hard stop above 1%. Show precise route conditions; no auto-increase. Fresh quote/signing envelope at most 20 seconds and within blockhash validity. |
| D15 | AI's investment suggestions are source-grounded candidate lists and editable allocation drafts among verified supported companies, based on explicit user criteria. No suitability claim, prediction of returns or autonomous order authority. Live recommendation access also has an operator policy gate. |
| D16 | OpenRouter paid low-cost vision/text candidate: z-ai/glm-5.3-flash. The earlier Gemini 2.5 candidates are being retired and were replaced before activation. Evaluate the pinned GLM endpoint before enabling. No automatic unrelated-provider or no-privacy fallback. |
| D17 | Image bytes/raw OCR in memory only. Retain only confirmed catalog-item selections and minimal operational metadata. No chat-history archive by default. |
| D18 | Sharing creates an explicit snapshot with random link, 7-day expiry and revocation. No identity, wallet address, amounts, holdings, order IDs, timestamps of shopping or receipts included. |
| D19 | No public feed, likes, leaderboards, referrals, price pushes, marketing email or embedded ad tracking in v1. In-app education and transaction status suffice. |
| D20 | CSV and JSON records; cash flows and confirmed holdings shown. Formal tax reports and headline investment-performance percentages deferred. |
| D21 | No custom Solana program, pooled portfolio token, allowance-based trading or central custody. |
| D22 | All provider integrations have deterministic mock adapters for automated tests; real and mock deployments cannot share financial database rows or credentials. |
| D23 | All AI content visibly labeled; companies do not endorse Shelf. Familiarity does not establish investment quality. |

## Limits chosen for the beta

- Guest: 5 AI scans per UTC day and 10 educational messages, with IP-abuse protection; authenticated: 20 scans and 40 messages per day. Three allocation drafts per day.
- Image upload: one JPEG/PNG/WebP per request, maximum 8 MiB input, 20 megapixels decoded, downsample to 1600 px longest side before provider upload. Up to 12 product candidates or 30 receipt line candidates; ask for another crop beyond limits.
- Text: search 120 characters, chat 2,000, shelf name 60. URL 2,048; HTTPS only, allowlisted hosts.
- Initial sponsor ceilings: 0.005 SOL per submitted transaction, 0.02 SOL per user/day, 0.10 SOL globally/day, 0.20 SOL maximum hot-wallet operating balance. Compute simulation/rent determine actual spend; these ceilings are not promises that every route fits.
- Initial AI budget: 2 USD/day and 20 USD/month, hard application caps plus provider key limit. These are proposed spend ceilings; actual paid use requires the owner's account/funding.
- Transfer anti-abuse: at most 5 sponsored outbound transfers/account/day; no more than 1 stock-asset account creation per transfer.
- Safety limits must be visible when they affect an action. Owner changes are audited and do not retroactively alter approved transaction terms.

## Resolved tensions

**Global versus restrictions:** neutral product education can be public where permitted. Token-specific promotion, funding, suggestions and transactions require a maintained eligibility policy. Empty/unknown policy denies financial activation. Do not implement “all countries except one” as legal clearance. [Issuer terms](https://docs.xstocks.fi/docs/product-legal-overview).

**Private versus onchain:** app records are private; blockchain addresses, balances and transfers are publicly observable. State this before wallet funding and sharing.

**USDC only versus SOL fees:** a separately funded, bounded sponsor covers SOL. Pause with a clear message if the sponsor cannot safely pay; no surprise requirement for users to acquire SOL in the normal flow.

**Small catalog versus every input:** every requested input path is implemented, but unresolved matches end in correction/unsupported states. A product URL is parsed only from safe supported hosts, not arbitrary browsing.

**Shelf-only portfolio versus fungible wallet balances:** distinguish tracked acquisition lots from externally received inventory. Reconcile outgoing changes without pretending tokens carry their acquisition history. Rules are in document 09.

**AI suggestions versus automatic financial advice:** implement draft suggestions and transparent rationale, never permission to trade or a promise of suitability. A disclaimer alone is not a substitute for product-policy review.

## Gates that cannot be resolved by writing prose

G01: Magic account configured; pinned SDK version proves Solana v0/partial signatures, identity binding and recovery on actual browser.

G02: Jupiter key, fee account and allowlisted route support work for the exact Token-2022 mints on buy and sell, with sponsor and simulation.

G03: Current issuer instrument terms and jurisdiction policy approved for the intended beta; any required onboarding/licensing resolved outside this document.

G04: OpenRouter paid model + required privacy flags + schema output verified using synthetic images; no forbidden endpoint fallback.

G05: Sponsor funded and budgets configured by owner; secret management and restore verification complete.

G06: Seed mapping provenance, exact barcode fixtures, legal asset identity and image licenses verified.

G07: User-authorized controlled live testing performed later in the implementation repository. It is not authorized by this pack.

G08: Public real-money launch is a separate readiness decision after beta, not an automatic environment-variable change.
