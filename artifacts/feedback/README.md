# Product, notification and loading review

Local production preview, September 25, 2026. API responses in these captures are isolated
browser fixtures. They do not represent an actual member save, provider availability or trade.

| State | Desktop | Mobile |
| --- | --- | --- |
| Product without relationship explorer | [Desktop](product-chromium.png) | [Mobile](product-mobile.png) |
| Save button pending | [Desktop](pending-chromium.png) | [Mobile](pending-mobile.png) |
| Dismissible action-error toast | [Desktop](toast-chromium.png) | [Mobile](toast-mobile.png) |
| Loading with reduced motion | [Desktop](loading-chromium.png) | [Mobile](loading-mobile.png) |

Pending buttons preserve their width and disable repeat submissions. Toasts use Raleway,
Heroicons and the existing palette; they expire, support manual dismissal and clear mobile
navigation. The loading capture uses the reduced-motion variant: a static dotted indicator
with readable status text. Ordinary motion uses a small rotating ring.

Tests cover expiry, keyboard dismissal, failure without false saving, pending-state semantics,
viewport clearance at phone/tablet sizes, accessibility and reduced motion. Reproduce with:

```sh
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3101 npm run test:browser -- tests/e2e/feedback.spec.ts
```

The broader 66-case Discover/Scan/research suite passed 64 with two intentional viewport skips.
No paid inference, real-money interaction or external deployment was used. Initial provider,
validation and financial context remain inline where a disappearing notification would lose
information needed to recover or make a decision.
