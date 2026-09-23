# Production operations

Shelf is deployed as one Next.js application on Vercel. Railway provides PostgreSQL and a scheduled Node worker. No separate HTTP backend is required.

Production configuration uses Magic, OpenRouter with `z-ai/glm-5.3-flash`, the PreStocks and xStocks issuer APIs, Jupiter, Helius, and PostgreSQL. `ENABLE_REAL_TRADING`, `ENABLE_DEPOSITS`, and `ENABLE_AI_ALLOCATION_SUGGESTIONS` remain false. Secrets belong only in Vercel or Railway secret storage.

The Railway worker runs every five minutes. It validates reviewed xStocks symbol/mint pairs, stores PreStocks issuer-mark and token-reference observations, and calls the narrowly authenticated Vercel reconciliation endpoint. When trading is disabled, reconciliation still checks persisted signatures and records finalized outcomes; it cannot broadcast. Each authenticated request processes at most one preparation, with a three-second timeout per chain RPC and a 24-second worker request deadline. The worker renews a 40-second lease and can issue two bounded reconciliation requests per scheduled run; unchecked items are selected oldest-check-first on later runs. It rebroadcasts identical stored bytes only when signature history is unseen and finalizes records from finalized Helius facts. A non-final signature error remains unresolved, retains its sponsor reservation and wallet lock, and is not treated as a failed trade until finality.

Vercel stores `SPONSOR_SECRET_KEY`, `DATA_ENCRYPTION_KEY`, and `WORKER_SHARED_SECRET`. Railway stores the same `WORKER_SHARED_SECRET` and the production `APP_ORIGIN`. Rotate the worker secret on both platforms together. Never rotate `DATA_ENCRYPTION_KEY` while encrypted preparations remain unresolved.

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
