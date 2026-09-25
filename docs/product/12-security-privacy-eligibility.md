# Security, privacy and financial eligibility

This is an engineering threat model and readiness policy, not legal advice or a security certification. Private beta status does not remove responsibility for real funds, personal information or instrument distribution.

## Trust boundaries

Untrusted: browser inputs/storage, uploaded images/EXIF/OCR, QR/barcodes, product websites, model output, unknown token metadata, provider errors, copied URLs and externally received tokens.

Trusted only after verification: Magic authentication evidence, exact Solana wallet binding, approved corporate relationships, exact issuer mint, versioned instrument terms, transaction message and chain outcome.

Operator-controlled secrets: provider keys, database credentials, session/data-encryption keys, sponsor signer. User private signing keys must not enter Shelf servers, logs, storage or AI context.

## Threat/control matrix

| Threat | Required control | Verification |
|---|---|---|
| IDOR across shelf/orders/exports | server-derived owner scope on every repository query | two-user authorization tests for every private endpoint |
| Stolen/replayed login | audience/time/issuer verification, nonce binding, secure cookies, rotation | forged/expired/replay tests |
| Email collision creates wrong wallet | immutable provider subject, Solana-specific metadata, no email-only merging | same email/different issuer fixtures |
| XSS through AI/catalog/report | escaped text, safe Markdown allowlist, CSP, no raw HTML | malicious markup fixtures |
| Prompt injection from package/receipt/site | no financial tools; typed outputs; approved source/mint resolution outside model | adversarial images/text and forged IDs |
| SSRF through product links | host/path allowlist, DNS/IP/redirect checks, pinned validated destination, size/time caps | loopback/metadata/IPv6/rebinding/redirect tests |
| Image decompression bomb | decoded-pixel/byte/type/concurrency caps and re-encoding | oversized and malformed fixtures |
| Duplicate buy on retry | client-intent uniqueness, preparation hash, deterministic signature stored before broadcast | crash/timeout/double-click tests |
| Sponsor drains | program/account instruction manifest, simulation, user signature, atomic budgets, creation caps | arbitrary SystemProgram/delegate/rent abuse fixtures |
| User signs modified recipient/fee | full message/digest comparison, fresh review, destination allowlist | tampered bytes/account-table tests |
| Counterfeit token symbol | issuer/onchain mint verification; no client/AI mint input | same-symbol fake mint fixture |
| Wrong Token-2022 units | official conversion tests, historical multipliers, pause windows | raw/UI/transition fixtures |
| False success from provider response | chain-meta/delta verification and finality journal | quote/submit success but chain failure fixture |
| Stale balance overspend | wallet lock, DB reservations, actual onchain checks | two tabs, two simultaneous orders |
| AI spend abuse | quotas, atomic cost reservations, request cap, no privacy-losing fallback | parallel guest requests and timeout accounting |
| Shared link exposes history | positive-field snapshot allowlist, random secret, no tracking/referrer, revoke | response schema and DOM tests |
| Sensitive logs/backups | redaction-by-allowlist, content logging off, encryption and retention | log capture scan and restore audit |
| Dependency compromise | pinned lockfile, audit, limited scripts/permissions, version review | supply-chain check and reproducible build |
| Admin compromise | owner allowlist, fresh auth, audit, low sponsor balance, scoped pauses | role forgery and key-rotation drill |

## Financial access policy

User wants global reach. Implement global-language/product accessibility **without asserting worldwide permission to market or trade stock instruments**.

xStocks' primary legal overview states restrictions involving the United States/U.S. persons and other prohibited jurisdictions; distributors have their own responsibilities. This requires more than a “not financial advice” footer. [Primary terms](https://docs.xstocks.fi/docs/product-legal-overview).

Capabilities are independently evaluated: view general learning, view instrument promotion, generate allocation suggestions, reveal deposit instructions, buy, sell, transfer. Maintain country/person/issuer rules as versioned reviewed policy. Default ALLOWED_FINANCIAL_JURISDICTIONS empty; unknown is denied. This is a safe bootstrap default, not a permanent product-country selection.

Collect only required declarations and policy references. Self-declared country plus an IP signal is not asserted sufficient identity/KYC verification. If instrument/provider/local requirements demand identity checks or licenses not available, keep real-money capability off while development and appropriate general education continue.

Recheck before preparation/submission, on policy changes and at policy expiry (default24 hours). Blocked new purchases do not automatically imply freezing records or disabling lawful exits. Operator review defines exit access; issuer transfer/freeze restrictions still apply.

No VPN evasion instructions, false country selection, bypassed issuer controls or unreviewed “any wallet is eligible” route.

## AI allocation policy

Implement requested suggestion/draft features. Distinguish product education from personalized investment advice. Do not collect income, debts, dependants or other suitability data merely to simulate advisory competence.

Allowed initial behavior: explain a bounded set of verified companies matching explicit selected interests and create an editable equal-company budget draft. Show that familiarity is not valuation, limited universe creates concentration, tokens add issuer/liquidity risk, and Shelf earns transaction fees.

No guaranteed returns, implied professional endorsement, “best investment for you,” prediction of appreciation, or automatic sign/execute tools. Country/product recommendation-policy readiness is separate from AI technical readiness. If not approved, expose education and manual allocation without the financial suggestion CTA.

## Privacy requirements

- Process images/OCR in transient memory only; release buffers on all paths and never persist them in DB, logs, caches, queues, object storage or crash traces.
- Shelf does not retain submitted scan images. Describe external image processing in the privacy policy and enforce documented ZDR/no-training routes server-side; the Scan UI does not require a repeated consent checkbox.
- Store confirmed catalog selections, required account records and minimal operations metadata, not shopping receipts or behavioral profiles.
- No session replay, advertising trackers, automatic screenshot capture, geolocation precision, contact uploads or wallet/email disclosure to AI.
- Product URLs may contain personal query tokens: strip known tracking fields, reject credential-bearing/private URLs, do not log query strings.
- Share pages have no third-party analytics, remote trackers or user-specific OpenGraph previews. Tokens stripped from access logs; Referrer-Policy no-referrer.
- Application privacy does not hide public onchain activity. Disclose this before funding; never market a standard Solana wallet as private/anonymous.
- Data export authenticated and fresh-authorized. Deletion removes normal account/shelf data within7 days after safety checks; records under reviewed retention policy are minimized and explained. Backups age out within30 days and replay deletion markers after restore.

## HTTP and secret security

TLS everywhere; Secure HttpOnly SameSite cookie; HSTS after domain setup; CSP with documented Magic origins only; frame-ancestors none except required owner-reviewed embeds; content-type and upload limits; nosniff; restrictive Permissions-Policy (camera self, microphone/geolocation disabled).

Same-origin mutation validation plus CSRF token; CORS never wildcard with credentials. OAuth callback state/nonce and safe return URLs. Error responses no stack traces/secrets.

Secrets stored in environment secret store, never public-prefixed unless deliberately publishable (Magic publishable key). No private RPC key in frontend. Sponsor environment isolated from preview/mock deployments. Least-privilege Jupiter key for selected products, read-only source credentials when applicable.

Rotate credentials after exposure, revoke sessions on auth-key compromise, and keep an operator-owned emergency submission pause. An app feature flag is not a substitute for secret revocation.

## Release security gate

Before funded beta: pass identity, transaction parser, sponsor, privacy, dependency and restore tests; configure jurisdiction/provider policy; verify financial disclaimers and fee disclosure; operator accepts bounded treasury costs; obtain separate approval for controlled mainnet tests.

Before public release: qualified review of distribution/advice obligations, threat-model review by another qualified engineer, wallet recovery verification, production backups/monitoring/support, provider terms and capacity review. These are not auto-satisfied by this specification.
