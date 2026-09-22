# Historical consumer source ledger

Read with [Sept20 corrections](README.md); these are the original research observations.

## 2026-09-19 — Consumer scan-to-invest exploration and live quote probes

All entries in this section were read on 2026-09-19. Findings supersede the earlier blanket dismissal of Own What You Buy; earlier log entries remain historical. First-party marketing establishes an advertised proposition, not independently verified execution or demand.

### Event and competitor evidence

- https://hackathons.solana.com/hackathons/stocklana — refreshed directly at 16:28:24 UTC, HTTP 200. Visible page still closes September 25 at 4 PM ET, welcomes consumer/mobile investing, and showed 711 registrations / 126 submissions. No rule requiring a bespoke smart contract or privileging infrastructure over consumer products was found. Exact fetch method and headers are recorded in the log.
- https://www.grifin.com/ and https://help.grifin.com/knowledge/grifin-101-start-here — primary product/onboarding material. Spending-card and bank-linked investing, with brokerage provided through Apex; not a documented self-custodial stock-token flow. Footer and onboarding citizenship/residency wording differ, so no definitive eligibility interpretation was made.
- https://www.stash.com/learn/stock-back-rewards — primary Stock-Back description: qualifying card purchases and a Personal Brokerage portfolio; merchant stock or a chosen fallback. Confirms a traditional brokerage/card-rewards precedent, not product-level manufacturer recognition.
- https://www.sec.gov/Archives/edgar/data/1173431/000117343115000169/amtd_20150930x10k.htm — TD Ameritrade's 2015 filing explicitly describes Snapstock barcode/photo discovery of a public company, ticker and research. Strong primary evidence that scanning a product to discover stock is not new. Current feature availability was not checked.
- https://play.google.com/store/apps/details?id=com.investwhatyousee.app — developer-provided listing, updated June 18, 2026, advertising product/photo/barcode/website recognition, company discovery and supported brokerage connections. Closest current camera-UX precedent found. No onchain flow documented here; execution and adoption untested. The standalone https://investwhatyousee.com site could not be opened with the web tool. No developer personal/contact information retained.
- https://receipt.family/ and https://receipt.family/docs — receipt-to-tokenized-stock reward proposition, separate utility-token holding requirement and trading-fee-funded rewards. Advertises Robinhood Chain plus some Solana coverage. **Contradiction:** homepage live claims conflict with footer saying stock-reward delivery is not yet live; docs and homepage also differ on reward details. Treat as an onchain competing concept, not a verified working payout service.
- https://receipt.family/proof — rendered loading/blank payout and wallet fields; no inspectable payout was verified. This does not prove that payouts do not exist, and does not justify calling the service fraudulent.

### Product-to-parent relationships and issuer assets

- https://www.pepsico.com/brands — official portfolio lists Pepsi and Doritos, supporting the same-parent demonstration. Brand portfolios do not resolve every regional licensee/manufacturer relationship.
- https://www.pepsico.com/newsroom/stories/2026/pepsico-first-corporate-brand-campaign — September 17 corporate-brand story provides an additional first-party signal around familiar brands sharing a company. Marketing context, not consumer demand validation for Shelf.
- https://us.pg.com/brands/ and https://us.pg.com/annualreport2026/pg-focused-portfolio/ — official indexed excerpts associate Gillette and Oral-B with P&G. Direct web fetches timed out. Reverify specific products and regional relationships before treating these as implementation data; global parent and a locally listed subsidiary are different entities.
- https://assets.backed.fi/products/pepsico-xstock and https://assets.backed.fi/products/procter-gamble-xstock — issuer instrument pages identify stock-linked tracker certificates and Solana availability. Product terms, eligibility and issuer risks are not erased by secondary-market access. Ignore unrelated template content in rendered pages.
- https://docs.xstocks.fi/developers and https://docs.xstocks.fi/apis/openapi/assets — official integration/API material: public metadata differs from authenticated issuance/RFQ access, Solana mint metadata and Scaled UI Amount behavior matter. The linked https://docs.xstocks.fi/developers/quickstart was used; a guessed `/developers/api-quickstart-guide` path failed and was not treated as documentation.
- https://api.xstocks.fi/api/v2/public/assets/PEPx, https://api.xstocks.fi/api/v2/public/assets/PGx and https://api.xstocks.fi/api/v2/public/assets/AAPLx — three successful public, unauthenticated read-only curl requests. Confirmed underlying symbols and Solana mint addresses recorded in `consumer-research.md`. All reported not halted but issuer trading period closed, with next change September 21 at 00:00 UTC. Issuer RFQ minimums are not DEX-wide minimums. No onchain mint-state or decimal/multiplier validation performed.

### Execution and recognition feasibility

- https://github.com/raydium-io/raydium-sdk-V2-demo/blob/master/src/api/swap.ts and https://github.com/raydium-io/raydium-sdk-V2/blob/master/src/api/url.ts — official code inspected to establish quote host, GET route and request parameters. No script was executed. A guessed documentation subpage returned 404; the official repository supplied the relevant interface.
- `https://transaction-v1.raydium.io/compute/swap-base-in` — three public unsigned GET quote probes, approximately 16:32–16:33 UTC. Inputs: canonical Solana USDC, 5,000,000 raw units, each of the issuer-verified PEPx/PGx/AAPLx mints, 50-bps slippage, V0 transaction request. All returned `success: true`. Request pattern, raw outputs, minimums, reported price impact and swap fees are in `consumer-research.md`. No transaction was built, simulated, signed or sent. This advances earlier quote-feasibility unknowns but does not establish an executable confirmed fill, best price, fair-value spread or all-in first-wallet costs.
- https://developers.jup.ag/docs/swap — current Swap v2 order/execute and build paths; all endpoints require API keys. Assembled transactions and customizable paths have different constraints. No key obtained, authenticated request made or unconditional gasless/tiny-order guarantee inferred.
- https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/ — official product lookup documentation. Current v3 guidance, public read access, per-endpoint limits, attribution/database/image licensing, and crowdsourced coverage limits matter. Product-brand data is not an authoritative corporate-ownership registry.
- https://openfoodfacts.github.io/documentation/docs/Product-Opener/v3/products/get-api-v3-product-code/ and https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/tutorials/scanning-barcodes/ — barcode/product lookup path and scan integration context. No account, integration registration, data contribution or image upload made.

### Evidence boundary

- Primary event, broker, corporate, issuer and official SDK/API sources support the documented comparisons and proposed integration path. They do not establish that Shelf's precise combination is unique, that consumers will retain it, or that judges prefer it to Branch.
- No apps were installed, real-money purchases made, authenticated trading requests sent, protocol contacts approached or code implemented. All consumer architecture, scope and demo recommendations are proposals for a separate build workspace.

