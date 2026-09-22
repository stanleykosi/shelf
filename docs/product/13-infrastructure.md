# Infrastructure, setup, environments and cost

## Selected low-cost prototype stack

Default: **Next.js/Node on Render + Supabase Postgres + Magic + OpenRouter + Jupiter + Helius**. One application and one periodic job, no dedicated AI server, Redis, vector database, paid market-terminal feed, image bucket or fiat provider.

Development can run locally with Docker Postgres and provider mocks. Paid accounts/services must be provisioned by the owner or through separately approved actions. Preparing this pack did not create any account or charge.

## Pricing snapshot and caveats · checked 2026-09-20

| Service | Selected starting point | Cost caveat |
|---|---|---|
| Render web | small paid 0.5 CPU/512 MB compute, formerly Starter | listed 7 USD/month compute; workspace, bandwidth/build overages separate |
| Render periodic job | one cron service | minimum1 USD/month, actual billed runtime may be higher |
| Supabase | Free Postgres for prototype | 500 MB DB, 2 active projects, inactivity pause; no free production backup guarantee |
| Magic | Developer | listed0 USD up to1,000 monthly active wallets; additional wallets/paid features change cost |
| OpenRouter | paid, task-capped | usage-based plus applicable purchase/provider fees; no claim of flat subscription |
| Jupiter | owned Free API key | current portal lists1 RPS; confirm permissions/rate window; upgrades optional |
| Helius | Free RPC initially | listed1M credits,10 requests/sec and1 sendTransaction/sec; credit costs vary by method |
| Backups | private Supabase Storage, encrypted | within available quota initially; includes no user photo uploads |
| Domain | optional beta subdomain initially | custom domain purchase separate |
| SOL sponsor | small operator-funded wallet | real network/rent expense separate from software hosting |

Sources: [Render pricing](https://render.com/pricing), [compute names](https://render.com/docs/compute-plans), [cron](https://render.com/docs/cronjobs), [Supabase](https://supabase.com/pricing), [Magic](https://magic.link/pricing), [Jupiter portal](https://developers.jup.ag/docs/portal/setup), [Helius](https://www.helius.dev/pricing).

Budget statement: approximately **8 USD/month minimum hosting/job charges**, plus AI, SOL/rent, any usage overages and optional services. Not an all-inclusive price or profitability forecast. Real-money reliability may justify Supabase Pro or other upgrades; do not silently provision them.

Render Free sleeping compute may be used for no-money previews, not the selected funded beta. [Free limitations](https://render.com/docs/free). Do not run phantom traffic to evade free-plan restrictions.

Neon and Cloudflare were considered. Neon free-plan documentation encountered quota wording inconsistencies; persistent reconciliation can also defeat scale-to-zero economics. Cloudflare is economical but introduces a different Next-compatible deployment path. Neither is the chosen baseline, avoiding unnecessary adapter complexity for this prototype.

## Runtime and repository setup

At implementation start: inspect destination repo; select maintained Node LTS compatible with current Next/Magic packages; pin Node and package manager; install matching stable dependencies and lock exact versions. Do not copy random tutorial versions or force unsupported peer dependencies.

Required dependency families: Next/React/TypeScript; schema validator; Drizzle + PostgreSQL driver; Magic SDK/Admin/OAuth2/Solana extensions; compatible @solana/web3.js and Token-2022 helpers; AI SDK/OpenRouter provider; precise decimal library; safe image decoder; local barcode library; test stack.

Use Next Node self-hosting/standalone output as documented by the selected Next version. Keep app API in Node, not an unverified edge runtime. Build and start commands are generated in the implementation repo, not this pack. Render's [Next deployment guide](https://render.com/docs/deploy-nextjs-app) and [Next self-hosting guide](https://nextjs.org/docs/app/guides/self-hosting) are references.

## Environments

| Environment | Database | Wallet/chain | AI/provider mode | Money capability |
|---|---|---|---|---|
| local-test | disposable local Postgres | deterministic mock wallets | mocks by default | never mainnet |
| integration | isolated staging database | devnet + fake stock mints | synthetic images, opt-in paid API checks | test assets only |
| private-beta | separate live DB | mainnet Magic app/wallets | production credentials/privacy policy | disabled until all gates pass |

Each deployment displays environment on administrative screens; staging user screens carry visible test-mode badge. Build-time and runtime checks reject mixed chain genesis/mint/database configurations. No production DB clones with personal data for frontend previews; use sanitized fixtures.

## Environment-variable manifest

Values belong in ignored local environment/hosting secrets. This table is the contract for a future .env.example; no real credentials are part of this pack.

| Variable | Visibility | Purpose / safe default |
|---|---|---|
| APP_ENV | server | local / integration / private-beta |
| APP_ORIGIN | server | exact HTTPS origin, localhost only in local |
| NEXT_PUBLIC_APP_NAME | public | Shelf (provisional) |
| NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY | public by design | matching environment's Magic app key |
| MAGIC_SECRET_KEY | secret | Admin verification; never client |
| MAGIC_APP_ID | server | audience/application binding |
| MAGIC_GOOGLE_REDIRECT_URI | server/config | exact allowed callback |
| NEXT_PUBLIC_SOLANA_RPC_URL | deliberately public | Magic initialization endpoint without a private server credential; use public/restricted browser RPC |
| SOLANA_RPC_URL | secret | Helius read/simulation/broadcast endpoint with server key |
| SOLANA_SECONDARY_RPC_URL | secret, optional | independent unknown-outcome verification |
| SOLANA_NETWORK / SOLANA_GENESIS_HASH | server | explicit environment identity; validated at boot |
| DATABASE_URL | secret | least-privilege app pooler/session connection |
| MIGRATION_DATABASE_URL | secret, job only | elevated migration connection; not web process |
| BACKUP_DATABASE_URL | secret, job only | dump-capable role |
| SESSION_TOKEN_HMAC_KEY | secret | app session/challenge hashing |
| LOOKUP_HMAC_KEY | secret | email/IP lookup hashing; no raw IP persistence |
| DATA_ENCRYPTION_KEY | secret | authenticated encryption for sensitive fields/signed bytes |
| BACKUP_ENCRYPTION_PUBLIC_KEY | server/job | backup encryption; decryption key offline, not web |
| SUPABASE_STORAGE_URL | server | private backup project endpoint |
| SUPABASE_BACKUP_SERVICE_KEY | secret, job only | limited storage/backup access where supported |
| BACKUP_BUCKET | server | private encrypted-backups, no public ACL |
| JUPITER_API_KEY | secret | restricted key for Swap/Price |
| XSTOCKS_API_BASE_URL | server allowlisted | official public base, not client supplied |
| OPENROUTER_API_KEY | secret | restricted spend cap, private requests |
| OPENROUTER_MODE | server | mock until the paid benchmark is explicitly authorized |
| OPENROUTER_VISION_MODEL | server | inspected paid candidate, pinned after eval |
| OPENROUTER_TEXT_MODEL | server | same low-cost candidate initially |
| OPENROUTER_PROVIDER_POLICY | server | validated config with ZDR+deny mandatory, no user override |
| OWNER_MAGIC_ISSUER | server secret/config | immutable owner role bootstrap, no sample real identity |
| SUPPORT_CONTACT | server/public selective | owner-controlled safe support destination |
| SPONSOR_SECRET_KEY | secret | bounded SOL-only signer; mainnet absent by default |
| SPONSOR_PUBLIC_KEY | server | must match secret, manifest and payer |
| FEE_USDC_TOKEN_ACCOUNT | server | verified operator USDC fee recipient |
| APP_FEE_BPS | server | 50; versioned changes/audit |
| AI_DAILY_LIMIT_USD / AI_MONTHLY_LIMIT_USD | server | 2 / 20, hard caps |
| SPONSOR_TX_LIMIT_LAMPORTS | server | 5000000 |
| SPONSOR_USER_DAY_LIMIT_LAMPORTS | server | 20000000 |
| SPONSOR_GLOBAL_DAY_LIMIT_LAMPORTS | server | 100000000 |
| ENABLE_REAL_TRADING | server | false until release gate |
| ENABLE_AI_ALLOCATION_SUGGESTIONS | server | false until technical and policy gate |
| ENABLE_DEPOSITS | server | false until identity/recovery/eligibility ready |
| FINANCIAL_POLICY_VERSION | server | reviewed registry version, no wildcard default |
| FINANCIAL_RECORD_RETENTION_DAYS | server | reviewed before beta; engineering proposal90 |
| PRODUCT_URL_ALLOWLIST | server | reviewed exact domains/path rules; empty denies dynamic URL fetch; static reviewed Apple iPhone mapping works without fetching |

No NEXT_PUBLIC variable may contain database, private RPC, OpenRouter, admin or sponsor credentials. Runtime validation refuses unsafe production defaults. An empty secret disables its capability visibly rather than silently switching to mocks.

## Provisioning checklist

1. Create separate staging/live Magic applications; allowlist origin/callback, configure email and Google, check plan features and recovery. Verify Solana metadata and v0 partial-signature contract.
2. Create Supabase projects or local/staging alternatives within quota. Use session-pooler/IPv4-compatible connection when needed, SSL, non-superuser runtime role. Disable direct browser access to private schema. [Connection guide](https://supabase.com/docs/guides/database/connecting-to-postgres).
3. Create restricted Jupiter/Helius keys and observe actual quotas. No hardcoded API keys in git or client bundle.
4. Configure OpenRouter billing/key caps, disable content logging/training opt-ins, require privacy policies, run synthetic schema/image smoke test.
5. Build Render Node web service, explicit health checks, protected environment variables and one UTC cron runner.
6. Configure public domain/TLS/CSP/OAuth redirects and same-origin cookies. Set actual hosting regions in privacy documentation.
7. Create encrypted private backup destination, test restore into disposable database, record outcome.
8. Owner creates separate fee collector account and low-balance sponsor in the implementation context with explicit financial authorization; do not create/fund them as an incidental setup task.
9. Import reviewed catalog/evidence and verify exact mints; run simulations/tests with mainnet writes disabled.
10. Enable narrowly scoped invited beta only after document15 gates and separate live-test approval.

## Periodic jobs

One cron invokes bounded work selection every minute and exits; never sleeps indefinitely. Work includes signature reconciliation, issuer refresh, scheduled multiplier checks, daily retention, daily encrypted backup and health checks.

Persist leases/retries in Postgres; job dedupe prevents repeated action. External calls have short timeouts and rate-limit shared providers. Limit bulk price/catalog work when transactions need quota. Owner can run reconciliation without granting generic code execution.

## Backups and operational visibility

Free database plans are not a backup strategy. Schedule encrypted pg_dump-equivalent backups with verified restore compatibility and 7 daily/4 weekly retained generations. Keep decryption key offline; do not store it next to dumps. Private object storage contains no user image library.

Target engineering RPO24 hours for app data and RTO4 hours for a small beta; chain transaction records can be backfilled from persisted signatures/addresses, but shelf/preferences cannot. These are targets until restore drill proves them. Real-money readiness requires owner acceptance or stronger backup tier.

Structured logs: request ID, opaque actor hash, operation ID, status code, latency, provider cost and redacted error category. Never body/headers/PII/full signed bytes. No session replay.

Alert on unknown submission, sponsor low/cap, provider/privacy failure, unexpected balance changes, backup age>26h and failed job leases. Use hosting alerts and owner console initially; a third-party monitoring service is optional, not a missing runtime dependency.

## Deployment and rollback

CI tests/build first. Migrate with expand/contract pattern; do not drop financial columns in routine releases. Before dangerous migration take backup and dry-run on sanitized staging.

Rollback code only if old code understands current schema/state. During incident pause new preparation/submission, retain read/history and reconcile existing signatures. Never redeploy with test mode over the live DB or reset financial records to make an error disappear.
