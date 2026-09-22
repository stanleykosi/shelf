# Trading, transfers and financial invariants

This document is the authority for money behavior. “Provider supports swaps” does not establish that our exact fee, sponsor, wallet and Token-2022 combination works. Complete the compatibility tests before accepting deposits or enabling live financial controls.

## 1. Assets and units

Mainnet only in real beta. Use canonical Solana USDC and an explicit issuer-verified stock-token allowlist. Never accept arbitrary mint addresses from frontend/AI/URLs. Read mint owner, decimals, extensions, freeze state and effective Scaled UI Amount multiplier from chain; compare to issuer metadata.

Settlement quantities are raw integer token units. UI quantities use verified decimals/effective multiplier at the relevant timestamp. Store historical unit snapshots; historical purchase quantities must not be recomputed using today's multiplier.

Do not use displayed “shares” as a signing amount. Buy spend is integer USDC; sell-all/transfer-max uses available raw inventory. Quantity conversions floor conservatively using tested official helpers; amount round-trip mismatch must be visible where material.

Initially support only reviewed extension combinations necessary for the selected xStocks, including Scaled UI Amount and harmless metadata extensions. Unknown transfer hooks, transfer fees, permanent-delegate changes, nontransferable/frozen states or other behavior outside the reviewed manifest disable affected operations until reviewed. Do not assume legacy SPL instructions apply to Token-2022 accounts.

## 2. Execution integration

Use Jupiter Swap v2 GET /build with exact input, resolved mints, user taker, separate sponsor payer, 50-bps integrator platform fee and validated USDC fee token account. Use returned instructions/account data with explicit compilation and policy checks. Do not modify an assembled /order transaction and then send it through /execute.

Send through the configured Helius RPC after simulation and required signatures. Jupiter's optional landing/tip path is not part of v1; avoid introducing an undocumented SOL tip into small purchases.

Relevant documented capabilities: custom payer and integrator fee account on /build, full composition control and Token-2022-aware route requirements. [Build docs](https://developers.jup.ag/docs/swap/build). Actual fee-side semantics and stock routes must be contract-tested; source inspection is not a live round-trip.

## 3. Fees and budget meaning

Shelf's configured fee is 50 bps (0.50%), collected in USDC in the same successful swap. Network costs are sponsored separately. Routing/pool costs and market spread can still affect receipt; show them where available without implying that an unavailable spread is zero.

**Buy:** the amount entered is the maximum total USDC debit for that leg, including Shelf fee. For a 10-USDC example, the intended Shelf fee is 0.05 USDC and the rest funds the swap before embedded liquidity costs. Normalize provider semantics to this contract; do not append a second fee transfer.

**Sell:** input is stock-token raw amount; show estimated gross USDC output, Shelf fee and net output/minimum. The quote adapter must establish whether provider output fields already include fees. Never subtract a fee twice.

Golden fixtures and simulation must establish:

- exactly one expected fee recipient;
- fee in USDC, not an unexpected stock token;
- no wallet USDC debit beyond the entered buy budget;
- true net minimum output enforced in transaction;
- fee rounding consistent with program implementation;
- failed onchain swap does not collect the Shelf fee (network fee may still be paid by sponsor).

Intended integer fee policy: floor(fee_basis_raw × 50 / 10000); buy basis is total budget and sell basis is gross output. If provider semantics differ, fail the compatibility gate and revise the adapter/visible contract explicitly before enabling; do not assume exact equality from an unchecked JSON field.

No independent pre-charge, post-charge retry or recurring allowance. Duplicate HTTP requests cannot collect the fee again. No Shelf fee on transfer/deposit. App fee recipient must never be used as a customer deposit address.

## 4. Prepare/sign/submit

1. Resolve authenticated immutable user/wallet/network and capability; validate adult/invite/eligibility policy and operator pauses.
2. Check daily buy limits, remaining tracked inventory (sell), cash, current reservations and wallet active-operation lock.
3. Refresh issuer/onchain metadata. Block if unavailable, inconsistent, stale beyond 60 seconds at preparation, or within 15 minutes before/after scheduled multiplier activation. This beta default adopts the example window in the [issuer's integration guidance](https://docs.xstocks.fi/developers/multipliers); it is not a guarantee that every incident resolves within that window.
4. Get provider build response through shared throttle. Validate schema, exact pair/input and route/program account manifest.
5. Derive exact fee, min output, expiration and sponsored-cost estimate. Reject impact >100 bps and slippage >100 bps. Default slippage 50 bps. Missing measurable price impact is not silently treated as zero; require an explicit reviewed policy before accepting.
6. Resolve address lookup tables from trusted chain RPC; inspect every signer, writable account, program, destination and fee instruction. Reject unrelated transfers, authority changes, delegate approvals, token-account closure, sponsor drains or injected memo URLs.
7. Compile transaction with the known recent blockhash and user+sponsor signer list. Simulate unsigned message with appropriate signature-verification setting for simulation only; all actual signatures verified before send. Require expected token deltas and bounded sponsor SOL changes. Simulation is not a fill guarantee.
8. Persist preparation and immutable review digest, quote version, message hash, account manifest and lastValidBlockHeight. Reserve wallet input and per-user buy budget in a short transaction. At most one active prepared/submitted spend per wallet.
9. Browser presents exact review. Explicit approval invokes Magic partial signing. User can reject.
10. Backend verifies session/capability again, exact message bytes/hash, user public key/signature, freshness, reviewDigest and preparation version. Recheck mint/action state and current block height.
11. Atomically reserve sponsor's global/user lamport budgets, including rent. Sponsor co-signs only this validated preparation.
12. Derive final signature; store signed bytes encrypted, signature and submission state before sending to RPC.
13. Broadcast exact bytes. Reply with signature and persistent status. Never expose sponsor key or create a generic cosigning API.

Quote age maximum 20 seconds, bounded additionally by blockhash and issuer transition. Any materially changed amount, fee, recipient, route policy, min output, unit snapshot or signing message requires a new review. Expiration must not be “fixed” by replacing the blockhash under an existing user signature.

## 5. State machines

```text
leg:
draft → quoted → prepared → awaiting_signature → signed → submitted
                                                        |
submitted → confirmed → finalized
          ↘ failed
          ↘ outcome_unknown → confirmed/finalized OR proven_failed/expired

Before submission: draft/quoted/prepared → cancelled or expired
After submission: cancellation means stop other unsigned work, not rollback
```

Use enum values consistently in code and API: draft, quoted, prepared, awaiting_signature, signed, submitted, confirmed, finalized, failed, outcome_unknown, cancelled, expired. Persist signed before network call so a crash between commit and broadcast is recoverable.

Confirmed success is displayed as “Confirmed—finalizing record.” Wait for finality and reconciliation before preparing/signing the next financial leg or releasing its predecessor's reservations. Permanent acquisition/disposition records post only at finality. This conservative beta policy keeps one unresolved spend per wallet.

Order aggregate: draft, in_progress, awaiting_user, complete, partially_complete, failed, stopped, outcome_unknown. Complete requires all legs finalized; partial means some finalized and others terminal/stopped. Any unknown active leg makes aggregate outcome_unknown until resolved.

## 6. Retry and reconciliation rules

- Persist signature before send; timeouts never mean definitive failure.
- Poll getSignatureStatuses and getTransaction with appropriate commitment and version support. Verify expected signers, program identities and actual token balances against preparation.
- Re-broadcast identical signed bytes only while still valid and not known landed. Do not reconstruct or sign a replacement automatically.
- Expiry is established through lastValidBlockHeight plus complete signature-history checks, not browser wall clock alone. If RPC history is insufficient, remain unknown and use secondary verification/support.
- A failed transaction with chain meta.err is terminal failed; record actual network fee and zero successful swap/transfer effect.
- On finality, insert unique chain event and update journal/lots/fees/status in one database transaction. Polling duplicate notifications are no-ops.
- Crash after chain finality but before DB commit is repaired from signature; crash before first broadcast uses stored signed bytes or safely expires.
- Manual retry after proven failure creates a new preparation version and requires fresh approval/signature. The same old client request cannot become a second order.
- Alert owner after 2 minutes of unknown status; escalate after 15 minutes. Persist and reconcile beyond alert thresholds; do not unlock on timeout.

## 7. Basket arithmetic and partial outcomes

Minimum 5 USDC/leg, total maximum 100 USDC, at most 5 unique companies. Equal split: divide budget raw integer by N, floor, allocate one remaining micro-USDC at a time in stable company-ID order. Custom allocations must sum exactly to requested budget; display any dust accurately.

No pool, fund token, escrow or backend custody. Each leg receives fresh quote, explicit review and user signature. No guaranteed simultaneous prices or automatic rollback.

Example fixture: 30 USDC → three 10-USDC legs. First finalizes; second fails; third is unsigned. Report 10 USDC spent (including first fee), 20 USDC unspent, failed second leg, not-started third. Sponsor may have paid network fees for the failure. Do not say all 30 USDC was refunded or all three investments succeeded.

Budget reservations block concurrent basket overspend. Unsigned drafts expire after 15 minutes; submitted/unknown reservation remains until reconciled. Stop remaining work releases only safe unsigned reservations.

On first basket preparation, atomically reserve the remaining basket USDC and buy-cap commitments per unsigned leg. Only one leg holds the active signing/submission lock. Expired quotes release their preparation, not unresolved chain work; safely release abandoned unsigned basket reservations at the 15-minute draft timeout. The user may resume by revalidating remaining funds/caps and reviewing fresh quotes.

Daily buy checks use finalized buy spend for the current UTC day plus all active buy reservations, including those created on previous days. At finality, attribute actual spend to the chain transaction's UTC date and reconcile the reservation exactly once. Missing block time remains conservatively reserved until resolved. A midnight timer must not release unresolved user/sponsor budgets. Daily cap is gross buy USDC debit including the Shelf fee; sells and transfers do not restore buy allowance.

## 8. Selling

Sell only up to actual spendable and Shelf-attributed raw inventory. Form presets calculate percentages in raw units. Sell-all uses full tracked spendable amount directly, not UI-rounded shares.

No minimum sell principal of 5 USDC: dust may be technically untradeable but must not be arbitrarily stranded by buy rules. Reject when no route or net output is zero; offer permitted transfer/help.

FIFO attribution across Shelf acquisition lots for records, not a jurisdiction-specific tax-lot election. Cost basis allocations floor proportionally and allocate remainder on final disposal so original acquisition cost is conserved.

User actual net USDC change, fee account delta and stock-token raw debit must match recorded transaction. Do not treat pre-swap quote as realized proceeds.

## 9. Transfers

Support canonical USDC and reviewed stock instruments. User selects amount or Max, reviews full address and signs. Fresh auth ≤15 minutes, 5 sponsored transfers/day, no arbitrary asset withdrawal endpoint.

For v1 recipient must be a valid Solana public key compatible with an ordinary wallet destination; reject own address, executable program, known mint account and ambiguous off-curve recipient. Supporting PDAs later requires explicit UX/security review, not silent acceptance.

Transfer quote/prepare endpoints build a local validated transfer preview, not a Jupiter swap. Amount and recipient are immutable review terms; input/output asset and amount are identical for the supported no-transfer-fee extension set, app fee is zero, and slippage/price impact are not applicable. USDC uses inventoryScope=cash; stock explicitly uses tracked or external. Different scopes are never silently combined.

Derive/create destination associated token account with correct token program; sponsor rent estimate included. Use transferChecked semantics and validated decimals/raw amount; support only reviewed extensions. No source-account closing or authority change.

Transfer-out is not a sale. Reduce tracked lots but do not record sale proceeds or a realized return. External recipient eligibility requirements depend on configured instrument policy; unrestricted public-key validation is not compliance clearance.

No cross-chain transfers, bridges, sending by username/email or hidden wallet import. Unknown outcomes follow the same reservation/reconciliation rules as swaps.

## 10. Shelf-origin holdings versus actual wallet assets

Tokens are fungible; the chain does not label “bought through Shelf.” Our attribution is an accounting convention:

1. A finalized Shelf buy creates a tracked acquisition lot.
2. Observed external inflow creates external/untracked inventory with unknown cost, never a Shelf lot.
3. A Shelf sell or tracked-holding transfer explicitly consumes tracked lots FIFO up to actual available balance. An explicitly labeled external-recovery transfer consumes external inventory only; mixed tracked/external amounts require separate intents.
4. Unsolicited external outflows consume external inventory first, then tracked FIFO for any remainder. Label such disposition External transfer/activity, not sale or known profit.
5. Internal movement between accounts of the same verified wallet is not a user-level disposal.
6. A returned transfer remains external unless uniquely reconciled under an explicitly supported reference flow; do not infer it restored the exact old lot.
7. Reconciliation must inspect relevant token accounts plus owner-address activity; owner signatures alone miss incoming transfers. Pagination/cursors must detect gaps.
8. If history is unavailable or accounting cannot explain actual balance, mark reconciliation_required, show last-known values and block affected overspending. Do not invent acquisition prices.

Portfolio displays tracked open lots only; Wallet shows cash and supported external assets separately. Each supported external asset has “Send received tokens,” opening the transfer flow with inventoryScope=external and a warning that these were not bought through Shelf. It uses the same eligibility, recipient, signing and sponsorship checks as tracked transfers. External tokens do not become portfolio holdings. A normal sell in v1 does not silently liquidate untracked assets.

## 11. Corporate actions and valuation

Raw balances may stay constant while displayed quantity changes. Record scheduled/effective multipliers; explain stock splits and reinvested dividends using verified issuer descriptions. Do not create a fictitious USDC credit for a multiplier increase.

Historical records preserve original raw amount, effective multiplier, display quantity, fee and source timestamp. Current holding view uses current verified multiplier. Total acquisition cost remains unchanged by a split absent an actual additional cash flow.

A token price's unit must be established before multiplication. Mark price unit raw_token/scaled_ui/underlying; normalize once. Applying multiplier to a price already scaled produces a double adjustment and is a release-blocking error.

For portfolio value use a verified secondary-market token mark with timestamp and normalization; issuer equity reference displayed separately. A sell quote is an executable estimate at that amount, not the same as an official stock-market print. Missing/ambiguous marks → value unavailable, not zero or a fabricated P&L.

## 12. Sponsor and treasury security

Fee collection account and gas payer are separate identities. Server gas key has a small SOL balance and no customer asset custody. Limit 0.005 SOL/transaction, 0.02/user/day and 0.10/global/day initially; reserve before signing, reconcile actual fees/rent after outcome. No auto-top-up without separate operator approval.

Account-creation rent can be reclaimed by account owners; repeated new accounts are an abuse vector. Limit creation counts and repeated asset/recipient sponsorship, monitor quota, and deny suspicious repeated churn. Never pay arbitrary SystemProgram transfers from sponsor.

Sponsorship is a beta subsidy and transaction-fee revenue may not cover it, particularly new accounts. Track costs separately; do not claim profitable unit economics. Exhaustion pauses new sponsored submissions with clear status, not a request for undisclosed SOL fees.

If sponsor signature/secret leaks, pause submission, rotate sponsor credentials and reconcile outstanding signatures. User funds are not automatically lost solely from sponsor key exposure, but any active transaction pipeline compromise requires incident review.
