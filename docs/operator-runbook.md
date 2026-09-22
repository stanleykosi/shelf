# Shelf operator runbook

## Local operation

Install dependencies, copy `.env.example` to `.env.local`, provide a PostgreSQL database and provider credentials, migrate and seed the database, then run `npm run dev`. Check `GET /healthz` and `GET /readyz` before using authenticated features.

The application has one runtime path. It uses Magic, OpenRouter, PreStocks, xStocks, Jupiter, Helius, and PostgreSQL. Missing services return an unavailable error and never create substitute identities, balances, prices, signatures, or transactions.

## Routine checks

- Confirm `/readyz` returns `ready`, `runtimeStore: postgres`, and `tradeExecution: disabled` until activation.
- Confirm anonymous `/api/v1/me` returns 401 and `/settings` redirects to sign-in.
- Confirm the public company catalog, PreStocks feed, xStocks feed, and stored market history load.
- Review Railway worker logs for a completed `refresh_issuer_context` job and nonzero PreStocks snapshots.
- Review OpenRouter usage caps and failed reservations from the owner console.

## Live-money activation

Keep `ENABLE_REAL_TRADING=false` and `ENABLE_DEPOSITS=false` until the owner approves the activation run. That run must create and verify the fee USDC account, fund the sponsor within the approved limit, simulate every reviewed route, verify Magic approval and rejection, test restart-safe reconciliation, and record finality evidence. Enable deposits only after trading has passed those checks.
