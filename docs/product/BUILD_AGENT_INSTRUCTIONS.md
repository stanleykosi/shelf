# Instructions for the Shelf implementation agent

You are building Shelf in the separate application repository containing this copied product pack. The original research workspace is not an implementation target.

## Read and preserve

Read README and documents00–19 before changing architecture or generating product code. Historical research in research/ explains origin, not current requirements. Inspect destination AGENTS.md and existing code/dirty worktree. Preserve unrelated user changes.

The user approved the product decisions and delegated minor defaults; do not restart the 22-question discovery exercise. Do ask before materially changing scope, wallet custody, provider, financial policy, privacy, external spending or launch authority.

Use native UX judgment. The user explicitly said not to use the UI/UX skill. The frontend teammate owns visual identity; implement complete functional UX, accessibility and state handling rather than treating design as absent.

## Product nonnegotiables

- Seven discovery inputs, multiple products, all five categories, small verified relationship registry.
- Guests learn/scan/save temporarily; one private member shelf and explicit sanitized link sharing.
- Magic email/Google embedded Solana wallet preferred; OpenRouter paid vision/education/drafts with required privacy.
- USDC deposit, single buy, multi-company budget, sell to USDC, supported token/USDC transfer.
- Shelf-origin portfolio, exact history/exports, corporate-action explanations.
- No retained images/raw receipts; no automatic AI trading; no custom contract/custodial wallet required.
- Global ambition is not permission to bypass issuer/eligibility requirements.

## Build discipline

Follow document17's stages. Keep checklists of PR requirements, T acceptance tests, and G readiness gates with evidence. Implement deterministic mocks first, connected staging next and real-money activation only after explicit authorization.

Use fixed-point/raw integer money, authoritative server validation, genuine user signature, bounded sponsor and persisted signature-before-broadcast. Never fake a successful quote/fill or replace an unknown transaction automatically.

Provider versions and SDK methods must be checked against installed types/current primary docs. In particular: bind Magic's Solana address, prove v0 partial signatures, validate Jupiter v2 /build fee/payer semantics, verify Token-2022 unit conversions and enforce OpenRouter endpoint privacy. Historical quote data is not proof.

No hardcoded keys, seed phrases, user PII or live funded fixtures. Do not ask the user to paste secrets into chat. Record environment variable names and setup locations, not their values.

Build every requested launch function even if real provider credentials are unavailable, using labeled mock adapters. Gate activation independently; do not remove sell/transfer/basket or AI functions as shortcuts. No public rollout implied by a passing build.

## Deliverables in the destination repository

Working application, database migrations/approved seed data, typed API contract, adapters, automated tests, local setup, ignored-secret template, operator/admin documentation, deployment/rollback instructions, evidence matrix and specific remaining live gates.

At handoff summarize what actually runs, test commands/results, limitations and required next approvals. The user wants to discuss live tests afterward; do not spend funds or run mainnet trades merely because a task says “finish the app.”

