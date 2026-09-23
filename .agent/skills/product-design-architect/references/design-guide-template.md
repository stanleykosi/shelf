# Product Design & Experience Guide

> This is the living product/UX architecture contract for the frontend refactor.
> It is not a design system.

## Document status

- Product:
- Last updated:
- Current refactor phase:
- Source-of-truth status:
- Known assumptions:

---

# 1. Product Model

## Product in human words

## Primary users

## Core user jobs

## Core value loop

## Core entities and relationships

## Product experience principles

---

# 2. Current Product Audit

## Current primary navigation

## Current route inventory

| Current Route | Page | Purpose | Key Capability | Auth | Observations |
|---|---|---|---|---|---|

## Existing product areas

## Existing primary journeys

---

# 3. Experience Problems & Opportunities

For each:
### [Problem]
**Evidence**
**Why it matters**
**Proposed direction**
**Confidence:** Confirmed / Inferred / Assumption

---

# 4. Target Product Experience

## What a first-time user should understand

## Primary action

## Secondary actions

## What feels exploratory

## What feels transactional

## What feels educational

## Trust requirements

---

# 5. Information Architecture

```text
Product
├── ...
└── ...
```

## Primary navigation

## Contextual navigation

## Authenticated navigation

## Mobile navigation

## Account navigation

---

# 6. Routing Architecture

| Proposed Route | Page | Purpose | Auth | Parent/Context | Deep-linkable? |
|---|---|---|---|---|---|

## Query/state conventions

## Transient surfaces that should NOT be routes

---

# 7. Route Migration & Redirect Map

| Existing Route | Decision | New Route | Redirect Type | Preserved State | Reason |
|---|---|---|---|---|---|

## Auth redirects

## Legacy deep links

---

# 8. Navigation Model

## Desktop

## Mobile

## Search entry

## Scan/discovery entry

## Account access

## Saved/research access

## Portfolio access

---

# 9. Core User Journeys

## First-time visitor

**Intent**
**Entry**
**Flow**
**Primary decisions**
**Recovery**
**Completion**

## Discovery

## Scan

## Search

## Entity research

## Save/revisit

## Investment/transaction

## Portfolio/holding review

## Auth interruption and return

---

# 10. Page Specifications

Repeat this block for every target page.

## [Page name]

**Route**

**Purpose**

**User intent**

**Entry points**

**Primary action**

**Secondary actions**

### Information hierarchy
1.
2.
3.

### Section responsibilities

### Important data

### Interaction model

### Related pages

### Mobile behavior

### States & recovery
- loading
- empty
- no results
- partial
- stale
- error
- unauthenticated
- restricted
- processing
- success

### Explicitly not shown here

---

# 11. Entity & Terminology Model

| Entity | User Meaning | Canonical Surface | Primary Actions | Related Entities |
|---|---|---|---|---|

## Terminology to keep

## Terminology to rename/remove

---

# 12. Discovery Strategy

## Primary entry

## Search

## Scan

## Alternative recognition methods

## Ambiguous match behavior

## No-match/unsupported behavior

## Correction flow

---

# 13. Market / Exposure / Transaction Experience

## Public vs private distinctions

## Instrument identity

## Availability/restrictions

## Risk/context

## Transaction progress and recovery

---

# 14. Saved / Watch / Owned Model

## Saved research

## Watch behavior

## Owned/portfolio behavior

## Terminology decision

---

# 15. Visual Experience Direction

## Product temperament

## Hierarchy & density

## Typography character

## Surface philosophy

## Imagery

## Data visualization

## Motion

## Desktop

## Mobile

## Explicit anti-patterns

---

# 16. Content & UX Writing

## Voice

## Navigation labels

## CTA language

## Financial terminology

## Error/recovery language

## Empty states

---

# 17. Interaction Philosophy

## Pages vs modals/drawers/sheets

## Tabs/segmented controls

## Inline expansion

## Confirmation

## Optimistic updates

## Destructive actions

## Async processing

---

# 18. Responsive Strategy

## Mobile

## Tablet

## Laptop

## Large desktop

## Dense data strategy

---

# 19. Product State Matrix

| Experience | Loading | Empty | Error | Partial | Success | Recovery |
|---|---|---|---|---|---|---|

---

# 20. Authentication Boundaries

## Guest capabilities

## Protected capabilities

## Sign-in triggers

## Return-to-intent

---

# 21. Refactor Decision Matrix

| Existing Feature/Page | Decision | Destination | Reason |
|---|---|---|---|

## New additions

| Addition | Problem Solved | Location | Refactor MVP / Later |
|---|---|---|---|

---

# 22. Shared Experience Patterns

For each pattern:
- meaning
- where it appears
- information hierarchy
- behavior
- states

---

# 23. Concept Integration Rules

Document project-specific rules that future references must respect.

---

# 24. Design Decision Log

| ID | Decision | Reason | Areas Affected | Status |
|---|---|---|---|---|

---

# 25. Refactor Sequence

For each phase:
- scope
- dependencies
- pages/routes
- preserved capabilities
- verification

---

# 26. Target Product Map

## Navigation map

## Route map

## Primary value journey

## Page inventory

## Removed concepts

## Merged concepts

## New concepts

---

# Open Questions / Assumptions

Keep unresolved product questions here rather than inventing behavior.
