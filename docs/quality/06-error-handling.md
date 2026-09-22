# Error handling and defensive-programming audit

Date: 2026-09-21

## Scope and method

This audit reviewed every `try`, `catch`, promise rejection handler, `finally`, explicit fallback,
and related recovery path in `src/`, `scripts/`, and `infrastructure/`. It also checked the product
contracts for identity, AI privacy, chain ambiguity, transient media, market freshness, and error
responses. There are 65 catch/rejection-handler sites after the changes below; most are at browser
event or provider trust boundaries and should not be removed.

The installed Next.js 16.3.5 guidance distinguishes expected operational failures from unexpected
exceptions. Expected failures should be represented explicitly, while render exceptions belong to
error boundaries. It also states that errors from async event handlers are not caught by React error
boundaries, so those handlers must update visible UI state themselves. This application uses route
handlers rather than Server Actions; its top-level API translation remains an intentional boundary.

## Critical assessment

### Fixed: Magic wallet verification failed open

The session exchange previously swallowed failure from the authoritative Magic Admin Solana-wallet
lookup and accepted the browser-provided address instead. That was not a harmless availability
fallback: the browser is untrusted, and product documents 05, 08, and 12 require authoritative
Solana-specific binding. The fallback could mark a wallet as usable without provider verification.

The session exchange now requires the Admin lookup to succeed and requires its address to equal the
browser wallet. Provider failure aborts sign-in; it no longer changes the source of truth.

### Fixed: unexpected API exceptions were exposed as client errors

The catch-all route previously returned any thrown `Error.message` with status 400. Database,
library, and provider exceptions could therefore leak implementation details and look like invalid
user input. The route now allowlists operational error codes, returns a generic 500 for unexpected
exceptions, and logs only a request ID and error class for correlation. Known authentication,
validation, conflict, rate, and dependency errors retain explicit statuses and recovery semantics.

Malformed JSON and non-object JSON bodies now become `INVALID_INPUT` (422) at the untrusted HTTP
boundary. This catch is purposeful normalization of unsanitized input, not a fallback.

### Fixed: redundant catch-and-rethrow blocks

Three AI controller blocks caught errors only to call `settleAiUsage(reservation)` without a cost.
That function intentionally does nothing when no cost is supplied, so the catches added nesting but
performed no cleanup or state transition. They were removed. Failed calls continue to retain their
conservative reserved cost; successful calls settle to provider-reported usage.

### Fixed: silent and misleading browser failures

- Wallet and account bootstrap requests no longer discard errors. They render an explicit error
  while preserving safe unavailable placeholders.
- Holding fetch failure no longer claims the position may have been sold or transferred. Loading,
  missing/unavailable, and request failure are now distinct UI states.
- Company and Markets watchlist requests ignore only the expected unauthenticated guest case.
  Other failures are visible instead of becoming an unhandled rejection or a false unwatched state.
- Share-link clipboard rejection now gives a manual-copy recovery message.

### Intentionally retained handling

| Area | Why the handling remains |
|---|---|
| Session, URL, Solana key, transaction, JSON, and AI-output parsing | These consume attacker-controlled or provider-controlled bytes and deliberately normalize parser/library exceptions to stable domain errors. |
| OpenRouter request loop | It implements the specified single bounded retry, 30-second deadline, privacy fail-closed behavior, and invalid-schema rejection. It does not switch providers or relax privacy. |
| Jupiter/Helius provider adapters | They convert transport failures to stable dependency errors while keeping schema, network, mint, signer, and transaction-policy failures explicit. |
| Market feed cache | A failed refresh may return a previously successful snapshot only with `state: "stale"`; callers display stale/unavailable state. This is explicit degraded service, not silent current data. |
| API method boundaries | `GET`, `POST`, `PATCH`, and `DELETE` translate known domain failures into the documented HTTP envelope. Unknown failures now remain 500s. |
| Browser event handlers | React/Next error boundaries do not catch async event-handler errors. These catches preserve input and render `ErrorMessage` rather than crashing or producing unhandled rejections. |
| Camera, image, and clipboard handling | Permission, decoding, and browser-capability failures are expected untrusted/environmental inputs with actionable alternatives. |
| `finally` in runtime serialization, image preparation, browser sign-out, benchmark, and worker | These release a queue lock, bitmap, local session/navigation state, browser process, or database connection on both success and failure. |
| Readiness route | It intentionally collapses dependency/configuration details to a coarse 503 response so public health output does not expose secrets or internals. |
| CLI entry points and worker job boundary | They set nonzero process status or persist a failed job while still closing resources. They do not report success after failure. |

## Recommendations

### Implemented with high confidence

1. Fail closed on authoritative wallet lookup; never substitute browser identity data.
2. Remove catch-and-rethrow code that has no state, cleanup, translation, or observability effect.
3. Allowlist public API error codes; classify everything else as an internal error and correlate it
   through a safe request ID.
4. Treat malformed request bodies as expected boundary validation failures.
5. Keep optional guest personalization optional, but surface all non-authentication failures.
6. Distinguish loading and request failure from empty financial data.
7. Contract-test the bounded OpenRouter retry and privacy fail-closed behavior so future cleanup does
   not remove necessary resilience.

### Follow-up work, not changed speculatively

- Route handlers repeat the same top-level translation block. A small typed route wrapper could
  consolidate it, but that overlaps the broader catch-all-route decomposition and should be done as
  one controller refactor rather than piecemeal.
- Several mutation buttons rely on a rejected event-handler promise reaching development tooling
  when the request fails. They do not hide or replace data, but consistent pending/error state should
  be added during the screen-level state-machine pass.
- The coarse readiness catch is correct for its public response, but production observability should
  attach its internal dependency category to the operator-only health path without exposing it at
  `/readyz`.
- Stale market data currently lives in process memory. Its `stale` label is honest, but persistence
  and age display should remain part of the planned market-data repository refactor.

## Verification

- `npm test -- --run src/providers/openrouter.test.ts` — 6/6 passed.
- `npm run lint` — passed with no warnings.
- `npm run typecheck` — passed.
- `npm test` — 8 files, 26 tests passed.
- `npm run build` — passed with Next.js 16.3.5.
