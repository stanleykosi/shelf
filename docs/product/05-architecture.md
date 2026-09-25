# System architecture

## Chosen architecture

One TypeScript modular monolith: Next.js web UI and versioned backend route handlers, a Postgres database, and a periodic job runner using the same domain modules. No separate Python AI service, message broker, vector database or custom Solana program.

This optimizes prototype cost and integration clarity. It does not claim to be the globally cheapest architecture under all workloads.

```text
Browser
  camera/local barcode + Magic user signer
          |
          v
Shelf API ───── catalog / eligibility / private shelf / order policies
  |   |   |
  |   |   +---- OpenRouter: scoped recognition/education only
  |   +-------- Jupiter: unsigned swap instructions / market data
  +------------ Postgres: sessions, evidence, intents, journal, jobs
          |
     validated user-signed message
          v
Bounded sponsor signer → Helius RPC → Solana programs
          ^                    |
          +---- reconciler <---+ finalized transaction facts

Periodic runner: reconciliation, issuer metadata, corporate actions,
retention, health and encrypted backups
```

## Provider choices

| Concern | Choice | Boundary |
|---|---|---|
| Web/backend | Next.js + Node on Render | Persistent small web process; no background correctness dependent on RAM |
| Database | Supabase-hosted Postgres | Use SQL/Drizzle, not Supabase Auth or direct browser Data API |
| Login/wallet | Magic embedded Solana | Email OTP + Google; user signer only |
| Model routing | OpenRouter + AI SDK provider | Paid model, required privacy constraints, no open-ended tools |
| Product identifiers | Curated registry; optional Open Food Facts lookup | External catalog never authoritative for company ownership |
| Issuer metadata | xStocks public API | Assets, multipliers, corporate actions and reference context |
| Swap composition | Jupiter Swap v2 /build | Controllable transaction assembly; no /execute dependency |
| Solana RPC | Helius | Private server key, public/restricted browser access only if SDK needs it |
| Application fee | USDC fee account controlled by operator | Fee collection, not custody of user portfolio |
| Network costs | Separate bounded SOL sponsor | Only approves registered safe operations |
| Jobs | Postgres work table + one Render Cron service | Lease/retry/idempotency; no paid Redis dependency |
| Images | Memory-only processing | No user image bucket |
| Backups | Encrypted database dumps to private Supabase Storage bucket | Separate from user uploads; restore drill mandatory |
| Support | Configured support email/link + redacted in-app reference | No marketing email service required |

See document 13 for live pricing snapshots and plan limitations; these services are not assumed provisioned.

## Backend domain modules

1. **Identity:** validate Magic DID tokens, bind verified Solana wallet, create sessions, fresh-auth challenge, logout.
2. **AccessPolicy:** invites, adult/region declarations, versioned issuer and operator policies; separate discover/suggest/buy/sell/transfer decisions.
3. **Catalog:** products, brand aliases, effective-dated relationships, sources and reviewed supported instruments.
4. **Discovery:** image/text/barcode/link normalization, external product lookup, AI recognition, deterministic catalog resolution.
5. **Shelf:** private collection, dedupe, guest merge, sanitized share snapshots.
6. **EducationAI:** exact issuer retrieval for bounded token chat answers, plus shelf summary and editable allocation draft validation.
7. **MarketData:** issuer records, onchain mint state, unit normalization, optional secondary-price snapshots, transition safeguards.
8. **Trading:** intents, allocation arithmetic, quote adaptation, fee/min-output verification, simulation and preparation.
9. **Submission:** verify user signature/message, atomically reserve sponsor budget, co-sign, persist deterministic signature, broadcast exact bytes.
10. **Reconciliation:** verify chain outcome and balance deltas, append journal, consume lots, release reservations, update history.
11. **Records:** read models, exact-unit exports, private data access; no mutation of finalized facts.
12. **AdminOps:** review evidence, scoped pauses, redacted diagnostics, audited configuration.

Routes are thin controllers. Shared services own invariants. A provider failure must not leave inconsistent partial database writes; use transactions and explicit state transitions.

## Provider adapter interfaces

Define interfaces before wiring live clients; mock implementations conform to the same schemas:

- IdentityProvider: verifyToken, getSolanaWallet, freshAuthEvidence, revokeSessions.
- VisionProvider: recognize(input, task, privacyPolicy) → validated candidates + usage metadata.
- EducationProvider: answer(context), draftAllocation(context) → typed output with source IDs.
- ProductLookupProvider: lookupBarcode, fetchApprovedProductPage.
- IssuerProvider: list/readAsset, multipliers, corporateActions, marketContext.
- QuoteProvider: buildExactInput(inputMint, outputMint, rawAmount, taker, payer, feeAccount, policy).
- ChainProvider: networkIdentity, mintState, balances, blockhash, simulate, broadcast, signatureStatus, transaction.
- SponsorSigner: signOnlyValidatedPreparation(preparationId) with no generic sign endpoint.
- BackupStore: writeEncryptedBackup, listIntegrityMetadata, restoreToIsolatedDatabase.

No generic server “execute tool,” “sign arbitrary bytes,” “proxy URL,” “SQL query” or “forward RPC” endpoint is allowed.

## Transaction boundaries

Prepare → persist unsigned canonical message/hash and spending reservation.

Submit → verify member, authorization, quote, message and signature; reserve sponsor funds using DB row lock; generate final signature; commit submission record and encrypted bytes **before** first network send.

Broadcast happens outside the DB transaction. Lost HTTP/RPC responses are reconciled by the precomputed signature. The system must be able to rebroadcast identical bytes, not invent a new transaction, until expiration is proven.

Finalization atomically inserts unique chain event, adjusts inventory lots, appends financial journal, settles fee record, releases reservations and completes order leg.

No database rollback can undo a confirmed blockchain transaction. Repair missing records by replaying chain facts, not by refund assumptions.

## Deployment shape

Single beta web instance; small SQL connection pool (max 5 per web process, max 2 job runner). Server and database in nearby regions; choose available compatible regions at provisioning and document actual locations for privacy.

Cron every minute runs bounded work and exits in <45 seconds; financial requests also enqueue/trigger immediate reconciliation. Background polling frequency is constrained by RPC/API credits. A global database-backed throttle governs Jupiter calls (initially 1 request/second with headroom).

All retries have limits and jitter. Use SKIP LOCKED row leases and compare-and-set version fields, not distributed in-memory locks. No permanently resident websocket indexer or full-chain scan in v1.

## No new contract

Swap programs and token programs already provide the necessary execution primitives. The application owns recognition, relationship verification, UX and orchestration. A new custom router/escrow is out of scope unless independently justified and approved. This avoids introducing an unnecessary custody/security surface, not the need for careful transaction validation.

## Runtime compatibility gates

Magic's official Solana source exposes VersionedTransaction and partial-signature methods; this is documented capability, not an executed interoperability test. Its installed return format must be verified—the prose example and source types differ. Test pinned versions with a server fee payer and lookup tables before mainnet activation.

Use an explicit OpenRouter provider object with the AI SDK. Do not accidentally route plain model-ID strings through another gateway. Provider SDK compatibility and privacy-field serialization must be covered by outgoing-request contract tests.
