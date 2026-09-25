# Notifications and loading refinement

September 25, 2026 user request: remove the Product relationship explorer and improve
notifications, button loading and general loading feedback.

- Product identity, company link and expandable source evidence remain; the Product-only
  relationship explorer is removed. Brand, Company and scan-result explorers remain.
- Sonner 2.0.8 supplies the app-level toast host. Discover/Scan journey action notices use
  per-surface IDs to replace repeated notices. Success/info expire after 4.5 seconds;
  failures after seven seconds. All include a close control and retain Sonner focus/hover behavior.
- Save, report, scan confirmation/correction/exclusion/cancellation and issuer-watchlist notices
  use toasts. Field validation, feed outages, offline state, consent and financial restrictions
  remain contextual. Existing structured financial results are not converted to disappearing messages.
- Shared `PendingButton` retains its width, disables repeat submission, sets `aria-busy` and
  supplies an accessible pending label. `LoadingStatus` announces work with a CSS spinner.
- Search/refresh, research saves/reports, issuer saving/purchase review, scan image preparation,
  camera permission and recognition have progress feedback. Root `loading.tsx` covers navigation.
- Scanner controls appear after their client handlers attach so early file selections are not lost.
- Reduced motion replaces rotating spinners with a static dotted indicator and retained status text.
- Toast placement clears the app's mobile/tablet navigation through its 819px breakpoint.

References: https://github.com/emilkowalski/sonner and the installed Sonner types/source;
Next.js installed `loading.js` guide. No additional animation library is needed.

Validation: lint, typecheck and final production build pass; 120 unit/contract tests pass.
The six-suite production-browser run passes 64 tests with two intentional skips. After the final
toast font adjustment, all four focused desktop/mobile feedback checks pass again. Tests cover
expiry, keyboard dismissal, pending-button width/repeat prevention, accessibility, navigation
clearance and reduced motion. Eight refreshed captures are in `../artifacts/feedback/README.md`.
Initial findings (early upload before hydration, contrast auditing during the entrance animation,
and library CSS overriding toast styling) are resolved by the scanner readiness gate,
settled-state audit and scoped toast CSS. Existing optional Magic build warnings remain nonfatal.
