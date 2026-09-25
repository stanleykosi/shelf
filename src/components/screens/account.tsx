"use client";

import Link from "next/link";
import { useNotification } from "@/components/notifications";
import {
  ArrowDownLeftIcon, ArrowPathIcon, ArrowRightIcon, ArrowUpRightIcon,
  BookmarkIcon, ChevronDownIcon, CircleStackIcon, GlobeAltIcon,
  LockClosedIcon, ShieldCheckIcon, SparklesIcon, UserCircleIcon, WalletIcon,
  ComputerDesktopIcon, ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { CopyButton } from "@/components/copy-button";
import { LoadingStatus, PendingButton } from "@/components/loading-feedback";
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
  const [signInMethod, setSignInMethod] = useState<"email" | "google">("email");

  async function signIn(method: "email" | "google") {
    if (loading) return;
    setSignInMethod(method);
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
    <div className="access-studio">
      <aside className="access-story">
        <div className="account-small-label"><span className="account-status-dot" /> Your discoveries, connected</div>
        <div className="access-art" aria-hidden="true">
          <div className="access-art-card access-art-back"><BookmarkIcon /><span>Your ideas.</span></div>
          <div className="access-art-card access-art-front"><span className="access-art-wordmark">shelf<span>®</span></span><div><span>One private space.</span><strong>A world of possibilities.</strong></div><SparklesIcon /></div>
        </div>
        <h2>Curiosity looks<br />good on you.</h2>
        <p>Keep the products, companies, and ideas that caught your eye. Pick up wherever inspiration finds you.</p>
        <div className="access-story-footer"><ShieldCheckIcon /><span>Private research. Always in your control.</span></div>
      </aside>
      <section className="access-form-panel">
        <PageIntro eyebrow="Welcome to Shelf" title="Continue your research.">
          <p>A little curiosity goes a long way. Save yours.</p>
        </PageIntro>
        <form className="stack access-form" onSubmit={(event) => { event.preventDefault(); if (!loading && email.includes("@")) void signIn("email"); }}>
          <Field label="Email address" htmlFor="email">
            <input id="email" type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>
          <PendingButton pending={loading && signInMethod === "email"} pendingLabel="Connecting…" data-cta="C43" disabled={loading || !email.includes("@")} type="submit">Continue with email</PendingButton>
          <div className="access-divider"><span>or</span></div>
          <PendingButton pending={loading && signInMethod === "google"} pendingLabel="Connecting…" className="secondary" type="button" data-cta="C44" disabled={loading} onClick={() => signIn("google")}>Continue with Google</PendingButton>
          <ErrorMessage message={error} />
        </form>
        <p className="access-guest">Just exploring? <Link href="/" data-cta="C45">Continue as guest <ArrowRightIcon /></Link></p>
        <div className="access-trust"><LockClosedIcon /><p>Signing in does not place an order or enable financial access. Magic manages your sign-in and linked Solana wallet. Shelf never holds your signing keys.</p></div>
        <details className="access-help"><summary>Need a hand?</summary><SupportAction id="C46" contact={supportContact}>Get sign-in help</SupportAction></details>
      </section>
    </div>
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
          <LoadingStatus>Verifying your account…</LoadingStatus>
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
        <p>A home for your next discovery. Let’s finish a couple of small things before you settle in.</p>
      </PageIntro>
      <div className="research-split onboarding-studio"><section className="research-section stack onboarding-card">
        <span className="onboarding-step">01 <span>A quick introduction</span></span>
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
      </section><section className="research-section stack onboarding-card onboarding-discoveries"><span className="onboarding-step">02 <span>Bring your ideas along</span></span><h2>Keep your discoveries</h2>
        <p>{guestIds.length ? `${guestIds.length} reviewed Products saved in this browser session.` : "No temporary discoveries to merge."}</p>
        {guestIds.length ? <ul>{guestIds.map((id) => <li key={id}>{productById(id)?.name}</li>)}</ul> : null}
        <PendingButton pending={merging} pendingLabel="Saving discoveries…" className="secondary" data-cta="C48" disabled={!guestIds.length || merging || merged} onClick={mergeGuestShelf}>{merged ? "Discoveries saved" : "Save my discoveries"}</PendingButton>
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
      <Card className="stack research-reading availability-card">
        <div className="account-symbol"><GlobeAltIcon /></div>
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
        <PendingButton pending={checking} pendingLabel="Checking availability…" data-cta="C50" disabled={!country || !adult || checking} onClick={checkEligibility}>
          Check availability
        </PendingButton>
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
  const notify = useNotification();
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
      const refreshMessage = walletRefreshMessage(refreshed.pendingReconciliation);
      setMessage(refreshed.pendingReconciliation ? refreshMessage : "");
      if (!refreshed.pendingReconciliation) notify(refreshMessage, "success");
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "WALLET_REFRESH_UNAVAILABLE");
    } finally { setRefreshing(false); }
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
    <div className="wallet-studio">
      <header className="account-page-heading">
        <div><p className="eyebrow">Your wallet</p><h1>Cash and received assets</h1><p>A clear view of your cash, your address, and what’s available.</p></div>
        <Link className="account-text-link" href="/portfolio">View Portfolio <ArrowUpRightIcon /></Link>
      </header>
      <div className="wallet-dashboard">
        <section className="wallet-balance-panel" aria-labelledby="wallet-balance-title">
          <div className="wallet-panel-top"><span className="account-small-label"><CircleStackIcon /> USDC · Solana</span><span className="wallet-status-badge"><LockClosedIcon /> Funding not activated</span></div>
          <h2 id="wallet-balance-title">USDC balance</h2>
          {wallet ? <div className="wallet-balance-amount"><strong>{formatRaw(wallet.cashRaw)}</strong><span>USDC</span></div> : error ? <p role="status">Balance unavailable. No amount is assumed.</p> : <LoadingStatus>Loading wallet balance…</LoadingStatus>}
          <p className="wallet-balance-caption">Tracked balance · {wallet ? `${formatRaw(wallet.reservedRaw)} USDC reserved` : "Awaiting wallet details"}</p>
          <div className="wallet-action-bar">
            <Link className="button" data-cta="C51" href="/account/wallet/deposit"><ArrowDownLeftIcon /> View funding status</Link>
            <Link className="button secondary" data-cta="C52" href="/account/wallet/send" scroll={false}><ArrowUpRightIcon /> Send USDC</Link>
            <PendingButton pending={refreshing} pendingLabel="Refreshing…" className="secondary wallet-refresh" data-cta="C53" disabled={refreshing || !wallet} onClick={refreshBalance} icon={<ArrowPathIcon />}>Refresh balance</PendingButton>
          </div>
          <div className="wallet-balance-note"><ShieldCheckIcon /><p>Tracked balances are not a live spending authorization. Deposits remain disabled.</p></div>
        </section>
        <aside className="wallet-identity-panel">
          <div className="wallet-identity-top"><div className="account-symbol"><WalletIcon /></div><span className="account-network"><span />Solana</span></div>
          <p className="eyebrow">Linked wallet</p><h2>Yours to control.</h2>
          <p className="wallet-provider">Managed by Magic. Connected to Shelf.</p>
          <div className="account-address-row"><code>{address}</code><CopyButton value={wallet?.address ?? ""} label="Copy wallet address" copiedLabel="Wallet address copied" /></div>
          <p className="hint">For identification only, not deposit instructions. Activity on Solana is public.</p>
          <Link className="account-text-link" href="/account">Account & security <ArrowRightIcon /></Link>
        </aside>
      </div>
      {wallet?.reconciliationRequiredAssets.length ? (
        <div className="notice" role="alert">One or more asset balances need reconciliation. Shelf is showing the last known tracked amounts and has blocked spending those assets until their finalized history is resolved.</div>
      ) : null}
      <ErrorMessage message={error} />
      {error && !wallet ? <button className="secondary" disabled={refreshing} onClick={retryWallet}>Retry wallet details</button> : null}
      {message ? refreshPending ? <div className="notice" role="status" aria-live="polite">{message}</div> : <ResultMessage>{message}</ResultMessage> : null}
      <section className="wallet-inventory">
        <div className="account-section-heading"><div><p className="eyebrow">Beyond your Shelf</p><h2>Assets received outside Shelf</h2></div>{wallet?.externalInventory ? <span className="account-count">{wallet.externalInventory.length} assets</span> : null}</div>
        <p className="muted">These assets were not bought through Shelf and are separate from Portfolio holdings.</p>
        {wallet?.externalInventory ? wallet.externalInventory.length ? <div className="wallet-asset-list">{wallet.externalInventory.map((holding) => <div className="wallet-asset-row" key={holding.instrumentId}><span className="wallet-asset-monogram" aria-hidden="true">{holding.symbol.slice(0, 1)}</span><div><h3>{holding.symbol}</h3><span>External balance</span></div><strong>{formatRaw(holding.externalRaw, holding.decimals)} <span>units</span></strong><CtaLink id={`external-${holding.instrumentId}`} href={`/account/wallet/send?asset=${encodeURIComponent(holding.instrumentId)}&scope=external`} secondary>Review sending {holding.symbol} <ArrowUpRightIcon /></CtaLink></div>)}</div> : <div className="wallet-empty"><div className="account-symbol"><CircleStackIcon /></div><div><h3>Nothing received yet.</h3><p>No supported external assets in the latest wallet summary. Your Shelf-origin investments live in Portfolio.</p></div><Link className="account-text-link" href="/portfolio">View Portfolio <ArrowUpRightIcon /></Link></div> : <p className="muted">External inventory unavailable. No balance is assumed.</p>}
      </section>
      <details className="account-disclosure wallet-tracking"><summary><span><ShieldCheckIcon /> Balance details & tracking</span><ChevronDownIcon /></summary><div><p>Supported assets received from elsewhere stay separate here. Shelf-origin investments appear in Portfolio.</p><dl className="facts"><div><dt>Reserved</dt><dd>{wallet ? `${formatRaw(wallet.reservedRaw)} USDC` : "Unavailable"}</dd></div><div><dt>Spending status</dt><dd>{wallet?.reconciliationRequiredAssets.length ? "Reconciliation required" : "Financial execution disabled"}</dd></div><div><dt>Network</dt><dd>{wallet?.network ?? "Solana"}</dd></div></dl></div></details>
    </div>
  );
}

export function SettingsScreen({ supportContact }: { supportContact?: string }) {
  const router = useRouter();
  const [section, setSection] = useState<"Profile" | "Privacy" | "Security" | "Sessions">("Profile");
  const setMessage = useNotification();
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

  const accountSections = [
    { name: "Profile", icon: UserCircleIcon, description: "Identity & wallet" },
    { name: "Privacy", icon: LockClosedIcon, description: "Your data, your choice" },
    { name: "Security", icon: ShieldCheckIcon, description: "Wallet verification" },
    { name: "Sessions", icon: ComputerDesktopIcon, description: "Access & support" },
  ] as const;

  return (
    <div className="platform-canvas settings-workspace account-studio">
      <header className="account-page-heading"><div><p className="eyebrow">Your corner of Shelf</p><h1>Account</h1><p>Make yourself at home. You’re in control here.</p></div><span className="account-private-label"><LockClosedIcon /> Private by default</span></header>
      <div className="settings-body">
      <aside className="account-sidebar">
        <div className="account-identity"><span className="account-avatar">{account?.email?.slice(0, 1).toUpperCase() ?? <UserCircleIcon />}</span><strong>Your Shelf</strong><span>{account?.email ?? "Your private account"}</span></div>
        <nav className="settings-navigation" aria-label="Account categories">
          {accountSections.map(({ name, icon: Icon, description }) => <button key={name} aria-label={name} aria-pressed={section === name} disabled={pendingAction || checkingSignature || Boolean(signingChallenge)} onClick={() => setSection(name)}><Icon aria-hidden="true" /><span>{name}<small>{description}</small></span><ArrowRightIcon aria-hidden="true" /></button>)}
          <Link href="/account/wallet"><WalletIcon aria-hidden="true" /><span>Wallet<small>Cash & received assets</small></span><ArrowUpRightIcon aria-hidden="true" /></Link>
        </nav>
        <div className="account-sidebar-note"><ShieldCheckIcon /><p>One identity.<br />A private space to explore.</p></div>
      </aside>
      <div className="settings-content">
      <div hidden={section !== "Profile"}>
        <Card>
          <div className="account-panel-heading"><div><p className="platform-label">The essentials</p><h2>Profile</h2></div><div className="account-symbol"><UserCircleIcon /></div></div>
          <p className="account-panel-lede">Your identity connects everything you discover on Shelf.</p>
          {account ? <dl className="account-profile-facts"><div><dt>Email address</dt><dd>{account.email ?? "Email unavailable"}</dd></div><div><dt>Sign-in provider</dt><dd>Magic <span className="account-inline-badge">{account.authMethod === "google" ? "Google" : account.authMethod === "email" ? "Email" : "Linked identity"}</span></dd></div></dl>
            : error ? <p>Account details unavailable</p>
            : <LoadingStatus>Loading account details…</LoadingStatus>}
          {account?.walletAddress ? <section className="settings-wallet-identity"><div className="account-section-heading"><span><WalletIcon /> Linked Solana wallet</span><span className="account-network"><span /> Solana</span></div><div className="account-address-row"><code>{account.walletAddress}</code><CopyButton value={account.walletAddress} label="Copy linked Solana wallet address" copiedLabel="Linked wallet address copied" /></div><div className="account-linked-footer"><span>Managed by Magic. Your keys stay with your provider.</span><Link data-cta="account-wallet" href="/account/wallet">Manage Wallet <ArrowUpRightIcon /></Link></div></section> : <CtaLink id="account-wallet" href="/account/wallet" secondary>Manage Wallet</CtaLink>}
          {account?.ownerBindingId ? (
            <details className="account-disclosure account-owner-setup">
              <summary><span>Production owner setup</span><ChevronDownIcon /></summary>
              <p className="muted">
                This stable Magic identity identifier grants no wallet access. Store it as the
                sensitive Vercel variable <code>OWNER_MAGIC_ISSUER</code> to bind this account to
                the Shelf owner console.
              </p>
              <code className="breakable-code">{account.ownerBindingId}</code>
              <div className="actions">
                <CopyButton value={account.ownerBindingId} label="Copy owner binding ID" copiedLabel="Owner binding ID copied" showLabel disabled={pendingAction} />
              </div>
            </details>
          ) : null}
          <p className="account-footnote"><LockClosedIcon /> Wallet replacement and identity merging are unavailable.</p>
        </Card>
      </div>
      <div hidden={section !== "Privacy"}>
        <Card>
          <div className="account-panel-heading"><div><p className="platform-label">Private by design</p><h2>Data controls</h2></div><div className="account-symbol"><LockClosedIcon /></div></div>
          <p className="account-panel-lede">Your curiosity belongs to you. Choose what you keep and what you take with you.</p>
          <div className="account-privacy-note"><ShieldCheckIcon /><div><strong>Research without a paper trail.</strong><p>Images, raw receipt text and chat transcripts are not retained by Shelf.</p></div></div>
          <div className="account-action-description"><h3>Take a copy with you</h3><p className="muted">Export requires fresh authentication. Financial records subject to retention are separate from research data.</p></div>
          <button data-cta="C95" disabled={pendingAction || !account} onClick={() => void runAccountAction(downloadExport)}>Export my data</button>
        </Card>
        <details className="settings-deletion account-disclosure"><summary><span>Delete Shelf account</span><ChevronDownIcon /></summary><div className="stack">
          <p>Deletion removes eligible Shelf profile data. Required financial records are retained. It does not delete your Magic wallet or public blockchain activity.</p>
          <label><input type="checkbox" checked={acknowledgeDeletion} onChange={(event) => setAcknowledgeDeletion(event.target.checked)} /> I understand that public blockchain activity and required records remain.</label>
          <label><input type="checkbox" checked={acknowledgeWallet} onChange={(event) => setAcknowledgeWallet(event.target.checked)} /> I understand that my wallet is independent and will not be deleted.</label>
          <button className="secondary" data-cta="C96" disabled={pendingAction || !account || !acknowledgeDeletion || !acknowledgeWallet} onClick={() => void runAccountAction(requestDeletion)}>Authenticate and delete Shelf account</button>
        </div></details>
      </div>
      <div hidden={section !== "Security"}>
        {account?.identityProvider === "magic" ? (
          <Card>
            <div className="account-panel-heading"><div><p className="platform-label">Peace of mind</p><h2>Wallet signing</h2></div><div className="account-symbol"><ShieldCheckIcon /></div></div>
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
                  <PendingButton pending={checkingSignature} pendingLabel="Signing…" disabled={checkingSignature} onClick={approveWalletSignatureCheck}>Approve and sign</PendingButton>
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
              <PendingButton pending={checkingSignature} pendingLabel="Preparing…" disabled={checkingSignature} onClick={prepareWalletSignatureCheck}>Check wallet signing</PendingButton>
            )}
          </Card>
        ) : <p>Wallet signing checks require your linked Magic identity. {account ? "This account does not have an available signing check." : "Account details are still loading."}</p>}
      </div>
      <section hidden={section !== "Sessions"} className="settings-sessions"><div className="account-panel-heading"><div><p className="platform-label">Access & recovery</p><h2>Sessions & support</h2></div><div className="account-symbol"><ComputerDesktopIcon /></div></div><p className="account-panel-lede">Stay connected on your terms.</p><p>Signing out all sessions requires fresh authentication. Your linked wallet remains independent of your Shelf session.</p><div className="actions">
        <button className="secondary" data-cta="C97" disabled={pendingAction} onClick={() => void runAccountAction(signOut)}>
          <ArrowRightOnRectangleIcon /> Sign out
        </button>
        <button className="secondary" data-cta="C98" disabled={pendingAction || !account} onClick={() => void runAccountAction(signOutEverywhere)}>
          Sign out all sessions
        </button>
        <SupportAction id="C99" contact={supportContact}>
          Get support
        </SupportAction>
      </div></section>
      {pendingAction ? <LoadingStatus>Completing account action…</LoadingStatus> : null}

      <ErrorMessage message={error} />
      <footer className="settings-footer"><span><LockClosedIcon /> Private by default</span><p>Standard Solana activity remains public. Your provider-managed wallet is independent of your Shelf account.</p></footer>
      </div>
      </div>
    </div>
  );
}
