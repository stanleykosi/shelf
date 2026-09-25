# Interaction studio — review gallery

This pass changes the experience as well as the styling: contextual tasks, a conversational
Assistant, visual Saved collection, deliberate Portfolio summaries and a clearer Account/Wallet.
Raleway, Heroicons and Shelf’s paper/mint/graphite identity continue from Discover and Scan.

All private-page captures use an isolated localhost QA account, synthetic holdings and records.
Assistant responses are deterministic browser fixtures, not live paid inference. The app never
labels these fixtures as live investments or provider results.

| View | Desktop | Mobile |
| --- | --- | --- |
| Saved | [View](saved-chromium.png) | [View](saved-mobile.png) |
| Assistant welcome | [View](assistant-chromium.png) | [View](assistant-mobile.png) |
| Assistant conversation | [View](assistant-conversation-chromium.png) | [View](assistant-conversation-mobile.png) |
| Account | [View](account-chromium.png) | [View](account-mobile.png) |
| Wallet copy confirmation | [View](account-copy-chromium.png) | [View](account-copy-mobile.png) |
| Wallet | [View](wallet-chromium.png) | [View](wallet-mobile.png) |
| Portfolio | [View](portfolio-chromium.png) | [View](portfolio-mobile.png) |
| Holding | [View](holding-chromium.png) | [View](holding-mobile.png) |
| Activity | [View](activity-chromium.png) | [View](activity-mobile.png) |
| Sign in | [View](sign-in-chromium.png) | [View](sign-in-mobile.png) |
| Send overlay | [View](send-dialog-chromium.png) | [View](send-dialog-mobile.png) |
| Sell overlay | [View](sell-dialog-chromium.png) | [View](sell-dialog-mobile.png) |
| Share overlay | [View](share-dialog-chromium.png) | [View](share-dialog-mobile.png) |

Send, sell and share open over the source page during in-app navigation. Browser back/forward,
Escape and returning focus are verified. Direct URL loads retain a complete standalone page.
The visible task controls progress from input to review; all signing and authorization rules remain.

The conversation keeps turns in memory only. Its existing endpoint answers each submitted question
independently; the consent disclosure explains this, and earlier messages are not sent implicitly.
Stop, retry, source references, copy feedback and clearing are working controls. No invented
streaming, archived chats, live price charts or financial outcomes are added.

Full-page screenshots include fixed navigation at its viewport position. Mobile action clearance
is verified separately. Additional 390px/1440px route captures are in `routes/`.

Reproduce with the isolated QA setup in `docs/FRONTEND_COMPLETION_REPORT.md`, then:

```sh
FRONTEND_QA_FIXTURES=true PLAYWRIGHT_BASE_URL=http://127.0.0.1:3103 npm run test:browser -- tests/e2e/interaction-studio.spec.ts tests/e2e/task-dialogs.spec.ts tests/e2e/frontend-workspaces.spec.ts
```
