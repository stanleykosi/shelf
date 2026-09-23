# Concept Integration Protocol

Use this when the user supplies a new screenshot, website, moodboard, competitor, concept, or visual direction after the initial product guide exists.

## Step 1 — Read the current contract

Read:
- `docs/PRODUCT_DESIGN_GUIDE.md`
- current decision log
- affected route/page implementation if necessary

Do not start from a blank slate.

## Step 2 — Extract, don't copy

Break the reference into:
- product idea
- information hierarchy
- navigation model
- page composition
- interaction pattern
- density
- typography character
- surface treatment
- imagery strategy
- motion
- responsive behavior
- trust/credibility signals

For each, decide:
- adopt
- adapt
- reject
- not applicable

Explain why.

## Step 3 — Separate visual and architectural impact

Classify each proposed change:

### Visual only
Does not alter route, task flow, page responsibility, or entity model.

### Interaction
Changes how a user performs a task but not the core IA.

### Information architecture
Moves/merges/splits content or changes navigation.

### Product model
Changes terminology, entity relationships, or meaning.

### Routing
Changes canonical URLs, redirects, or deep links.

Higher-impact categories require broader guide updates.

## Step 4 — Protect product meaning

For Shelf specifically, ensure a concept does not:
- blur Product / Brand / Company / Instrument / Holding
- make saved items look owned
- make public and private exposure look equivalent when they are not
- prioritize decorative market visuals over comprehension
- bury the product-to-company discovery idea
- force finance jargon into first-time discovery
- turn all pages into generic dashboard cards

## Step 5 — Update only affected sections

Patch the existing guide.
Do not regenerate unchanged architecture.

If page responsibilities change:
- update page spec
- update page inventory
- update journey
- update navigation if relevant
- update route map if relevant
- update redirect map if relevant
- update implementation sequence if dependencies changed

## Step 6 — Decision log

Add a decision entry when the concept materially changes:
- navigation
- route
- terminology
- page responsibility
- journey
- visual direction principle
- major interaction

Include the reason and affected areas.

## Step 7 — Consistency check

Before finishing:
- no duplicate page purposes
- no orphan route
- no stale terminology
- no route referenced by navigation that no longer exists
- no old journey referring to removed UI
- no conflicting visual rules
