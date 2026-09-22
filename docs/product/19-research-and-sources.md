# Research, provider evidence and limits

Research refreshed 2026-09-20 unless a row explicitly says historical Sept19. This is the source ledger for the portable product pack. Documented support is not executed interoperability. Prices/limits can change and must be checked before purchase.

## Product thesis and prior art

Shelf combines product-level discovery, a verified ownership explanation, grouping by underlying company, learning and user-approved stock-token purchases into a personal Solana wallet. Its useful distinction is the complete experience—not inventing barcode stock lookup, asserting nobody has tried onchain shopping, or promising a new financial asset.

| Source | Evidence and consequence |
|---|---|
| [Grifin](https://www.grifin.com/) and [onboarding](https://help.grifin.com/knowledge/grifin-101-start-here) — Sept19 | Bank/card-linked brokerage investing. Adjacent consumer motivation; not documented stock-token delivery to a personal wallet in inspected material. |
| [Stash Stock-Back](https://www.stash.com/learn/stock-back-rewards) — Sept19 | Card-linked brokerage rewards. Shelf instead uses deliberate user-funded product discovery; no special card required. |
| [TD Ameritrade 2015 filing](https://www.sec.gov/Archives/edgar/data/1173431/000117343115000169/amtd_20150930x10k.htm) — Sept19 | Historical Snapstock barcode/company discovery establishes clear prior art. |
| [Invest What You See listing](https://play.google.com/store/apps/details?id=com.investwhatyousee.app) — Sept19 | Advertises image/product recognition and brokerage connections. Closest interface precedent; onchain execution not documented there, not proven absent. |
| [RECEIPT](https://receipt.family/), [workflow](https://receipt.family/docs), [proof page](https://receipt.family/proof) — Sept19 | Advertised tokenized-stock receipt rewards, separate-token funding/eligibility. Live marketing contradicted by not-live delivery footer; no payout verified. Treat as competing concept, not validated operation or fraud. |

No competitor account or transaction was tested, no consumer interview completed, no exhaustive entrant census performed. Parent grouping's learning value and repeat use remain hypotheses. Historical full findings are retained in research/, not silently rewritten as proof of demand.

## Issuer, token units and ownership

| Source | Verified relevance / remaining gate |
|---|---|
| [xStocks legal overview](https://docs.xstocks.fi/docs/product-legal-overview) | Issuer-defined stock exposure and distribution restrictions; onchain settlement does not establish eligibility. Must review actual chosen instrument terms before beta. |
| [xStocks FAQ](https://docs.xstocks.fi/docs/frequently-asked-questions) | Primary issuance/redemption process differs from secondary DEX swaps. Issuer minimums are not universal minimums for Shelf buys. |
| [Multiplier integration](https://docs.xstocks.fi/developers/multipliers) | Scheduled multiplier changes require historical/current unit handling and cautious interaction windows. |
| [Dividends/splits](https://docs.xstocks.fi/docs/dividends-and-stock-splits) — Sept19 | Instrument-specific reinvestment/split explanations; don't fabricate cash dividends. |
| [API reference](https://docs.xstocks.fi/apis/openapi) and [v2 OpenAPI description](https://docs.xstocks.fi/_bundle/apis/@v2/openapi.json?download=) | Public metadata versus authenticated client flows; exact endpoint inventory in document11. Schema inspected Sept20; not all endpoints executed. |
| [Solana Scaled UI Amount](https://solana.com/docs/tokens/extensions/scaled-ui-amount) | Raw amount versus display conversion and rounding. Must test effective timestamps, program/extension combinations and price units. |
| [PEPx metadata](https://api.xstocks.fi/api/v2/public/assets/PEPx), [PGx metadata](https://api.xstocks.fi/api/v2/public/assets/PGx), [AAPLx metadata](https://api.xstocks.fi/api/v2/public/assets/AAPLx) — Sept19 | Historical unauthenticated responses identified Solana deployments. Exact snapshots in document16; no current mint-state/extension assertion from those responses alone. |
| [PepsiCo brands](https://www.pepsico.com/brands) | First-party same-parent evidence; product region/license needs separate care. |
| [P&G brands](https://us.pg.com/brands/) | Direct page successfully read Sept20, improving Sept19's indexed-excerpt-only evidence. Specific SKU/market still requires review. |
| [Apple iPhone](https://www.apple.com/iphone/) | Official product-family context; no invented model/GTIN. |
| [NIKE company](https://about.nike.com/en/company) | Nike/Jordan/Converse company portfolio. Does not establish a supported stock token; clothing discovery remains valid without a buy button. |
| [Open Food Facts API](https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/), [product lookup](https://openfoodfacts.github.io/documentation/docs/Product-Opener/v3/products/get-api-v3-product-code/), [barcode guidance](https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/tutorials/scanning-barcodes/) — Sept19 | Optional identity enrichment with coverage/rate/licensing constraints, never authoritative ownership. No catalog upload or account created. |

## Execution and gas sponsorship

| Source | Verified relevance / remaining gate |
|---|---|
| [Jupiter Swap v2 build](https://developers.jup.ag/docs/swap/build) | Selected composable transaction path with integrator fee/payer options. Exact fee basis, stock route, program manifest and sponsor combination still need testing. |
| [Order and execute](https://developers.jup.ag/docs/swap/order-and-execute) | Distinct assembled path; do not modify it and assume execution remains valid. Not the selected integration. |
| [Gasless guide](https://developers.jup.ag/docs/swap/advanced/gasless) | Automatic sponsorship has conditions and fee interactions; does not mean every tiny stock purchase is free. Shelf chooses its own bounded payer. |
| [Jupiter portal setup](https://developers.jup.ag/docs/portal/setup) | Sept20 page lists keyless access and a free keyed tier. **Correction:** earlier blanket claim that every endpoint requires a key is stale; pack still deliberately chooses an owned key. |
| [Rate limits](https://developers.jup.ag/docs/portal/rate-limits) | Shared organization quota and rate-window behavior; multiple keys don't create independent capacity. |
| [Official documentation index](https://developers.jup.ag/docs/llms.txt) | Current page/API navigation; use it to resolve moved paths, not guessed old endpoints. |
| [Raydium swap example](https://github.com/raydium-io/raydium-sdk-V2-demo/blob/master/src/api/swap.ts) and [API URLs](https://github.com/raydium-io/raydium-sdk-V2/blob/master/src/api/url.ts) — Sept19 | Supported the historical public unsigned quote probes. Raydium is not an implemented fallback to Jupiter. |
| [Helius pricing](https://www.helius.dev/pricing) | Prototype RPC quota/cost basis. No private key or production call tested. |

No stock was bought/sold/transferred in this research. Existing Sept19 quote evidence is read-only, stale by design and not executable terms.

## Magic identity and wallet

| Source | Verified relevance / remaining gate |
|---|---|
| [Magic pricing](https://magic.link/pricing) | Developer starting tier and monthly active wallet pricing; paid features must be checked against required recovery/auth behavior. |
| [Email OTP](https://docs.magic.link/embedded-wallets/authentication/login/email-otp) | Preferred email onboarding flow. |
| [OAuth implementation](https://docs.magic.link/embedded-wallets/authentication/login/oauth/implementation) | Google through current OAuth2 extension; origin/redirect configuration required. |
| [Server SDK](https://docs.magic.link/embedded-wallets/sdk/server-side/node) | Verify DID server-side and obtain chain-specific metadata. Generic public-address examples may return EVM identity. |
| [Solana docs](https://docs.magic.link/embedded-wallets/blockchains/non-evm/solana) | Signing/partial-signing integration surface. |
| [Magic Solana extension source](https://github.com/magiclabs/magic-js/blob/master/packages/@magic-ext/solana/src/index.ts) | Source accepts Transaction/VersionedTransaction and exposes partial signing. Sample return encodings differ from source/types; pin and test installed SDK bytes, not a guessed cast. |
| [Recovery](https://docs.magic.link/embedded-wallets/authentication/features/account-recovery) | Provider recovery must be validated for actual app/plan before accepting deposits. No claim that a Shelf support button can recover keys. |

No Magic account configured, login attempted, wallet created or signing flow executed during specification work.

## OpenRouter and AI

| Source | Verified relevance / remaining gate |
|---|---|
| [Data collection](https://openrouter.ai/docs/guides/privacy/data-collection) | Content and metadata have different handling; disabling training/content logging is not “no data leaves device.” |
| [Provider logging](https://openrouter.ai/docs/guides/privacy/provider-logging) | Endpoint/provider retention policy matters. |
| [Zero data retention](https://openrouter.ai/docs/guides/features/zdr) | Required privacy routing must hold across fallback; blocked if no compatible endpoint. |
| [OpenRouter AI SDK integration](https://openrouter.ai/docs/guides/community/vercel-ai-sdk) | Official adapter path. Some examples use older tool-schema conventions; verify installed AI SDK/provider versions rather than copying blindly. |
| [GLM 5.3 Flash](https://openrouter.ai/z-ai/glm-5.3-flash) | Current low-cost multimodal candidate for Shelf recognition and short grounded answers. It still requires the paid synthetic quality/privacy evaluation before activation. |
| [OpenRouter guardrails](https://openrouter.ai/docs/guides/features/guardrails/overview) | Provider-side key budgets and model/privacy restrictions complement Shelf's application reservations and rolling spend caps. |

Exact model suitability, accuracy, latency, schema transport and paid privacy routing are untested. Provider flags and per-request caps are requirements, not evidence of successful execution.

## Hosting, database and runtime

| Source | Relevance |
|---|---|
| [Render pricing](https://render.com/pricing), [compute plans](https://render.com/docs/compute-plans), [cron](https://render.com/docs/cronjobs), [free limits](https://render.com/docs/free) | Small paid web plus one cron chosen; avoid sleeping free compute for money reconciliation. Pricing snapshot in document13. |
| [Render Next deployment](https://render.com/docs/deploy-nextjs-app), [Next self-hosting](https://nextjs.org/docs/app/guides/self-hosting) | Node deployment path, no separate Vercel dependency. |
| [Supabase pricing](https://supabase.com/pricing), [connections](https://supabase.com/docs/guides/database/connecting-to-postgres), [backups](https://supabase.com/docs/guides/platform/backups) | Prototype Postgres economics and pooling/backup constraints; Magic remains auth. |
| [Neon free-plan article](https://neon.com/blog/how-to-make-the-most-of-neons-free-plan) | Considered alternative; page encountered inconsistent compute quota wording. No exact Neon allowance relied on. |
| [Cloudflare Next guidance](https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/), [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing) | Considered low-cost alternative; deployment/runtime differences not selected for baseline. |

## Access failures and research integrity

Some guessed/older Jupiter paths failed; official portal/index supplied canonical current pages. AI SDK structured-data and community-provider pages returned tool Internal Error in this session; the directly accessible OpenRouter guide and installed-package validation gate are used instead. Two xStocks rendered category pages failed, but the downloadable OpenAPI was readable through the web tool.

A direct sandbox curl of the xStocks OpenAPI on Sept20 failed with DNS resolution error (curl6); no response headers were available. The web tool retrieved the primary specification. No access control was bypassed and no account credentials were requested. Sept19 official event fetch details remain in the original research log; event dates were not reverified for this product-design turn.

## What remains genuinely unknown

Actual Magic–Jupiter–Token-2022–sponsor interoperability; fresh-wallet account-creation economics; current per-mint route availability; exact price-unit normalization; approved beta jurisdiction policy; genuine recovery behavior; paid model quality/privacy endpoint availability; verified barcode/license coverage; physical-device reliability; and user demand/retention.

The implementation pack addresses these with adapters, explicit gates, deterministic fixtures and measurable tests. Writing a requirement does not resolve an external gate.
