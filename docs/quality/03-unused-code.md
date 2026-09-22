# Unused-code assessment

Date: 2026-09-21

## Scope and method

This audit covered source files, Next.js route conventions, scripts, the Railway worker, Drizzle configuration and migrations, tests, exports, and package dependencies. It used:

- `npx --yes knip@5.64.1 --reporter compact` before and after changes;
- repository-wide `rg` searches for every reported file and symbol;
- `npm ls` and `npm explain` to distinguish direct dependencies, transitive dependencies, optional peers, and build-tool usage;
- TypeScript with `--noUnusedLocals --noUnusedParameters`;
- the installed Next.js 16.3.5 project-structure and route-handler documentation, so framework entrypoints such as `page.tsx`, `route.ts`, `layout.tsx`, `error.tsx`, and `loading.tsx` were not mistaken for dead files.

The audit treated every `package.json` script, Next.js convention file, `drizzle.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `postcss.config.mjs`, `next.config.ts`, `infrastructure/railway-worker.ts`, migration, and test file as a potential entrypoint. No removal was based on Knip output alone.

## Critical assessment

The repository was already relatively lean: Knip found one unused file and no abandoned application feature directory. The largest issue was stale package metadata from implementation tooling that is no longer used. Five packages had no import, configuration reference, script, or test consumer. Keeping them increased lockfile and install surface without preserving behavior.

The source-level findings fell into two classes:

1. Genuinely dead implementations: an owner-issuer extraction script with no script/config/documentation caller, an unused raw-amount Zod schema, an unused Magic transaction-signing path and one unused Magic configuration predicate.
2. Public export surface wider than actual module use: several constants, interfaces, and inferred types were used only inside their defining module. Their runtime code was still required, but exporting them implied unsupported reuse and prevented static tools from distinguishing module internals.

Knip also produced expected false positives:

- `buffer` is directly imported by `src/lib/solana-signing.ts` for browser-compatible Solana transaction bytes.
- `encoding` satisfies the optional peer used by `node-fetch`, reached through `@magic-sdk/admin` and `@solana/web3.js`; removing it without provider-bundle verification is lower confidence than retaining it.
- `tailwindcss` is loaded from `src/app/globals.css` and through `@tailwindcss/postcss`, not a TypeScript import.
- `postgres` was reported as unlisted only for `infrastructure/railway-worker.ts`, but it is a listed runtime dependency and the worker is the `npm run worker` entrypoint.
- Next.js App Router convention files and dynamic catch-all routes are runtime entrypoints even when there is no ordinary import edge.

The remaining Knip results are confined to shared domain/provider type exports being reviewed by the dedicated shared-types pass. They are not evidence that their underlying values or interfaces are unused internally.

## Implemented high-confidence changes

- Removed `scripts/capture-owner-issuer.mjs`. It had no package script, deployment/config reference, documentation reference, import, or dynamic invocation. Its one-off production-state query and `/tmp` output contract were otherwise undiscoverable and untested.
- Removed unused dependencies `@tanstack/react-query`, `@axe-core/playwright`, `@testing-library/jest-dom`, `@testing-library/react`, and `prettier`, updating `package-lock.json` through npm. Removed the orphaned `.prettierrc.json` after confirming no formatting command or integration consumes it.
- Removed the unused `rawAmountSchema` and its now-unneeded `zod` import from `src/domain/money.ts`. Zod remains a required application dependency elsewhere.
- Removed the unreachable Magic `signMagicSolanaTransaction` implementation and its private deserialization helpers, plus the unused `magicBrowserIsConfigured` predicate. The active email, Google, wallet-binding proof, and logout paths remain.
- Narrowed internal-only exports for the Solana memo program ID, acquisition-lot type, environment type, page-access type, session-claims type, PreStocks provider interface, xStocks provider interface, and Jupiter instruction type.

## Deliberate non-removals and recommendations

- Keep `buffer`, `encoding`, `tailwindcss`, and `postgres` for the reasons above. A future removal of `encoding` should be supported by a production bundle/provider test, not static import analysis alone.
- Keep every Next.js convention file, catch-all route, operational script exposed by `package.json`, Railway worker, database migration, and provider verification script.
- `SponsorSigner` remains exported even though Knip sees no current consumer. The architecture specification requires this provider boundary for activation, so it is a deliberate contract rather than removable runtime debris.
- Add Knip as a pinned development check only if the team wants to maintain a project configuration for framework/build-tool false positives. This audit intentionally used a one-shot pinned CLI and did not add a permanent dependency.
- The product specification requires automated accessibility checks in T29. `@axe-core/playwright` had no consumer, so retaining it would not provide coverage; it was removed. Accessibility automation remains a documented coverage gap until a real Playwright axe test is implemented, at which point the dependency should be reintroduced with that test.

## Verification record

- Initial Knip run: one unused file; unused dependency/dev-dependency findings; four unused exported values; nine unused exported types.
- `tsc --noEmit --noUnusedLocals --noUnusedParameters --pretty false`: passed before changes.
- Final Knip run after the shared-types pass: no unused files, values, or removable types. Its remaining findings are the four corroborated dependency false positives above and the deliberately retained `SponsorSigner` activation contract.
- `npm run lint`: passed without warnings after the shared-types cleanup completed.
- `npm run typecheck`: passed.
- `npm test`: 8 files and 23 tests passed.
- `npm run build`: passed with Next.js 16.3.5; all five App Router entrypoints were generated.

Full repository lint, type checking, tests, and production build should be reported by the coordinating quality pass after all eight agents' edits are integrated, since concurrent cleanup work can change the same verification baseline.
