# Discovery journey design extension

The September 25 user request extends the Discover/Scan design to their connected pages.
Use the established Raleway, Heroicons outline, paper, graphite and mint treatment.

- [x] Map routes and inspect existing data, privacy and interaction contracts.
- [x] Scan results: review queue, candidate identity, correction, evidence and completion states.
- [x] Product, Brand and Company: consistent identity, relationship evidence and next actions.
- [x] Issuer asset details and purchase-review entry: sourced facts, explicit rights and failure states.
- [x] Learning library and articles: readable contextual research.
- [x] Verify responsive layouts, keyboard use, reduced motion and automated accessibility.
- [x] Run required checks, capture review screenshots and update BUILD_STATUS.md.

Markets legacy URLs redirect to Discover and retain that behavior. Saved, Assistant and financial
execution beyond the issuer purchase-review entry are separate workspaces. Existing provider,
privacy, save/report, confirmation and purchase guards remain authoritative. No live transactions,
paid inference, deployment or remote publication are authorized by this design extension.

## Verification

- `npm run lint`, `npm run typecheck`, `npm test`: pass; 120 unit/contract tests.
- Production build with paid credentials and trading/deposit flags disabled: pass.
- Six-suite production Playwright run: 68 passed, two redundant matrices skipped, two issuer
  error-contrast failures. Fixed the shared error style, rebuilt, and all four targeted issuer/result
  tests passed. This verifies 70 distinct browser cases with no unresolved failures.
- Responsive matrix: 360, 390, 430, 768, 1280 and 1440px; automated axe WCAG checks at 390/1440;
  separate desktop/mobile scan correction, focus, consent, source and failure-state checks.
- `git diff --check`: pass. Sixteen screenshots in `artifacts/discovery-journey/README.md`.
- Purchase-entry styling compiles; guest sign-in gate verified. Authenticated purchase-page visuals
  and transactions were not exercised. Existing optional Magic native-module build warnings remain.

Final image-loading follow-up: direct local artwork avoids the optimizer stall. The final production
journey/entity rerun passed 17 with one redundant matrix skip; all 16 gallery captures were refreshed.
