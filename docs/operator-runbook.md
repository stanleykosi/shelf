# Shelf operator runbook

## Local operation

Install dependencies, copy `.env.example` to `.env.local`, provide a PostgreSQL database and provider credentials, migrate and seed the database, then run `npm run dev`. Check `GET /healthz` and `GET /readyz` before using authenticated features.

The application has one runtime path. It uses Magic, OpenRouter, PreStocks, xStocks, Jupiter, Helius, and PostgreSQL. Missing services return an unavailable error and never create substitute identities, balances, prices, signatures, or transactions.

## Routine checks

- Confirm `/readyz` returns `ready`, `runtimeStore: postgres`, and `tradeExecution: disabled` until activation.
- Confirm anonymous `/api/v1/me` returns 401 and `/settings` redirects to sign-in.
- Confirm the public company catalog, PreStocks feed, xStocks feed, and stored market history load.
- Review Railway worker logs for two completed jobs: `refresh_issuer_context` with nonzero PreStocks snapshots, `directory_feeds:2`, and `discover_warmed:2`, and `reconcile_transactions`. Confirm both `issuer_feed_snapshots` rows are less than ten minutes old; a missing row makes Discover's directory incomplete. With trading disabled, reconciliation still reports `execution:disabled` and inspects outstanding signed transactions without broadcasting. The reconciliation result includes `checked`, `finalized`, `errors`, and `remaining`; an unresolved backlog drains in bounded, lease-heartbeated batches. Investigate nonzero errors and a remaining count that does not decrease over subsequent scheduled runs before widening any live-money use.
- Review OpenRouter usage caps and failed reservations from the owner console.

## Live-money activation

Keep `ENABLE_REAL_TRADING=false` and `ENABLE_DEPOSITS=false` until the owner approves the activation run. Before changing either flag, verify that Vercel contains `SPONSOR_SECRET_KEY`, `DATA_ENCRYPTION_KEY`, and `WORKER_SHARED_SECRET`, and Railway contains the matching `WORKER_SHARED_SECRET` plus `APP_ORIGIN`. That run must create and verify the fee USDC account, fund the sponsor within the approved limit, simulate every reviewed route, verify Magic approval and rejection, test restart-safe reconciliation, and record finality evidence. Enable deposits only after trading has passed those checks.
