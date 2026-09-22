# Legacy, compatibility, and fallback audit

Date: 2026-09-21

## Scope and method

This audit covered application source, provider adapters, route handlers, scripts, the Railway worker, direct dependencies, and the pinned Next.js and provider contracts. It searched for deprecated/legacy terminology, compatibility branches, default endpoints, swallowed provider failures, alternate providers, old model or exchange names, and values synthesized when an upstream field is absent. Product specifications 00–19 were treated as authoritative, especially the fail-closed identity, AI privacy, eligibility, and transaction rules.

Evidence used:

- Installed Next.js 16.3.5 documentation: Turbopack is the default, `--webpack` remains a supported opt-out, and asynchronous route parameters are required.
- Installed `@magic-sdk/admin` 2.8.2 types and implementation: `getMetadataByIssuerAndWallet(issuer, WalletType.SOLANA)` is available and returns the selected wallet in `publicAddress`.
- Current Magic Node SDK documentation: generic token/public-address methods are Ethereum-oriented; multichain methods with `WalletType.SOLANA` are the documented Solana path.
- Current Jupiter `/build` documentation: raw build instructions, `payer`, `platformFeeBps`, and `feeAccount` remain current. The documented build response does not promise a price-impact field, so its absence cannot be interpreted as zero.
- `npm ls`, lockfile deprecation metadata, source searches, lint/type/test/build commands, and focused provider tests.

## Critical assessment

### Removed: browser wallet as a Magic Admin fallback

The login controller previously caught failure of the authoritative Magic Admin Solana lookup and accepted the address reported by the browser. That widened one identity flow into two authorities. A correctly shaped browser address was therefore usable even when server-side chain-specific metadata was unavailable.

The catch fallback is removed. Login now requires all three facts to agree: a valid DID token, the Solana address returned by the chain-specific Admin method, and the address reported by the authenticated browser SDK. Provider failure is an explicit authentication failure, and disagreement is `WALLET_BINDING_MISMATCH`.

`MagicIdentityProvider.getSolanaWallet` also no longer scans every returned wallet and then the generic address for the first string that looks like a Solana public key. It uses only `publicAddress` from the explicit `WalletType.SOLANA` request. This avoids turning response-shape compatibility guesses into identity authority.

### Removed: wallet-binding repair through proof-of-control

The settings proof flow previously allowed a user whose stored binding was missing or marked unverified to replace it with the proposed browser wallet. That was a legacy repair path inside an ordinary version-one endpoint, contrary to the requirement that wallet replacement use a separate reviewed migration process.

The flow is now singular: the proposed address must equal the already bound Magic address, and the signed transaction proves control of that address. The `wallet:repair_invalid_binding` audit branch and the assignment that replaced the wallet were removed. A mismatch fails closed.

### Removed: implicit public devnet RPC

The Magic browser adapter silently used `https://api.devnet.solana.com` when `NEXT_PUBLIC_SOLANA_RPC_URL` was absent. This could initialize the browser signer on a different network/provider than the server configuration. The adapter now reports `MAGIC_BROWSER_CONFIGURATION_REQUIRED`, and `.env.example` declares the required public browser RPC variable.

### Removed: missing Jupiter price impact becomes zero

The quote adapter previously used `priceImpactPct ?? "0"`. That transformed missing upstream risk data into a favorable value and contradicted the approved policy that missing measurable price impact is not zero.

The adapter now requires a present, finite, nonnegative price-impact value. An absent or malformed value returns `QUOTE_PROVIDER_INVALID`; a focused contract test covers the missing-field case. This is intentionally conservative because current Jupiter `/build` documentation does not guarantee this field. Trading remains disabled until the exact live response and a reviewed impact policy pass the activation gate.

### Removed elsewhere in the coordinated cleanup

The allocation adapter had supplied generic prose when the model selected a company without returning a rationale. The coordinated OpenRouter cleanup now rejects unallowed or duplicate IDs and missing/blank rationales with `AI_INVALID_RESPONSE`; it no longer invents a rationale.

### Retained: explicit stale market-data state

The PreStocks and xStocks five-minute caches return a labeled `stale` result after a refresh failure. This is not an invisible provider fallback: it retains the same reviewed provider, exposes freshness state, and does not enable trading. Removing it would make educational market pages less resilient without improving authority boundaries.

### Retained: static approved product URL mapping

The Apple product-family mapping is the specification's approved safe alternative to an arbitrary server-side fetcher. It is deterministic, reviewed, and reports unsupported hosts rather than broadening network access.

### Retained: Webpack opt-out pending environment-independent verification

Next.js 16 recommends its default Turbopack path, and this project has no custom Webpack configuration. However, both sandboxed and escalated `next build` attempts with Turbopack failed while PostCSS attempted to bind a local port (`Operation not permitted`). That is an execution-environment failure rather than evidence of an application incompatibility, but it prevents a trustworthy production-build comparison here. The supported `--webpack` opt-out remains until Turbopack passes in CI or the deployment environment; it should not be removed solely for cosmetic modernization.

### Dependency deprecations retained pending upstream releases

The lockfile contains four deprecated packages:

- `crypto-js@4.2.0`, a runtime transitive dependency of the required `@magic-ext/oauth2@15.14.0`;
- `@esbuild-kit/esm-loader@2.6.5` and `@esbuild-kit/core-utils@3.3.2`, development-only transitives of `drizzle-kit@0.31.10`;
- `eslint@9.39.2`, directly pinned but required by several currently installed Next ESLint plugins whose peer ranges stop at ESLint 9.

No override was added. Replacing a provider-owned crypto dependency or forcing a tooling major beyond plugin peer ranges would be lower confidence than retaining the pinned, working dependency graph. Upgrade the owning packages when their compatible releases remove these transitives; re-run lint, migration generation, OAuth, and production builds afterward.

### Partially removed: runtime-state compatibility normalization

`store.ts` previously backfilled newly added maps, arrays, user fields, and share fields with `??=` both at module initialization and whenever persisted state was loaded. Those hot-reload/old-payload compatibility mutations are removed; the current `StoreState` has one required shape.

`deserializeState` still performs the documented one-way removal of pre-Magic users and non-Jupiter orders. The production cleanup is recorded as complete, but the JSONB runtime payload has no explicit application schema version or validation boundary. Removing every fail-closed filter immediately would turn an old or malformed row into uncontrolled runtime failures.

Recommendation: add an explicit runtime-state schema version and a one-time database migration, verify the sole production row, then remove the historical cleanup filters. Until then, the deletion filters are also fail-closed security checks, not ordinary product fallback behavior.

## Verification

- `npm test -- src/providers/live.test.ts src/providers/openrouter.test.ts` — 2 files, 13 tests passed.
- `npm run lint` — passed with no warnings.
- `npm run typecheck` — passed.
- `npm test` — 9 files, 29 tests passed.
- `npm run build` — passed with Next.js 16.3.5 using the repository's supported Webpack path.
- `npx next build` (Turbopack, sandboxed and escalated) — not an application result; both attempts stopped because the environment denied PostCSS a local port.

## Remaining recommendations

1. Contract-test Magic Admin metadata with the configured production application and keep deposits disabled until the Solana address is returned by the explicit wallet-type method.
2. Decide whether price impact must come from an independently verified quote/price source if Jupiter `/build` continues to omit it; do not restore a zero default.
3. Prove Turbopack in CI or deployment, then remove `--webpack` from both scripts in one change.
4. Introduce runtime-state schema versioning before deleting the remaining deserialization cleanup guards.
5. Track upstream Magic OAuth, Drizzle Kit, Next ESLint plugin, and ESLint releases rather than forcing incompatible transitive overrides.
