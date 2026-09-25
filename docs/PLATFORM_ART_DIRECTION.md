# Platform art direction — five-screen review

Status: five implementations completed and locally verified; awaiting user review. Not yet user-accepted.
Home is the only accepted visual benchmark.

## Audit and contract

Shelf connects familiar Products to reviewed Brands and Companies; optional issuer exposure and
owned Holdings are separate layers. Routes, permissions, provider contracts and financial gates
are unchanged. The functional frontend remains the behavior reference, not the visual reference.
The repeated PageIntro / research-split / ruled-section composition is rejected for these screens.

Home's actual code (`concept-two.tsx`, `concept-two.css`) establishes a graphite environment,
off-white research objects, unusually clear scale contrast, asymmetric supporting content,
product imagery, and composition changes between recognition, evidence and exposure. Preserve
its Arial foundation, precise geometry and restrained mint. Do not transplant its decorative
orbits or marketing motion into a frequent-use workspace.

## Spatial primitives

- **ResearchCanvas:** uninterrupted narrative ground; identity, exhibits and evidence change
  composition instead of repeating titled boxes. Company is its first implementation.
- **IdentityStage:** one dominant entity name, compact listing metadata, offset factual context.
- **RelationshipStage:** the existing CapitalRelationship object, on a light inset surface within
  a meaningful dark research band. It is not a replacement relationship visualization.
- **WorkspaceFrame / MediaStage:** task environment with an attached contextual rail; media or
  answer occupies the dominant area. No universal two-column page template.
- **FinancialStage:** a quiet ownership masthead and prominent instrument positions. Quantity
  and acquisition cost are exact; unavailable valuation never becomes zero or invented P&L.
- **SettingsWorkspace:** contextual navigation plus one active category. Profile, Privacy,
  Security and Sessions retain all existing actions; Wallet remains its canonical route.

These are composition primitives, not cards. Grid is reserved for relationships and aligned
data; flex, reading measures, inset surfaces and bands define the page's spatial hierarchy.

## Five implementations, in order

1. Company: identity → familiar product field → relationship evidence → separate exposure band.
2. Scan: compact task title → dominant graphite media → local preview → consent only as needed.
3. Assistant: answer/source workspace → attached question composer; no chat bubbles or fake answer.
4. Portfolio: holdings dominate; cash is contextual, Activity is peer navigation.
5. Account: selected category dominates; dangerous actions remain explicit and fresh-auth gated.

Mobile is recomposed: product exhibits use a short horizontal strip; media fills available width;
Assistant sources follow the response in a keyboard-accessible disclosure; holding identity and quantities remain paired; settings
navigation wraps above its selected pane. Actions must scroll above the unchanged bottom nav.

## Verification / stop gate

- [x] Five implementations complete, with no other route recomposed.
- [x] Desktop and mobile screenshots reviewed against Home.
- [x] Responsive 390 / 430 / 768 / 1280 / 1440 checks.
- [x] Keyboard, reduced-motion and automated accessibility checks.
- [x] Routing, privacy/consent and functional regression checks.
- [x] Record evidence and stop for approval; no propagation in this phase.

## Visual coherence review

Compared the actual desktop/mobile renders with the accepted Home screenshot and code, not just
its tokens. The five screens now share scale contrast, framed research objects, precise alignment
and contextual graphite/off-white transitions without sharing a universal page layout.

| Screen | Dominant object | Why the composition belongs to Shelf |
|---|---|---|
| Company | Company identity and familiar product field | Large editorial name, offset factual context, staggered reviewed imagery; a light Relationship Explorer sits inside a dark evidence environment, directly extending Home's research board. |
| Scan | Camera / local image stage | The media environment owns the screen; the narrow method rail is attached, not a competing form. Mint marks the deliberate camera action. Privacy appears only for processing. |
| Assistant | Research response canvas | A graphite notebook and connected source rail establish a research task, not chat bubbles or an isolated textarea. The composer is attached below; mobile sources collapse. |
| Portfolio | Instrument position and exact quantity | Large instrument identity faces the owned quantity; acquisition cost and the holding action sit together. Wallet cash remains separate, with no fabricated chart or market value. |
| Account | Selected settings category | Dark contextual navigation anchors one light working pane. Profile, Privacy, Security and Sessions no longer compete down one long page. |

**Acceptance questions:** without the logo, each uses Home's research-object language; each has
one dominant object; none uses a generic page-long equal-column grid. Borders group evidence,
navigation or financial facts rather than repeating at every paragraph. No gradients, glass,
glow, decorative charts or new motion are used. This is the implementation review, not user
acceptance. Propagation remains explicitly unstarted.

**Corrections from rendered review:** contained Company imagery after an overly broad span
selector caused overlap; raised Assistant prompt contrast; raised Scan rail metadata contrast;
kept mobile sources accessible without making them a compulsory long scroll before the composer.
The Scan geometry test now checks the padded media bounds instead of the historical 248px cap,
while still enforcing original aspect ratio and never enlarging images beyond natural dimensions.

## Verification evidence — 2026-09-24

- `npm run lint`: passed.
- `npm run typecheck`: passed; final production build also passed TypeScript.
- `npm test`: 120 passed across 21 files.
- `npm run build`: final production build passed. One intermediate packaging attempt failed
  because the local disk was full; only ignored, reproducible production cache and incomplete
  standalone output were removed. Source, screenshots, QA database and the existing dev server
  were preserved. Disk space remains low; no wider cleanup was attempted.
- Local browser regression group (account entry, route architecture, entity research, Saved/Learn,
  live-discovery fixtures, both historical/accepted concept checks, identity): 57 passed,
  7 intentional project-specific skips. Output: `test-results/platform-regression-final`.
- Final `platform-art-direction.spec.ts` + `scan.spec.ts`: 33 passed, 5 intentional duplicate
  mobile-project matrix skips; zero failures. Output: `test-results/platform-verified`.
- The new matrix covers all five screens at 390, 430, 768, 1280 and 1440px, WCAG 2 A/AA and
  2.1 AA automated checks, overflow, product-caption separation and mobile bottom clearance.
  All four Account categories also pass automated accessibility checks on both projects.
- Existing Scan tests cover camera permission/capture/switch/track cleanup, preview geometry,
  consent, privacy/quota/provider failures, offline/cancel, barcode/link/screenshot/receipt,
  session results, correction focus, no retained evidence and reviewed relationship boundaries.
- 20 final production-rendered screenshot files (five screens × two widths × full/viewport).
  Every screenshot-index link was checked. See `artifacts/platform-art-direction/README.md`.

All private data in screenshots is the existing synthetic localhost fixture, not live balances
or user data. Reviewed catalog imagery is unchanged; unavailable issuer feeds are explicitly
labeled. No external processing, account deletion, signing, transaction, deployment or push was
performed. Browser verification uses Chromium and an emulated mobile viewport, not physical
camera hardware, Safari/Firefox or a full screen-reader audit.

**Exact next task:** user review of these five compositions. Do not propagate to other routes
or reinterpret this local verification as visual acceptance or live-service authorization.
