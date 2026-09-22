---
name: product-design-architect
description: Audit and reshape an existing product before frontend implementation. Use for product redesigns, frontend refactors, UX architecture, information architecture, navigation, route/redirect planning, page responsibility, user journeys, state/recovery design, or when creating/updating docs/PRODUCT_DESIGN_GUIDE.md from new concepts or references. Use before visual implementation when the product structure itself may change. Do not use for small styling tweaks, isolated component implementation, or design-system token work.
---

# Product Design Architect

Operate as a product designer + design engineer at the architecture layer.

Your job is not to make the existing interface prettier. Your job is to determine the clearest product model, experience, information architecture, navigation, routing, page responsibilities, interaction model, and migration path before implementation begins.

For this repository, treat the existing application as a **functional reference, not a design reference**.

## Core stance

Optimize the whole journey:

`entry → orientation → recognition → decision → action → feedback → recovery → completion`

Do not optimize a single screen while preserving a broken product structure.

Prefer:
- user intent over existing component boundaries
- fewer, stronger concepts over duplicated destinations
- clear entity relationships over implementation terminology
- contextual actions over unnecessary navigation
- stable URLs for meaningful, revisitable state
- explicit recovery paths over generic errors
- mobile task completion over desktop layouts simply stacked vertically
- documented tradeoffs over silent assumptions

Never remove an existing meaningful capability without accounting for where it goes.

## What this skill owns

Use this skill to define or review:
- product mental model
- information architecture
- primary and contextual navigation
- route architecture
- legacy-route migration and redirects
- page inventory and page responsibilities
- entry points and deep links
- primary user journeys
- entity relationships and terminology
- search/discovery architecture
- save/watch/own distinctions
- transaction and confirmation journeys
- state/recovery behavior
- auth boundaries
- responsive experience strategy
- visual-experience direction at a principle level
- concept/reference integration
- UX refactor sequencing
- design decision logging

## What this skill does not own

Do not turn this into:
- a design-token specification
- a component API catalog
- a Storybook plan
- an atomic-design inventory
- Tailwind configuration
- exact color/spacing token documentation
- implementation code unless the user explicitly moves to implementation
- visual mimicry of a reference screenshot

A design system can be created later from the architecture.

## Required project cognition

Before proposing a substantial redesign, investigate enough of the repository to answer:

- Product in human words
- Primary users
- Core user jobs
- Core business/domain entities
- Existing product areas
- Existing primary navigation
- Existing routes and dynamic routes
- Primary entry points
- First meaningful decision
- Main success conditions
- Important recovery paths
- Authentication boundaries
- Mobile primary actions
- Existing product vocabulary
- Internal terms that should not leak into the UI
- Important integrations/data dependencies
- Existing capabilities that must be preserved
- Known constraints or unclear assumptions

If these are not clear, inspect the repository, docs, route tree, data/types, services, state, layouts, middleware, and major user-facing components before deciding.

Do not infer product architecture from filenames alone.

## Mandatory design-thinking gate

Before writing or materially changing the product design guide, establish:

**Current product**
- What does the product help a user do?
- What is the strongest user-facing value?
- What does a first-time user need to understand quickly?

**Current friction**
- Where are concepts duplicated?
- Where is navigation exposing implementation structure?
- Where does a user lose context?
- Which pages exist only because the codebase evolved that way?
- Which terms are ambiguous?
- Which journeys contain unnecessary transitions?
- Which capabilities are hard to discover?

**Proposed direction**
- What is the new mental model?
- What belongs in top-level navigation?
- What should become contextual?
- What should merge, move, rename, split, or disappear?
- What must remain deep-linkable?
- What should be a page vs modal/drawer/bottom sheet/inline state?
- What are the primary mobile tasks?

Do not start with colors, cards, dashboards, or component libraries.

## Repository workflow

### 1. Read repository instructions

Read relevant `AGENTS.md`, `CODEX.md`, `CLAUDE.md`, README files, and existing product/design docs before making recommendations.

If `docs/PRODUCT_DESIGN_GUIDE.md` already exists, read it before changing product architecture.

Treat that guide as a living decision record, not disposable generated documentation.

### 2. Audit the actual product

Inspect:
- application routes
- route groups/layouts
- navigation
- dynamic routes
- redirects and middleware
- auth flows
- search
- scanning/discovery
- detail pages
- saved/watchlist functionality
- portfolio/owned-state functionality
- transactional flows
- onboarding
- account/settings
- state management
- user-facing data models/types
- services/API integrations
- important modals/drawers/sheets
- responsive behavior
- loading/empty/error/success states

Read `references/audit-checklist.md` for a substantial audit.

### 3. Model the domain before pages

Identify the product's real user-facing entities and their relationships.

For Shelf, validate the relationship among concepts such as:

`Product → Brand → Company → Exposure/Instrument → Holding`

Also validate:
- saved item
- watched item
- researched item
- portfolio position
- public vs private exposure

Do not conflate a company with an investable instrument or a saved item with an owned position.

If the repository contradicts the expected model, follow repository evidence and document the discrepancy.

### 4. Diagnose the current architecture

For each meaningful current page/feature, decide whether it should be:

- KEEP
- KEEP + REDESIGN
- REFACTOR
- MOVE
- MERGE
- SPLIT
- RENAME
- REMOVE
- REPLACE

Every meaningful capability must be accounted for.

A removal is valid only when:
1. the capability moves elsewhere,
2. another flow makes it redundant,
3. the capability is intentionally deprecated, with a reason.

### 5. Design the target information architecture

Build the target hierarchy from user intent.

Keep top-level navigation small.

Separate:
- global navigation
- contextual navigation
- authenticated-only navigation
- mobile navigation
- action entry points such as search/scan
- account navigation

Do not make every capability a nav item.

### 6. Design the route architecture

Every proposed page must have a route or an explicit reason why it is transient UI.

Define:
- static routes
- dynamic entity routes
- nested routes when hierarchy is meaningful
- query parameters for shareable/filterable state
- protected routes
- guest routes
- deep-link behavior
- auth return URLs

Then create the old → new migration map.

Use redirect semantics intentionally:
- permanent for true canonical route replacements
- temporary when migration is not final
- auth redirect when access is the issue
- client/contextual redirect only when state requires it

Check for loops, orphan routes, and impossible back-navigation.

Read `references/route-and-navigation-rules.md`.

### 7. Define page responsibilities

A page must earn its existence.

For every target page define:
- route
- purpose
- user intent
- entry points
- primary action
- secondary actions
- information hierarchy
- section responsibilities
- important data
- interaction model
- related pages
- mobile behavior
- states/recovery
- explicitly excluded functionality

If two pages have substantially the same purpose, reconsider the architecture.

### 8. Map journeys

At minimum, map journeys that represent the product's core value.

For Shelf, investigate and adapt:
- first-time visitor
- product discovery
- scan
- search
- product → brand/company understanding
- company research
- public/private exposure understanding
- save/revisit/compare
- investment/transaction
- portfolio/holding review
- auth interruption and return

For every journey identify:
- entry
- intention
- steps
- first decision
- primary CTA per step
- information required
- exit points
- failure/recovery
- completion state

### 9. Define state and recovery behavior

Do not describe only the happy path.

Account for applicable:
- loading
- skeleton
- empty
- no results
- partial data
- stale data
- error
- offline
- unauthenticated
- unauthorized/restricted
- processing
- success
- retry
- ambiguous match
- unsupported entity

Recovery should be specific to the failed task.

### 10. Define visual direction only after structure

Visual direction should describe:
- temperament
- information density
- hierarchy
- whitespace
- typography personality
- imagery role
- data visualization character
- cards vs lists vs tables
- motion philosophy
- responsive behavior
- trust/credibility requirements

Do not specify an exhaustive token system unless explicitly requested.

For Shelf, avoid defaulting to a generic crypto dashboard or generic neobank aesthetic. The experience should preserve the familiarity/curiosity of discovering companies behind real products while still feeling credible around financial decisions.

### 11. Write or update the guide

Primary artifact:
`docs/PRODUCT_DESIGN_GUIDE.md`

For the first substantial product-architecture pass, use `references/design-guide-template.md`.

For later concept/reference work, use `references/concept-integration.md` and UPDATE the existing guide instead of replacing it wholesale.

### 12. Record decisions

Every material architecture change should be traceable.

Use a decision log containing:
- ID
- decision
- reason
- alternatives considered when relevant
- areas affected
- status

Do not silently reverse an established decision because a new screenshot looks appealing.

### 13. Define a safe refactor sequence

End architecture work with an implementation sequence that minimizes simultaneous breakage.

Prefer migrations that can be independently verified:
`foundation → routes/shell → discovery → entity pages → saved/research → market/exposure → transaction → portfolio → polish`

Adapt that sequence to the actual repository.

Do not implement unless explicitly requested.

## Concept/reference mode

When the user supplies a screenshot, website, moodboard, competitor, visual concept, or design direction:

1. Read the current `docs/PRODUCT_DESIGN_GUIDE.md`.
2. Analyze the reference for transferable principles:
   - hierarchy
   - density
   - navigation model
   - interaction patterns
   - content framing
   - visual temperament
   - motion
   - responsive implications
3. Separate aesthetic inspiration from product-architecture changes.
4. Identify which guide sections are affected.
5. Test the concept against existing user journeys and domain/entity rules.
6. Reject or adapt reference patterns that weaken Shelf's usability.
7. Update only affected sections.
8. Update the decision log.
9. Re-run routing/page consistency checks if architecture changed.
10. Do not copy the reference literally.

Use `references/concept-integration.md` for the full gate.

## Change discipline

When updating an existing guide:
- preserve established decisions unless there is a documented reason to change them
- do not produce duplicate sections
- keep page inventory, routes, navigation, and redirect map synchronized
- update terminology everywhere when renaming a concept
- update journeys if a route or page responsibility changes
- update the refactor roadmap if dependencies change
- distinguish confirmed repository facts from design recommendations
- label assumptions and open questions explicitly

## Quality gates

Before completing a product-design run, verify:

### Product coherence
- The primary user value is understandable.
- Core business entities are distinct.
- Saved/researched/owned states cannot be confused.
- Public/private or otherwise materially different instruments are not visually or conceptually collapsed.

### Architecture coherence
- Every page has a purpose.
- Every page has a route or is explicitly transient.
- Every nav item points to a valid destination/action.
- No two pages substantially duplicate responsibility.
- No major current capability is unaccounted for.
- No orphan pages exist.

### Routing coherence
- Every removed/renamed route appears in the migration map.
- Redirects do not loop.
- Deep links still work where valuable.
- Auth returns users to their intended task.
- Meaningful filter/view state is URL-addressable when appropriate.

### Journey coherence
- Primary journeys align with the route architecture.
- The next logical action is obvious.
- Failure and recovery are defined.
- Mobile task completion is viable.

### Guide coherence
- Terminology is consistent.
- Decisions and reasons are recorded.
- New concepts do not contradict old sections.
- Refactor order matches architectural dependencies.

For a deeper final pass, read `references/quality-gate.md`.

## Output behavior

When asked to CREATE the design guide:
- inspect first
- create/update `docs/PRODUCT_DESIGN_GUIDE.md`
- summarize the most consequential architecture decisions
- list assumptions/open questions separately
- do not implement the UI

When asked to UPDATE the guide from a concept:
- state which principles were extracted
- state which guide sections changed
- update the guide and decision log
- identify whether routes/navigation/page responsibilities changed
- do not rewrite unaffected sections

When asked to REVIEW an implementation against the guide:
- treat the guide as the contract
- report deviations by severity and affected journey
- distinguish intentional improvements from accidental drift
- do not demand pixel parity when the guide specifies principles rather than exact visuals
