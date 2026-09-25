# Shelf identity — direction 01

Status: first local direction for review, 2026-09-25. It is implemented locally;
the owner has not yet accepted this identity. No deployment is part of this work.

## Representation

Shelf starts with something familiar and gives it a wider context: a product,
the company behind it, and a place to keep discoveries. The identity should feel
curious, considered and approachable. It should leave the next decision with the person.

The symbol is an **S formed by three horizontal rails and two open shelf spaces**.
The alternating openings suggest discovery and connection. Solid geometry keeps
it readable as a browser icon. The wordmark uses the application's existing
Raleway in SemiBold, with outlined lettering so exported logos do not require a font.

The existing product line remains the lead message:

> The things you know. The companies behind them.

Supporting lines: “Familiar products. A wider perspective.” and
“Your research. Your decisions.” Copy should describe discovery and understanding;
it must not suggest a product match proves ownership, a saved item is an investment,
or an investment guarantees a return.

## Visual rules

| Color | Value | Use |
| --- | --- | --- |
| Ink | `#111715` | Main dark canvas and primary text |
| Mint | `#B6EFD2` | Symbol, emphasis, icon background |
| Paper | `#F5F5EF` | Light canvas and reversed lettering |
| Forest | `#254B39` | Supporting dark surface and text on paper |
| Sage | `#B6C7BB` | Secondary copy on ink |

Keep mint on ink, ink on mint, or ink on paper. Use the supplied black and white
logos for one-color production. Raleway Regular and Medium carry headings and copy;
SemiBold carries the logo. The bundled font is distributed under its included OFL.

- Keep at least a quarter of the visible symbol's height clear around a standalone
  logo. The supplied small browser icons use their own tighter optical padding.
- Use the full logo at 24 CSS pixels high or larger. Use only the symbol for favicons.
- Preserve the artwork's aspect ratio. Keep the shelves horizontal.
- Keep backgrounds flat; leave typography and the mark free of shadows or gradients.
- Use the padded avatar for circular crops. App icons use square artwork so the OS
  can apply its own corner shape. These are standard icons, not maskable PWA icons.
- Thumbnails have a short headline, one large symbol and generous empty space.
  Private shelf contents, balances and personal data never appear in default link previews.

## Asset inventory

The [preview and download page](../public/brand/index.html) is served locally at
`/brand/index.html`. The [review board](../artifacts/branding/brand-board.png)
shows the system together.

| Asset | Files in `public/brand/` |
| --- | --- |
| Full logo | `shelf-logo-dark.svg`, `shelf-logo-light.svg`, `shelf-logo-black.svg`, `shelf-logo-white.svg` |
| Transparent raster logo | `shelf-logo-dark.png`, `shelf-logo-light.png` |
| Standalone symbol | `shelf-symbol-dark.svg`, `shelf-symbol-light.svg`, `shelf-symbol-mint.svg` |
| Browser icons | `favicon.ico` (16/32/48), `favicon-16.png`, `favicon-32.png`, `favicon-48.png`, `shelf-app-icon.svg` |
| Apple icon | `apple-touch-icon.png` (180 × 180) |
| App exports | `icon-192.png`, `icon-512.png` |
| Circular-safe avatar | `shelf-avatar.svg`, `avatar-512.png` |
| Link preview | `share-1200x630.png` and its editable HTML source |
| Wide thumbnail | `thumbnail-1920x1080.png` |
| Square social image | `social-1080x1080.png` and its editable HTML source |
| Typeface | `raleway.ttf`, `FONT-LICENSE.txt` |

## Sources and reproduction

`src/brand/identity.ts` owns the colors, symbol path and lockup proportions.
`src/brand/wordmark.json` stores the outlined Raleway SemiBold lettering (600 weight,
80 px source size, -2 px tracking), extracted from the repository's bundled font.
`src/components/shelf-logo.tsx` renders the same vector artwork in the app header
and Home footer. All letter contours are paths, not text that can fall back to
another font.

After installing dependencies and the project's Playwright Chromium:

```sh
npm run brand:generate
```

The local generator uses the installed Chromium and bundled font. It makes no
network or AI request. It writes the standalone kit, review board, and the Next.js
`favicon.ico`, `icon.svg`, `apple-icon.png`, `opengraph-image.png` and image alt text.
For later edits, change the source geometry/template and regenerate; do not edit
the generated copies independently. `APP_ORIGIN` supplies the absolute origin for
social image metadata. The existing robots restriction remains in place.

## Checklist

- [x] Read the product representation and existing accepted visual direction.
- [x] Make one coherent, scalable identity with light, dark and one-color variants.
- [x] Generate icons, avatar, social images and editable thumbnail templates.
- [x] Connect the local header, footer, favicon and social metadata.
- [x] Verify production build, metadata, image dimensions and responsive presentation.
- [ ] Owner reviews the visual direction.

## Verification — 2026-09-25

`npm run lint`, `npm run typecheck`, `npm run test` (131 tests in 26 files),
`npm run build`, and `git diff --check` passed. The production build reported
the existing optional Magic transport-module warnings and nonfatal Magic API
initialization error in the restricted environment.

The documented standalone server was checked locally in Chromium. The shared
header and Home footer render the new artwork, the favicon/SVG/Apple icon routes
return 200, and Open Graph and Twitter both resolve to the 1200 × 630 branded
image with alt text. Ten PNG dimensions and the ICO's three frames were checked.
The preview has no page overflow or clipped icon samples at 320, 390, 768 and
1440 pixels; all 12 unique download links return 200. A tablet clipping issue
found during review was corrected before the final passing run.

See [the recorded results](../artifacts/branding/verification.json),
[desktop application](../artifacts/branding/home-1440.png),
[mobile application](../artifacts/branding/home-390.png), and
[mobile asset preview](../artifacts/branding/preview-390.png).
Browser requests to provider APIs were intercepted as unavailable; the screenshots
contain no invented balances, holdings or quotes. External social platforms,
physical Apple devices and a full screen-reader audit were not tested.
