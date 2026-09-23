# Product Design Architect — Codex Skill

This package is intended to live inside the Shelf repository as a repo-specific Codex skill.

## Install

Copy this folder to:

```text
<repo>/.agents/skills/product-design-architect/
```

Codex discovers repo-level skills from `.agents/skills`.

Recommended structure:

```text
.agents/
└── skills/
    └── product-design-architect/
        ├── SKILL.md
        └── references/
            ├── audit-checklist.md
            ├── concept-integration.md
            ├── design-guide-template.md
            ├── quality-gate.md
            └── route-and-navigation-rules.md
```

## First use

From the Shelf repo, tell Codex:

```text
Use $product-design-architect.

Audit the existing application and create the initial
docs/PRODUCT_DESIGN_GUIDE.md.

Do not implement the redesign yet. Treat the current application as the
functional baseline, not the design baseline. You may restructure navigation,
routes, page responsibilities and journeys as long as every meaningful
existing capability is accounted for.

Inspect the repository before making decisions and use the skill's full
product audit and quality gates.
```

## When you later provide a design concept

```text
Use $product-design-architect in concept/reference mode.

Read the existing docs/PRODUCT_DESIGN_GUIDE.md first.

Analyze the supplied reference for transferable product, UX, hierarchy,
interaction and visual principles. Do not copy it literally. Update only the
affected sections of the guide, keep routes/page responsibilities/journeys
synchronized, and add material decisions to the decision log.

Do not implement yet.
```

## When implementation begins

Use this skill as the architecture contract, then pair it with a frontend/UI
implementation skill. The product-design skill decides what the product should
do and how the experience is structured; the implementation skill handles
production UI/code and visual verification.

## Optional AGENTS.md pointer

If the repo has an `AGENTS.md`, keep the pointer short:

```md
## Product design / frontend architecture

Before substantial UI redesigns, route/navigation changes, new product
surfaces, or UX refactors, use the repo skill
`$product-design-architect` and read `docs/PRODUCT_DESIGN_GUIDE.md`.
Do not change product architecture without updating the guide and its
decision log.
```

Do not duplicate the whole skill inside `AGENTS.md`.
