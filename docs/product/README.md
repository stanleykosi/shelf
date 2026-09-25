# Shelf — product build pack

Specification version: 1.0 · Prepared: 2026-09-20 · Product name provisional.

Shelf turns everyday product discovery into understandable, user-approved stock-token purchases. This pack is a standalone implementation contract for a **mobile-friendly web product and invite-only real-money beta**. It is not an event submission brief. Application implementation belongs in a different repository.

## Start here

1. Read [decisions](00-decisions.md) and [product requirements](01-product-requirements.md).
2. Read [experience flows](02-ux-flows.md) and [every screen/CTA](03-screens-and-ctas.md).
3. Read [architecture](05-architecture.md), [data model](06-data-model.md) and [API contracts](07-api-contracts.md).
4. Implement in the order in [build sequence](17-build-sequence.md), using [agent instructions](BUILD_AGENT_INSTRUCTIONS.md).
5. Use [acceptance tests](15-testing-and-acceptance.md) and [traceability](18-traceability.md) to establish completion. A rendered screen alone does not establish that a feature works.

## Document map

| File | Authority |
|---|---|
| [00-decisions.md](00-decisions.md) | User requirements, chosen defaults, explicit unresolved external gates |
| [01-product-requirements.md](01-product-requirements.md) | Scope, personas, feature IDs, release boundaries |
| [02-ux-flows.md](02-ux-flows.md) | Journeys, information hierarchy, native UX decisions, functional wireframes |
| [03-screens-and-ctas.md](03-screens-and-ctas.md) | Routes, inputs, CTAs, permission/loading/empty/error/success states |
| [04-frontend.md](04-frontend.md) | Client/server boundaries, components, browser behavior, accessibility |
| [05-architecture.md](05-architecture.md) | Stack, trust boundaries, backend services and provider adapters |
| [06-data-model.md](06-data-model.md) | Tables, field types, uniqueness, indexes, accounting and retention |
| [07-api-contracts.md](07-api-contracts.md) | First-party endpoints, validation, authentication, errors and idempotency |
| [08-identity-wallet-funding.md](08-identity-wallet-funding.md) | Magic, sessions, wallet binding, deposits, recovery |
| [09-trading-transfers-accounting.md](09-trading-transfers-accounting.md) | Quote/sign/submit/confirm, fees, baskets, transfers, inventory attribution |
| [10-ai-recognition.md](10-ai-recognition.md) | OpenRouter, schemas, prompt contracts, source grounding, allocation drafts |
| [11-catalog-and-market-data.md](11-catalog-and-market-data.md) | Ownership registry, data ingestion, mint verification, pricing, corporate actions |
| [12-security-privacy-eligibility.md](12-security-privacy-eligibility.md) | Threat model, privacy, financial access rules, transaction controls |
| [13-infrastructure.md](13-infrastructure.md) | Hosting, costs, environment variables, credentials, environments, backups |
| [14-admin-and-operations.md](14-admin-and-operations.md) | Owner console, jobs, incident response, support, recovery |
| [15-testing-and-acceptance.md](15-testing-and-acceptance.md) | Automated/manual tests and money/AI/security release gates |
| [16-seed-catalog-and-fixtures.md](16-seed-catalog-and-fixtures.md) | Candidate seed content, exact mint snapshots, deterministic fixtures |
| [17-build-sequence.md](17-build-sequence.md) | Dependency-ordered implementation with measurable exit criteria |
| [18-traceability.md](18-traceability.md) | User answers → features → API/screens → verification |
| [19-research-and-sources.md](19-research-and-sources.md) | Competitors, verified provider capabilities, source links and caveats |
| [BUILD_AGENT_INSTRUCTIONS.md](BUILD_AGENT_INSTRUCTIONS.md) | Copyable instructions for the implementation agent |
| [research/README.md](research/README.md) | Historical evidence retained separately from current product requirements |

## Precedence and evidence

The user's latest explicit choices override earlier research proposals. This pack's numbered specifications override historical appendices. Domain-specific documents own their contracts: API file owns HTTP shapes; data file owns persistence; trading file owns monetary invariants; AI file owns model boundaries. Update dependent documents together when changing one.

**Confirmed** describes the user's decisions or directly inspected primary documentation, not executed integration. **Default** is an implementation decision chosen under the user's delegation. **Gate** is a prerequisite that requires credentials, provider verification, operator policy or a controlled test before enabling a real-money capability.

The pack is ready to guide implementation. It is **not** a security audit, legal clearance, proof of provider interoperability, or permission to spend money. No application, API account, deployment or live transaction was created while preparing it.

## Scope in one paragraph

Guests can scan, upload, search or paste supported product links; AI recognizes multiple products and helps identify likely owners. Current issuer token details carry company/instrument research and the only AI chat, scoped to that exact token. Signed-in users have a Magic Solana wallet, one private shelf, USDC deposits, individual/basket buys, sells, outbound transfers, private records and corporate-action explanations. The explicit basket flow can propose editable, constrained allocation drafts. Images and raw receipt text are not retained. Users deliberately opt into revocable, holdings-free shelf links. Recurring investments, gifts, native apps and bank/card funding are not version-one requirements.

## Critical distinctions

- Globally accessible discovery does not imply universally lawful token-stock distribution. Unknown financial eligibility fails closed.
- A camera match does not establish a corporate relationship; a relationship does not establish a supported token; a token does not establish an executable quote.
- A quote is not a purchase. A submitted transaction is not final settlement.
- Shelf's private application records do not make public Solana transactions private.
- AI suggests; a deterministic backend validates; the user reviews and signs.
- No custom onchain program is required for version one. No server holds user signing keys.
- Styling belongs to the frontend teammate. UX contracts are specified here using native reasoning; the UI/UX skill's generated recommendations are not adopted.

## Copying into the build repository

Copy this entire directory into the destination repository as `docs/product/` (or retain its name) and point the implementation agent at this README. Relative links make the pack portable. Keep historical evidence read-only. Create runtime secrets only in that repository's ignored local environment and approved hosting secret stores—never in this pack.
