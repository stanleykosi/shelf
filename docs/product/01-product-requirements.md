# Product requirements

## Product purpose

Help people understand which public companies stand behind everyday products and, when supported and eligible, intentionally buy corresponding stock-token exposure using a personal embedded Solana wallet.

Core promise: “Scan a product. Discover the company. Choose what to own.”

Explain on financial screens that a stock token is an issuer-defined instrument tracking an underlying asset, not a direct corporate voting share. No claim of price parity, profitability, consumer-product endorsement, guaranteed liquidity or universal availability.

## Users and modes

- **Newcomer:** needs explanations of company ownership, USDC, wallet addresses, fees and confirmation. Show concise help beside the action; do not force a course before scanning.
- **Experienced user:** needs exact mint, issuer, raw/display units, route, slippage, fee, chain link and records. Put details behind an accessible disclosure, not a separate expert mode.
- **Guest:** discovery and temporary shelf, subject to public-content/AI limits; no wallet or portfolio access.
- **Member:** Magic account, private shelf, invite status and eligibility state; financial capabilities vary by policy.
- **Owner:** catalog verification and operational control; no authority to sign for users, rewrite completed records or change a user's wallet.

## Requirement inventory

| ID | Requirement | Completion evidence |
|---|---|---|
| PR-01 | Camera capture, barcode, image upload, screenshot, receipt, approved URL, typed search | All seven inputs reach common results/correction flow; tests include unavailable permissions/unsupported sites |
| PR-02 | Detect multiple products without requiring exact SKU certainty | Up to 12 product cards; each individually confirmable/excludable |
| PR-03 | Source-backed product → brand → company resolution | Company relationship displayed with relation type, source and verification date; ambiguity blocks investing |
| PR-04 | Unsupported/private brands handled honestly | No invented mint, supplier proxy, or substitute investment; manual search/correction available |
| PR-05 | One private shelf with company grouping | Duplicate parent exposure grouped; discovery and actual holding visually distinct |
| PR-06 | Guest experience and post-login merge | Save locally, sign in, explicit merge, no lost items or duplicates |
| PR-07 | Magic embedded Solana wallet | Email/Google sign-in, backend verification, secure session, wallet binding, logout/recovery |
| PR-08 | USDC deposit and cash balance | Correct Solana address/mint, warnings, confirmed balance; no fiat-provider dependency |
| PR-09 | Single-company buys | Quote, fee/minimum preview, deliberate review/sign, verified outcome |
| PR-10 | Multi-company budget allocation | Deduplicate parents, edit amounts, sequential per-leg outcomes, unspent remainder retained |
| PR-11 | Sell to USDC | Reliable spendable amount, sell-all/dust handling, fee preview, confirmed proceeds |
| PR-12 | Outbound USDC/stock transfer | Recipient validation, amount review, fresh auth, correct program/units, independent confirmation |
| PR-13 | Shelf-origin portfolio | Tracked open lots and chain reconciliation; external deposits distinguished |
| PR-14 | Records/history | Immutable successful/failed/pending actions, CSV/JSON export, fees and corporate-action context |
| PR-15 | Corporate-action explanations | Historical/effective multiplier context, source links, cash-versus-reinvestment distinction |
| PR-16 | Educational AI | Grounded answers, citations, uncertainty, clear AI labeling, no signing tools |
| PR-17 | AI allocation suggestions | Editable supported-asset drafts; reasons/risks; deterministic limits; never auto-execute |
| PR-18 | AI shelf organization/summary | Proposed grouping/summary; changes require explicit application; undo where nonfinancial |
| PR-19 | Link sharing | Explicit sanitized snapshot, random secret, expiry/revoke; no profile/financial data |
| PR-20 | Transaction-fee revenue | Exactly once, same successful transaction, visible before signing and in receipts |
| PR-21 | Privacy | Images/OCR not persisted; user data never publicly indexed; deletion/export controls |
| PR-22 | Owner administration | Mapping/source review, asset pause, invite control, operational counters and redacted diagnostics |
| PR-23 | Failure-safe operation | Idempotency, chain reconciliation, no false “failed” on ambiguous submission, bounded sponsorship |
| PR-24 | Accessible responsive UX | Keyboard/screen-reader/zoom support, visible focus, mobile camera fallback, no hover-only controls |
| PR-25 | Learning/discovery return use | Browse verified brands, inspect common parents, read explainers without requiring purchase |
| PR-26 | Automated verification | Unit, contract, integration, browser, privacy, adversarial AI and ledger tests with mocks |

## Version-one boundaries

All PR requirements are in the beta implementation scope. Build them progressively; don't call the product complete after only the scanner works. Financial activation is independently gated.

Excluded: public launch automation, recurring investments, gifts, leveraged positions, shorting, NFTs/reward tokens, bank/card payments, pooled baskets, arbitrary token trading, delegated execution, external-wallet login, multiple named shelves, public social graph, universal retailer scraping, investment-performance rankings and tax filing.

Receiving an unsupported token remains a chain possibility. The app must warn that it cannot manage unsupported assets; do not silently delete evidence of an observed deposit or claim the wallet is empty.

## Quality targets, not measured results

- Scan UI reacts within 100 ms; progress appears by 500 ms. Normalized vision result target p95 < 15 seconds, hard timeout 30 seconds.
- Public content usable at 360 px width and 200% zoom; normal body text ≥16 CSS px, primary touch targets ≥44×44 CSS px.
- No purchase can be signed without showing asset/issuer, amount, Shelf fee, minimum received, slippage and network-cost payer.
- Chain “confirmed” status target within 30 seconds when the network permits; UI degrades to pending, never fabricates success to meet a timer.
- Zero accepted unknown mints or unverified ownership relationships in release tests.
- No image bytes, raw OCR, DID tokens, private keys, email or full receipt content in application logs.
- Exact integer monetary accounting, deterministic allocation rounding and idempotent event application.
- Educational content does not require wallet funding; users may dismiss investment prompts.

## Success instrumentation

Use aggregate operational counters, not invasive analytics: scan completion/correction/unsupported rates; source-card opens; distinct-parent comprehension test; first successful purchase conversion in opt-in beta testing; completion/timeout/partial-order rates; support incidents; measured model costs. Do not claim retention or customer validation from seeded tests.

No automatic purchase nudges based on inferred wealth or spending. No confetti, streak penalty, FOMO countdown, fabricated popularity or reward for increased spending.
