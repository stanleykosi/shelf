# Workspace studio review

September 25, 2026. These screenshots use an isolated localhost QA account and synthetic
holdings, cash and activity records. They do not represent real investments or provider execution.

The accepted Discover/Scan typography, materials, icons and interaction treatment now extend
across the remaining workspaces. Home keeps its composition with Raleway and Heroicons.

| Workspace | Desktop | Mobile |
| --- | --- | --- |
| Saved collection | [1440px](saved-1440.png) | [390px](saved-390.png) |
| Research Assistant | [1440px](assistant-1440.png) | [390px](assistant-390.png) |
| Account | [1440px](account-1440.png) | [390px](account-390.png) |
| Sign in | [1440px](sign-in-1440.png) | [390px](sign-in-390.png) |
| Wallet | [1440px](wallet-1440.png) | [390px](wallet-390.png) |
| Portfolio | [1440px](portfolio-1440.png) | [390px](portfolio-390.png) |
| Holding details | [1440px](holding-1440.png) | [390px](holding-390.png) |
| Activity | [1440px](activity-1440.png) | [390px](activity-390.png) |
| Activity record | [1440px](record-1440.png) | [390px](record-390.png) |
| Share builder | [1440px](sharing-1440.png) | [390px](sharing-390.png) |
| Empty Saved | [1440px](saved-empty-1440.png) | [390px](saved-empty-390.png) |
| Unavailable share | [1440px](share-expired-1440.png) | [390px](share-expired-390.png) |
| Onboarding | [1440px](onboarding-1440.png) | [390px](onboarding-390.png) |
| Availability | [1440px](availability-1440.png) | [390px](availability-390.png) |
| Deposit status | [1440px](deposit-1440.png) | [390px](deposit-390.png) |
| Investment details | [1440px](investment-1440.png) | [390px](investment-390.png) |
| Basket planning | [1440px](basket-1440.png) | [390px](basket-390.png) |
| Sell | [1440px](sell-1440.png) | [390px](sell-390.png) |
| Send | [1440px](send-1440.png) | [390px](send-390.png) |
| Order review | [1440px](order-review-1440.png) | [390px](order-review-390.png) |
| Order status | [1440px](order-status-1440.png) | [390px](order-status-390.png) |
| Owner overview | [1440px](admin-1440.png) | [390px](admin-390.png) |
| Catalog | [1440px](admin-catalog-1440.png) | [390px](admin-catalog-390.png) |
| Access | [1440px](admin-access-1440.png) | [390px](admin-access-390.png) |
| Operations | [1440px](admin-operations-1440.png) | [390px](admin-operations-390.png) |
| Audit | [1440px](admin-audit-1440.png) | [390px](admin-audit-390.png) |

Full-page captures include the fixed mobile navigation at its viewport position. Scroll clearance
is verified independently by the browser tests. Financial reviews and persistent results remain
visible; transient action confirmations use the themed toast host. No authentication bypass,
paid AI request, wallet signature, deployment or live financial action was used.

Reproduction follows the isolated QA setup in `docs/FRONTEND_COMPLETION_REPORT.md`:

```sh
FRONTEND_QA_FIXTURES=true PLAYWRIGHT_BASE_URL=http://127.0.0.1:3102 npm run test:browser -- tests/e2e/frontend-workspaces.spec.ts
```
