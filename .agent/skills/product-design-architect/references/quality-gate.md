# Product Design Quality Gate

Use before declaring a substantial product-design guide complete.

Score nothing numerically. Review for coherence.

## A. Product comprehension

Can a new user answer:
- What is this product for?
- What can I do here?
- What is the difference between discovering, saving, investing, and owning?
- What should I do next?

If not, the architecture is not ready.

## B. Entity clarity

Check that each user-visible entity has:
- one clear meaning
- one canonical detail surface where appropriate
- consistent terminology
- actions that belong to that entity

For Shelf:
- Product is not Company
- Company is not Instrument
- Instrument is not Holding
- Saved is not Owned
- Public and Private exposure are not silently treated as the same thing

## C. Navigation

Check:
- top-level destinations are user jobs
- high-frequency actions are easy to reach
- context-specific actions are not promoted globally without reason
- mobile navigation is deliberately prioritized
- there is no duplicate destination under different labels

## D. Routes

Check:
- every canonical page has one canonical route
- every removed route has an intentional outcome
- legacy query parameters are preserved or deliberately migrated
- deep links work
- auth return-to-intent is defined
- redirect loops are impossible

## E. Page responsibility

For each page:
- one primary purpose
- one obvious primary action
- information ordered by task priority
- excluded responsibilities are documented
- states/recovery are defined
- mobile behavior is intentional

If a page cannot be described in one concise purpose statement, revisit it.

## F. Journeys

Check primary journeys for:
- clear entry
- no unnecessary page transitions
- no repeated decisions
- no context loss
- explicit success
- explicit failure recovery
- sensible browser/back behavior

## G. Financial/trust surfaces

Where financial action is involved:
- identity of company/instrument is clear
- action is clearly distinct from research/save
- restrictions/availability are visible
- materially different investment types are distinguished
- transaction processing/success/failure states are explicit
- copy avoids implying guarantees

## H. Responsive behavior

Check:
- mobile is not a collapsed desktop page
- primary actions remain reachable
- dense data has a mobile strategy
- tables/charts have intentional alternatives
- drawers/sheets do not create interaction traps
- scan/search entry remains accessible

## I. Guide integrity

Check:
- current-state facts and recommendations are distinguishable
- assumptions are labeled
- decision log is current
- route map, page inventory, journeys, navigation, and roadmap agree
- no stale names remain after renames
- no proposed page is missing from the page specifications
