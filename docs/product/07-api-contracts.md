# First-party API contracts

Base path: /api/v1. JSON UTF-8, UTC ISO timestamps, raw amounts as digit strings, IDs as opaque UUIDs. No client-supplied user_id, role, network, fee recipient or trusted mint. No public generic provider proxy.

## Common transport

Success: {data, meta:{requestId,serverTime}}. Lists add nextCursor|null and hasMore. Default page size 20, maximum 100. Stable cursor uses timestamp+ID, never offset for financial history.

Error: {error:{code,message,retryable,fieldErrors?,retryAfterSeconds?,operationId?},meta:{requestId,serverTime}}.

Authentication: secure session cookie. State-changing endpoints validate same-origin Origin, CSRF token and content type. Guest endpoints use a bounded guest-session cookie plus abuse control; it is not a member identity.

Idempotency-Key UUID required for order/draft merge/share/deletion and all financial mutation endpoints; client reuses it only for the identical operation. Same key and body returns original reference; same key/different body → 409 IDEMPOTENCY_CONFLICT. A timed-out response is queried/retried with the same key, not a new order.

Private and financial responses Cache-Control: private, no-store. Public approved catalog summaries may cache 60 seconds; asset trading capability and quotes never inherit public cache validity. Error logs hold request ID/code, not body/headers.

Status: 200 read/update; 201 new resource; 202 operation accepted/pending; 204 logout/revoke; 400 malformed; 401 unauthenticated; 403 capability denied; 404 unknown or another user's resource; 409 version/state conflict; 413 body too large; 415 format unsupported; 422 semantic validation; 429 limit; 502 invalid upstream response; 503 dependency/privacy/sponsor unavailable.

## Typed objects

**Discovery match (U24):** candidateId, displayLabel (product), ownerName? (AI suggestion), companyId|null (issuer feed identity), issuer?(xstocks/prestocks), symbol?, mint? (issuer feed only), state(matched/unlisted), confidenceBand(low), sourceIds[], requiresConfirmation. The model supplies neither issuer symbol nor mint.

**CompanyCard:** id, name, ticker?, exchange?, description, brands[], relationships[{id,type,regionScope,sourceIds,verifiedAt}], instrumentSummary|null, capabilities{learn,buy,sell,transfer,reasonCodes[]}.

**MoneyAmount:** mint, rawAmount, decimals, uiAmount, unit(raw_token/scaled_ui), multiplierSnapshotId|null. UI amount is server-rendered nonauthoritative display; all signing uses rawAmount.

**QuoteView:** id, version, legId, side(buy/sell/transfer), input:MoneyAmount, estimatedOutput:MoneyAmount, minimumOutput:MoneyAmount, fee{mint,rawAmount,bps,recipientLabel}, slippageBps|null, priceImpactBps|null, routeLabel, recipientAddress?, inventoryScope?, networkCost{payer:shelf,estimatedLamports,rentLamports}, warnings[], expiresAt, policyVersion, unitSnapshotIds[], reviewDigest. Transfer preview uses the same asset/exact amount for input/output, zero app fee, null swap metrics and a full recipient; it does not call a DEX.

**OrderView:** id, type, status, version, budgetUsdcRaw?, spentUsdcRaw?, unspentUsdcRaw?, legs[{id,position,companyId?,side,status,requestedInputRaw,latestQuote?,submissionId?,signature?}], nextAction, createdAt. nextAction is informational; server reauthorizes action.

**PreparationView:** id, orderId, legId, version, quoteId, canonicalMessageHash, transactionBase64, blockhash, lastValidBlockHeight, expiresAt, requiredUserSigner, sponsorAddress, reviewDigest. Only unsigned/user-partial work crosses into browser; never sponsor secret.

**AllocationDraft:** id, budgetUsdcRaw, allocations[{companyId,instrumentId,amountUsdcRaw,weightBps,sourceIds[],rationale}], warnings[], expiresAt, status. Sum weights=10000 and sum amounts=budget after deterministic rounding.

## Identity and access endpoints

| Method/path | Access / input | Output / behavior |
|---|---|---|
| POST /auth/challenges | guest; {purpose:login,returnPath?} | challengeId, expiry, CSRF cookie; returnPath same-origin allowlist |
| POST /auth/session | guest+challenge; {challengeId,didToken} | user summary, invite state, verified wallet, capabilities; sets session; DID never persisted |
| GET /me | member | masked account, current wallet, consent versions, feature flags/capabilities; no secrets |
| POST /auth/step-up | member; {challengeId,didToken,purpose} | refreshed authorization timestamp after genuine challenge proof |
| POST /auth/step-up-challenge | member; {purpose} | single-use bound challenge, 5-min TTL |
| DELETE /auth/session | member | revoke this session; idempotent |
| POST /auth/logout-all | member+fresh auth | revoke all sessions and provider sessions where supported |
| POST /consents | member/guest; {scope,version,accepted} | stored consent reference; known versions only |
| POST /eligibility/check | member; {residenceCountry,locationCountry?,adultAttested,declarationCodes[]} | capability decisions, policyVersion, expiresAt; no universal-country assumption |
| GET /capabilities | guest/member | per-feature allow/deny/reason; guest-safe public result |

## Discovery, catalog and shelf

| Method/path | Access / input | Output / behavior |
|---|---|---|
| GET /issuer/search?q=&provider=&offset= | guest/member | xStocks and PreStocks Solana listings; 50 per page, total, unavailable and stale feed names; query max 120 chars; provider xstocks/prestocks |
| GET /issuer/directory | guest/member | cacheable lightweight list of every current xStocks and PreStocks asset from validated Railway/PostgreSQL snapshots, with direct-feed fallback until snapshots exist; returns `listings`, editorial sectors, unavailable and stale feed names. Browser paginates ten per page and chooses featured names per visit. Exact asset and trading checks bypass this display cache. |
| POST /api/internal/issuer-directory-refresh | Railway worker only, shared-secret bearer | reads both public issuer feeds through the validated adapters and atomically replaces each successful provider snapshot; reports incomplete refresh if either provider fails |
| GET /issuer/reviewed | guest/member | reviewed company IDs mapped only to current issuer listings; configured symbols also require the reviewed Solana mint to match; unavailable/stale feed names returned |
| GET /issuer/asset/{provider}/{symbol} | guest/member | exact current Solana issuer listing and reviewed lifecycle; xStocks also returns validated underlying/security metadata; no client-provided mint or directory snapshot |
| GET /issuer/asset/xstocks/{symbol}/market?range=1D\|1W\|1M\|3M | guest/member | exact current issuer mint selects a qualifying Solana pool via DEX Screener; returns indicative pool price, 24-hour move and optional GeckoTerminal USD candles for that mint and pool; cache 180 seconds; unavailable history remains empty, never synthetic or executable |
| GET /issuer/asset/xstocks/{symbol}/disclosures | guest/member | independent optional public Solana multiplier and timestamped issuer proof-of-reserves figures; one failed upstream source returns null for only that section; public 60-second CDN cache; never an execution price |
| GET /products/{id} | guest/member | public product/relations + private saved flag only for member, no-store when personalized |
| GET /companies/{id} | guest/member | CompanyCard, jurisdiction-aware promotion policy |
| GET /learn and /learn/{slug} | guest/member | approved editorial content, sources and version |
| POST /discovery/query | guest/member; {query} | search both issuer feeds first; return matching company assets without AI, or automatically ask OpenRouter to suggest an owner for an unmatched term and join it to the same feed snapshot; enforce AI privacy and spend limits; never accept a model-supplied mint |
| POST /discovery/image | guest/member; {imageDataUrl,mode} | temporary product and likely-owner candidates joined to current issuer listings; no retained image/OCR; OpenRouter privacy and budget controls enforced server-side |
| POST /discovery/barcode | guest/member; {gtin} | public Open Food/Beauty/Products Facts product-name lookup → AI likely owner → issuer feed; unresolved if no name; never GTIN→mint |
| POST /discovery/link | guest/member; {url} | approved URL yields a product name for AI ownership resolution; unsupported site → 422 |
| POST /catalog/reports | guest/member; {productId?,relationshipId?,reasonCode,note?} | reportId; sanitize note; no attachment |
| GET /shelf | member | shelf id/name/version, items with grouped company summary |
| PATCH /shelf | member; {name?,itemOrderIds?[],expectedVersion}; at least one changed field | updated shelf; name length, exact current-item permutation for ordering, optimistic concurrency; Undo sends prior order with new expectedVersion |
| POST /shelf/items | member+idempotency; {productIds[],expectedVersion} | deduplicated items; max100; only approved IDs |
| DELETE /shelf/items/{id} | owner member; expected version header | remove discovery only; never position |
| POST /shelf/merge | member+idempotency; {mergeId,productIds[],name?} | stable merge result; safe normalized IDs only |
| POST /shelf/share | member+idempotency; {productIds[],expiresInDays:7} | link id, raw token URL once, expiresAt, sanitized preview |
| GET /shelf/shares | owner member | link metadata, expired/revoked state; no raw secret recovery |
| DELETE /shelf/shares/{id} | owner member | immediate revoke |
| GET /shares/{token} | bearer, rate-limited | sanitized snapshot or generic404; no-store,noindex,no-referrer |

Guest shelf is local-only, not a bypass around member endpoints. Shared recipient “save” is ordinary local save/POST shelf items using public catalog IDs.

## Wallet and records

| Method/path | Access / input | Output / behavior |
|---|---|---|
| GET /wallet | member | address/network, USDC actual/reserved/spendable, supported external inventory, chain freshness |
| GET /wallet/deposit | member+funding capability | canonical USDC instructions and verified address; no transaction created |
| POST /wallet/refresh | member | 202 reconciliation reference; throttled; no user-declared credit |
| GET /portfolio | member | tracked open holdings, estimated values with unit/source/freshness; unknown totals flagged |
| GET /portfolio/{instrumentId} | owner member | lots, tracked/actual/reserved quantities, corporate-action links |
| GET /history?type=&status=&from=&to=&cursor= | member | private paginated records |
| GET /history/{id} | owner member | immutable record detail |
| GET /exports/activity?format=csv|json&from=&to= | member+fresh auth | attachment stream, ≤10000 rows; formula escaping; no shared cached file |
| GET /account/export | member+fresh auth | JSON personal data including saved items/records/policies, no provider secrets |
| POST /account/deletion | member+fresh auth+idempotency; {acknowledgeChainPermanence,acknowledgeWalletIndependence} | deletion request, blockers/retention explanation; no wallet destruction |

## Order creation

POST /orders, member+financial capability+idempotency:

- Buy: {clientIntentId,type:buy,companyId,amountUsdcRaw,slippageBps:50}.
- Basket: {clientIntentId,type:basket,budgetUsdcRaw,allocations:[{companyId,amountUsdcRaw}],slippageBps:50}.
- Sell: {clientIntentId,type:sell,instrumentId,amountRaw} OR the same required fields with {sellAll:true} replacing amountRaw; exactly one quantity form.
- Transfer: {clientIntentId,type:transfer,assetId:usdc|instrumentId,inventoryScope:cash|tracked|external,recipientAddress,amountRaw} OR the same required fields with {sendMax:true} replacing amountRaw. USDC requires cash; stock requires tracked or external. External is supported-token recovery only, never a buy/sell portfolio attribution.

Server resolves mints/network, validates limits, chooses current fee policy, stores immutable intent and legs. Return 201 OrderView. Creation does not execute/sign or charge a fee. Ambiguous company/instrument mapping → 422; another active wallet operation →409.

Basket allocations must already satisfy budget in raw units. Server may return an equal-split proposal from a dedicated helper but must not silently change a submitted custom allocation.

## Order lifecycle

| Method/path | Input | Output / invariant |
|---|---|---|
| GET /orders/{id} | owner | OrderView, persistent status |
| POST /orders/{id}/legs/{legId}/quote | {expectedOrderVersion} | QuoteView; only first uncompleted/unblocked leg; issuer/route/units checks |
| POST /orders/{id}/legs/{legId}/prepare | {quoteId,quoteVersion,reviewDigest,expectedOrderVersion} | PreparationView; exact terms or 409 QUOTE_CHANGED; spends not yet submitted |
| POST /preparations/{id}/submit | {signedTransactionBase64,canonicalMessageHash,reviewDigest} | 202 submissionId/signature/status; signature/message validation and budget reservation before broadcast |
| GET /submissions/{id} | owner | state, chain status, failure reason when known |
| POST /orders/{id}/refresh | none | 202 reconciliation; never recreates/sends a different transaction |
| POST /orders/{id}/stop | {expectedOrderVersion} | cancel unsigned remaining legs; submitted work still monitored |
| POST /orders/{id}/legs/{legId}/retry | {expectedOrderVersion} | new draft quote version only after prior attempt proven failed/expired; no auto-sign |

Same submit retried returns original submission. Changing signed bytes under same preparation is rejected. Signed bytes maximum 4 KiB base64 envelope after request/schema checks; enforce actual Solana transaction size/protocol constraints.

## AI endpoints

- GET /ai/session: sets a signed, HttpOnly guest quota cookie when server signing is configured. The cookie contains a random quota ID, never chat content or a member identity. Guests behind one network receive separate daily quotas; a secondary network cap and the shared AI spending budget still limit abuse.
- POST /ai/answer: {question,issuer:{provider:xstocks|prestocks,symbol},history?:[{role:user|assistant,content}]}. Member or limited guest. The issuer reference is required; a missing or invalid reference returns INVALID_INPUT before provider work. The server refetches the exact current issuer record, including its full bounded public provider response, and ignores client-supplied facts. History is at most six prior turns of 1,000 characters each and is not persisted. Returns {answer,sourceIds,uncertainty,issuer} with the current normalized listing. Every request enforces OpenRouter privacy routing and shared spend limits. The current transport returns one bounded JSON answer, with browser abort as best-effort cancellation.
- POST /ai/shelf-summary: member {shelfVersion}; returns summary, duplicateParents[], categoryCounts, proposedSortIds[] and sourceIds. No automatic mutation.
- POST /ai/allocation-drafts: eligible member {budgetUsdcRaw,companyIds?[],categories?[],includeShelf:boolean}; returns validated AllocationDraft, never an order/preparation.
- GET /ai/allocation-drafts/{id}: owner, until expiry.

Answer responses never include hidden reasoning, the raw provider payload, email, wallet or full receipt. The domain response schema remains authoritative.

## Owner endpoints

All /admin endpoints require server owner role, fresh authorization for mutations, reason field and audit:

- GET /admin/health; GET /admin/budgets; GET /admin/orders?state=unknown; GET /admin/audit.
- POST /admin/invites {email,expiresAt?}; DELETE /admin/invites/{id} {reason}. Email is operational data, not a repository fixture.
- GET /admin/catalog/review; POST /admin/relationships/{id}/review {decision,sourceIds,regionScope,reason}.
- POST /admin/instruments/{id}/capabilities {buyEnabled,sellEnabled,transferEnabled,expectedVersion,reason}; only if readiness checks support activation.
- POST /admin/pauses {scope,enabled,reason}; POST /admin/limits {validatedKey,value,expectedVersion,reason}.
- POST /admin/reconcile {orderId|walletId,reason}; enqueues work, does not fabricate chain facts.
- GET /admin/diagnostics/{orderId}: redacted summary. No signed bytes or private image content.

Internal periodic job runs directly in the trusted process with a separate job credential/DB role, not a public unauthenticated cron URL. /healthz is public minimal liveness; /readyz contains no secrets and returns only coarse readiness.

## Error catalog and UI action

| Code | Meaning | User recovery |
|---|---|---|
| AUTH_REQUIRED / SESSION_EXPIRED | no valid app session | sign in, preserve nonfinancial draft |
| BETA_ACCESS_REQUIRED | no invitation | continue learning, contact owner |
| ELIGIBILITY_UNKNOWN / ELIGIBILITY_DENIED | financial access not established | review policy/support; no bypass |
| REAUTH_REQUIRED | old authorization evidence | provider reauthentication |
| MATCH_UNVERIFIED / ASSET_UNSUPPORTED | no reviewed executable mapping | correct/search/learn |
| IMAGE_TOO_LARGE / IMAGE_UNREADABLE | rejected media | crop/retake/use supported format |
| AI_PRIVACY_UNAVAILABLE / AI_LIMIT_REACHED | private endpoint or allowance absent | browse verified data/try later |
| QUOTE_EXPIRED / QUOTE_CHANGED | terms no longer approvable | refresh and review again |
| NO_ROUTE / PRICE_IMPACT_HIGH | unsafe/unavailable liquidity | reduce amount or try later, never widen automatically |
| CORPORATE_ACTION_PAUSE / UNIT_METADATA_STALE | quantity interpretation unsafe | wait/refresh |
| INSUFFICIENT_USDC / INSUFFICIENT_ASSET | actual spendable funds too low | deposit or reduce amount |
| SPONSOR_UNAVAILABLE / SPONSOR_LIMIT | network costs cannot be paid safely | try later; no fake gasless success |
| WALLET_BUSY / OUTCOME_UNKNOWN | another spend not resolved | view/check pending operation |
| SIGNATURE_INVALID / MESSAGE_MISMATCH | supplied bytes not approved | stop; regenerate from clean review; security event |
| DUPLICATE_INTENT / IDEMPOTENCY_CONFLICT | repeated conflicting action | load existing intent, don't repeat |
| RECIPIENT_INVALID / TRANSFER_UNSUPPORTED | unsafe destination/asset | correct address or choose supported operation |
| PROVIDER_UNAVAILABLE / RATE_LIMITED | dependency failure | Retry-After; preserve intent, not quote |
| RECONCILIATION_REQUIRED | tracked and actual holdings conflict | show status/support; prevent overspending |

## Limits and abuse behavior

Anonymous search 30/minute/session, authenticated catalog 60/minute; global IP-hash cap catches fresh guest-cookie abuse. AI quotas per document 00. Auth exchange 10 attempts/10 minutes/IP-hash, plus provider limits. Financial drafts 10/minute/user; quote/prepare 6/minute/user and organization-wide provider scheduler; submit 3/minute/user with one active wallet operation. Owner configuration changes 10/minute.

Limits are protective defaults, not a throughput claim. Provider 429 overrides local optimism. Queue feedback must be visible when quotes wait; do not serve already expired queued quotes.
