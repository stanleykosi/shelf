# Screens, controls and state specification

Every listed screen requires loading, usable, empty, recoverable-error, permission/eligibility and offline behavior where relevant. Global rules in document 02 apply; detailed money states in document 09 take precedence. CTA IDs are acceptance-test anchors, not visible UI decoration.

## S01 — Discover · /

Audience: everyone, subject to content policy. Primary C01 **Scan a product** → /scan, without automatically requesting camera access. Secondary C02 **Search products** → /discover?focus=search. Home explains that issuer facts and AI chat live on an exact token detail page, and links to the current issuer directory.

Show concise Scan/search guidance and token-page capabilities. Do not restore the product gallery, Product → Brand → Company relationship explorer, company research table, research coverage metrics or general assistant entry. Member header has cash/status only after authentication; never expose private server data in the guest HTML. If directory data is unavailable, typed search and Scan remain independently available.

## S02 — Explore/search · /discover

Active U30 flow: one search field checks the full current xStocks and PreStocks feeds first, then automatically asks OpenRouter for a likely product owner if no company matches. Search results replace the browse table while active. AI ownership is labelled unverified and only current issuer listings supply symbols and mints. Clearing search returns to the company spotlight.

The browse area first shows ten rotating assets from current issuer listings, with recognizable public companies and about two PreStocks listings. An All listings tab exposes every current xStocks and PreStocks asset in pages of ten; page changes do not refetch provider feeds. Show validated provider logos, editorial sector chips, a public/private market filter, and name ordering. The selection is not a performance ranking. Unknown sectors remain Other; an unavailable feed cannot create a fallback asset. C03 **View company details** opens the current issuer asset page. C04 **Clear filters** restores the featured mix. Empty filters, stale feeds and provider errors have distinct, recoverable states. The older product and brand browse tables and the manual refresh control are retired.

## S03 — Scan/input chooser · /scan

Modes: Camera, Barcode, Upload, Receipt, Product link, Search. Screenshots use Upload and are labeled in help, not a distinct technical channel.

C05 **Open camera** requests browser video permission. C06 **Capture photo** freezes frame; C07 **Retake** discards bytes; C08 **Use photo** sends the captured image for recognition without an extra consent step. Switch camera shown only if supported. Stop camera tracks on navigation/background/close.

Barcode mode reads camera frames locally; C09 **Enter barcode** fallback accepts digits, validates supported GTIN checksum, preserves leading zeros. Unsupported hardware/library → ordinary camera or manual entry.

C10 **Choose image** uses file input. Accept JPEG/PNG/WebP; enforce document 00 limits. HEIC/HEIF: convert only if a tested client decoder is provided; otherwise tell user to upload JPEG or take an in-app photo. PDFs/video/animated images are rejected.

Receipt: guide the user toward a clear image of the product lines. Before C11 **Read receipt**, show a local preview and retake/crop controls. Do not upload automatically on file selection.

Link: URL field, approved-host explanation, C12 **Find products**. Unsupported domain offers “Upload a screenshot instead”; no silent arbitrary fetch.

Typed input invokes S02. Camera denied: **Use an image** and **Search instead**, plus browser permission instructions. Upload too large: **Choose another image**.

## S04 — Scan results · /scan/results

Ephemeral result, owned by current browser/session; never encode image/OCR in query strings. Show “Check the matches” and a card for each candidate. On-screen thumbnail uses local object URL only, destroyed when leaving processing flow.

C13 **This is correct** confirms a candidate; C14 **Change match** opens catalog search constrained to that candidate; C15 **Remove result** excludes it. C16 **View company** opens a current issuer token detail only when an exact listing is confirmed; otherwise it offers issuer search. C17 **Save selected** saves confirmed catalog IDs, not raw extracted text. Initially no ambiguous candidates are selected.

Cards show Matched, Needs confirmation, Not in catalog, Private company, or Relationship not verified as separate states. Company/asset unavailability must not invalidate successful product recognition. Show overflow notice if result count exceeds limit. All rejected: offer scan/search. Refresh without result: “Scan expired” with **Scan again**.

## S05 — Product · /products/[id]

Show licensed catalog image or textual placeholder, product/brand, category, relationship path, sources and date. Do not retain the user's submitted photo as its image.

C18 **Save to shelf** toggles to Saved; C19 **Remove from shelf** needs nonfinancial undo, not a scary money warning. C20 **Explore company** searches current issuer listings for the reviewed company, then opens S06 only after an exact listing is selected. Ambiguous relation offers selection of region or **Report a mismatch**; no investment CTA until resolved. Report stores structured catalog IDs/reason, not image/receipt.

## S06 — Token detail · /assets/[provider]/[symbol]

This is the company and stock-token research destination for a current issuer listing. The former `/companies/[slug]` research URL is retired and returns 404. Show what the issuer instrument represents, source-linked company context where supplied, its limitations, and current provider observations. Separate issuer reference values from an amount-specific Jupiter quote; label timestamp/source/unit. Missing values are “Unavailable,” never zero.

C21 **Choose amount** → S15 after sign-in/eligibility if required. C22 **Chat with AI** opens S09 for this exact provider and symbol. C23 **View sources** links to issuer records and disclosures. C24's former separate company-to-token handoff is retired because this page is the token detail.

The token detail page shows **Chat with AI** beside purchase review and watchlist actions. It opens `/assets/[provider]/[symbol]/chat` with the exact current issuer listing loaded before the first question. No AI request happens merely by opening chat. There is no standalone general `/assistant` route.

The token page now leads with what the instrument represents and the next actions. xStocks shows the underlying ticker/exchange, issuer-session state, security identifiers, Solana mint, current Solana multiplier, and a timestamped issuer reserve snapshot where available. PreStocks shows issuer token reference, mark, premium/discount, implied and mark company valuations, issuer supply, and the official product page. Explain that issuer sessions and references do not establish Jupiter liquidity or an executable price. Optional disclosure outages leave the core token page usable; a current issuer trading halt pauses Shelf purchase review. Do not fill gaps in the public PreStocks feed by scraping its website.

Supported-but-paused: explain pause with no active purchase CTA. Discovery-only company: “Not available to buy on Shelf.” Closed underlying market: show warning and actual policy/routing state, not invented market reopening countdown.

## S07 — My shelf · /shelf

One personal shelf; C25 **Rename shelf**, 1–60 trimmed characters; neutral naming, no HTML. View toggle Products / Companies changes grouping, not investment allocation.

C26 **Scan another product** is primary when empty. On populated shelf C27 **Choose companies to invest in** opens selection; C28 **Summarize my shelf** invokes AI with scoped consent; C29 **Share by link** opens S25; C30 **Remove item** updates only saved discovery. Removing a discovery never sells a holding.

Guest banner explains temporary storage and C31 **Sign in to keep this shelf**. Summary includes repeated parents and category coverage, not “well diversified” based on logo count. AI organization is a preview; C32 **Apply organization** changes presentation ordering only, with Undo.

## S08 — Learning · /learn and /learn/[slug]

Versioned editorial content, sources and last review date. C33 **Explore related brands** and optional **Back to Discover** remain. C34's general **Ask a question** action is retired; users open AI chat from an exact token detail page. No buy CTA disguised as a required next lesson. At minimum ship six explainers listed in document 11. Error preserves topic title and offers Retry.

## S09 — Issuer-scoped chat · /assets/[provider]/[symbol]/chat

This page requires a valid xStocks or PreStocks provider and exact symbol. The issuer context card loads from the current feed. Intro says AI may be wrong and cannot place orders. Prompt input max 2,000 characters; C35 **Send message**; C36 **Stop response** aborts the browser wait (provider cancellation is best effort); C37 **Clear chat** erases the page-memory transcript. A follow-up sends only six bounded prior turns; a route change or reload starts a new conversation until retention is decided separately.

Show the issuer source and response citations. Keep the typed question after an error so the user can retry deliberately; no duplicate automatic billable retries. A missing current listing blocks scoped chat rather than using stale browser-provided facts. Privacy-routing failure: “Private AI processing is unavailable. Try again later or browse verified information.”

C38–C39 are retired from chat. Allocation suggestions remain in the explicit basket flow, never in an issuer answer. No markdown raw HTML, arbitrary embedded image or clickable transaction payload from model text.

## S10 — Retired allocation draft route

The separate `/invest/suggest` route and C40–C42 are retired. Editable allocation suggestions are created and reviewed within the S16 basket flow, with explicit user approval before any order.

## S11 — Sign-in · /sign-in

Email label/type/autocomplete; C43 **Continue with email**, Magic OTP modal; C44 **Continue with Google**, same-origin callback. C45 **Continue as guest** preserves local shelf.

Provider unavailable: identify affected method and offer the other. Invite status is checked without exposing a public list of invited emails. Already-associated-but-different identity: use original sign-in method; no auto-merge. C46 **Get sign-in help** opens configured support guidance.

## S12 — Welcome/invite/merge · /welcome

Show account created versus beta access granted distinctly. Owner invite required for full member functionality. Terms/privacy and adult confirmation are unchecked initially, versioned and timestamped.

C47 **Continue** enabled after required consents. C48 **Save my discoveries** explicitly merges selected guest catalog IDs; C49 **Skip for now** preserves guest draft until deliberate deletion/end of session. Account status pending → no deposit address reveal encouraging funding.

## S13 — Financial eligibility · /eligibility

Collect country of residence, current location country where required by configured policy, adult attestation and relevant issuer declarations with exact policy-reviewed copy. Do not collect passport/SSN documents in this prototype; if required, the financial feature remains unavailable pending an approved provider flow.

C50 **Check availability** applies versioned policy server-side. Allowed → return to amount/funding. Unknown/blocked → **Continue learning**, **View restrictions**, **Contact support**. No VPN or country-change workaround guidance. Self-declaration alone is not asserted as sufficient compliance.

## S14 — Wallet/cash/deposit · /wallet and /wallet/deposit

Wallet shows spendable USDC, pending changes, embedded wallet address and supported external inventory separate from Shelf portfolio. C51 **Deposit USDC**, C52 **Send USDC**, C53 **Refresh balance**. C52 also provides a contextual **Send received tokens** action on each supported external stock asset, opening S22 with inventoryScope=external; never mix it with tracked holdings silently.

Deposit shows network Solana, canonical USDC, wallet-address QR and full copyable string; C54 **Copy address**, C55 **I’ve sent USDC** → status refresh, not a credit. Banner: wrong network/token may be unrecoverable; deposits are not purchases. If cash is available, C56 **Return to purchase** obtains new quote.

Deposits without transaction detected: no fake timer promise. RPC outage says balances unavailable, not zero. Address binding failure/disabled beta: no deposit UI until corrected. Never display a server/sponsor address as the user's deposit destination.

## S15 — Single buy amount · /invest/buy?companyId=...

Selected company immutable unless user edits; amount USDC input, visible available balance, 5-USDC minimum and beta maximum. Presets 5 / 10 / 25 USDC are suggestions, not preapproved spending. C57 **Review purchase** creates a draft/quote; C58 **Deposit USDC** if needed.

Numeric input accepts at most 6 decimals internally, displays normal cents but shows nonzero sub-cent values without rounding to zero. Validation explains minimum, budget cap, stale metadata, unavailable route or unsupported eligibility distinctly.

## S16 — Basket · /invest/basket

Unique-company checklist, total budget and editable per-company amounts. C59 **Split equally**, C60 **Remove company**, C61 **Review basket**. Show leftovers explicitly and ensure sum equals budget in raw USDC units. Remainders use stable company-ID order.

Max 5 companies and per-leg minimum; duplicate product brands do not create duplicate legs. C62 **Get an AI draft** optional. Confirmation screen discloses sequential transactions; fees estimated until each leg is freshly quoted.

## S17 — Order review · /orders/[id]/review

Fields: buy/sell, asset/issuer/mint, USDC pay/receive, input quantity, estimated/min received, Shelf fee, embedded route fees/spread caveat, slippage, network-cost payer, quote age, available funds, corporate-action warning.

C63 **Approve purchase** or C64 **Approve sale**; action label must match side. C65 **Edit amount** invalidates prepared quote; C66 **Cancel order** abandons unsigned order.

Approval disabled for expired quote, blocked asset, unknown units, insufficient funds, unsafe price impact, exhausted sponsor or unresolved wallet operation. C67 **Refresh quote** shows changed terms and requires new approval. Do not run approval automatically when quote refresh completes.

## S18 — Order progress/result · /orders/[id]

State text: Awaiting your approval; Awaiting signature; Sending transaction; Submitted; Confirmed—finalizing record; Complete; Failed; Expired before submission; Checking transaction outcome; Partly completed; Stopped.

C68 **View transaction** opens configured explorer with noreferrer and no private app metadata. C69 **Check status** asks reconciliation. C70 **Review next purchase** advances a basket only after the prior leg finalizes and reconciles. C71 **Stop remaining purchases** cancels unsigned legs. C72 **Retry remaining purchase** always creates a fresh quote/version and is disabled while prior outcome is unknown.

Success: View holding / View record / Keep discovering. Failure shows whether funds moved and whether sponsor paid a network cost; never claim a rollback of earlier basket legs.

## S19 — Portfolio · /portfolio

Header “Your Shelf investments”; tracked open positions only. USDC is a separate Cash card, not part of stock holdings total. Position grouping by company and exact instrument. Show current estimated value only with valid normalized prices; otherwise partial/unavailable valuation.

C73 **View holding**, C74 **View history**, C75 **Discover companies** for empty state. Historical sold/transferred positions reachable from history. External received assets appear only under Wallet, labeled untracked; never import assumed purchase costs.

## S20 — Holding · /portfolio/[assetId]

Tracked quantity, onchain spendable quantity, pending/reserved quantity, current valuation timestamp, purchase records and corporate actions. C76 **Sell**, C77 **Send**, C78 **View company**, C79 **Why did my quantity change?**

Reconciliation discrepancy → visible warning; block affected spend until reviewed. Do not equate a multiplier change with new raw tokens or fresh cash dividends.

## S21 — Sell · /invest/sell?assetId=...

Quantity field plus 25% / 50% / 100% of spendable tracked raw inventory. C80 **Sell all**, C81 **Review sale**. Percentage math in integers with documented flooring. Do not allow external inventory to be silently counted as a Shelf purchase.

Small position with no viable route: clear dust/liquidity explanation and Send option where allowed. Reuses S17/S18 after draft.

## S22 — Transfer · /wallet/send

Asset selector (USDC/supported eligible holding), destination, amount/Max, display full destination before approval. C82 **Review transfer**, then C83 **Approve transfer**; C84 **Edit recipient** invalidates prepared transaction.

Reject same-address, mint-account address, invalid/non-wallet recipient under v1 policy, wrong network labels, above balance, caps or unsupported extensions. Fresh authentication required. No QR destination scanning in v1; source product scanner must never interpret a QR payment instruction as authorization.

Completed transfer opens S24 record. Checking outcome disables a duplicate send.

## S23 — History and exports · /history

Filters: all/buys/sells/transfers/deposits/corporate actions, date range, status; cursor pagination. C85 **View record**, C86 **Download CSV**, C87 **Download JSON**. Exports include UTC timestamps, raw and displayed units, mint, multiplier snapshot, fees, signature and status; no secrets or unrelated users.

Empty: explain no activity, offer Discover/Deposit. Date validation clear. Export limits 10,000 rows; narrower date range if exceeded. Escape spreadsheet-formula injection. Corporate actions are informational events, not fabricated USDC receipts.

## S24 — Activity record · /history/[id]

Read-only financial facts, pending/final status, amounts, exact asset, fee breakdown, source order and chain signature; technical disclosure for raw units/multiplier. C88 **View on Solana**, C89 **Get help with this record** exposes a redacted support reference. No edit/delete completed-transaction button.

## S25 — Share preview/view · /shelf/share and /share/[token]

Owner preview lets user select saved catalog items; no notes/amounts. C90 **Create private link**, C91 **Copy link**, C92 **Revoke link**, C93 **Create new snapshot**. Describe bearer-link access accurately, not “only friends can see.”

Recipient C94 **Save these discoveries** copies catalog IDs to their own shelf; never copies holdings or executes investment. Expired/revoked/unknown links all return generic unavailable. No public social profile, comments, view tracking, crawler preview with personal data or automatic OG image fetching.

## S26 — Settings/privacy/support · /settings

Account method, masked email, wallet address, terms/privacy versions, data controls and clear public-chain disclosure. C95 **Export my data**, C96 **Delete my Shelf account**, C97 **Sign out**, C98 **Sign out all sessions**, C99 **Get support**.

Deletion requires recent auth and explains retained statutory records if policy requires, irreversible chain data and wallet-provider independence. Pending money operations must reconcile before deletion completes; unspent assets trigger prominent withdrawal/recovery guidance. Do not delete a Magic wallet or lock a user out of assets as a side effect.

Settings do not allow arbitrary wallet replacement or email identity merge. The token chat can clear its page-local conversation.

## S27 — Owner console · /admin

Server-authorized owner only; 404 for other users. Sections: status/budgets, invites, catalog relationships, source review, asset readiness, pending orders, reconciliation issues, audit and configuration.

C100 **Approve mapping**, C101 **Reject mapping**, C102 **Pause purchases**, C103 **Pause all submission**, C104 **Resume after checks**, C105 **Run reconciliation**, C106 **Invite beta user**, C107 **Revoke beta access**, C108 **Review budget**, C109 **Export redacted diagnostic**.

Each material action requires reason and audit. Mapping approval shows original evidence; never model-only approval. Pauses distinguish buys from sells/transfers; do not block exits unnecessarily. Owner cannot transfer customer funds, alter signed terms, fabricate settlement, erase financial history or reveal user photos.

## Common component contracts

- Buttons show pending state and suppress double activation; server idempotency still required.
- Forms use visible labels, field errors and focus first invalid field. Avoid disabling a CTA without an adjacent reason.
- Dialogs trap/restore focus, support Escape/back unless cancellation would falsely imply a chain rollback.
- Financial error summary persists; toast is supplementary.
- Unavailable balances/prices render a dash plus explanation, never “0.”
- Charts are optional in v1; text/table values remain complete. No invented historical graph.
- External source links use verified safe URLs; untrusted AI text never controls navigation attributes.
