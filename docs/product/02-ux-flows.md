# Experience architecture and flows

These are functional UX decisions, not a visual identity. The frontend teammate chooses typography, color, illustration and component styling. Do not use the UI/UX skill or its previously generated recommendations. Product hierarchy and behavior below remain binding unless deliberately revised.

## Information architecture

Mobile primary navigation: **Discover · Scan · Shelf · Portfolio**. Scan is visually prominent but still has a text label. Account/wallet/settings live in the account menu. Learning content is reached from Discover, products, companies and the assistant. Desktop uses the same destinations in a header/sidebar; preserve route meaning.

Guests see Portfolio's explanation and sign-in CTA, never fabricated balances. Existing members see a pending-transaction banner across financial screens until resolution. Do not put market tickers or flashing price charts above the scanner.

Content hierarchy:

1. Recognizable product and confirmed identity.
2. Brand-to-company relationship, with an accessible source.
3. What the company does and overlap with existing shelf items.
4. Available issuer instrument and its limitations.
5. User-selected spend and financial review.

## Functional wireframes

### Discovery and understanding

```text
Discover
Scan a product to find the company behind it
[ Scan a product ]     [ Search products ]
Browse: Groceries | Beauty | Electronics | Clothing | Household
Learn: Brands are not always separate companies
Navigation: Discover | Scan | Shelf | Portfolio

Result
[recognized product]          [Change match]
Doritos → PepsiCo
Also behind: Pepsi (already on your shelf)
[View relationship source]
[Save to shelf]               [Explore company]
Stock-token availability: shown separately, never inferred from recognition

Company
PepsiCo · PEP
Brands on your shelf: Pepsi, Doritos
About | Risks | Sources
Available exposure: PepsiCo xStock · PEPx · issuer shown
[Choose amount]               [Ask a question]
```

### Financial review

```text
Review purchase
You pay                      10.00 USDC
Shelf fee                    amount from the actual quote (0.50%)
Estimated receipt            correctly scaled token quantity
Minimum receipt              correctly scaled minimum
Network/account costs        Covered by Shelf · estimated SOL cost in details
Slippage                     0.50%
Instrument                   PEPx · issuer · Solana
Quote expires                absolute/local countdown
[Edit amount]                [Approve purchase]
Nothing has been purchased yet.
```

Never fill these values with invented example data in a live mode. A read-only preview must say it is not an executable order.

## J01 — Guest scan to saved discovery

1. Open Discover; no camera prompt on page load.
2. Tap Scan a product. Choose camera, barcode, upload, receipt, link or search.
3. For images, show the processing notice and let the user crop/rotate/retake before upload. Explain no images are kept by Shelf.
4. Recognize up to the documented candidate limit. Show each candidate and explicit uncertainty.
5. User confirms the matching catalog entry or chooses Change match. Uncertain candidates are not preselected for a purchase.
6. Show verified company relationships; ambiguous/private/unsupported results keep educational value but no investment CTA.
7. Save to temporary shelf. Toast: “Saved on this device for this session.” Secondary CTA: Sign in to keep your shelf.
8. Browser Back restores selected products while the tab is open. Reload after ephemeral result expiry yields “This scan is no longer available. Scan again or search.”

No purchase is a side effect of capture, recognition, save or sign-in.

## J02 — Guest becomes member

1. Sign-in may be initiated from Save, Portfolio, Share or Choose amount.
2. Preserve only normalized product IDs and a safe same-origin return route.
3. Email OTP/Google authenticates via Magic. Backend verifies identity and Solana wallet, invite status and session.
4. On first login, show terms/privacy acknowledgment and confirm adult status; request financial eligibility separately when appropriate.
5. Present “Save your discoveries?” with selected catalog items. Merge by catalog-item ID; no duplicate company investments or purchases.
6. Return to the initiating action. If it was purchase, resume amount selection, not approval.

Declined invitation or unavailable Google leaves the temporary shelf intact. Email/Google identities are not merged just because email strings match.

## J03 — Fund and buy one company

1. Member selects supported company → amount.
2. Backend checks invite, eligibility, instrument status and price/unit metadata.
3. If cash is insufficient, show Deposit USDC. On deposit screen show only Solana USDC and the user's verified Solana wallet address. Explain wrong-network risk.
4. Refresh after deposit; chain confirmation updates cash. Offer Return to purchase, retaining the amount but obtaining a new quote.
5. Quote displays fees, min receipt, available balance, sponsor status and restrictions. Insufficient sponsor funds is not presented as insufficient user funds.
6. Approve purchase triggers server preparation and transaction inspection; if quote changed/expired, show the refreshed terms and require another deliberate approval.
7. User signs via Magic; backend verifies unchanged message and user signature before sponsor signing and submission.
8. Show Submitted → Confirmed → Finalized. Finalized creates the settled acquisition record exactly once.
9. Offer View holding, View record, Keep discovering. Do not auto-reinvest or auto-share.

## J04 — One budget, several companies

1. Select shelf companies, not products. Repeated brands count once.
2. Enter total budget in USDC; default equal-weight among selected parents. Show dollar amounts and percentages together.
3. Max 5 parents; every buy leg ≥5 USDC; total ≤100 USDC. Explain conflicts immediately.
4. AI may create an editable proposal, but it cannot start the basket or replace manual allocations without Apply draft.
5. Review basket totals and explain: “Purchases happen separately. Prices can change between purchases. You approve each one.”
6. Quote and approve first leg, show confirmation progress, then wait for finality/reconciliation before enabling Review next purchase. Never prepare/sign the next leg while the previous spend is unresolved.
7. If a leg fails or is unknown, pause. Show what was bought, what remains unspent, and the unresolved leg. Do not reprice/retry automatically.
8. User may stop remaining purchases. Completed legs remain; no automatic compensating sales.
9. Summary accounts for every leg and cash remainder. “Complete” means each requested leg succeeded; “Partly completed” is a first-class result.

## J05 — Sell a Shelf holding

1. Holding → Sell. Show current tracked, actual, reserved and sellable quantities.
2. Enter displayed token quantity or choose Sell all. “All” maps to authoritative raw spendable inventory, not a rounded UI string.
3. Explain estimated USDC proceeds and fee; no promise of original purchase price.
4. Review, explicit approval, Magic signature, confirmation.
5. Reduce attributed lots using the documented FIFO allocation; retain historical acquisitions and dispositions.
6. If no route exists, show liquidity unavailable and offer refresh or eligible transfer. Do not treat issuer redemption as an automatic retail API fallback.

## J06 — Transfer

1. Wallet or holding → Send. Choose USDC or a supported tracked holding.
2. Paste Solana address; validate base58, length, account type and mint-account mistakes. No automatic ENS/email resolution.
3. Enter amount or Max. Show full destination on review, network, asset/mint, fee payer and irreversible-transfer warning.
4. Require fresh authentication if older than 15 minutes; clear review if recipient/amount/asset changes.
5. Approve transfer → sign → verify → submit → record. Confirmation timeout means pending, not safe to resend.
6. Transfer-out adjusts tracked positions but is not a sale or realized gain. Recipient gets no app message/email by default.

## J07 — Ask, learn, and get allocation suggestions

1. Ask a company question from the company's context or open the assistant.
2. Consent context identifies exactly what is sent: question and relevant catalog/source content, not wallet/email or receipts.
3. Display answer with sources and verification timestamps. Unsupported claims receive uncertainty, not invented citations.
4. Suggest an allocation asks for an explicit budget and user-chosen categories/companies; optional “use my shelf” consent supplies only relevant normalized catalog IDs.
5. Return suggested candidates, editable weights, rationale and concentration warnings. Users can reject, edit or Apply to basket.
6. Only the ordinary basket purchase flow can spend money. Chat has no execution, approval, transfer, secret or admin tools.
7. Financial eligibility or recommendation-policy failure shows education instead, with a truthful reason.

## J08 — Share without exposing finances

1. Shelf → Share by link.
2. Preview exactly what will be shared: selected products, parent names, relationship explanations and approved source links.
3. No actual positions, dollar allocations, email, address, profile, scan dates, receipt or notes.
4. Create link, display expiration and “Anyone with this link can view this snapshot.”
5. Copy link only on user action. Recipient sees read-only snapshot and may copy public catalog items into their own temporary shelf.
6. Revoke or regenerate link. Revocation stops future app access; cannot erase recipients' screenshots or copies.
7. Changes to the owner's shelf are not silently published; regenerate snapshot explicitly.

## J09 — Learn and discover again

Discover shows curated catalog collections by category and short source-backed explainers: what a parent company is, why brands overlap, what a stock token represents, how fees work, and how dividends/splits affect displayed quantities. No personalized purchase recommendation is smuggled into “education.” Saving and learning remain useful without funding.

## Global behavior

- Money-related controls never rely on toast-only confirmation. Status has a stable route and refresh recovery.
- Back, Cancel and Close mean navigation or abandoning unsigned work; never reversal of a submitted chain action.
- A disconnected network disables new approval with retry guidance, preserving drafts but not stale quotes.
- Browser close after signing is recoverable via History; wallet queue remains locked while outcome is uncertain.
- Service failure messages name the affected capability without exposing provider credentials or internal traces.
- A user can log out even during a pending transaction; chain monitoring continues. Logout does not undo submission.
- All irreversible actions use plain verbs. Avoid “Get free stocks,” “guaranteed,” “safe return,” “instant” or “anonymous.”
