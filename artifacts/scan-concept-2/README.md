# Scan — Concept 2 review

These are local production-build browser captures. The input preview is a screenshot of Shelf's existing reviewed Doritos artwork. Recognition responses are intercepted catalog fixtures, not live recognition or accuracy claims. No Product relationship was invented. Raw input remains in memory only.

## Required views

| State | Desktop | Mobile |
| --- | --- | --- |
| Scan default | [1440](scan-1440-default.png) | [390](scan-390-default.png) |
| Image preview | [1440](scan-1440-preview-full.png) | [390](scan-390-preview.png) |
| Preview + consent accepted | [1440](scan-1440-preview-consent-accepted-full.png) | [390](scan-390-preview-consent-accepted-full.png) |
| Consent required | — | [390](scan-390-consent-required.png) |
| Confirmed result | [1440](results-1440-confirmed.png) | [390 identity](results-390-confirmed.png) · [relationship](results-390-confirmed-relationship.png) · [actions clear navigation](results-390-actions-clearance.png) |
| Ambiguous / multiple | [1440](results-1440-ambiguous-multiple.png) | [390](results-390-ambiguous-multiple-full.png) |
| Replacement search | — | [390](results-390-correction.png) |
| Session expired | [1440](results-1440-session-expired.png) | [390](results-390-session-expired.png) |
| No match | [1440](results-1440-no-match.png) | [390](results-390-no-match.png) |

The directory also includes 430, 768 and 1280px views, plus full-page companions. Viewport captures show actual fold and navigation positions; full-page captures are not used as clearance proof.

Reproduce against the locally running production build:

```sh
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3200 node --import tsx scripts/capture-scan.ts
```

Only approved existing artwork is read externally. Every recognition request is intercepted locally. Camera lifecycle tests use synthetic browser media tracks; physical phone permission UI, optics and native BarcodeDetector support still merit device testing before release.
