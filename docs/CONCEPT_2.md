# Concept 2 — Capital / Rho study

Status: ACCEPTED and FINAL — Capital Research Direction, confirmed 2026-09-24.

Concept 2 is the default at `/` and `/discover` and the shared foundation for remaining routes. Explicit `concept=1` preserves the historical comparison; `concept=2` links remain compatible. No new authentication mode or financial capability is introduced by visual promotion. The approved composition remains unchanged.

## Reference translation

The current homepages of [Capital](https://capital.xyz/) and [Rho](https://www.rho.co/) were inspected at 1440px. The useful ideas are a dark opening, large light-weight typography, mint actions, a prominent product interface, and a sequence of contrasting light and dark sections. Shelf's interface, copy, relationships and data are its own. Neither site's banking claims, testimonials, balances or imagery are used.

Shelf's opening interface is interactive: Doritos, Apple and Tide each resolve to their reviewed Product, Brand, Company and source. The lower explanation distinguishes the Product, the Company and issuer-defined exposure. All detail links use the existing canonical slugs.

## Scoped foundation

| Element | Concept 2 |
|---|---|
| Canvas | Near-black `#111715`, light paper `#f5f5ef` |
| Accent | Pale mint `#b6efd2`, dark forest actions |
| Type | Arial/system sans, regular-weight headlines; 40–90px opening title, 36–58px section headings, 14–18px body |
| Grid | 1250px editorial content, 1328px shell, 20–24px gutters; 20px mobile content edges |
| Geometry | 3–5px controls, 9px research-board frame; unboxed content sections |
| Home motion | 850–1000ms opening reveal, 650–750ms one-time section reveals, 280ms example changes, scroll-responsive board perspective |
| Interaction | Immediate entity/filter state; restrained hover feedback |

The longer timings are intentional for this user-requested homepage concept. They do not apply to daily-use Discover controls. The decorative opening lines settle once; there is no endless particle animation. Pause motion disables motion in Home. Reduced-motion preferences show all content immediately, remove movement and skip scroll listeners. Observers and animation frames are cleaned up on unmount. No animation dependency was added.

## Scope and comparison

- Home is a separate component. Concept 1's Home composition is preserved.
- Discover shares its data and URL behavior, with scoped Concept 2 presentation.
- Shell styling changes only on Home and Discover when `concept=2` is selected.
- Scan, detail pages, Saved, Portfolio, Account and financial surfaces retain their existing content and behavior.
- The comparison selector is review chrome. It can be removed when a concept is selected.
- The named product-design-architect skill was not available; implementation followed the supplied brief and product guide, with the available motion, reduced-motion and framework guidance.

## Review artifacts

`artifacts/concept-2/` contains 1440px, 1280px, 430px and 390px Home/Discover viewport and full-page screenshots, search and filtered Discover states, a Concept 1 reference capture, and Home motion recordings. Generate them against a local server with:

```sh
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 node scripts/capture-design-concepts.mjs
```

Browser regressions cover concept switching, retained search context, product-example links, reduced motion, pause/resume, keyboard filter behavior, reloadable filter state, 390/430/1280/1440 layouts, and mobile bottom-nav clearance.

Final local verification: ESLint and TypeScript pass; 14 unit-test files/90 tests pass; the production build passes; Playwright against `http://127.0.0.1:3100` reports 21 passed and 7 intentional project-specific skips. Capture reports no browser page errors. The build logged nonfatal disk-cache and Magic initialization/network warnings; authenticated or financial readiness was not evaluated in this design pass.
