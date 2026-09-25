# Remaining frontend — execution contract

Concept 2 — Capital Research Direction is FINAL. This continuation implements the existing
guide, not another concept. Approved Home, Discover and Scan compositions are preserved.

## Shared-foundation audit

Inspected actual AppShell/AppHeader/MobileNavigation, ConceptTwoHome, ConceptDiscoverScreen,
ScanScreen, ScanResultsScreen, discovery-patterns, CapitalRelationship and their styles, plus
the existing rendered Concept 2 and Scan captures. Typography is Arial/system sans, regular
editorial headings; functional canvas #f5f5ef, text #19221d, graphite shell #111715,
mint #b6efd2, forest actions #203e2c. Bounded 1328px workspace, 40px desktop/16px mobile
gutters, 54px desktop/42px mobile page titles, 44px minimum controls, 3px control radii,
thin neutral rules, no shadows. Evidence follows identity, exposure follows research.

Reuse: AppHeader/MobileNavigation, ProductArtwork, CapitalRelationship,
SearchCommand, Field, CtaLink, ErrorMessage/ResultMessage, native details and native dialog.
All remaining routes receive `.research-workspace`; `research-workspace.css` centrally
extends the existing ui.tsx primitives. Card becomes a ruled section within this scope only.
Common classes: `research-split`, `research-section`, `research-rows`, `research-row`,
`research-tabs`, `research-table`, `research-reading`, `research-identity`, `research-products`.
Use existing button/secondary/ghost, field, facts, actions, notice/error/result classes.
No independent type/color/control/table/modal systems. Request shared changes from root.

## Ownership and sequence

- Root: shared styles/shell, route-pages integration, A research entities, F Admin, guide, final QA.
- B: new Saved, Share, Learn and Assistant screen modules; no shared files.
- C/E: financial.tsx and issuer-assets.tsx (including Send), dedicated financial tests.
- D: account.tsx only, dedicated account tests; coordinate Send with C/E.
- All: read relevant guide responsibilities and provider contracts; preserve API/server guards.
- Root alone runs production builds. Others may run scoped lint/tests/typecheck when no build runs.

## Checklist

- [x] Shared foundation audited and ownership assigned.
- [x] A: Product / Brand / Company.
- [x] B: Saved / sharing / learning / Assistant.
- [x] C: Portfolio / Holding / Sell / Activity / Record.
- [x] D: Account / Wallet / Send / auth / onboarding / availability.
- [x] E: investment / Basket / review / status.
- [x] F: five distinct Admin work areas.
- [x] Five-width rendered QA, accessibility, regressions, build and screenshots.

The latest explicit brief restores real Brand/Company research routes; current issuer asset
routes/backend remain separate and authoritative for live instruments. No deployment, paid AI,
production-state mutation or money activation is authorized. Financial tests use isolated data.

## Completion evidence

All six workstreams are integrated. ESLint, TypeScript, 120 unit/contract tests and production
build pass. The consolidated browser run passes 90 cases with 14 deliberate project-specific
skips. Four final guest/member/owner route checks pass after the investment auth-boundary fix.
The five-width matrix and automated desktop/mobile accessibility sweep pass; 76 screenshots
are linked from the artifact index. See `FRONTEND_COMPLETION_REPORT.md` for the route inventory,
exact evidence, synthetic-fixture disclosure and retained backend limitations. Stop here for review;
no deployment or financial activation was performed.
