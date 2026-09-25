# Interaction studio refinement

User direction: improve the remaining workspace compositions to match Discover/Scan, replace
small task pages with contextual overlays, and make Assistant conversational and interactive.
Keep Raleway, Heroicons, Torph, mint/graphite/paper and explicit financial/privacy controls.

- [x] Saved editorial collection, filtering, visual product cards and connections sidebar.
- [x] Portfolio acquisition summary, separate wallet cash, holding rows and detail hierarchy.
- [x] Account/Wallet composition and reusable clipboard copy-to-check feedback.
- [x] Assistant in-memory conversation, composer, reviewed references, consent, retry and stop.
- [x] Send/sell/share intercepted route dialogs with canonical full-page deep links.
- [ ] Verify mobile/desktop appearance, keyboard focus, history, copy and conversation flows.
- [ ] Run lint, TypeScript, unit tests, production build and browser regression checks.
- [ ] Capture final screens and record outcomes in BUILD_STATUS.md.

No private chat text is put in URLs or storage. The existing single-question endpoint remains:
each question is independent and the interface explains this. No invented market performance,
prices, conversation responses or paid inference is used in production UI.

Dialogs use pinned @radix-ui/react-dialog 1.1.20 and the installed Next 16.3.5 interception and
parallel-route contracts. Existing route guards are reused in the intercepted pages. The source
workspace remains mounted beneath the task. A direct URL still has a complete full-page view.


Initial Chromium review: 20 of 22 new cases passed. The two failures were the desktop/mobile
contrast sweep, identifying secondary labels on tinted Saved/Account/Wallet/Portfolio/sign-in
surfaces. Those labels were darkened. All task history, focus, mobile fit, consent, stop/retry,
collection filtering and wallet-copy tests passed. Assistant now omits redundant page chrome and
uses horizontal mobile prompt cards to put the composer earlier in the page. Send progressively
reveals review actions; copying also covers generated share links and AI responses.

The UI uses the [Radix Dialog primitive](https://www.radix-ui.com/primitives/docs/components/dialog)
for accessible modal semantics and focus management. Package-lock changes are limited to this
primitive and its required dependencies. Existing optional native Magic warnings remain nonfatal.
