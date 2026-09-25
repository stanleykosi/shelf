# Shelf: Product and System Description

## Purpose

Shelf helps people find the companies behind familiar products. It also shows stock tokens that current issuers list for those companies.
People can learn about an asset, save products, and follow companies. Financial actions need separate access and approval.

A product-owner link and a token listing are different facts. AI can propose an owner, but Shelf marks that proposal as unverified.
Only current issuer data can supply a token symbol and Solana mint. A stock token is not an ordinary share with voting rights.

## Discover and Scan

Discover shows a featured group and a directory from the current xStocks and PreStocks feeds.
People can search the full feeds by company name. They can also search by product name.
Shelf checks issuer names first. If no issuer name matches, AI proposes a likely product owner.
Shelf then looks for that owner in the issuer feeds. It does not invent a token for an unknown company.

Scan accepts seven inputs: camera photo, barcode, upload, screenshot, receipt image, permitted product link, and typed search.
AI can propose more than one product from an image. The person can correct or reject each proposal.
Shelf supports groceries, beauty, electronics, clothing, and household products.
If a feed fails, Shelf shows that its results can be incomplete.

## Token details and AI

A token detail page shows the issuer source, symbol, Solana mint, and available source times.
xStocks pages describe public equity tracker certificates. PreStocks pages describe private company exposure tokens.
Issuer reference values are not executable purchase prices. A buy review needs a new Jupiter quote for the selected amount.

Token chat starts from one exact token detail page. The server gets that issuer record again for each answer.
The general assistant uses reviewed Shelf lessons and product relationships. It does not claim current issuer prices or mints.
The person starts an AI request only when they send a question. AI cannot sign or place an order.

The browser shows one chat history list for both scopes. Member history stays on that device under the member account.
Guest history stays in the current tab. People can delete chats. Shelf does not keep chat text in a server history store.

## Accounts and saved items

Guests can browse, scan, learn, and save products in temporary browser state. They cannot use a wallet or see a portfolio.
Members sign in with Magic by email or Google. Magic gives each member an embedded Solana wallet.
Shelf checks the identity and wallet link on the server. Shelf servers do not hold the member's signing key.

A member has one private shelf and a company watchlist. After sign-in, Shelf can merge guest items into that shelf.
A member can make a share link from a selected shelf snapshot. The link expires after seven days and supports revocation.
The snapshot excludes wallet addresses, balances, orders, and holdings.

## Financial path and records

The financial screens define a single buy, a multi-company budget, a sale to USDC, and a Solana transfer.
The member must review each transaction and approve it with the Magic wallet. A quote does not create a purchase.
The financial design sets a 0.50% Shelf fee for successful buys and sells. Deposits and transfers have no Shelf fee.

Shelf checks the exact issuer mint and Solana token data before an order. It uses exact integer amounts for money and tokens.
After submission, Shelf checks the chain result. It keeps an unknown result open until it has proof.
The portfolio tracks assets bought through Shelf. The wallet shows tokens from outside Shelf separately.
Members can view history and export records as CSV or JSON.

**Real trades and new deposits are off now.** The owner must complete safety gates and approve a controlled live test.
Public real-money release needs a separate decision.

## System and privacy

Next.js runs the browser app and API on Vercel. PostgreSQL keeps private account data, saved items, issuer snapshots, and orders.
A Railway job refreshes issuer data and checks unresolved chain transactions.
Magic handles identity. OpenRouter handles bounded AI tasks. Jupiter supplies swap data. Helius supplies Solana data.

Shelf processes photos and raw receipt text in short-lived memory. It does not save those inputs as account records.
OpenRouter requests must use Shelf's privacy controls. Shelf stops a request if a suitable AI route is unavailable.
Private app records do not make Solana transfers private. Other people can see public chain activity.

For setup and tests, see the [README](../README.md). For current limits, see the [product decisions](product/00-decisions.md).
