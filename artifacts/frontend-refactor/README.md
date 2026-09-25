# Concept 2 — remaining frontend screenshots

Local production-build review, 2026-09-24. Research identities and relationships come from
the reviewed repository catalog. Authenticated pages use the explicitly synthetic, isolated
`scripts/seed-frontend-qa.ts` fixtures. Displayed account balances, Holdings and records are
test data, **not real investments, transactions, performance or production account data**.
No paid inference, signatures, blockchain submissions or administrative mutations were run.

| Surface | Desktop 1440 | Mobile 390 |
|---|---|---|
| Product | [View](product-1440.png) | [View](product-390.png) |
| Brand | [View](brand-1440.png) | [View](brand-390.png) |
| Company | [View](company-1440.png) | [View](company-390.png) |
| Saved populated | [View](saved-1440.png) | [View](saved-390.png) |
| Saved empty | [View](saved-empty-1440.png) | [View](saved-empty-390.png) |
| Share builder | [View](sharing-1440.png) | [View](sharing-390.png) |
| Expired share | [View](share-expired-1440.png) | [View](share-expired-390.png) |
| Learn | [View](learn-1440.png) | [View](learn-390.png) |
| Article | [View](learn-article-1440.png) | [View](learn-article-390.png) |
| Research Assistant | [View](assistant-1440.png) | [View](assistant-390.png) |
| Portfolio | [View](portfolio-1440.png) | [View](portfolio-390.png) |
| Holding | [View](holding-1440.png) | [View](holding-390.png) |
| Sell | [View](sell-1440.png) | [View](sell-390.png) |
| Activity | [View](activity-1440.png) | [View](activity-390.png) |
| Activity record | [View](record-1440.png) | [View](record-390.png) |
| Account | [View](account-1440.png) | [View](account-390.png) |
| Wallet | [View](wallet-1440.png) | [View](wallet-390.png) |
| Deposit restrictions | [View](deposit-1440.png) | [View](deposit-390.png) |
| Send | [View](send-1440.png) | [View](send-390.png) |
| Sign in | [View](sign-in-1440.png) | [View](sign-in-390.png) |
| Onboarding | [View](onboarding-1440.png) | [View](onboarding-390.png) |
| Availability | [View](availability-1440.png) | [View](availability-390.png) |
| Investment amount | [View](investment-1440.png) | [View](investment-390.png) |
| Basket | [View](basket-1440.png) | [View](basket-390.png) |
| Order review | [View](order-review-1440.png) | [View](order-review-390.png) |
| Order status | [View](order-status-1440.png) | [View](order-status-390.png) |
| Admin overview | [View](admin-1440.png) | [View](admin-390.png) |
| Admin catalog | [View](admin-catalog-1440.png) | [View](admin-catalog-390.png) |
| Admin access | [View](admin-access-1440.png) | [View](admin-access-390.png) |
| Admin operations | [View](admin-operations-1440.png) | [View](admin-operations-390.png) |
| Admin audit | [View](admin-audit-1440.png) | [View](admin-audit-390.png) |

## Actual mobile viewport checks

Full-page images retain fixed navigation at its initial viewport position. Separate viewport
and scrolled-bottom captures demonstrate the actual 390×844 composition and action clearance:

| Surface | Initial viewport | Bottom clearance |
|---|---|---|
| Product | [View](product-390-viewport.png) | [View](product-390-bottom.png) |
| Company | [View](company-390-viewport.png) | [View](company-390-bottom.png) |
| Saved | [View](saved-390-viewport.png) | [View](saved-390-bottom.png) |
| Portfolio | [View](portfolio-390-viewport.png) | [View](portfolio-390-bottom.png) |
| Send | [View](send-390-viewport.png) | [View](send-390-bottom.png) |
| Order review | [View](order-review-390-viewport.png) | [View](order-review-390-bottom.png) |
| Admin operations | [View](admin-operations-390-viewport.png) | [View](admin-operations-390-bottom.png) |

See [the implementation report](../../docs/FRONTEND_COMPLETION_REPORT.md) for verification,
limitations and reproducibility. Additional widths 430/768/1280 are verified in the browser matrix.
