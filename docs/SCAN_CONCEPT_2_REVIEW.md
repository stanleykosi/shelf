# Scan / Scan Results — Concept 2 compliance review

## Latest completion review — 2026-09-24

- **Visual compliance: yes.** Approved desktop geometry and exact shell/search/artwork/Relationship Explorer retained. Mobile guidance stacks legibly; disabled text contrast is 5.32:1. No new font, palette, decorative scanner treatment or motion.
- **Behavioral compliance: yes, with the explicitly approved backend adaptation.** Capture/input → possible Product → user confirmation → independently reviewed catalog relationship → research. Barcode/link use truthful text-processing consent under the newer backend. AI owner, issuer and mint suggestions do not establish catalog relationships.
- **UX / enterprise review:** task-first ruled verification workspace, desktop candidate rail, mobile count/navigation, correction sheet with native focus containment, evidence disclosure and explicit recovery states. No investment shortcut or generic AI presentation.
- **Accessibility:** keyboard upload/disclosure, correction focus containment/return, camera/live-state labels, intrinsic preview sizing, active Scan navigation and action clearance verified. The animation-accessibility guidance informed the reduced-motion checks; no new animation was introduced. Physical-device permission UI remains a release QA item.
- **Evidence:** 104/104 unit tests; lint, TypeScript and production build pass. Targeted Scan/recognition browser suite 32/32. Full suite 54 passed / 7 skipped / 3 failures in historical Discover assertions (removed Products table twice, old filter action once). All Scan and Phase 0–2 route tests pass. These Discover failures were not hidden or fixed by changing out-of-scope surfaces.
- **Screenshots:** `../artifacts/scan-concept-2/README.md`, captured on local production build at 390/430/768/1280/1440 using existing reviewed artwork and simulated recognition responses. No paid provider call or accuracy claim.

The pre-implementation review and earlier verification record below remain historical context.

Pre-implementation review, 2026-09-23. Scope: `/scan`, `/scan/results` only, plus exact shared-pattern extraction. Concept 2 — Capital Research Direction is accepted and authoritative by the user's latest instruction. No new inspiration source.

## Inspected implementation

- `app-shell.tsx`: existing dark/mint header and mobile navigation; route-aware Scan state.
- `concept-two.tsx` and `concept-two.css`: Arial/system sans, regular editorial headings, paper `#f5f5ef`, graphite `#111715`, mint `#b6efd2`, 1328px bounded shell, 56px search, 44px controls, 3–5px control radii, thin neutral rules.
- `concept-discovery.tsx` and `discovery-patterns.tsx`: SearchCommand, reviewed ProductArtwork, low-noise metadata, distinct Product/Brand/Company presentation.

## Reused directly

Existing shell and mobile navigation (including safe-area clearance), SearchCommand, ProductArtwork, Lucide icons, and Home's exact `c2-entity-trail` and `c2-evidence-ledger` pattern. Extract the latter into a shared component without changing Home composition.

## Extended

Discover's bounded light workspace becomes a two-column research intake. Its title scale, borders, control geometry and metadata are retained. Preview replaces the input surface. Results use a compact candidate rail and one detail workspace; mobile uses previous/next with a visible count. Reviewed relationship evidence is disclosed after explicit Product confirmation.

## New

Permission/requesting/active/capture/retake/switch camera states; local drag/drop with keyboard file-picker equivalent; serious per-image OpenRouter consent; abortable processing; native modal replacement search styled as desktop drawer/mobile sheet. No scanner beam, glow, fake boxes, model scores, giant upload card or new typeface. Native dialog supplies modality and browser focus containment; transitions are unnecessary for this frequent functional task.

## Contract findings

At the initial review, image requests enforced `ai-processing-v1` while barcode and approved Apple link were deterministic. **2026-09-24 reconciliation:** the user explicitly chose to preserve the newer AI/issuer backend. Barcode/link now require truthful text-processing consent matching the server contract; manual catalog search stays local. Issuer ownership, mint and source fields never constitute a reviewed Product relationship. Exact catalog names/brands can propose identities, with ambiguous brands requiring selection and all identities requiring confirmation. Original camera lifecycle and memory-only session issues have been addressed. Guest saves persist only explicitly confirmed catalog IDs. Confidence bands lack calibrated user-facing validation, so strength claims remain omitted. No existing crop/rotate controls to preserve.

## Execution checklist

- [x] Read guide and inspect approved Shell/Home/Discover implementation.
- [x] Compliance review and Scan extensions defined before implementation.
- [x] Update Scan-specific guide decisions.
- [x] Implement and browser-review Scan before implementing Results.
- [x] Implement and browser-review Scan Results.
- [x] Responsive and accessibility passes at 390/430/768/1280/1440.
- [x] Regression tests and required screenshots.
- [x] Stop for review; no entity detail, Saved or Portfolio redesign.

## Completion review — 2026-09-24

**Concept 2 compliance:** yes. Rendered Scan uses the accepted dark/mint shell, light editorial workspace, exact search/artwork foundation, and shared Home relationship trail. No alternate Scan design system, typeface or decorative scanner effects.

**UX coherence:** capture/upload/search → proposed Product → explicit confirmation → independently reviewed Product/Brand/Company relationship → research. An ambiguous brand has no automatically selected Product. Correction preserves other candidates. Confirmed Company research remains reachable when the final candidate is excluded.

**AI-pattern audit:** no generic AI-tool framing. The only prominent technical terminology is necessary, accurate privacy disclosure. No scores, sparkles, beams, fake progress or model claims. Deterministic barcode/link/manual paths do not request image-processing consent.

**Enterprise quality:** credible for this research phase: aligned ruled workspaces, precise controls, honest uncertainty, accessible keyboard correction, restrained density and recoverable failures. This is a visual/interaction assessment, not a live-provider or production-activation certification.

## Evidence and boundaries

- `npm run check`: lint, TypeScript, 93 tests in 15 files and Next production build passed. Final source build and separate lint/typecheck/unit reruns passed.
- Complete local production Playwright suite: 41 passed / 7 expected viewport-specific skips. All 20 Scan desktop/mobile tests passed.
- Coverage includes consent reset/version, no raw evidence persistence, deterministic inputs, multi-candidate confirmation/correction/exclusion/save, expiry, unlisted/no-match, permission pending/denied/unavailable, active/capture/retake/switch/track cleanup, privacy/quota/provider recovery, invalid files, offline, cancelled late requests, receipt/screenshot modes, five-width overflow/clearance, reduced motion, keyboard focus containment/return and Escape.
- Live regions announce permission, processing and decisions; file picking is keyboard-operable; native modal semantics isolate the replacement flow; relationship facts have explicit text equivalents. No new motion was added. No external accessibility certification is claimed.
- [Screenshot gallery](../artifacts/scan-concept-2/README.md): reviewed imagery with intercepted catalog responses; no invented relationships or paid recognition. Viewport and full-page captures are both included. Browser captures produced zero page errors.
- Provider failures are displayed in intake before a results session is created. Unreviewed candidates cannot acquire Company authority from model output. Confidence bands are deliberately not presented as calibrated strength claims.
- Physical phone camera/permission UI and native BarcodeDetector behavior remain device-QA limitations. Live recognition accuracy and authenticated member workflows were not tested in this local visual phase. Existing backend privacy/consent/routing regressions remain in the passing suite.

Requested `$product-design-architect` was unavailable in the session. Work used the repository's guide and accepted implementation as the design authority. The available accessibility/UI primitive guidance supported reuse of native modal behavior and avoiding unnecessary motion; no new dependency or alternate visual direction was introduced.
