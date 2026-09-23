# Product Audit Checklist

Use this reference when the task is a substantial redesign/refactor or when the current product architecture is not already documented.

## 1. Repository evidence

Inspect enough of the repository to understand:
- framework and app structure
- route tree
- layouts
- middleware
- redirects
- auth handling
- state management
- data fetching/services
- domain types/models
- feature folders
- global navigation
- mobile navigation
- modals/drawers/sheets
- forms
- search
- loading/error/empty states
- responsive behavior
- analytics/event names if they reveal user journeys
- README/product docs

Do not treat component names as proof of user-facing meaning.

## 2. Current route inventory

Record:
- route
- dynamic params
- auth requirement
- page purpose
- entry points
- primary CTA
- entities shown
- key dependencies
- observed issues

Include route-group layouts and query-driven states when they materially alter behavior.

## 3. Capability inventory

Group capabilities by user job rather than folder structure.

Potential Shelf groups:
- discover
- search
- scan
- identify product
- understand brand/company relationship
- research company
- understand public/private exposure
- save/watch
- invest/transact
- track holdings
- portfolio
- learn
- authenticate
- account/settings

Mark duplicates and overlaps.

## 4. Domain/entity audit

For each entity, document:
- human meaning
- source data/model
- identifying fields
- relationships
- actions
- detail surface
- whether it is searchable
- whether it can be saved
- whether it can be owned
- terminology inconsistencies

Pay special attention to:
Product, Brand, Company, Instrument/Exposure, Holding, Portfolio Position, Saved Item, Watch Item.

## 5. Journey audit

For each major journey record:
- entry
- intent
- first decision
- steps
- context lost between steps
- duplicate decisions
- auth interruptions
- dead ends
- success
- recovery

## 6. Experience-friction heuristics

Look for:
- too many top-level destinations
- same capability exposed under different names
- internal vocabulary used as navigation
- pages whose only purpose is to lead to another page
- unclear distinction between save/watch/own
- unclear entity identity
- repeated searches
- unnecessary confirmation
- modal stacks
- hidden primary actions
- dead-end empty states
- generic errors
- desktop-only workflows
- important state that cannot be shared/revisited
- URLs that encode implementation rather than meaning
- duplicated public/private investment UI despite different semantics
- charts/data presented without actionable context
- financial CTAs shown before users understand the underlying entity

## 7. Evidence classification

Label important findings as:
- CONFIRMED — directly supported by code/docs
- INFERRED — strongly implied by product structure
- ASSUMPTION — needed to proceed but not confirmed
- RECOMMENDATION — target-state design decision

Do not present assumptions as current product facts.
