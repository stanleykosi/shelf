# Scan / Scan Results — Concept 2 compliance review

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

Current image requests already enforce `ai-processing-v1`; barcode and approved Apple link are deterministic and must not ask for that consent. Current camera lacks lifecycle/permission granularity; correction leaves context. Existing results write candidate labels to sessionStorage, contrary to the product pack's memory-only evidence rule. Replace this with an in-memory session; reload expires results gracefully. Guest saves persist only explicitly confirmed catalog IDs. Confidence bands lack calibrated user-facing validation, so omit strength claims. No existing crop/rotate controls to preserve.

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
