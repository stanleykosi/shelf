# Connected discovery journey — local review

September 25, 2026. Raleway, Heroicons outline and the approved Discover/Scan palette.
These captures use the production build on localhost. Issuer data and scan responses are
synthetic browser fixtures, not current market availability or a real recognition result.
Product/Brand/Company relationships and educational text come from the repository catalog.
The seven existing reviewed image references are now served directly from local files, without
request-time optimization; attribution is in
`public/images/reviewed-products/README.md`. Unreviewed images retain labeled placeholders.

| Page | Desktop | Mobile |
| --- | --- | --- |
| Scan results | [Desktop](results-chromium.png) | [Mobile](results-mobile.png) |
| Correct a match | [Desktop](correction-chromium.png) | [Mobile](correction-mobile.png) |
| Product | [1440px](product-1440.png) | [390px](product-390.png) |
| Brand | [1440px](brand-1440.png) | [390px](brand-390.png) |
| Company | [1440px](company-1440.png) | [390px](company-390.png) |
| Issuer details | [1440px](issuer-1440.png) | [390px](issuer-390.png) |
| Learning library | [1440px](library-1440.png) | [390px](library-390.png) |
| Article | [1440px](article-1440.png) | [390px](article-390.png) |

The issuer purchase-entry presentation is implemented and type/build checked. Browser tests
verify that guest entry still redirects to sign-in; this pass does not claim an authenticated
purchase-page visual check, real quote, wallet approval or transaction execution.

Reproduce on a local production server with provider credentials and real-money flags disabled:

```sh
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3101 JOURNEY_CAPTURE=true npm run test:browser -- tests/e2e/discovery-journey.spec.ts
```

Automated accessibility checks cover WCAG 2 A/AA and 2.1 AA rules exposed by axe. They are
supplemented by keyboard, responsive, correction-focus and reduced-motion browser checks,
and do not constitute a full assistive-technology audit. Build warnings for the existing
optional Magic admin native modules (`bufferutil`, `utf-8-validate`) remain nonfatal.
