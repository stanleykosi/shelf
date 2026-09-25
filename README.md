# Shelf

Shelf helps people find the companies behind familiar products. It also shows stock tokens that current issuers list for those companies.
People can learn about an asset before they choose a financial action.

A product link and a token listing are different facts. Shelf marks an AI product-owner proposal as unverified.
Only issuer data can supply a token symbol and Solana mint. A stock token is not an ordinary share with voting rights.

## Current state

The web app, API, database code, provider adapters, and tests exist in this repository.
The current configuration disables real trades, new deposits, and AI allocation suggestions.
The owner must approve a controlled live test before any real-money activation.
Public real-money release needs a separate decision. See the [readiness report](docs/readiness-report.md).

## What people can do

### Find a company

Discover shows a featured group and the full current xStocks and PreStocks directory.
A person can select a market or sector and can search across both issuer feeds.
Shelf checks issuer names first. If no issuer name matches, AI proposes a likely owner for the product name.
The screen marks that proposal as unverified. It also shows when a feed is old or unavailable.

Scan accepts a camera photo, barcode, file upload, screenshot, receipt image, product link, or typed search.
It can propose more than one product from one image. The person can correct or reject a proposed product.
Shelf supports groceries, beauty, electronics, clothing, and household products.
An unknown product stays unknown. Shelf does not invent an owner, token, or price.

### Examine an asset

Each token detail page identifies the issuer source, symbol, Solana mint, and available source times.
xStocks pages describe public equity tracker certificates. PreStocks pages describe private company exposure tokens.
The detail page shows issuer reference facts. A buy review gets a Jupiter quote for a selected amount.
An issuer reference value is not an executable purchase price.

### Ask AI

Token chat starts from a token detail page. The server gets the current record for that exact asset for each answer.
The general assistant uses reviewed Shelf lessons and product relationships. It does not supply current issuer prices or mints.
The person starts an AI request only when they send a question.

The browser shows one history list for both chat scopes. Member history stays on that device under the member account.
Guest history stays in the current browser tab. People can delete chats.
Shelf does not keep chat text in a server history store.
AI can explain and suggest. It cannot sign, approve an owner link, or place an order.

### Save and share

Guests can save products in temporary browser state. Members can save products to one private shelf and follow companies on a watchlist.
After sign-in, Shelf asks the person whether to merge guest items into the member shelf.
A member can make a share link from a selected shelf snapshot. The link expires after seven days and supports revocation.
The snapshot excludes wallet addresses, balances, orders, and holdings.

### Use a wallet and view records

Magic supplies email or Google sign-in and an embedded Solana wallet. Shelf checks the identity and wallet link on the server.
The member wallet signs member transactions. Shelf servers do not hold the member's signing key.

The financial screens define a single buy, a multi-company budget, a sale to USDC, and a Solana transfer.
Each action needs a new review and the member's approval. A quote does not create a purchase.
The financial design sets a 0.50% fee for successful buys and sells. Deposits and transfers have no Shelf fee.
The current configuration keeps real transaction submission and new deposits off.

Portfolio records show assets that the member bought through Shelf. The wallet shows external token receipts separately.
History shows action states, fees, and chain results. Members can export records as CSV or JSON.
Shelf keeps the unit value that applied when it made each record.

### Operate the beta

The owner console shows system status, invites, source reviews, and cost records.
The owner can pause new financial actions. The owner cannot sign a member transaction.

## How the system works

The browser uses the Next.js app. Versioned API routes check input, identity, access, and request limits.
PostgreSQL keeps private account state, saved items, issuer snapshots, orders, and system facts.
A Railway job refreshes issuer data and checks unresolved chain transactions.
Vercel runs the web app and API.

| System | Purpose |
|---|---|
| Magic | Email or Google identity and a member Solana wallet. |
| xStocks and PreStocks | Current issuer asset records. |
| OpenRouter | Product recognition and bounded educational answers. |
| Jupiter | Amount-specific swap quotes and transaction instructions. |
| Helius | Solana mint, balance, and transaction data. |
| PostgreSQL | Private app state and issuer snapshots. |

The server checks the issuer mint before an order. It checks Solana data before it accepts a transaction result.
If a chain result is unknown, Shelf keeps that state open until it has proof.
The app uses exact integer amounts for money and token units.

Shelf processes photos and raw receipt text in short-lived memory. It does not save these inputs in account records.
OpenRouter requests must use Shelf's privacy controls. The app stops a request if a suitable AI route is unavailable.
Private app records do not make Solana transfers private. Other people can see public chain activity.

## Start on your computer

Use Node.js 22, npm 10, and Docker with Compose. The Compose file supplies PostgreSQL 17.

1. Install the project packages.
2. Copy the example environment file.
3. Start PostgreSQL.
4. Apply the database changes.
5. Add the seed data.
6. Start the app.

```bash
npm ci
cp .env.example .env.local
docker compose up -d postgres
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:3000`. Put required provider keys in `.env.local` for the functions you want to use.
Git ignores that file. Missing keys stop the related functions; Shelf does not create fake accounts, balances, quotes, or trades.
Keep `ENABLE_REAL_TRADING=false` and `ENABLE_DEPOSITS=false` until the owner approves activation.

## Do the checks

Run these commands after a change:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Start the app before you run browser tests against your computer:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:browser
```

If Playwright cannot find Chromium, install its browser with `npx playwright install chromium`.
Browser tests need the database and relevant provider setup. They do not authorize real trades.

## Repository map

| Path | Content |
|---|---|
| `src/app/` | Pages, API routes, and health routes. |
| `src/components/` | Screens and shared browser components. |
| `src/domain/` | Product rules, exact money values, and transaction state. |
| `src/providers/` | External service adapters. |
| `src/db/` and `drizzle/` | Database access, schema, and migrations. |
| `infrastructure/` | The Railway worker. |
| `tests/e2e/` | Browser tests. |

## Find more information

- [Detailed product and system description](docs/SHELF_PROJECT_DESCRIPTION_STE.md)
- [Current product decisions](docs/product/00-decisions.md)
- [Version-one product documents](docs/product/README.md)
- [Build status](BUILD_STATUS.md)
- [Readiness report](docs/readiness-report.md)
- [Operator runbook](docs/operator-runbook.md)
- [Production operation and rollback](docs/production-operations.md)

Use the latest product decision when an older summary gives a different rule.
The build status and readiness report show current implementation work and open activation gates.
