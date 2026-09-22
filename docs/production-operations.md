# Production operations

Shelf is deployed as one Next.js application on Vercel. Railway provides PostgreSQL and a scheduled Bun worker. No separate HTTP backend is required.

Production configuration uses Magic, OpenRouter with `z-ai/glm-5.3-flash`, the PreStocks and xStocks issuer APIs, Jupiter, Helius, and PostgreSQL. `ENABLE_REAL_TRADING`, `ENABLE_DEPOSITS`, and `ENABLE_AI_ALLOCATION_SUGGESTIONS` remain false. Secrets belong only in Vercel or Railway secret storage.

The Railway worker runs every five minutes. It validates reviewed xStocks symbol/mint pairs and stores PreStocks issuer-mark and token-reference observations. It records only work it actually performed.

## Release

1. Run `npm ci`, lint, type checking, unit tests, and the production build.
2. Apply reviewed migrations with `MIGRATION_DATABASE_URL`.
3. Deploy the worker and confirm one successful issuer refresh.
4. Deploy Vercel and check `/healthz`, `/readyz`, public catalog routes, anonymous auth denial, and sign-in redirect behavior.
5. Run the read-only Chromium suite against the selected deployment.

Readiness must report PostgreSQL, Magic, OpenRouter, Jupiter, and Helius, with `realTrading: false` and `tradeExecution: disabled` until the approved activation run.

## Rollback

Use Vercel deployment rollback for the application. Roll the Railway worker back to the preceding image if its refresh job fails. Do not roll database migrations back destructively; deploy a forward correction. Keep financial flags off throughout rollback.

## Remaining activation work

The sponsor is unfunded and its derived fee USDC account is not initialized on-chain. The approved live-money run must cover account creation, bounded sponsor funding, simulation, user approval and rejection, submission, ambiguous-result recovery, finality, reconciliation, and one small buy/sell cycle. Public launch remains a separate decision.
