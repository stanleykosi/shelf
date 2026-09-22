# Historical snapshot — not the current build contract

See [research README](README.md) and [current product pack](../README.md) for precedence and corrections.

# StockLana — scan-to-invest consumer research

Research date: 2026-09-19. Own What You Buy, working product name **Shelf**. **Subsequent decision: the user accepted Shelf and explicitly requested AI integration and a complete product build documentation pack after clarification.** Implementation will happen in another repository; none is authorized here. This report records the supporting research, not an approved detailed product specification. Branch remains an archived alternative.

## Recommendation

**Shelf — turn the brands in your life into a portfolio you control.** Scan a product, discover its verified public-company connection, optionally collect several discoveries into a parent-company-aware shelf, and approve purchases of supported stock tokens into your own Solana wallet.

The first screen is a camera/product discovery experience, not a trading terminal. No purchase, receipt, bank connection, special payment card, merchant partnership or reward-token holding is required by the proposed workflow. Investing is paid for by the user from an existing funded wallet. This does not remove issuer restrictions or establish that the product needs no legal permissions.

**Changed assessment:** parking this idea simply because Grifin and Stash exist was too coarse. Consumer innovation can come from a materially better interaction, different access/custody model, and a compelling complete experience. A new financial primitive or bespoke smart contract is not a published event requirement. Conversely, “onchain” is not proof that nobody else is building it: a tokenized-stock receipt-reward concept already exists.

Recommended priority: pursue Shelf as the main consumer concept; retain Branch as the more financially novel, harder-to-explain alternative. This ranks fit to the user's stated interests and the event's usefulness/demo requirements, not win probabilities. No evidence supports a universal claim that consumer projects win more often than infrastructure.

## What existing products actually do

| Product | Documented workflow | Onchain status established in this research | Implication |
|---|---|---|---|
| Grifin | Connect spending cards and a bank account; invest in companies associated with purchases, through its investment account | Documented brokerage model via Apex, not delivery of stock tokens to a user wallet | Same emotional “invest where you shop” idea; proposed custody, inputs and access path differ |
| Stash Stock-Back | Qualifying purchases on its card earn stock rewards in a Personal Brokerage portfolio | Documented banking/brokerage reward program, not a token-wallet flow | Card-linked reward precedent; not the same as user-funded product discovery |
| TD Ameritrade Snapstock | A product barcode could reveal the public company, ticker, quote and research inside its mobile offering | Historical traditional-brokerage feature; current availability not researched | The camera/barcode-to-company concept is not new; primary evidence exists in its 2015 filing |
| Invest What You See | Product/photo/barcode/website recognition, related-company research, saved discoveries and supported brokerage connections | No onchain execution documented in the inspected app listing; absence of documentation is not proof of absence | Much closer interface precedent than Grifin; do not claim to invent visual stock discovery |
| RECEIPT | Photograph a purchase receipt; merchant-based tokenized-stock rewards funded by a separate token's trading fees and gated by token holdings | Advertises Robinhood Chain and some Solana coverage, but footer explicitly says stock-reward delivery is not live; no payout verified | Direct onchain-category collision, with a materially different funding/user action model and unresolved launch status |

Sources: [Grifin](https://www.grifin.com/), [Grifin onboarding](https://help.grifin.com/knowledge/grifin-101-start-here), [Stash](https://www.stash.com/learn/stock-back-rewards), [TD Ameritrade filing](https://www.sec.gov/Archives/edgar/data/1173431/000117343115000169/amtd_20150930x10k.htm), [Invest What You See listing](https://play.google.com/store/apps/details?id=com.investwhatyousee.app), [RECEIPT](https://receipt.family/), [RECEIPT workflow](https://receipt.family/docs).

### Important evidence qualifications

- Grifin's site describes US-resident advisory availability; its onboarding article more narrowly says US citizens/SSN. Do not silently reconcile those eligibility wordings or transplant them to Shelf.
- RECEIPT's homepage advertises live payouts while its footer says delivery is not live. Its docs and homepage also differ on reward details. Its proof page rendered loading/blank fields without inspectable payout transactions. Treat this as a competing proposition; do not call it either a verified live service or a scam.
- Invest What You See's developer-provided listing confirms advertised functionality, not tested brokerage execution or substantial adoption. Its standalone site was inaccessible to the web tool.
- No competitor applications were installed, accounts created, wallets connected or transactions sent. Search is not a census of StockLana entrants.

## The consumer problem and the stronger version

**Hypothesis:** people recognize products and brands more readily than tickers or corporate structures. A familiar object can be an inviting starting point for understanding an investment, particularly for an adult who already has a funded crypto wallet but has not explored stock tokens.

The missing step is not simply identifying a logo. Shelf should help answer:

1. What product/brand am I looking at?
2. Which public company is actually connected to it, and how?
3. Is an appropriate stock token available and tradable for me?
4. Do other products I scanned lead to the same company?
5. What exactly will I receive, what will it cost, and where will I hold it?

### Concrete example

Scan Pepsi and Doritos: both are in PepsiCo's official brand portfolio. Shelf groups them under **PepsiCo**, rather than implying that the user has discovered two independent stocks. Scan Gillette and Oral-B: P&G's published brand portfolio supplies another parent-family example. Corporate relationships should be source-backed and dated; listed subsidiaries, local licensees and regional product variants can make a simple global-parent mapping incomplete.

The next view can say: **four familiar products, two parent-company exposures**. The user can approve an allocation to the supported parents or just save the discoveries. The global parent, local manufacturer, retailer, bottler and licensee are not interchangeable; show the relationship type rather than inventing a unique economic beneficiary for every purchase.

PepsiCo evidence: [brand portfolio](https://www.pepsico.com/brands). P&G evidence: [2026 focused portfolio](https://us.pg.com/annualreport2026/pg-focused-portfolio/) and [brand directory](https://us.pg.com/brands/), available in first-party indexed extracts; direct web fetches of the P&G pages timed out in this pass. Reverify exact demo product/region relationships before implementation.

### Distinction from “stock in the shop”

A merchant-linked record can identify the supermarket where a purchase occurred; it does not necessarily identify every manufacturer inside the basket. A product scan can lead to the brand's parent regardless of the shop, or without buying the product at all. That is the proposed primary consumer distinction from card/reward-based alternatives.

Do not require receipt proof for a user-funded investment. A scan is discovery, not an entitlement to free money. The user can photograph the same bottle twice without defrauding a rewards treasury; just avoid duplicate discovery cards and make every purchase intentional.

## What onchain changes for the user

- **Portable holdings:** approved swaps deliver stock-exposure tokens to the user's own compatible wallet. The portfolio does not exist only in Shelf's database; issuer, network and transfer constraints still apply.
- **Wallet-native payment:** a user can choose to spend existing USDC rather than linking a supported bank/card to this app. Funding a wallet remains real onboarding friction; the MVP does not solve fiat access for everyone.
- **Product-first discovery anywhere:** no merchant enrollment is needed for the proposed discovery flow. Jurisdiction and asset eligibility still govern purchases.
- **Shareable recipes, independent ownership:** an optional shelf link describes products, verified parents and allocation choices. Another person can review and create their own purchases at new quotes; no pooled money or automatic copy-trading is implied.
- **Observable settlement:** show a completed transaction and independent wallet balance rather than an internal pending reward alone. A submitted transaction is not a confirmed purchase.

This is a product/interaction and custody differentiation claim, not a new protocol. Some of these benefits exist separately in other products. The opportunity is a clear, usable combination. More features are not a substitute for a good camera-to-wallet flow.

## Variants considered

| Variant | Consumer attraction / demo | Distinctness and trade-offs | Decision |
|---|---|---|---|
| Single product → stock | Immediate, understandable; easiest complete loop | Camera-to-stock has old and current precedents; wallet settlement adds a meaningful but narrower difference | Mandatory core |
| **Shelf: multiple discoveries → verified parents → wallet holdings** | Familiar products visibly collapse into the companies behind them | Adds parent awareness, deduplication and a portable visual portfolio to the core; still a differentiation hypothesis | Recommended product identity |
| Receipt → product-level basket | One shopping trip can reveal multiple companies, not just the merchant | OCR abbreviations and incomplete item names increase mapping errors; distinction from RECEIPT must be explicit | Later input mode; not required first |
| Scan-to-gift | Gift stock exposure associated with a physical item | Wallet transfers are composable, but recipient eligibility/onboarding and gift-claim security add scope | Stretch, not a second MVP |
| Scan-to-earn stock rewards | Familiar cashback proposition | Funding, fraud and reward eligibility dominate; directly adjacent to RECEIPT | Do not lead with this version |

No native token, NFT reward, retailer partnership or artificial yield is needed. A digital shelf is a presentation of discoveries and actual wallet holdings, not a newly issued fund token.

## Technical feasibility checked, not merely assumed

### Issuer metadata: live read-only results

On September 19, the public issuer endpoint `https://api.xstocks.fi/api/v2/public/assets/{symbol}` returned the following Solana deployments:

| Symbol | Underlying | Solana mint |
|---|---|---|
| PEPx | PEP / PepsiCo | `Xsv99frTRUeornyvCfvhnDesQDWuvns1M852Pez91vF` |
| PGx | PG / Procter & Gamble | `XsYdjDjNUygZ7yGKfQaB6TxLh2gC6RRjzLtLAGJrhzV` |
| AAPLx | AAPL / Apple | `XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp` |

All three returned `isTradingHalted: false`, while their issuer trading context reported `openNow: false`, `currentPeriod: closed`, and next change at September 21 00:00 UTC. These issuer-market fields do not establish that every secondary DEX pool is closed. The documented issuer RFQ minimums are not minimums for all DEX swaps.

Sources: [asset API specification](https://docs.xstocks.fi/apis/openapi/assets), [PEPx instrument](https://assets.backed.fi/products/pepsico-xstock), [PGx instrument](https://assets.backed.fi/products/procter-gamble-xstock). Exact mint state, decimals and Token-2022 extensions still require implementation-time verification.

### Small swap quote probe: successful, not executed

At approximately **16:32–16:33 UTC, September 19**, Raydium's public quote endpoint returned `success: true` for three separate **5-USDC** exact-input quotes, using `amount=5000000`, `slippageBps=50`, `txVersion=V0` and the issuer mints above. Canonical USDC input: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`.

| Output | Raw quoted output | Raw minimum output | Reported `priceImpactPct` | Reported USDC `feeAmount`, raw |
|---|---:|---:|---:|---:|
| PEPx | 3,694,276 | 3,675,804 | 0 | 13,381 |
| PGx | 3,317,432 | 3,300,844 | 0.05 | 12,500 |
| AAPLx | 1,484,785 | 1,477,361 | 0 | 5,000 |

Request pattern, read-only: `https://transaction-v1.raydium.io/compute/swap-base-in?inputMint={USDC}&outputMint={issuerMint}&amount=5000000&slippageBps=50&txVersion=V0`.

Endpoint and parameters were checked against the [official Raydium example](https://github.com/raydium-io/raydium-sdk-V2-demo/blob/master/src/api/swap.ts) and [SDK URL constants](https://github.com/raydium-io/raydium-sdk-V2/blob/master/src/api/url.ts). No repository script was run and no transaction was built, signed, simulated or submitted.

**What this supports:** small secondary-market routes existed in the returned snapshot, including during the issuer's closed period. **What it does not prove:** future availability, best execution across venues, underlying-equity fair value, correct rendered share-equivalent quantities, confirmation, or all-in cost. Network fees, priority fees, new token-account rent and any application fees must still be included. A reported zero price impact is not zero spread or zero cost. Do not turn these raw quantities into displayed shares without mint decimals and the effective multiplier.

### Recognition and company mapping

- Use barcode lookup where possible, with camera/photo recognition and manual confirmation as complementary paths. AI proposes a product/brand; it does not invent the legal parent or executable mint.
- Open Food Facts offers product lookup; its current docs recommend v3, identify rate limits and disclose incomplete crowdsourced coverage. Food/beauty/product catalogs are separate concerns, and data/image reuse has license obligations. No image uploads or data contributions were made.
- A small, curated ownership table should hold brand, relationship type, parent legal entity/ticker, applicable region, evidence URL, last-verified date and supported issuer mint. Plan 15–25 verified product/brand examples across a few parent companies, not universal recognition of every product.
- Unknown, private, ambiguous or untradeable matches should remain discoverable without a fabricated buy button. Never silently replace a private company with a loosely related listed supplier.
- Receipts/photos stay offchain. If images go to a recognition service, disclose it, obtain appropriate consent and minimize retention. Sharing a shelf should not reveal raw receipts, addresses, wallet holdings or purchase history by default.

### Execution path and contract scope

Jupiter's current Swap v2 documentation supports assembled order/execute transactions and a separate composable build path; all endpoints require an API key. Raydium's public quote path supplied the read-only evidence above and is a potential alternative, not an instruction to hardcode one venue forever. No Jupiter key was obtained or request authenticated.

A successful consumer entry **does not need a new custom smart contract**. The first version can use existing swap programs to deliver tokens directly to the user's wallet. If a later basket needs a custom router, prove the user benefit and transaction constraints first. Multiple stock purchases are not automatically one atomic transaction or one signature; an honest sequential flow with per-leg status is preferable to a false promise. Unspent user funds should remain in the wallet.

## Credible hackathon scope

**Core:** mobile camera/barcode discovery; a sourced company card; optional add-to-shelf; verified asset/eligibility status; user-chosen spend; quote with total-cost disclosure; wallet approval; confirmed holding visible outside the app.

**Shelf moment:** scan two brands with the same parent and a third from another parent. Group by underlying company, not by packaging or ticker aliases. Make budget allocation editable. Count parent exposures honestly: several consumer-stock positions are not automatically a diversified portfolio.

**Exclude:** automatic bank/card round-ups, paid rewards, new protocol token, full-world brand graph, autonomous investing, claimed financial recommendations, pooled fund shares, complex gift escrow, supply-chain guesses, and guaranteed one-transaction baskets.

The user can build contracts, frontend and backend, but team size and available hours remain unknown. Prototype execution belongs in a separate project workspace. Real-money demonstrations require explicit authorization, suitable assets and participant eligibility; otherwise label devnet/test-token transfers and live read-only quotes separately.

### Six-day sequence

1. Confirm supported demo products/parents/mints, access to recognition and swap services, current small-lot quotes and true setup costs. Freeze the coverage list.
2. Complete the real product-recognition → verified-parent flow with user correction and an unsupported-product state.
3. Complete one product → quote → approved purchase → verified wallet holding. Do not postpone settlement behind interface polish.
4. Add the visual shelf, same-parent grouping and simple budget selection; sequential purchases are acceptable if clearly labeled.
5. Rehearse normal and failure flows, permissions, receipt/photo privacy, stale quotes and uncertain recognition. Check a fresh wallet's costs.
6. Record the end-to-end demonstration, disclose reused components and limits, and submit before September 25 at 20:00 UTC / 21:00 Lagos.

### Two-minute demonstration

Begin with real everyday objects, not a price chart. Scan Pepsi, then Doritos: reveal the common PepsiCo parent with a source link. Add a verified product from another parent. The shelf shows the grouped exposure, not a fictitious diversified collection. Choose a small budget, review actual token identities and costs, approve the supported purchases, then show the resulting balance in a separate wallet view. Scan one private/ambiguous product and show an honest non-investable result. Label any mock execution as such.

The story is **recognition → understanding → intentional investment → portable holding**. No reward treasury or claim that brand loyalty predicts returns is needed.

## Judging comparison and decision

| Criterion | Shelf | Branch |
|---|---|---|
| Main-track fit | Explicit consumer/mobile investing and investing categories | Trading/structured-product categories |
| User value | Familiar entry point to corporate identity and wallet-held stock exposure; demand still a hypothesis | Conditional investment commitment; demand still a hypothesis |
| Technical credibility | Issuer mint data and 5-USDC quote paths checked; execution/recognition untested | Payoff design researched; verified oracle settlement untested |
| Meaningful Solana role | Wallet-native payment, real token delivery, portable holdings | Program-held inventory and outcome-selected settlement |
| Demo clarity | High: familiar object becomes a visible holding | Requires explaining conditional prices and obligations |
| Novelty | Product/UX/custody combination; scanner and shopping precedents disclosed | Financial-workflow combination; conditional-market precedents disclosed |
| Six-day feasibility | Favorable if a curated universe and existing swap infrastructure are used | More complex custody, event resolution and timeout state machine |
| Original work / continuation | Product-company mapping, parent-aware shelf and integrated flow; retention unvalidated | Allocation agreement implementation and new event types; counterparty pricing unvalidated |

**Recommendation:** prioritize Shelf for this user's consumer direction. This is not saying it is novel because the user likes it, or that every onchain adaptation deserves a prize. It has a clear consumer hook, a concrete difference from merchant rewards, and now some live read-only feasibility evidence. Branch remains available if the user ultimately prefers its deeper financial mechanism.

## Next validation and rejection gates

- Can the chosen real products be identified accurately enough to avoid buying the wrong asset? Uncertain matches must require correction or stop.
- Do fresh-wallet, all-in costs make the desired small purchase sensible? If not, use a larger disclosed budget or explicitly sponsored fees, not hidden costs.
- Does a person understand parent-company exposure and token ownership after seeing the flow? Liking a product is not evidence that its stock is attractively priced.
- Can at least one complete purchase be honestly demonstrated, with recognizable wallet balances? A camera demo alone is insufficient.
- Does the shelf add understanding and repeat usefulness beyond a one-time camera trick? Measures to test later include recognition completion, time to confirmed purchase, same-parent comprehension and voluntary return use—not fabricated user metrics.
- Does a closer competitor already combine product-level scanning, parent grouping, wallet settlement and portable shelves? Keep checking; the current scan does not prove exclusivity.

No customer interviews, competitor installations, authenticated trading requests, transactions, deployments or product code were performed. Public issuer data and three unsigned quote responses were the only live asset-market probes.

