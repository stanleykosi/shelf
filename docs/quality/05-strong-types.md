# Strong-type audit

Date: 2026-09-21

## Scope and method

This audit covered application, provider, worker, script and test TypeScript under `src/`, `infrastructure/`, `scripts/` and `tests/`. It searched for explicit `any`, `unknown`, broad records, type assertions and unchecked JSON parsing, then traced each hit to its producer and consumers. The review also checked the pinned TypeScript, Zod, postgres.js, Next.js, Solana and provider-facing types in `package.json` and `node_modules` rather than assuming older SDK shapes.

`unknown` is not inherently weak. It is the correct type for JSON, caught exceptions, browser storage and other untrusted inputs until runtime validation has established a narrower type. This audit therefore removes `unknown` used as a substitute for modeling known application data, but retains it at actual trust boundaries.

## Critical assessment

### What was already strong

- TypeScript strict mode is enabled and the repository contains no explicit source-level `any`.
- Monetary values use strings or `bigint` rather than JavaScript floating-point numbers.
- Core order, holding, quote and provider contracts are named domain types.
- Error callback parameters use `unknown`, then narrow with `instanceof Error`; this is appropriate for JavaScript exceptions.
- Public helper inputs such as CSV cells and RPC parameters were generally bounded by their callers, even when their annotations were broader than necessary.

### High-risk findings

1. Provider JSON was asserted directly into expected response types. OpenRouter, Jupiter and Helius responses could therefore satisfy the compiler while containing malformed nested data. This matters at security and financial boundaries: route instructions, token balances, signature status, and AI-selected IDs must never be trusted merely because a generic or assertion says they are valid.
2. Session claims were asserted after `JSON.parse`. A correctly signed but malformed payload could reach property access without its declared shape being established.
3. Runtime-state persistence converted maps through double assertions (`as unknown as ...`) and assigned maps through `never`. Those casts disabled structural checking over the complete persisted state and made schema drift easy to hide.
4. Several known in-memory collections used `Record<string, unknown>` even though every writer created a stable shape. Allocation drafts, consents, catalog reports and audit events therefore lost useful compiler checks between route writers, persistence and readers.
5. Order construction accepted a broad record and asserted the order discriminator, allocation shape and inventory scope. Invalid request fields could be coerced to strings and enter domain code before semantic validation.
6. The Railway worker asserted xStocks response objects and deployments instead of narrowing the external JSON.

### Medium-risk findings not fully changed

- `src/lib/api-client.ts` uses caller-provided generic response types without runtime decoders. The envelope and every endpoint payload should ultimately be generated or validated from the same API schemas used by route handlers. Retrofitting all client calls is high value, but doing it piecemeal would create inconsistent guarantees; it is recommended as a dedicated contract migration.
- Several client components assert `JSON.parse` results from `sessionStorage`. Server authorization does not trust this data, so this is not currently a financial authority flaw, but corrupt or manually edited storage can still crash or misdirect UX. Add small versioned codecs for guest shelf IDs, scan results, login challenges and basket drafts.
- The catch-all route correctly parses raw request JSON as `Record<string, unknown>`, but not every endpoint has a complete schema yet. High-value order and array/integer paths were strengthened here. The remaining endpoint bodies should move to named Zod schemas alongside generated request types rather than accumulating `String(...)`/`Boolean(...)` coercions.
- `skipLibCheck` remains enabled. That is a common build-performance choice, but it means dependency declaration conflicts are not checked. Provider responses are now validated at runtime, which is the more important boundary; a periodic strict dependency-type CI job would still be useful.

## Implemented high-confidence recommendations

- Added concrete `AllocationDraft`, `ConsentRecord`, `CatalogReport` and `AuditEvent` models to the store.
- Rewrote state serialization/deserialization as an explicit field mapping. All double assertions and `never` map assignments were removed. The postgres.js `JSONValue` assignment is now checked directly; the transaction result is wrapped to work with postgres.js's documented array-unwrapping conditional type without a cast.
- Added Zod validation for OpenRouter envelopes and task-specific structured output. Recognition, grounded answers and allocation drafts now become concrete values only after validation. Allocation drafts reject unknown or duplicate company IDs and missing rationales rather than filtering or inventing a fallback rationale.
- Added Zod validation for Jupiter token search/build payloads and every Helius RPC result shape used by the adapter. The generic RPC helper now requires a result schema.
- Added a runtime type guard for signed session claims before any claim is used.
- Added Railway worker guards for PreStocks and xStocks JSON without provider-response assertions.
- Added a discriminated Zod order-input contract. Domain code now receives typed buy, basket, sell and transfer variants; inventory scope is an enum, allocation entries are typed, and mutually exclusive amount/all flags are enforced.
- Replaced catch-all route array/number/scope assertions with runtime narrowing helpers.
- Narrowed the heterogeneous market request queue from `Promise<unknown>[]` to `Promise<void>[]`, and narrowed CSV cell input to the actual `string | undefined` domain.
- Added tests proving schema-invalid AI output and RPC results fail closed.

## Retained `unknown` and why

The remaining `unknown` occurrences are intentional trust-boundary annotations: caught errors; raw `JSON.parse`/`Response.json()` values; generic HTTP request bodies before validation; heterogeneous JSON-RPC parameters; and a worker record predicate. They prevent accidental property access before validation and are stronger than `any` in these positions.

## Recommendations

1. Establish endpoint-specific Zod request/response schemas in a shared API-contract module, infer both route and client types from them, and require `apiRequest` to accept the response schema. This removes the remaining generic client assertion comprehensively.
2. Add versioned browser-storage codecs and discard invalid guest/session data with a clear recoverable UI state.
3. Add lint rules that forbid explicit `any`, double assertions, and unvalidated `JSON.parse` assertions in application code. Allow `unknown` at declared boundary modules.
4. Keep provider schemas intentionally minimal and fail closed when required fields change. Provider additions should be reviewed instead of accepted through `.passthrough()` as domain facts; passthrough fields are currently ignored.
5. Add malformed-fixture cases for each endpoint schema as the shared API-contract migration proceeds.

## Verification evidence

Focused checks run during the audit:

- `npm run typecheck`
- `npx vitest run src/providers/openrouter.test.ts tests/core-safety.test.ts src/domain/store.test.ts`
- `npx vitest run src/providers/live.test.ts src/providers/openrouter.test.ts tests/solana-safety.test.ts tests/core-safety.test.ts`

Both focused Vitest runs passed at the time they were run (10/10 and 13/13 tests respectively). Final repository-wide lint, typecheck and test results should be read from the handoff because other quality agents were editing the shared worktree concurrently.
