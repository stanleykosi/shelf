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
- Shared `PendingButton` uses pinned Torph 0.1.3 for 250ms text morphs between action and
  pending labels. An invisible grid reserves both labels’ space, keeping adjacent actions stable.
  Buttons disable repeat submission and expose their current accessible name and `aria-busy`.
  `LoadingStatus` uses the same text treatment and a small CSS spinner; status announcements
  are separate from the decorative morph so letter-level changes do not reach screen readers.
- Search/refresh, research saves/reports, issuer saving/purchase review, scan image preparation,
  camera permission and recognition have progress feedback. Root `loading.tsx` covers navigation.
- Scanner controls appear after their client handlers attach so early file selections are not lost.
- Reduced motion replaces rotating spinners with a static dotted indicator and retained status text.
- Toasts use graphite surfaces, paper text, mint Heroicons, Raleway, subtle borders and a
  compact title/message hierarchy. Errors keep the same surface with a warm icon accent.
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

Torph refinement: lint, TypeScript, production build and 120 unit tests pass. The final
feedback/Discover/Scan browser run passes 17 with one intentional viewport skip; combined with
the initial research/journey run, 34 distinct cases pass with two intentional skips. Tests cover
Torph’s readable labels, reduced-motion updates, exact button-width stability, toast contrast,
expiry and keyboard dismissal. Ten refreshed desktop/mobile captures are in the feedback gallery.
API verified against https://torph.lochie.me/ and installed `torph/react` types. Torph respects
reduced motion; loading spinners become static. No artificial progress or rotating status claims.
