# Product, notification and loading review

Local production preview, September 25, 2026. API responses in these captures are isolated
browser fixtures. They do not represent an actual member save, provider availability or trade.

| State | Desktop | Mobile |
| --- | --- | --- |
| Product without relationship explorer | [Desktop](product-chromium.png) | [Mobile](product-mobile.png) |
| Save button pending | [Desktop](pending-chromium.png) | [Mobile](pending-mobile.png) |
| Success toast | [Desktop](success-chromium.png) | [Mobile](success-mobile.png) |
| Dismissible action-error toast | [Desktop](toast-chromium.png) | [Mobile](toast-mobile.png) |
| Loading with reduced motion | [Desktop](loading-chromium.png) | [Mobile](loading-mobile.png) |

Pending buttons morph action text into loading labels with Torph, preserve their width and disable repeat submissions. Toasts use Raleway,
Heroicons, graphite surfaces and mint accents; they expire, support manual dismissal and clear mobile
navigation. The loading capture uses the reduced-motion variant: a static dotted indicator
with readable status text. Ordinary motion uses a small rotating ring.

Tests cover expiry, keyboard dismissal, failure without false saving, pending-state semantics,
viewport clearance at phone/tablet sizes, accessibility and reduced motion. Reproduce with:

```sh
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3101 npm run test:browser -- tests/e2e/feedback.spec.ts
```

The Torph refinement verifies 34 distinct browser cases across the broad run and final rerun,
with two intentional viewport skips. The final feedback/Discover/Scan rerun passes 17 and skips
one duplicate mobile matrix. Lint, TypeScript, production build and 120 unit tests pass.
No paid inference, real-money interaction or external deployment was used. Initial provider,
validation and financial context remain inline where a disappearing notification would lose
information needed to recover or make a decision.
