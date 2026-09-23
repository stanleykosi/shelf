# Route & Navigation Rules

## Route principles

Routes should describe durable user-visible concepts, not implementation details.

Prefer:
- `/companies/:slug`
- `/products/:slug`
- `/portfolio`
- `/discover`

Avoid route names derived from component or backend terminology unless users recognize them.

## Page vs transient UI

Use a route when the state:
- deserves deep linking
- is likely to be revisited/bookmarked
- has meaningful browser history
- represents a distinct user task or entity
- may be shared
- benefits from SEO/indexability where relevant

Prefer modal/drawer/sheet/inline state when:
- the interaction is subordinate to the current task
- it is quick and reversible
- deep linking adds little value
- preserving parent-page context is more important

A modal is not a substitute for architecture.

## Query parameters

Use URL query state when:
- filters materially change the result set
- sort/view modes are worth sharing/reloading
- search terms should survive refresh/back
- pagination/cursor state benefits from history

Do not put ephemeral animation/UI state in the URL.

## Redirect matrix

Every old route should have:
- existing route
- decision: KEEP / RENAME / MERGE / SPLIT / REMOVE / REPLACE
- target route
- redirect behavior
- preserved params/query state
- reason

## Redirect rules

Permanent:
- canonical route has truly changed
- old semantic concept maps cleanly to new one

Temporary:
- migration is staged
- replacement is provisional
- rollout may reverse

Auth:
- store intended destination
- authenticate
- return to intended destination when permitted

Contextual:
- use only when target depends on entity state or feature availability

Never:
- redirect A → B while another rule redirects B → A
- send multiple unrelated legacy pages to a homepage without preserving intent
- hide broken migrations behind broad catch-all redirects

## Navigation principles

Top-level navigation should represent recurring user jobs, not every feature.

Classify each destination/action:
- global
- contextual
- authenticated-only
- account
- promoted action
- mobile-only
- desktop-only

Search and Scan may be actions rather than permanent destinations if that better matches usage.

## Back-navigation

Define whether back means:
- browser history
- parent entity
- prior workflow step
- close transient surface

Never overload a single back control with unpredictable behavior.

## Mobile navigation

Prioritize the 3–5 highest-frequency tasks.
Do not reproduce desktop navigation mechanically.
A mobile primary action can be promoted independently of the desktop header.
