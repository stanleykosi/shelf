# Architecture decisions

## One application runtime

Shelf runs as a Next.js App Router application on Vercel with PostgreSQL on Railway. Route handlers serialize the current application state under a transaction-scoped advisory lock. Railway runs the scheduled issuer-data refresh.

## Provider boundaries

Magic owns identity and the embedded wallet. OpenRouter handles recognition and education under explicit privacy and spend controls. PreStocks supplies private-company discovery and issuer reference data. xStocks supplies reviewed public-company instruments. Jupiter supplies liquidity and unsigned transaction construction. Helius supplies Solana RPC reads.

## Financial safety

Shelf uses raw integers, reviewed mint relationships, historical unit snapshots, explicit user approval, idempotency, and restart-safe reconciliation. Jupiter transaction messages are checked for exact terms, signers, fee account, allowed programs, and absence of tips. Execution remains disabled until the sponsor, fee account, simulation, broadcast, finality, and reconciliation checks are approved and completed.

## Storage and privacy

PostgreSQL is the only runtime store. Raw images, receipt text, chat transcripts, credentials, wallet signing keys, and signed transaction bytes are excluded from persistence.
