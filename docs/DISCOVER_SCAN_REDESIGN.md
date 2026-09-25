# Discover and Scan — September 25 design pass

Scope: the user requested a new hackathon-quality design for Discover and Scan first.
This supersedes the previous visual review stop for these two pages only. Existing dirty
work in other screens is preserved. No new provider, financial or persistence contract.

References: [Simply Wall St investing ideas](https://simplywall.st/discover/global/investing-ideas/473744/ai-infrastructure-stocks),
[company research](https://simplywall.st/stocks/us/tech/nyse-anet/arista-networks), and
[Quartr global search](https://quartr.com/features/global-search). Use the research hierarchy
and contextual discovery as inspiration, with Shelf's graphite, paper and mint identity.
Source data remains explicit; no fabricated prices or performance.

Typography follow-up: Discover and Scan now use a self hosted Raleway variable font, with
the [Open Font License](../src/app/fonts/OFL.txt) stored alongside it. Their interface icons
use the pinned [Heroicons React outline set](https://github.com/tailwindlabs/heroicons/blob/master/react/README.md).
The shared header and mobile navigation select those icons only on the two reviewed routes.
Raleway is not preloaded on unrelated pages. Mobile headline and search hint copy were
shortened to accommodate its wider letterforms without losing meaning.

## Checklist

- [x] Inspect current implementation, product contracts, installed Next.js and motion guidance.
- [x] Discover: search-first editorial masthead, working themed entry points, company directory.
- [x] Scan: focused media stage, clear input methods, local preview and explicit consent.
- [x] Purposeful, bounded motion with reduced-motion alternatives and keyboard access.
- [x] Inspect actual desktop/mobile renders; verify responsive widths and accessibility.
- [x] Run lint, types, unit/contract tests, relevant browser suites and production build.
- [x] Record review screenshots, outcomes, limitations and exact next task in BUILD_STATUS.md.

Data shown in browser test captures is synthetic and intercepted locally. Paid AI, deployment,
trading, wallet operations and production writes are outside this design pass.

## Verification

- `npm run lint` and `npm run typecheck`: passed.
- `npm test`: 120 tests passed across 21 files.
- Production build: passed, including the final spacing and input-switching refinements.
- Production Chromium and Pixel 7 emulation: 49 passed, three intentional project-specific
  skips, zero failures. Includes existing Scan, live discovery and Concept 2 regressions.
- Automated WCAG 2 A/AA and 2.1 AA checks passed for the default pages at six widths
  (360/390/430/768/1280/1440), plus Scan preview, barcode, link and search states.
- Reduced-motion checks, horizontal overflow, keyboard focus, deliberate search submission,
  filter deep links, provider failure recovery and bottom-navigation clearance passed.
- `git diff --check`: passed.

Reproduce the production build without paid providers or live-money controls:

```sh
MAGIC_SECRET_KEY= OPENROUTER_API_KEY= SOLANA_RPC_URL= JUPITER_API_KEY= ENABLE_REAL_TRADING=false ENABLE_DEPOSITS=false npm run build
HOSTNAME=127.0.0.1 PORT=3101 MAGIC_SECRET_KEY= OPENROUTER_API_KEY= SOLANA_RPC_URL= JUPITER_API_KEY= ENABLE_REAL_TRADING=false ENABLE_DEPOSITS=false npm start
```

Then run in another terminal:

```sh
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3101 STUDIO_CAPTURE=true npm run test:browser -- tests/e2e/discover-scan-studio.spec.ts tests/e2e/scan.spec.ts tests/e2e/live-discovery.spec.ts tests/e2e/concept-two.spec.ts --output=test-results/discover-scan-production
```

Visual inspection corrected mobile row density, privacy-footer wrapping, small guidance text
and secondary-label contrast. The final layout brings Discover's directory higher and plays
Scan's entrance once per page visit; input changes remain immediate. Development chunk-loading
errors were absent in the clean production verification.

[Screenshot gallery](../artifacts/discover-scan/README.md). Physical-device camera behavior
and Safari/Firefox remain unverified. User acceptance of this visual direction is pending;
the exact next task is review of these two pages, before any wider design propagation.
