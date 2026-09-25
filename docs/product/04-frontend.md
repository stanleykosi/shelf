# Frontend specification

## Stack and implementation boundaries

Use TypeScript strict mode, Next.js App Router, React version supported by the pinned Next release, Tailwind CSS with semantic design tokens, accessible headless primitives and one coherent icon set. Use the teammate's design assets when supplied. No generated skill palette, prescribed brand font or mandatory visual theme.

Use Node runtime server routes. Browser-only modules: Magic SDK/extensions, camera/barcode decoder, upload preview/crop, browser storage and signing UI. Dynamically import these behind client boundaries; do not instantiate Magic or read window at module scope in server code.

Use a small client query-cache library (TanStack Query) for private reads/status and forms with schema validation. Use Zod at HTTP boundaries. Domain arithmetic is in shared pure modules; no duplicate floating-point fee logic in components. Financial decisions remain server-authoritative.

The implementation repo must pin compatible package versions and commit a lockfile. “Latest” is an installation-time lookup, not a dependency specification. Check current framework security advisories and actual installed docs before generating code.

## Route layout

Public: /, /discover, /scan, /scan/results, /products/[id], /companies/[id], /learn, /learn/[slug], /assistant, /share/[token], /sign-in, /auth/callback.

Member: /welcome, /eligibility, /shelf, /shelf/share, /wallet, /wallet/deposit, /wallet/send, /invest/buy, /invest/basket, /invest/suggest, /invest/sell, /orders/[id], /orders/[id]/review, /portfolio, /portfolio/[assetId], /history, /history/[id], /settings.

/shelf and /assistant support guest variants without server-private data. Admin: /admin plus status, catalog, invites, orders and audit subroutes. Private pages and API endpoints authenticate independently; hiding a navigation item is not authorization.

Each route defines metadata, loading boundary, error boundary and unavailable/not-found behavior. All account, scan, share, order and portfolio routes use noindex and private no-store responses. Only public approved education/catalog content can be indexed if financial-content policy permits.

## Component responsibilities

| Component | Owns | Must not own |
|---|---|---|
| AppShell | Responsive navigation, status banner, account menu | Secrets or inferred financial eligibility |
| CapturePanel | Permission, camera lifecycle, retake, crop, downsampling | Upload without a user scan action, background recording |
| BarcodeReader | Local decode, checksum, manual fallback | Arbitrary QR execution |
| RecognitionResults | Candidate correction, selection, confidence wording | Generating executable token identities |
| RelationshipCard | Evidence links, region/relationship labels | Claiming all brand ties are outright ownership |
| ShelfView | Grouping and local/private saves | Treating save/remove as investment actions |
| WalletProviderBoundary | Magic client setup, verified wallet session status | Server private keys or automatic signatures |
| AmountForm | Decimal input and visible constraints | Deciding available funds from cached state alone |
| QuoteReview | Exact current terms, expiration and material-change display | Repricing silently after approval |
| SignRequest | Explicit signing transition and cancellation | Repeated background signing |
| OrderTimeline | Reconciliation states and per-leg outcomes | Treating timeout as definitive failure |
| HoldingView | Tracked/actual/reserved balances and units | Assuming all wallet tokens originated on Shelf |
| AIAnswer | Safe text, source cards, validated structured actions | Raw HTML, tool-driven navigation or transaction execution |
| SharePreview | Sanitized selected-catalog snapshot | Wallet/amount/history leakage |
| ErrorPanel | Recoverable action and request reference | Stack traces or provider response dumps |

## State ownership and persistence

- Server: identity, invite/eligibility, catalog evidence, shelf after login, order/quote versions, wallets, financial history, policy/budget configuration.
- In-memory browser: image bytes, crop previews, raw recognition/OCR display, chat transcript and pending wallet response. Revoke object URLs when no longer needed.
- Session storage: guest confirmed catalog IDs/shelf name, safe return route, nonfinancial basket draft IDs/amount strings. Clear on explicit “clear temporary data.” No image/OCR/chat/DID/signed transaction here.
- Query cache: private data scoped by immutable internal user ID and network; clear fully on logout, identity change and network switch.
- URL: public query/filter and opaque resource IDs only; no email, receipt content, private chat, amount-sensitive share data or signing payloads.

For successful sign-in, show merge prompt before moving guest items to the server. Merge is idempotent; delete local guest data only after confirmed merge or user's explicit discard.

## Data transport

Money mutations use the HTTP contracts in document 07 for explicit idempotency and contract testing. This is an intentional route-handler choice, not a mixture of competing Server Actions and REST mutations. Server-rendered public reads may call domain services directly. All private actions are server-validated regardless of transport.

Refresh balances on wallet view, return from deposit, confirmed transaction and manual refresh. Poll active operation at 2 seconds for 20 seconds, then 5 seconds until 2 minutes, then 15 seconds; respect server Retry-After and page visibility. Background reconciliation does not rely on an open browser.

Poll quotes only on explicit amount submission or user refresh; do not consume provider quota on every keypress. Local debounce is not a replacement for organization-wide provider throttling.

Use abort controllers for scans/questions when users cancel. Cancellation is best-effort at the provider and may still incur cost; do not claim otherwise.

## UX quality contract

- Mobile-first 360–767 px, tablet 768–1023, desktop ≥1024. No horizontal scrolling for primary flows. Dense technical content wraps or lives in disclosure panels.
- Bottom navigation and sticky financial CTAs reserve safe-area space and do not cover validation text or software keyboards.
- One visually primary action per decision screen. Back/cancel remains reachable. No irreversible gesture-only controls.
- Normal text ≥16 CSS px. Primary actions ≥44×44 CSS px; form controls ≥44 px high. Design at 200% zoom and reduced motion.
- Meet WCAG 2.2 AA as the target: contrast, keyboard operation, labels, focus management, announcement of status, error association and meaningful alt text.
- Financial amounts align consistently; use tabular numerals. Format locally, store UTC and exact decimal/raw strings. USDC is not labeled a bank dollar deposit.
- Do not show a blank trading chart as a placeholder for missing data. No faux users, holdings, liquidity or performance.
- Skeletons reserve layout. Failed network queries provide retry without erasing user input. Never optimistically update holdings.
- Accessible status messages use polite live regions except actionable critical errors; retain stable headings during polling.

## Security-sensitive frontend rules

Do not trust deep-link mint/amount params, local eligibility flags, model output or browser timestamps. Read server order version before signing. Hash/inspect returned prepared message; after Magic returns, send only to the matching preparation ID.

Content Security Policy must allow only approved Magic endpoints/frames and intended asset hosts. Test OAuth against it; do not relax to broad wildcard scripts. Sources open with noopener/noreferrer. No session replay, auto-captured form values or raw analytics events.

Image link previews cannot force server-side arbitrary fetch; URL scanning is a restricted backend operation. Guest quota tokens are not authentication tokens.

## Frontend acceptance

All C01–C109 controls in document 03 must have a tested destination/side effect and honest disabled/error condition. Route coverage cannot be replaced by a static mock dashboard. Money approval requires meaningful human interaction in every test scenario; mocked wallets may simulate this only in test environments.
