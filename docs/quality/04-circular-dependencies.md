# Circular-dependency audit

Date: 2026-09-21

## Assessment

The repository has no circular local dependencies. No source change is justified for this task: splitting or relocating modules solely to make the graph look more layered would add indirection without breaking a real cycle.

The audit covered `src`, `tests`, `scripts`, and `infrastructure`, including Next.js App Router entrypoints, `@/*` aliases, relative imports, re-exports, dynamic imports, and type-only imports. It used two independent graph passes:

- Madge 8.0.0, configured with `tsconfig.json`, resolved 51 files from `src` and the reachable graph from 32 ancillary files. It reported no cycle in either run.
- A TypeScript 5.9 compiler-API pass resolved every local import in 62 TypeScript/JavaScript files and ran Tarjan strongly-connected-component detection separately over the complete graph and the runtime-only graph. It found 118 local edges: 92 runtime edges and 26 erased type-only edges. Both graphs had zero strongly connected components representing cycles.

This distinction matters because a type-only cycle can still make ownership unclear even though it cannot create an initialization-order failure. Neither kind exists here.

## Graph observations

The dependency direction is presently stable:

- Next entrypoints are roots. Pages and route handlers import components/services; no service imports an App Router entrypoint.
- Client modules import browser-safe helpers and erased types. No client component reaches `db/runtime-store.ts`, `lib/authentication.ts`, Node cryptography, or a server provider through a runtime edge.
- Provider implementations depend on their contracts and low-level policy/constants. The contracts do not import implementations.
- `domain/types.ts` is a leaf. `data/catalog.ts` depends on those types, and `domain/store.ts` depends on catalog data; there is no return edge.
- Tests import production modules, while production modules do not import tests.
- `scripts/start.mjs` dynamically imports the generated `.next/standalone/server.js`; generated output has no source-graph edge back into the script.

The largest import fan-out is the catch-all API route. That is a maintainability concern, but not a cycle: as a composition root, it is expected to assemble domain, persistence, and provider modules. Decomposing it should be driven by route cohesion and testability, not by this graph audit.

There are three acyclic relationships worth watching:

1. `domain/store.ts -> data/catalog.ts -> domain/types.ts` means the in-memory application state is coupled to the concrete catalog fixture. If a future catalog repository starts importing the store, that would create a cycle. Keep catalog data/repository code below the store and pass data into new domain services rather than adding a reverse import.
2. `domain/state-serialization.ts -> domain/store.ts` currently obtains store defaults while `db/runtime-store.ts` imports both modules. Keep serialization one-way; the store must not begin importing its serializer.
3. `components/screens/discovery.tsx -> components/screens/markets.tsx` reuses `MarketHistoryChart` from another screen module. This is currently safe. If either screen later imports the other, move the chart to a neutral component module at that point; extracting it preemptively would be churn.

## Tool limitations and manual checks

Madge warned about two skipped external specifiers:

- `tailwindcss`, referenced by CSS, is an external package rather than a local TypeScript module.
- `postgres@3.4.9` in `infrastructure/railway-worker.ts` is a version-pinned external specifier. The worker has no local imports, so this skipped external edge cannot participate in a repository-local cycle.

The dynamic generated-server import in `scripts/start.mjs` was inspected separately because static source analyzers cannot traverse a build artifact that does not exist in the source tree. Searches found no CommonJS `require`, module export mutation, local dynamic import, or barrel re-export that could conceal a local back edge.

The installed Next.js 16.3.5 documentation was used to classify App Router roots and client/server module graphs. In particular, a `use client` directive defines a client dependency subtree, while route files and pages are framework entrypoints rather than ordinary reverse dependencies. These conventions do not introduce an implicit source cycle.

## Recommendations

- Keep `@/*` mapped only to `src/*`; graph tooling and TypeScript currently resolve it consistently.
- Preserve `import type` for contracts used only during checking. This keeps the runtime graph smaller and makes environment boundaries explicit.
- Continue treating route handlers, pages, scripts, and the worker as composition roots. Shared modules should not import them.
- Add a bounded cycle check to CI only if the team is willing to pin the analyzer as a development dependency. A reproducible command is:

  ```bash
  madge --circular --warning --extensions ts,tsx --ts-config tsconfig.json src
  madge --circular --warning --extensions ts,tsx,mjs --ts-config tsconfig.json tests scripts infrastructure
  ```

- Do not add a new abstraction, barrel, or dependency-injection layer merely to enforce a theoretical layering rule. Re-run the graph after changes to the three watched relationships above or after introducing index/barrel modules.

## Implementation and verification

No production or test code was changed because both graph analyses and manual inspection showed an acyclic codebase. This is the high-confidence outcome requested by the audit: preserve the clean graph rather than manufacture a refactor.

Commands run:

```text
npx --yes madge@8.0.0 --circular --warning --extensions ts,tsx --ts-config tsconfig.json src
  Processed 51 files; no circular dependency found; one external CSS package skipped.

npx --yes madge@8.0.0 --circular --warning --extensions ts,tsx,mjs --ts-config tsconfig.json tests scripts infrastructure
  Processed 32 files; no circular dependency found; one version-pinned external package skipped.

TypeScript compiler-API local graph + Tarjan SCC pass
  62 files; 118 total edges; 92 runtime edges; 26 type-only edges;
  zero complete-graph cycles; zero runtime cycles.
```

Because implementation code was intentionally unchanged, the existing type, lint, test, and build baselines are not re-attributed to this audit. The graph commands above are the focused verification for the documented conclusion.
