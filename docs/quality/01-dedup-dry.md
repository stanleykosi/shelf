# Deduplication and DRY assessment

Date: 2026-09-21

## Scope and method

This review covered the TypeScript application, provider adapters, scripts, worker, and tests. It
used file-size and symbol inventories, exact-value searches for protocol identities and policy
constants, call-site tracing, and manual comparison of the largest modules. The current repository
does not include a clone detector, so this review does not present an unrun similarity score.

The standard applied here is deliberately narrower than “remove every repeated line.” Shared code
is useful when it gives one invariant one owner or removes branching. Repetition remains when an
abstraction would couple unrelated domains, obscure financial/security checks, or make a small
flow harder to read.

## Critical assessment

### High confidence: Solana protocol identities had several owners

The canonical mainnet USDC mint appeared independently in the API route, Jupiter adapter, provider
verification, and sponsor-address script. SPL Token, Token-2022, Associated Token, and Jupiter
program IDs were also repeated across transaction validation, RPC balance reads, and setup code.
These values are security-sensitive configuration, not incidental display strings. Independent
copies could drift and cause the verifier, transaction allowlist, and account derivation script to
disagree.

Implemented: `src/providers/solana-constants.ts` is now the source of truth for the network, mint,
and program identities used across provider code, the API route, and the sponsor setup script. The
module exports strings only, so importing it does not pull Node-only code into a browser bundle.
Tests intentionally retain literal protocol IDs
where they are independent fixtures; making tests import every implementation constant would
weaken their ability to detect an accidental change.

### High confidence, coordinated separately: repeated transport types

`JupiterBuildProvider` repeated the exact-input request shape across its public and private methods,
while the provider contract described the same structure again. State enums also existed in domain
types and database declarations. These are genuine shared contracts rather than coincidentally
similar objects. They should have one exported type/value definition. This area was assigned to the
shared-types review and was not edited here to avoid concurrent conflicting changes.

### Implemented after route-file coordination: duplicate stale-on-error market caches

`preStocksListings` and `xStocksListings` in the catch-all API route implement the same five-minute
cache algorithm: return a fresh value, refresh from a provider, return a stale value when refresh
fails, and fail when no value exists. A small typed `staleWhileError` cache would remove duplicated
time/error policy and make cache behavior directly testable.

Implemented during the coordinating pass after concurrent route edits completed: one typed
`cachedListings` helper now owns the five-minute freshness and explicitly labeled stale behavior.
Provider-specific error codes remain at the wrapper call sites.

### Medium confidence: catch-all route mixes unrelated controllers

`src/app/api/v1/[...path]/route.ts` is over one thousand lines and combines authentication,
discovery, AI quotas, markets, shelf operations, orders, account deletion, and administration. Its
repeated path matching and authorization calls are symptoms of missing bounded route modules.
Blindly replacing them with a generic dispatch table would make authorization less visible.

Recommendation: incrementally move each bounded context into a handler module with an explicit
typed input and keep authorization beside each handler. Do this by domain, with route contract tests
after every move; do not create a generic “execute handler” abstraction.

### Medium confidence: screen modules repeat request-error presentation

Client screens repeatedly convert caught request failures into strings, sometimes preserving error
codes and sometimes lowercasing/replacing underscores. One presentation helper can make messages
consistent, but error-handling policy is being reviewed independently. It was not changed here to
avoid concealing distinctions between authentication, recoverable provider failure, and validation
errors.

Recommendation: consolidate only the formatting primitive after error codes have a typed contract.
Keep flow-specific fallback copy at each call site.

### Intentional repetition that should remain

- Database schema declarations and in-memory mock/runtime state model different persistence
  boundaries. They should share enums and value objects, not be forced into one generated object
  graph.
- Transaction-policy validation repeats explicit checks at trust boundaries. A few extra lines are
  preferable to a generic validator that hides signer, fee-account, or program-allowlist rules.
- Provider tests keep literal external identities and payloads as independent evidence.
- Similar public/private market cards have materially different disclosures. Combining them into a
  highly conditional component would reduce line count while increasing product and compliance
  complexity.

## Recommendations by priority

1. Keep all production Solana protocol identities in the constants module and add new identities
   there only after review.
2. Complete the shared request/state type consolidation and let TypeScript enforce a single shape.
3. Split the catch-all API implementation by bounded context; retain explicit authorization and
   error mapping.
4. Standardize client error formatting after the error-handling audit establishes which codes and
   messages are safe to expose.
5. Do not pursue abstraction by line-count alone. Require a named invariant, at least two real
   consumers, and lower branching/coupling before adding a shared helper.

## Verification

- `npm run lint` — passed with no warnings.
- `npm run typecheck` — passed.
- `npm test` — 8 files, 23 tests passed.
- `npm test -- --run src/providers/live.test.ts tests/solana-safety.test.ts` — 2 files, 7 tests
  passed.

No provider network call, transaction, signature, deployment, or money movement was performed.
