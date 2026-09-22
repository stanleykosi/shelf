# Identity, embedded wallet and USDC funding

## Identity model

Magic is the initial provider. Use email OTP and Google OAuth via the current documented extension. Provider-managed authentication is distinct from Shelf's server session and financial policy.

Canonical user identifier: validated Magic issuer subject plus Magic application/environment, not email and not a browser-provided wallet address. Never attach an arbitrary wallet to an account based on a POST parameter.

Magic Admin's generic public-address methods may refer to EVM addresses. Retrieve Solana-specific metadata using the documented multichain method and WalletType.SOLANA; verify the returned chain/address. Do not interpret an Ethereum DID address as the Solana account. [Admin reference](https://docs.magic.link/embedded-wallets/sdk/server-side/node).

## Login flow

1. Server issues single-use login challenge, same-site cookie, expiration 5 minutes and allowed return route.
2. Browser performs email OTP or Google OAuth with Magic; OAuth state and redirect allowlist are provider-validated and app-bound.
3. Browser sends DID token only over TLS to session-exchange endpoint, with challenge ID and CSRF proof.
4. Server calls Magic token validation, checks audience/application, expiry, not-before and issuer; fetches authoritative Solana wallet metadata. Atomically record a keyed DID digest and consume its challenge; reject token reuse at another exchange. Store no DID bytes. An interrupted login can request fresh provider authentication; it must not reuse a consumed token with a new challenge.
5. Bind new user/wallet once. If an existing issuer yields a different address, stop funding/trading and flag wallet_binding_changed; no automatic replacement.
6. Evaluate invite state; guest learning remains possible without it. Do not leak whether arbitrary emails are invited via public search.
7. Issue random 256-bit session token in HttpOnly Secure SameSite=Lax cookie; store only hash. Rotate on login and privilege change.
8. Session absolute lifetime 7 days, idle lifetime 24 hours. No authentication token in localStorage, logs, URL or analytics.

Do not replay DID tokens as a long-lived app session. Provider token validation alone does not establish app policy, user consent or issuer eligibility.

## Fresh authorization and admin access

Financial actions require authenticated session and user signature. Transfers, account deletion, exports of sensitive account data and admin actions additionally require authentication evidence within 15 minutes (owner actions within 5 minutes). Use a new supported provider login/challenge; refreshing an old token without actual reauthentication must not be represented as step-up.

If the selected Magic plan cannot provide suitable reauthentication, stop those operations until a documented compatible flow is available; do not pretend an app modal is MFA. Owner's provider account should have available MFA enabled; plan cost/availability is a setup gate.

Owner role comes from explicit server configuration/DB provisioning matching the immutable issuer, never a client flag, public signup or email-domain match.

## Signing

Browser signs an inspected server preparation with Magic's Solana extension. The source documents both legacy/v0 transaction support and partial signing. Pin and test actual package behavior before relying on it. Return bytes may differ between docs/examples/versions; normalize only the installed, tested format.

The backend cannot request or store user's private key. The sponsor key is separate and cannot replace a required user signature. No delegated signing session, automatic allowance or AI execution.

Client verifies prepared transaction wallet/network and review digest. Server verifies exact serialized message hash and the user's Ed25519 signature, including all lookup-table resolutions and account identities, before co-signing. No transaction is sent directly from the browser in the main flow; the server records deterministic signature before broadcast.

## Recovery and account linking

Use Magic's documented account-recovery process; Shelf does not promise to restore an irrecoverable email/social account or override provider custody/security controls.

Sign-out revokes Shelf session; sign-out-all revokes all app sessions and provider sessions when supported. Clear cached private data and local conversation.

Email and Google sign-in that yield the same verified issuer are one account. If they yield different issuers, do not merge wallets or financial history based on matching email. Explain original login method and provide support. Multi-identity linking is later scope.

If Magic supports user-controlled Solana key export/recovery for this configured product, document and expose only the provider-hosted safe flow. Never implement a server “show private key” endpoint. Do not advertise export until verified. Ensure deposit screen gives accurate dependency/recovery disclosure.

## USDC deposits

Mainnet canonical USDC mint snapshot: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`. Reverify mint owner/decimals/network in bootstrap. Six decimal places are the expected canonical USDC scale; mismatch is a blocking configuration error.

Display the verified **wallet address**, not an invented exchange memo, sponsor address or fee recipient. QR contains only the Solana address or a correctly labeled compatible payment URI; never mix environments.

Deposits must be canonical USDC on Solana. Wrong-network/wrapped assets are not credited as spendable USDC. No onramp or bridge is included; Magic's general pricing page advertising funding does not prove the required Solana widget is available.

Balance reads include both classic SPL and Token-2022 programs as appropriate, resolving only allowed mints. Spendable financial cash comes from actual finalized onchain balance minus unresolved local reservations, not an app-issued stored value. More recent confirmed changes are shown separately as pending until finality.

Member taps “I’ve sent USDC”: queue a refresh, inspect finalized/confirmed transfer history and show pending/unavailable honestly. The app does not mint funds or accept an uploaded receipt as deposit proof.

## Funding safeguards

Do not reveal a newly created deposit flow encouraging funding until wallet binding, invite, financial access policy, recovery disclosure and basic infrastructure health pass. A returning funded user must still see balance/recovery information even when new deposits/purchases are suspended.

Deposits do not incur a Shelf transaction fee. They do not need the sponsor to sign; the sending wallet pays its own network cost. The sender may need to create the recipient token account; explain that external wallet behavior is outside Shelf's control.

No notification is sent to the source wallet/email. Full deposit history remains private in Shelf, although chain transfers are public.

## Tests

Invalid/expired/audience-mismatched DID; nonce replay; OAuth redirect injection; EVM/Solana metadata confusion; forged wallet param; issuer/address change; duplicate login; two providers with same email but different issuer; logout-cache leakage; missing invite; wrong-network deposit; counterfeited USDC symbol; RPC outage; fresh-auth bypass; v0 partial-signature preservation; browser cancellation; lost session during pending transaction.
