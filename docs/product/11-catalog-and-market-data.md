# Catalog, issuer data, pricing and corporate actions

## Active issuer-feed discovery (U24, 2026-09-23)

Typed issuer browse reads all pages of the xStocks public assets endpoint and all valid Solana
PreStocks rows. Image and product-name searches infer a likely owner with AI and match its name
against those feeds. Product ownership is labeled as unverified; the issuer feed verifies only
the token's reported symbol and mint. No presaved company or product row limits discovery.
Barcode mode obtains a product-name clue from public Open Food/Beauty/Products Facts, then uses
the same AI and issuer-join path; a missing barcode result stays unresolved.
Before a selected asset becomes an order instrument, Shelf re-fetches the issuer listing,
inspects the mint's token program and decimals through Helius, and persists that identity.
Before Jupiter builds an exact-input route it re-fetches the issuer and requires the same mint.
Issuer xChange atomic-swap support describes a separate primary-market path and does not gate
Jupiter secondary-market liquidity; issuer trading halts and Jupiter's own route checks still
fail closed. Reviewed catalog rows below support the five product category collections, product
detail pages and shelf saves. They do not limit live AI or issuer search, and a reviewed
product-to-company relationship does not establish a current issuer listing.

## Verified relationship registry

The registry—not a model—is the authority connecting a product to a company and an allowed instrument. Store product family/SKU, brand, relationship type, global parent and relevant regional facts separately.

An official company brand portfolio supports a brand connection but does not prove that every local bottle, franchise or licensed SKU has identical ownership economics. Product screens say “Brand in [company]'s portfolio” or the verified relation, not “100% of your purchase goes to [company].”

Mapping review workflow:

1. Identify product/brand from primary packaging/corporate sources.
2. Record source URL, short supported claim, date, region scope and relation type.
3. Check conflicting parent/licensee/subsidiary facts and effective dates.
4. Resolve listed entity and exact issuer instrument independently.
5. Owner approves mapping and review expiration; default 90-day review cadence, immediate invalidation on credible contradiction.
6. Publish education first. Trading requires separate instrument/mint/liquidity/eligibility readiness.

Private companies, ambiguous ownership and unsupported instruments remain valid educational results with buying unavailable. Never replace an unavailable company with a supplier, sector ETF, synthetic prediction contract or vaguely related token without a separately designed user choice.

## Seed coverage

Target approximately 20 reviewed brand/product-family entries across all five requested categories. Initial financially verified mint snapshot covers AAPLx, PEPx and PGx; clothing entries can initially be discovery-only until a suitable exact instrument is verified. Do not call a category wholly investable if its entries cannot be purchased.

Document 16 contains candidate identities and evidence status. Do not fabricate GTINs: barcode fixtures must come from actual verified public catalog/product data with correct variant and region.

## Product-database use

Open Food Facts and its related catalogs may enrich barcode identity, but are optional external lookups behind timeout/cache/rate controls. Cache only permitted public catalog fields; retain attribution/license provenance. Keep derivative-database licensing obligations under review before mixing/releasing data.

Do not ingest all community data or copyrighted product imagery indiscriminately. A missing barcode lookup may fall back to visual recognition/manual catalog search. Raw user photos are not submitted as database contributions.

## Issuer API

Base: https://api.xstocks.fi/api/v2. These GET paths were verified in the issuer's [v2 OpenAPI](https://docs.xstocks.fi/_bundle/apis/@v2/openapi.json?download=) on 2026-09-20:

| Relative path | Shelf use |
|---|---|
| /public/assets | Directory ingestion |
| /public/assets/{symbol} | Instrument/deployment metadata |
| /public/assets/{symbol}/multiplier | Current/scheduled multiplier context |
| /public/assets/{symbol}/multiplier/history | Historical unit snapshots |
| /public/assets/{symbol}/price-data | Indicative reference, not execution |
| /public/proof-of-reserves/{symbol} | Timestamped issuer-reported shares held and circulating token supply across chains |
| /public/system/status/{symbol} | Issuer halt context |
| /public/corporate-actions/upcoming | Scheduled events |
| /public/corporate-actions/history | Historical/corrected events |
| /public/proof-of-reserves/{symbol} | Reserve disclosure links/data |
| /public/oracles/{symbol} | Oracle metadata |

Corporate-action pagination starts at page 1; inspect each endpoint's own paging contract rather than assuming a common base. Explicitly select network=Solana for the documented multiplier/history network query. Asset trading context is embedded in asset metadata. Validate nullable fields and issuer-versus-DEX meanings. These are documented public paths, not a report of executing every endpoint.

Implementation adapter must capture current API schema as an integration fixture and map only required fields. Public data access is distinct from authenticated issuance/RFQ access. Shelf does not need xChange credentials and must not present secondary trading as issuer redemption.

Token detail display reads the exact public asset record for xStock/underlying ISIN and listing context, then loads the Solana multiplier and timestamped reserve disclosure separately. The public `price-data` response inspected on 2026-09-25 contained only a numeric `quote`, with no source price timestamp; Shelf therefore does not turn that figure into a current-price or valuation claim on the detail page. PreStocks' public feed supplies token price, mark, valuations and supply but no per-value update timestamp; label these as issuer references with the feed retrieval time and show an amount-specific Jupiter route only during purchase review. Web-only PreStocks company stats are linked at the issuer page, not copied into Shelf as feed facts.

Startup requires public assets, exact Solana deployment, decimals/extension verification from chain and issuer product terms. No wallet funding if configured mints are missing, wrong-chain or inconsistent.

## Update schedules and freshness

- Asset directory/terms metadata: daily, and owner-triggered before enabling an asset.
- Active enabled mint state/multiplier: every 60 seconds while trading active, plus mandatory pre-prepare check; no more than 60 seconds old for financial review.
- Scheduled corporate actions/market context: every 5 minutes during active beta, daily when financial features disabled.
- Price marks: on-demand shared cache up to 30 seconds; validity also checks the source's original timestamp. Missing timestamp or ambiguous unit is unusable for monetary display.
- Source-backed company summaries/articles: editorial versioning, default 90-day review.
- No promises of issuer webhooks unless a currently documented supported contract exists. Timer-triggered multiplier activation can occur without a new account write.

If a scheduled transition falls within ±15 minutes of now, pause new preparation/submission for that instrument. Afterward reread mint/account state and issuer schedule, reconcile history and reopen only after consistent units. This default adopts the example window in the [issuer guidance](https://docs.xstocks.fi/developers/multipliers); unresolved inconsistencies extend the pause. Already-broadcast work remains monitored, not cancelled retroactively.

## Pricing sources and meanings

1. **Executable quote:** amount-specific secondary-market terms from Jupiter, expires quickly and requires confirmation.
2. **Token mark:** Jupiter Price v3 or validated equivalent, timestamped and unit-labeled; not guaranteed executable for the user's amount.
3. **Underlying reference:** issuer/oracle equity price and market status; not a token liquidity guarantee.

Jupiter Price v3 endpoint: https://api.jup.ag/price/v3?ids={mintList}; server API key chosen for consistency. The current portal advertises keyless access too, correcting the earlier blanket “all calls require keys” statement, but the product should use an owned restricted key with known quotas.

Never average these sources into an unexplained number. A stale underlying print outside stock-market hours must show its timestamp/closed context. DEX availability is independently quoted; “24/7 liquidity” is not guaranteed.

Normalization tests must prove whether the selected price field is per raw-token base unit or scaled UI/underlying unit. If unproven, withhold valuation and show quantity. This is preferable to multiplying by a wrong factor.

## Corporate actions

Fetch/review issuer events for dividends, splits and reverse splits. Explain instrument-specific treatment rather than assuming a cash payment. Scaled UI Amount can change displayed quantity without changing raw token count.

Required record: asset, external event ID, type, announced/effective timestamps, issuer source, prior/new multiplier if applicable, revision status and plain-language explanation.

Required UI:

- On affected holding: “Your displayed quantity changed because of [verified event].”
- Expand shows before/after quantity, invariant raw units where applicable, source and time.
- History distinguishes informational corporate event from purchase/sale/deposit.
- If an event is unverified, label quantity adjustment under review and do not invent its cause.
- Cost records retain acquisition cash cost and historical multiplier snapshots. Do not mistake a split for investment gain.

## Licensed content and education

Catalog images come only from approved licensed sources with attribution records or deliberately authored neutral illustrations supplied by the team. No retaining user images to fill the catalog. Text-only product cards are acceptable where rights are unknown.

Live issuer result logos come only from the current xStocks `logo` and PreStocks `image` feed fields. Accept HTTPS URLs on those providers' known logo hosts and paths; show text initials when a URL is absent or fails. A logo helps identify a listing but does not verify product ownership, issuer affiliation, or trading eligibility. Do not store copies in Shelf's catalog or treat the logo as relationship evidence.

Launch editorial articles:

1. A brand is not always a separate company.
2. What a tokenized stock represents—and does not.
3. How USDC deposits and Solana addresses work.
4. What you pay when buying or selling.
5. Why token and underlying stock prices can differ.
6. How splits and reinvested dividends affect quantities.

Each article has a reviewed body, source list, date, version and cautious examples. AI may explain the content, not silently rewrite published financial facts.
