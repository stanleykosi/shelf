"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { apiRequest, freshApiRequest, freshPostJson, postJson } from "@/lib/api-client";
import {
  Card,
  CtaLink,
  ErrorMessage,
  Field,
  PageIntro,
  ResultMessage,
  SupportAction,
} from "@/components/ui";
import type {
  AccountSummary,
  LoginChallenge,
  WalletSigningChallenge,
  WalletSigningVerification,
  WalletSummary,
} from "@/domain/identity";
import {
  finishMagicGoogleLogin,
  magicSolanaWalletAddress,
  signInWithMagicEmail,
  signMagicSolanaProof,
  signOutMagicBrowser,
  startMagicGoogleLogin,
} from "@/providers/magic-browser";
import { walletRefreshMessage } from "./wallet-refresh-message";
import { safeReturnTo } from "@/lib/routes";
import { formatRaw } from "@/domain/money";
import { productById } from "@/data/catalog";
import type { Holding } from "@/domain/types";
import { reviewedGuestProductIds } from "./account-draft";

type WalletDetails = WalletSummary & { externalInventory?: Holding[] };

const subscribeGuestResearch = () => () => {};
function guestResearchSnapshot() {
  try { return sessionStorage.getItem("shelf:guest-items") ?? "[]"; }
  catch { return "[]"; }
}

async function createLoginChallenge(returnPath: string): Promise<LoginChallenge> {
  return postJson<LoginChallenge>("auth/challenges", {
    purpose: "login",
    returnPath,
  });
}

async function createShelfSession(challengeId: string, didToken: string, method: string) {
  const walletAddress = await magicSolanaWalletAddress();
  return postJson("auth/session", { challengeId, didToken, method, walletAddress });
}

export function SignInScreen({
  returnPath = "/onboarding",
  supportContact,
}: {
  returnPath?: string;
  supportContact?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signIn(method: "email" | "google") {
    setLoading(true);
    setError(null);
    try {
      const challenge = await createLoginChallenge(safeReturnTo(returnPath));
      if (method === "email") {
        const didToken = await signInWithMagicEmail(email, challenge.challengeId);
        await createShelfSession(challenge.challengeId, didToken, method);
        router.push(safeReturnTo(challenge.returnPath) as Route);
        return;
      }

      sessionStorage.setItem("shelf:magic-login", JSON.stringify(challenge));
      await startMagicGoogleLogin(
        challenge.oauthRedirectUri ?? `${window.location.origin}/auth/callback`,
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "SIGN_IN_FAILED");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageIntro eyebrow="Account access" title="Continue your research.">
        <p>
          Use email or Google to access the same Magic-managed account and embedded Solana wallet.
        </p>
      </PageIntro>
      <div className="research-split"><form className="stack research-section" onSubmit={(event) => { event.preventDefault(); if (!loading && email.includes("@")) void signIn("email"); }}>
        <Field label="Email address" htmlFor="email">
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <button
          data-cta="C43"
          disabled={loading || !email.includes("@")}
          type="submit"
        >
          {loading ? "Connecting…" : "Continue with email"}
        </button>
        <button
          className="secondary"
          type="button"
          data-cta="C44"
          disabled={loading}
          onClick={() => signIn("google")}
        >
          Continue with Google
        </button>
        <CtaLink id="C45" href="/" secondary>
          Continue as guest
        </CtaLink>
        <SupportAction id="C46" contact={supportContact}>
          Get sign-in help
        </SupportAction>
        <ErrorMessage message={error} />
      </form><aside className="research-section"><h2>One account. Private research.</h2><p>Your saved research is separate from investments. Signing in does not place an order or enable financial access.</p><p className="muted">Magic manages email and Google authentication and your linked Solana wallet. Shelf does not hold your signing keys.</p></aside></div>
    </>
  );
}

export function MagicCallbackScreen() {
  const router = useRouter();
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function finishLogin() {
      try {
        const stored = sessionStorage.getItem("shelf:magic-login");
        if (!stored) throw new Error("LOGIN_CHALLENGE_MISSING");
        const challenge = JSON.parse(stored) as LoginChallenge;
        const didToken = await finishMagicGoogleLogin(challenge.challengeId);
        await createShelfSession(challenge.challengeId, didToken, "google");
        sessionStorage.removeItem("shelf:magic-login");
        router.replace(safeReturnTo(challenge.returnPath) as Route);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "GOOGLE_SIGN_IN_FAILED");
      }
    }

    void finishLogin();
  }, [router]);

  return (
    <>
      <PageIntro eyebrow="Sign in" title="Finishing Google sign-in">
        <p>Shelf is verifying the one-time Magic identity token and binding your Solana wallet.</p>
      </PageIntro>
      <Card>
        {error ? (
          <>
            <ErrorMessage message={error} />
            <Link className="button" href="/sign-in">
              Try again
            </Link>
          </>
        ) : (
          <ResultMessage>Verifying your account…</ResultMessage>
        )}
      </Card>
    </>
  );
}

export function WelcomeScreen() {
  const router = useRouter();
  const [terms, setTerms] = useState(false);
  const [adult, setAdult] = useState(false);
  const [merged, setMerged] = useState(false);
  const [merging, setMerging] = useState(false);
  const guestSnapshot = useSyncExternalStore(subscribeGuestResearch, guestResearchSnapshot, () => "[]");
  const guestIds = reviewedGuestProductIds(guestSnapshot);
  const [error, setError] = useState<string | null>(null);
  const mergeId = useRef<string | null>(null);

  async function mergeGuestShelf() {
    if (merging || merged || !guestIds.length) return;
    setMerging(true);
    setError(null);
    try {
      mergeId.current ??= crypto.randomUUID();
      await postJson("shelf/merge", { mergeId: mergeId.current, productIds: guestIds });
      setMerged(true);
      sessionStorage.removeItem("shelf:guest-items");
    } catch { setError("Your discoveries were not merged. They remain on this device; try again."); }
    finally { setMerging(false); }
  }

  return (
    <>
      <PageIntro eyebrow="Welcome" title="Your Shelf account is ready">
        <p>
          Account creation and beta financial access are separate. Live funding stays unavailable
          while provider and policy gates are open.
        </p>
      </PageIntro>
      <div className="research-split"><section className="research-section stack">
        <h2>Before you continue</h2>
        <p className="muted">These acknowledgements apply to this setup step. Financial availability is checked separately by the server.</p>
        <label>
          <input
            type="checkbox"
            checked={terms}
            onChange={(event) => setTerms(event.target.checked)}
          />{" "}
          I acknowledge the current terms and privacy notice.
        </label>
        <label>
          <input
            type="checkbox"
            checked={adult}
            onChange={(event) => setAdult(event.target.checked)}
          />{" "}
          I confirm I am an adult.
        </label>
        <button
          id="C47"
          data-cta="C47"
          disabled={!terms || !adult}
          aria-describedby="setup-requirements"
          onClick={() => router.push("/onboarding/availability")}
        >
          Continue
        </button>
        <p id="setup-requirements" className="hint">Acknowledge both statements to continue. This does not enable deposits or trading.</p>
      </section><section className="research-section stack"><h2>Keep your discoveries</h2>
        <p>{guestIds.length ? `${guestIds.length} reviewed Products saved in this browser session.` : "No temporary discoveries to merge."}</p>
        {guestIds.length ? <ul>{guestIds.map((id) => <li key={id}>{productById(id)?.name}</li>)}</ul> : null}
        <button className="secondary" data-cta="C48" disabled={!guestIds.length || merging || merged} onClick={mergeGuestShelf}>
          {merging ? "Saving discoveries…" : merged ? "Discoveries saved" : "Save my discoveries"}
        </button>
        <CtaLink id="C49" href="/" secondary>
          Skip for now
        </CtaLink>
        {merged ? (
          <ResultMessage>Your previously saved guest products were merged once.</ResultMessage>
        ) : null}
        <p className="hint">Skipping keeps temporary research in this browser session. Saved research is not ownership.</p>
        <ErrorMessage message={error} />
      </section></div>
    </>
  );
}

export function EligibilityScreen() {
  const [country, setCountry] = useState("");
  const [adult, setAdult] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function checkEligibility() {
    if (checking) return;
    setChecking(true);
    setResult("");
    setError(null);
    try {
      const response = await postJson<{ allowed: boolean; policyVersion: string }>(
        "eligibility/check",
        {
          residenceCountry: country,
          adultAttested: adult,
          declarationCodes: [],
        },
      );
      setResult(
        response.allowed
          ? `Eligibility check passed under policy ${response.policyVersion}. Funding and trading remain subject to separate activation controls.`
          : "Financial capabilities are unavailable. You can continue learning.",
      );
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Eligibility check failed");
    } finally { setChecking(false); }
  }

  return (
    <>
      <PageIntro
        eyebrow="Financial availability"
        title="Financial availability"
      >
        <p>
          Global access to education does not establish that stock-token distribution is allowed
          everywhere. This prototype does not collect identity documents.
        </p>
      </PageIntro>
      <Card className="stack research-reading">
        <Field label="Country of residence" htmlFor="country">
          <select id="country" value={country} disabled={checking} onChange={(event) => { setCountry(event.target.value); setResult(""); }}>
            <option value="">Choose a country</option>
            <option value="NG">Nigeria</option>
            <option value="GB">United Kingdom</option>
            <option value="US">United States</option>
          </select>
        </Field>
        <label>
          <input
            type="checkbox"
            checked={adult}
            disabled={checking}
            onChange={(event) => { setAdult(event.target.checked); setResult(""); }}
          />{" "}
          I confirm I am an adult.
        </label>
        <button data-cta="C50" disabled={!country || !adult || checking} onClick={checkEligibility}>
          {checking ? "Checking availability…" : "Check availability"}
        </button>
        <ErrorMessage message={error} />
        {result ? (
          <ResultMessage>
            {result}
            <div className="actions">
              <CtaLink id="C33" href="/learn" secondary>
                Continue learning
              </CtaLink>
            </div>
          </ResultMessage>
        ) : null}
      </Card>
    </>
  );
}

export function WalletScreen({ deposit = false }: { deposit?: boolean }) {
  const [message, setMessage] = useState("");
  const [refreshPending, setRefreshPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wallet, setWallet] = useState<WalletDetails>();
  const [refreshing, setRefreshing] = useState(false);
  const address = wallet?.address ?? "Wallet unavailable";

  async function retryWallet() {
    setRefreshing(true);
    setError(null);
    try { setWallet(await apiRequest<WalletDetails>("wallet")); }
    catch { setError("Wallet details are unavailable. Try again when your connection is restored."); }
    finally { setRefreshing(false); }
  }

  useEffect(() => {
    apiRequest<WalletDetails>("wallet")
      .then(setWallet)
      .catch((requestError: unknown) => {
        setError(requestError instanceof Error ? requestError.message : "WALLET_UNAVAILABLE");
      });
  }, []);

  async function refreshBalance() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const refreshed = await postJson<
        Pick<WalletSummary, "cashRaw" | "reconciliationRequiredAssets"> &
          { pendingReconciliation: boolean }
      >("wallet/refresh", {});
      setWallet((current) => current ? { ...current, ...refreshed } : current);
      setRefreshPending(refreshed.pendingReconciliation);
      setMessage(walletRefreshMessage(refreshed.pendingReconciliation));
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "WALLET_REFRESH_UNAVAILABLE");
    } finally { setRefreshing(false); }
  }

  async function copyAddress() {
    if (!wallet?.address) return;
    try {
      await navigator.clipboard.writeText(address);
      setRefreshPending(false);
      setMessage("Magic wallet address copied.");
    } catch {
      setRefreshPending(false);
      setMessage("Clipboard permission was blocked. Select and copy the address manually.");
    }
  }

  if (deposit) {
    return (
      <>
        <PageIntro eyebrow="Deposit instructions" title="Deposit USDC on Solana">
          <p>
            Deposits are disabled until live-money activation.
          </p>
        </PageIntro>
        <div className="notice">
          Wrong-network or noncanonical tokens may be unrecoverable in a live wallet. Deposits are
          public onchain and are not purchases.
        </div>
        <Card className="section">
          <dl className="facts">
            <div>
              <dt>Funding status</dt>
              <dd>Not activated</dd>
            </div>
            <div>
              <dt>Network</dt>
              <dd>{wallet?.network ?? "Solana"}</dd>
            </div>
            <div>
              <dt>Asset</dt>
              <dd>USDC deposits disabled</dd>
            </div>
            <div>
              <dt>Deposit instructions</dt>
              <dd>Withheld while deposits are disabled</dd>
            </div>
          </dl>
          <div className="actions">
            <button data-cta="C54" disabled aria-describedby="deposit-gate">
              Deposits unavailable
            </button>
            <CtaLink id="C56" href="/account/wallet" secondary>
              Return to Wallet
            </CtaLink>
          </div>
          <p id="deposit-gate" className="hint">Do not send funds. Identity verification does not activate funding. No deposit address or QR code is provided until that capability is enabled.</p>
          <ErrorMessage message={error} />
          {message ? refreshPending
            ? <div className="notice" role="status" aria-live="polite">{message}</div>
            : <ResultMessage>{message}</ResultMessage> : null}
        </Card>
      </>
    );
  }

  return (
    <>
      <PageIntro eyebrow="Wallet" title="Cash and received assets">
        <p>
          Shelf-origin investments appear in Portfolio. Supported assets received from elsewhere
          stay separate here.
        </p>
      </PageIntro>
      <div className="research-split">
        <Card>
          <h2>USDC balance</h2>
          {wallet ? <dl className="facts"><div><dt>Tracked balance</dt><dd>{formatRaw(wallet.cashRaw)} USDC</dd></div><div><dt>Reserved</dt><dd>{formatRaw(wallet.reservedRaw)} USDC</dd></div><div><dt>Spending status</dt><dd>{wallet.reconciliationRequiredAssets.length ? "Reconciliation required" : "Financial execution disabled"}</dd></div></dl> : <p role="status">{error ? "Balance unavailable. No amount is assumed." : "Loading wallet balance…"}</p>}
          <p className="muted">Tracked balances are not a live spending authorization. Deposits remain disabled.</p>
        </Card>
        <Card>
          <p className="eyebrow">Embedded wallet</p>
          <h2>Magic · Solana</h2>
          <p className="breakable-code">{address}</p>
          <button className="secondary" disabled={!wallet?.address} onClick={copyAddress}>Copy wallet address</button>
          <p className="hint">For identification only, not deposit instructions. Activity on Solana is public.</p>
        </Card>
      </div>
      <div className="section actions">
        <CtaLink id="C51" href="/account/wallet/deposit">
          View funding status
        </CtaLink>
        <CtaLink id="C52" href="/account/wallet/send" secondary>
          Send USDC
        </CtaLink>
        <button className="secondary" data-cta="C53" disabled={refreshing || !wallet} onClick={refreshBalance}>
          {refreshing ? "Refreshing…" : "Refresh balance"}
        </button>
      </div>
      <section className="research-section"><h2>Assets received outside Shelf</h2><p>These assets were not bought through Shelf and are separate from Portfolio holdings.</p>
        {wallet?.externalInventory ? wallet.externalInventory.length ? <div className="research-rows">{wallet.externalInventory.map((holding) => <div className="research-row" key={holding.instrumentId}><div><h3>{holding.symbol}</h3><p>{formatRaw(holding.externalRaw, holding.decimals)} units · external balance</p><p className="hint">Instrument: {holding.instrumentId}</p></div><CtaLink id={`external-${holding.instrumentId}`} href={`/account/wallet/send?asset=${encodeURIComponent(holding.instrumentId)}&scope=external`} secondary>Review sending {holding.symbol}</CtaLink></div>)}</div> : <p className="muted">No supported external assets in the latest wallet summary.</p> : <p className="muted">External inventory unavailable. No balance is assumed.</p>}
        <CtaLink id="wallet-portfolio" href="/portfolio" secondary>View Shelf-origin holdings</CtaLink>
      </section>
      {wallet?.reconciliationRequiredAssets.length ? (
        <div className="notice" role="alert">
          One or more asset balances need reconciliation. Shelf is showing the last known tracked
          amounts and has blocked spending those assets until their finalized history is resolved.
        </div>
      ) : null}
      <ErrorMessage message={error} />
      {error && !wallet ? <button className="secondary" disabled={refreshing} onClick={retryWallet}>Retry wallet details</button> : null}
      {message ? refreshPending
        ? <div className="notice" role="status" aria-live="polite">{message}</div>
        : <ResultMessage>{message}</ResultMessage> : null}
    </>
  );
}

export function SettingsScreen({ supportContact }: { supportContact?: string }) {
  const router = useRouter();
  const [section, setSection] = useState<"Profile" | "Privacy" | "Security" | "Sessions">("Profile");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checkingSignature, setCheckingSignature] = useState(false);
  const [signingChallenge, setSigningChallenge] = useState<WalletSigningChallenge>();
  const [account, setAccount] = useState<AccountSummary>();
  const [pendingAction, setPendingAction] = useState(false);
  const [acknowledgeDeletion, setAcknowledgeDeletion] = useState(false);
  const [acknowledgeWallet, setAcknowledgeWallet] = useState(false);

  async function runAccountAction(action: () => Promise<void>) {
    if (pendingAction) return;
    setPendingAction(true);
    setError(null);
    setMessage("");
    try { await action(); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "This account action could not be completed. Try again."); }
    finally { setPendingAction(false); }
  }

  useEffect(() => {
    apiRequest<AccountSummary>("me")
      .then(setAccount)
      .catch((requestError: unknown) => {
        setError(requestError instanceof Error ? requestError.message : "ACCOUNT_UNAVAILABLE");
      });
  }, []);

  async function downloadExport() {
    const exportData = await freshApiRequest("account/export", "account_export");
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "shelf-account-export.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function prepareWalletSignatureCheck() {
    setCheckingSignature(true);
    setError(null);
    setMessage("");
    try {
      const walletAddress = await magicSolanaWalletAddress();
      const challenge = await postJson<WalletSigningChallenge>("wallet/signing-challenge", {
        walletAddress,
      });
      setSigningChallenge(challenge);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "WALLET_SIGNING_CHECK_FAILED",
      );
    } finally {
      setCheckingSignature(false);
    }
  }

  async function approveWalletSignatureCheck() {
    if (!signingChallenge) return;
    setCheckingSignature(true);
    setError(null);
    try {
      const signedTransactionBase64 = await signMagicSolanaProof(signingChallenge);
      const result = await postJson<WalletSigningVerification>(
        "wallet/verify-signing",
        { challengeId: signingChallenge.challengeId, signedTransactionBase64 },
      );
      setSigningChallenge(undefined);
      setMessage(
        `Magic verified control of this ${result.network} wallet. Nothing was broadcast and no funds moved.`,
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "WALLET_SIGNING_CHECK_FAILED",
      );
    } finally {
      setCheckingSignature(false);
    }
  }

  async function cancelWalletSignatureCheck() {
    if (!signingChallenge) return;
    setCheckingSignature(true);
    setError(null);
    try {
      await postJson("wallet/cancel-signing", { challengeId: signingChallenge.challengeId });
      setSigningChallenge(undefined);
      setMessage("Signing check cancelled. Magic was not asked to sign and nothing was broadcast.");
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "WALLET_SIGNING_CANCEL_FAILED",
      );
    } finally {
      setCheckingSignature(false);
    }
  }

  async function signOut() {
    await apiRequest("auth/session", { method: "DELETE" });
    try {
      await signOutMagicBrowser();
    } finally {
      router.replace("/sign-in");
      router.refresh();
    }
  }

  async function copyOwnerBindingId() {
    if (!account?.ownerBindingId) return;
    await navigator.clipboard.writeText(account.ownerBindingId);
    setMessage("Owner binding ID copied. Store it as OWNER_MAGIC_ISSUER in Vercel.");
  }

  async function signOutEverywhere() {
    await freshPostJson("auth/logout-all", "logout_all", {
      reason: "User requested sign-out everywhere",
    });
    try {
      await signOutMagicBrowser();
    } finally {
      router.replace("/sign-in");
      router.refresh();
    }
  }

  async function requestDeletion() {
    if (!acknowledgeDeletion || !acknowledgeWallet) return;
    await freshPostJson("account/deletion", "account_deletion", {
      acknowledgeChainPermanence: true,
      acknowledgeWalletIndependence: true,
    });
    setMessage(
      "Shelf profile data was deleted. Required financial records remain, and the wallet and public chain are not deleted.",
    );
  }

  return (
    <div className="platform-canvas settings-workspace">
      <header className="settings-masthead"><h1>Account</h1><p>Your identity. Your controls.</p></header>
      <div className="settings-body">
      <nav className="settings-navigation" aria-label="Account categories">
        {(["Profile", "Privacy", "Security", "Sessions"] as const).map((item) => <button key={item} aria-pressed={section === item} disabled={pendingAction || checkingSignature || Boolean(signingChallenge)} onClick={() => setSection(item)}>{item}<span aria-hidden="true">↗</span></button>)}
        <Link href="/account/wallet">Wallet <span aria-hidden="true">↗</span></Link>
      </nav>
      <div className="settings-content">
      <div hidden={section !== "Profile"}>
        <Card>
          <p className="platform-label">Your Shelf identity</p>
          <h2>Profile</h2>
          <p>
            {account ? `Magic identity · ${account.email ?? "Email unavailable"}` : error ? "Account details unavailable" : "Loading account details…"}
          </p>
          {account?.walletAddress ? <div className="settings-wallet-identity"><span>Linked Solana wallet</span><p className="breakable-code">{account.walletAddress}</p></div> : null}
          <CtaLink id="account-wallet" href="/account/wallet" secondary>Manage Wallet</CtaLink>
          {account?.ownerBindingId ? (
            <details>
              <summary>Production owner setup</summary>
              <p className="muted">
                This stable Magic identity identifier grants no wallet access. Store it as the
                sensitive Vercel variable <code>OWNER_MAGIC_ISSUER</code> to bind this account to
                the Shelf owner console.
              </p>
              <code className="breakable-code">{account.ownerBindingId}</code>
              <div className="actions">
                <button className="secondary" disabled={pendingAction} onClick={() => void runAccountAction(copyOwnerBindingId)}>
                  Copy owner binding ID
                </button>
              </div>
            </details>
          ) : null}
          <p className="muted">Wallet replacement and identity merging are unavailable.</p>
        </Card>
      </div>
      <div hidden={section !== "Privacy"}>
        <Card>
          <p className="platform-label">Privacy & retention</p>
          <h2>Data controls</h2>
          <p>Images, raw receipt text and chat transcripts are not retained by Shelf.</p>
          <p className="muted">Export requires fresh authentication. Financial records subject to retention are separate from research data.</p>
          <button data-cta="C95" disabled={pendingAction || !account} onClick={() => void runAccountAction(downloadExport)}>Export my data</button>
        </Card>
        <details className="settings-deletion"><summary>Delete Shelf account</summary><div className="stack">
          <p>Deletion removes eligible Shelf profile data. Required financial records are retained. It does not delete your Magic wallet or public blockchain activity.</p>
          <label><input type="checkbox" checked={acknowledgeDeletion} onChange={(event) => setAcknowledgeDeletion(event.target.checked)} /> I understand that public blockchain activity and required records remain.</label>
          <label><input type="checkbox" checked={acknowledgeWallet} onChange={(event) => setAcknowledgeWallet(event.target.checked)} /> I understand that my wallet is independent and will not be deleted.</label>
          <button className="secondary" data-cta="C96" disabled={pendingAction || !account || !acknowledgeDeletion || !acknowledgeWallet} onClick={() => void runAccountAction(requestDeletion)}>Authenticate and delete Shelf account</button>
        </div></details>
      </div>
      <div hidden={section !== "Security"}>
        {account?.identityProvider === "magic" ? (
          <Card>
            <p className="platform-label">Security / proof of control</p>
            <h2>Wallet signing</h2>
            <p>
              Confirm that Magic can sign with your linked Solana wallet. This check is never
              broadcast and cannot move funds.
            </p>
            {signingChallenge ? (
              <div className="stack" role="region" aria-label="Review wallet signing check">
                <p>
                  <strong>Review before signing</strong>
                </p>
                <p className="muted">
                  Network: {signingChallenge.network}
                </p>
                <p className="breakable-code">Wallet: {signingChallenge.walletAddress}</p>
                <p className="muted">
                  Purpose: prove control of this wallet. This transaction contains only a memo,
                  will not be broadcast, and cannot move funds.
                </p>
                <div className="actions">
                  <button disabled={checkingSignature} onClick={approveWalletSignatureCheck}>
                    {checkingSignature ? "Signing…" : "Approve and sign"}
                  </button>
                  <button
                    className="secondary"
                    disabled={checkingSignature}
                    onClick={cancelWalletSignatureCheck}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button disabled={checkingSignature} onClick={prepareWalletSignatureCheck}>
                {checkingSignature ? "Preparing…" : "Check wallet signing"}
              </button>
            )}
          </Card>
        ) : <p>Wallet signing checks require your linked Magic identity. {account ? "This account does not have an available signing check." : "Account details are still loading."}</p>}
      </div>
      <section hidden={section !== "Sessions"} className="settings-sessions"><p className="platform-label">Access & recovery</p><h2>Sessions & support</h2><p>Signing out all sessions requires fresh authentication. Your linked wallet remains independent of your Shelf session.</p><div className="actions">
        <button className="secondary" data-cta="C97" disabled={pendingAction} onClick={() => void runAccountAction(signOut)}>
          Sign out
        </button>
        <button className="secondary" data-cta="C98" disabled={pendingAction || !account} onClick={() => void runAccountAction(signOutEverywhere)}>
          Sign out all sessions
        </button>
        <SupportAction id="C99" contact={supportContact}>
          Get support
        </SupportAction>
      </div></section>
      {pendingAction ? <p role="status">Completing account action…</p> : null}
      {message ? <ResultMessage>{message}</ResultMessage> : null}
      <ErrorMessage message={error} />
      <footer className="settings-footer"><span>Shelf data is private by default.</span><p>Standard Solana activity remains public. Your provider-managed wallet is independent of your Shelf account.</p></footer>
      </div>
      </div>
    </div>
  );
}
