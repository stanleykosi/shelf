# Shelf — implementation instructions

## This repository's purpose

This is Shelf's application repository. Implement, run, test and refine the product here when the user asks to build it. Always write human readable code, a junior developer should be able to read your code. 

The approved specification is in docs/product/. The initial repository contains documentation, not a working application. Historical references to implementation happening “elsewhere” mean elsewhere than the original research workspace: **this repository is that destination**.

## First build or resumed build

1. Inspect the current files and git status; preserve existing user work.
2. Read README.md and BUILD_STATUS.md.
3. Read docs/product/README.md, docs/product/BUILD_AGENT_INSTRUCTIONS.md and all numbered specifications00–19 before implementing architecture. Follow the document precedence rules. Historical research/ files are evidence, not competing requirements.
4. Follow docs/product/17-build-sequence.md. Keep an actionable checklist, then implement and verify; do not stop after a plan, scaffold, landing page, scanner-only demo or static mock dashboard.
5. Update BUILD_STATUS.md after meaningful milestones and before handoff/context transitions. Record real files, commands, results, unresolved gates and the exact next task. Resume from recorded progress rather than rebuilding finished work.

The user already answered discovery questions and delegated sensible defaults. Fill ordinary coding details yourself. Ask only for a genuine missing decision, authority or credential that materially affects the work.

## Completion contract

Build the entire agreed version-one application: guest and member journeys; seven discovery inputs and five categories; verified product/company registry; one private shelf and revocable links; Magic email/Google Solana wallet; USDC funding; single purchases, multi-company budgets, sells and transfers; Shelf-origin portfolio, history, corporate-action explanations and exports; OpenRouter recognition, education, shelf summaries and editable allocation suggestions; owner administration, privacy controls and operations.

Use docs/product/18-traceability.md and PR-01–PR-26, S01–S27, C01–C109 and T01–T36 as evidence-linked completion checks. A feature needs working frontend, backend, persistence where required, failure states and tests.

No credentials is not a reason to omit a feature: implement deterministic test adapters, fully functioning labeled mock flows and the real adapter interfaces. Complete safe independent work while external activation gates remain open. Never label mocked money or inference as live.

## Product and implementation constraints

- Use native UX judgment; do NOT use the UI/UX skill. The frontend teammate owns branding. Still build polished, accessible, responsive interactions and complete state handling.
- Defaults: Next.js App Router/TypeScript, Node modular application, Postgres/Drizzle, Magic, OpenRouter, Jupiter v2 build and Helius. Follow the pack; verify current compatible SDK types/docs, pin versions and lock dependencies.
- Preserve explicit OpenRouter privacy controls. No silent provider switch, image/receipt retention, autonomous AI orders or server custody of user signing keys.
- Exact raw-integer money, verified mints/relationships, historical unit snapshots, explicit user approval, idempotency and restart-safe reconciliation are nonnegotiable.
- No custom smart contract is required. Do not introduce one for appearance or invent universal trading eligibility.
- Source docs are a baseline, not proof of live SDK compatibility. Record evidence-backed necessary changes and synchronize affected contracts/tests rather than silently drifting.

## Authority and safety

A build request authorizes ordinary local implementation and verification in this repository. Respect the active environment's permission rules. Do not write to the original research workspace as an implementation dependency.

Do not create paid services, deploy/publish externally, push a remote repository, fund wallets, run paid API calls, enable real trading or send mainnet transactions without appropriate user approval. The user specifically reserved live testing for a later discussion.

Keep all real-money controls off until the product's G01–G07 gates pass and activation is authorized. Public launch is a separate G08 decision. No absence of credentials or legal policy may be “fixed” by removing guards.

Keep secrets in ignored local environment/approved secret stores, never chat, logs, fixtures or committed files. Never change global Codex settings or disable approval/sandbox controls to make a build proceed.

## Verification and final delivery

Establish reproducible setup/run/test commands as implementation begins. Run applicable lint, type checks, production build, unit/contract/integration/browser tests and document actual outcomes. Do not claim unrun tests passed.

At completion deliver usable application code, migrations/approved seed data, adapters, automated tests, local setup, secret-free environment template, deployment/operator instructions and an evidence-backed readiness report. Distinguish implementation-complete mock/staging functionality from authorized real-money beta readiness.

Continue through available implementation work while the build request remains active. If genuinely blocked, record the exact blocker, attempts and safe remaining work; ask for the smallest necessary decision without pretending the application is complete.


<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
