# Shelf

Shelf lets people search current xStocks and PreStocks token listings or scan a familiar product
to find a likely company. AI ownership suggestions are unverified; token symbols and Solana mints
come from the issuer. Token details are the place to examine company and instrument facts and open
AI chat scoped to that exact issuer record. Signed-in members have a private shelf, watchlist,
wallet view, portfolio, records, sharing and deliberate investment workflows.

Discover uses one search field: it checks both live issuer feeds for a company first, then uses
OpenRouter automatically to suggest the owner of an unmatched product. The UI labels AI ownership
as unverified, while stock assets and mints come only from the current issuer feeds. Discover
shows a rotating selection of familiar issuers plus a paginated directory of every current
xStocks and PreStocks listing. The directory shows ten assets per page, grouped by market and
filterable by editorial sector. Featured names are not a performance ranking. Search covers the
same full feeds. The Railway worker keeps a validated directory snapshot in PostgreSQL; Vercel
and browser caching keep repeat visits fast without freezing the per-visit featured selection.

Token detail pages clearly separate xStocks public-equity tracker certificates from PreStocks private-company exposure tokens. PreStocks supplies issuer reference prices and lifecycle notices. xStocks supplies public-market instrument metadata. Jupiter supplies executable-market quotes. Shelf never presents either instrument as an ordinary voting share. Barcode discovery uses public Open Food/Beauty/Products Facts for a product-name clue before the same AI and issuer lookup. AI chat is available only from token details; the former general assistant, company research, Markets, and separate allocation draft URLs are retired.

Production runs as a full Next.js application on Vercel. Railway supplies PostgreSQL and the scheduled issuer-data and transaction-reconciliation worker. Magic supplies email/Google identity and an embedded Solana wallet. OpenRouter runs recognition and education through the pinned GLM model. Helius supplies Solana RPC access.

Financial execution and deposits remain disabled until the sponsor is funded, the fee account exists, transaction simulation passes, and the owner authorizes the live-money run.

## Local setup

Requirements: Node.js 22, npm 10, PostgreSQL 16, and the provider credentials listed in `.env.example`.

```bash
npm ci
cp .env.example .env.local
docker compose up -d postgres
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:3000`. Local development uses PostgreSQL and the same provider adapters as production. Missing credentials fail closed; they do not create substitute users, balances, market data, or transactions.

## Verification

```bash
npm run lint
npm run typecheck
npm run test
npm run build
PLAYWRIGHT_BASE_URL=https://shelf-one-phi.vercel.app npm run test:browser
```

Browser tests are read-only and use the installed Linux Chromium. They do not install or use Windows Chrome, Firefox, or WebKit.

Live issuer results and the Discover company table use optional logo images supplied by xStocks and PreStocks. Shelf accepts only their known HTTPS logo paths and shows initials when a provider omits an image or it fails to load. Logos do not establish product ownership.

## Repository map

- `src/app` — App Router pages, health endpoints, and versioned API
- `src/components/screens` — responsive product screens
- `src/domain` — exact money, order accounting, lots, and private shares
- `src/providers` — Magic, OpenRouter, Jupiter, Helius, PreStocks, and xStocks adapters
- `src/db/schema.ts` and `drizzle/` — PostgreSQL model and migrations
- `infrastructure/railway-worker.ts` — scheduled issuer-data refresh and restart-safe transaction reconciliation
- `tests/e2e` — read-only production browser checks
- `docs/operator-runbook.md` — local and production operation
- `docs/production-operations.md` — Vercel, Railway, activation, and rollback
- `BUILD_STATUS.md` — implementation and readiness record

The approved version-one specification remains in [`docs/product`](docs/product/README.md).
