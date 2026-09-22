# Administration and runbooks

One owner operates the private beta. A single operator is not permission to bypass authentication, skip audit or move user funds.

## Owner console

Dashboard shows capability health, current network, last issuer/mint refresh, pending/unknown operations, sponsor balance/budgets, AI usage, quote rate allowance, backup age and catalog review queue. No photos/receipts/raw chat are available to inspect because they are not stored.

Actions:

- Invite/revoke access through server-reviewed identity flow.
- Review brand/company source claims, region scope and expiry; publish only after evidence.
- Enable asset capabilities only after exact mint/metadata/fee/sponsor checks.
- Pause buy, pause suggestions, pause all new submission separately; preserve appropriate history/exit controls.
- Change limits/fee policy with reason, version and effective time; approved transaction versions unchanged.
- Reconcile an operation/wallet; inspect redacted event facts and missing records.
- Inspect anonymized performance/cost counters; export a redacted support bundle.

Forbidden: sign for user, replace wallet, edit balance, mark an unverified chain trade complete, upload arbitrary executable program IDs from a user report, silently waive issuer restrictions, reveal secret keys, clear unknown status to permit retry, delete financial audit entries.

## Jobs and retry policy

| Job | Cadence/trigger | Idempotency and stop condition |
|---|---|---|
| reconcile_submission | immediate after send; cron while unresolved | key network+signature; finalize once; unknown escalates, never double-sends new bytes |
| refresh_wallet | view/deposit/transaction/manual; background for recently active wallets | wallet+time bucket; cursor checkpoints over relevant accounts |
| refresh_mints | ≤60s freshness for active assets; pre-prepare | asset+observed slot; compare extension/authority changes |
| refresh_issuer_context | every5m active, daily disabled | issuer event ID/version, not duplicate poll notifications |
| apply_corporate_action_context | effective schedule/reconciliation | asset+event; raw inventory unchanged unless chain facts differ |
| source_review_due | daily | relation review date; mark overdue, notify owner |
| retention_cleanup | daily | policy version, legal hold, pending-operation exclusions |
| backup_database | daily | manifest+digest; encrypted; restore test scheduled |

Lease jobs for30 seconds with heartbeats for bounded steps; attempts5 with exponential backoff for ordinary reads, then owner queue. Reconciliation of unknown financial outcomes continues at slower interval rather than becoming a silently abandoned dead letter. Periodic runner must finish under45 seconds; schedule remaining work.

## R01 — Transaction outcome unknown

1. Do not create a replacement order or release spend reservation.
2. Retrieve persisted preparation/signature and inspect both provider result and chain signature history.
3. Check exact transaction meta, current block height and lastValidBlockHeight.
4. If valid and unseen, rebroadcast identical signed bytes only under idempotent policy.
5. If definitively failed/expired, record evidence and release safe reservation; allow user-reviewed retry.
6. If chain finalized but DB absent, replay unique event and rebuild projection.
7. If evidence unavailable, retain pending state and contact owner; never invent success/failure.

## R02 — Sponsor drained, unavailable or compromised

Pause new sponsored submissions. Existing submitted signatures still reconcile. Show users that network-cost sponsorship is temporarily unavailable, not that their USDC is missing.

Inspect reserved vs spent, account creation patterns and failure rates. Rotate key on suspected compromise; do not top up automatically or move customer funds. Owner funding is a separate approved action. Unpause only after cause and budget validation.

## R03 — Wrong mapping or counterfeit asset

Disable new buys/suggestions for affected mapping/instrument immediately, leave educational correction visible, preserve historical evidence. Verify source/chain identity; notify affected users through in-app notices without changing their holdings.

Do not silently swap customers into another asset or rewrite past trade records. Exits/transfers governed by safety/legal policy. Correct mapping with effective date and source, not retroactive history deletion.

## R04 — Corporate-action/unit mismatch

Pause affected preparations and quote displays. Compare issuer schedule, mint active/future multiplier and clock. Record snapshots; replay display projections without changing raw acquisition quantities.

Invalidate unsigned preparations using stale units. Already submitted transactions reconcile using their actual raw amounts and recorded unit context. Reopen only after tests for the actual transition pass.

## R05 — Privacy leak or AI policy failure

Disable affected AI/logging route, preserve minimal incident metadata, stop logging content, rotate exposed credentials where necessary. Determine what external retention occurred; do not assert deletion at providers without evidence.

Restore only with enforced privacy routing and contract tests. Follow applicable notification obligations through qualified review; this pack does not determine them.

## R06 — Database outage/restore

Disable new financial preparations and sponsor signing. RPC facts alone do not replace idempotency and authorization records. Restore encrypted backup to isolated environment; verify schema/manifests; replay post-backup known chain events and deletion markers.

Investigate pending wallet signatures and source-account history to avoid double purchases. Compare aggregate inventory and fee records. Resume only after reconciliation; never rebuild acquisition prices from today's price.

## R07 — Member loses access

Direct to documented Magic recovery/original sign-in. Do not attach old wallet to a newly created issuer by matching email or an unauthenticated support message. No manual server signing or private-key handling.

If platform outage prevents recovery, communicate provider dependency honestly. Avoid accepting new deposits until recovery expectations are credible.

## Support and deletion

Support reference contains opaque record ID, time/status and safe instructions. User may elect to share their public signature; do not require seed phrases, OTPs or private keys. Static contact is owner-configured; no customer messaging sent by this research pack.

Deletion pauses new actions, reconciles pending operations, offers data export and withdrawal/recovery guidance, then deletes normal app data under policy. Do not close/burn wallet or confiscate remaining assets. Retained financial records and backup aging must be explained before confirmation.

## Operational acceptance

Owner must rehearse R01, R02, R04 and R06 in staging using synthetic/test assets. All sensitive admin actions produce audit records and cannot be performed through direct client database access. The incident button must work during partial provider outages.
