"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
  returnPath = "/welcome",
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
      const challenge = await createLoginChallenge(returnPath);
      if (method === "email") {
        const didToken = await signInWithMagicEmail(email, challenge.challengeId);
        await createShelfSession(challenge.challengeId, didToken, method);
        router.push(challenge.returnPath as Route);
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
      <PageIntro eyebrow="Sign in" title="Keep your discoveries and access your wallet">
        <p>
          Use email or Google to access the same Magic-managed account and embedded Solana wallet.
        </p>
      </PageIntro>
      <Card className="stack">
        <Field label="Email address" htmlFor="email">
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <button
          data-cta="C43"
          disabled={loading || !email.includes("@")}
          onClick={() => signIn("email")}
        >
          {loading ? "Connecting…" : "Continue with email"}
        </button>
        <button
          className="secondary"
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
      </Card>
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
        router.replace(challenge.returnPath as Route);
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
  const [terms, setTerms] = useState(false);
  const [adult, setAdult] = useState(false);
  const [merged, setMerged] = useState(false);

  async function mergeGuestShelf() {
    const productIds = JSON.parse(sessionStorage.getItem("shelf:guest-items") ?? "[]") as string[];
    await postJson("shelf/merge", { mergeId: crypto.randomUUID(), productIds });
    setMerged(true);
    sessionStorage.removeItem("shelf:guest-items");
  }

  return (
    <>
      <PageIntro eyebrow="Welcome" title="Your Shelf account is ready">
        <p>
          Account creation and beta financial access are separate. Live funding stays unavailable
          while provider and policy gates are open.
        </p>
      </PageIntro>
      <Card className="stack">
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
        <CtaLink
          id="C47"
          href={terms && adult ? "/onboarding/availability" : "/onboarding"}
        >
          Continue
        </CtaLink>
        <button className="secondary" data-cta="C48" onClick={mergeGuestShelf}>
          Save my discoveries
        </button>
        <CtaLink id="C49" href="/" secondary>
          Skip for now
        </CtaLink>
        {merged ? (
          <ResultMessage>Your previously saved guest products were merged once.</ResultMessage>
        ) : null}
      </Card>
    </>
  );
}

export function EligibilityScreen() {
  const [country, setCountry] = useState("");
  const [adult, setAdult] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function checkEligibility() {
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
          ? `Allowed by policy ${response.policyVersion}.`
          : "Financial capabilities are unavailable. You can continue learning.",
      );
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Eligibility check failed");
    }
  }

  return (
    <>
      <PageIntro
        eyebrow="Financial availability"
        title="Check before viewing funding or trading controls"
      >
        <p>
          Global access to education does not establish that stock-token distribution is allowed
          everywhere. This prototype does not collect identity documents.
        </p>
      </PageIntro>
      <Card className="stack">
        <Field label="Country of residence" htmlFor="country">
          <select id="country" value={country} onChange={(event) => setCountry(event.target.value)}>
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
            onChange={(event) => setAdult(event.target.checked)}
          />{" "}
          I confirm I am an adult.
        </label>
        <button data-cta="C50" disabled={!country || !adult} onClick={checkEligibility}>
          Check availability
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
  const [wallet, setWallet] = useState<WalletSummary>();
  const address = wallet?.address ?? "Wallet unavailable";

  useEffect(() => {
    apiRequest<WalletSummary>("wallet")
      .then(setWallet)
      .catch((requestError: unknown) => {
        setError(requestError instanceof Error ? requestError.message : "WALLET_UNAVAILABLE");
      });
  }, []);

  async function refreshBalance() {
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
    }
  }

  async function copyAddress() {
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
              <dt>Environment</dt>
              <dd>Magic identity integration</dd>
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
              <dt>Wallet address</dt>
              <dd>{address}</dd>
            </div>
          </dl>
          <div className="actions">
            <button data-cta="C54" onClick={copyAddress}>
              Copy address
            </button>
            <button className="secondary" data-cta="C55" onClick={refreshBalance}>
              I’ve sent USDC
            </button>
            <CtaLink id="C56" href="/invest/pepsico" secondary>
              Return to purchase
            </CtaLink>
          </div>
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
      <div className="grid">
        <Card>
          <p className="eyebrow">Funding status</p>
          <h2>Deposits disabled</h2>
          <p className="muted">Identity and wallet binding are active; no funds are accepted yet.</p>
        </Card>
        <Card>
          <p className="eyebrow">Embedded wallet</p>
          <h2>Magic · Solana</h2>
          <p className="muted">{address}</p>
        </Card>
      </div>
      <div className="section actions">
        <CtaLink id="C51" href="/account/wallet/deposit">
          Deposit USDC
        </CtaLink>
        <CtaLink id="C52" href="/account/wallet/send" secondary>
          Send USDC
        </CtaLink>
        <button className="secondary" data-cta="C53" onClick={refreshBalance}>
          Refresh balance
        </button>
      </div>
      {wallet?.reconciliationRequiredAssets.length ? (
        <div className="notice" role="alert">
          One or more asset balances need reconciliation. Shelf is showing the last known tracked
          amounts and has blocked spending those assets until their finalized history is resolved.
        </div>
      ) : null}
      <ErrorMessage message={error} />
      {message ? refreshPending
        ? <div className="notice" role="status" aria-live="polite">{message}</div>
        : <ResultMessage>{message}</ResultMessage> : null}
    </>
  );
}

export function SettingsScreen({ supportContact }: { supportContact?: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checkingSignature, setCheckingSignature] = useState(false);
  const [signingChallenge, setSigningChallenge] = useState<WalletSigningChallenge>();
  const [account, setAccount] = useState<AccountSummary>();

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
    await freshPostJson("account/deletion", "account_deletion", {
      acknowledgeChainPermanence: true,
      acknowledgeWalletIndependence: true,
    });
    setMessage(
      "Shelf profile data was deleted. Required financial records remain, and the wallet and public chain are not deleted.",
    );
  }

  return (
    <>
      <PageIntro eyebrow="Settings and privacy" title="Your account, data and recovery">
        <p>
          Shelf data is private by default. Standard Solana activity remains public, and deleting
          Shelf does not destroy a provider-managed wallet.
        </p>
      </PageIntro>
      <div className="grid">
        <Card>
          <h2>Account</h2>
          <p>
            Magic identity · {account?.email ?? "email unavailable"}
          </p>
          {account?.walletAddress ? <p className="muted">{account.walletAddress}</p> : null}
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
                <button className="secondary" onClick={copyOwnerBindingId}>
                  Copy owner binding ID
                </button>
              </div>
            </details>
          ) : null}
          <p className="muted">Wallet replacement and identity merging are unavailable.</p>
        </Card>
        <Card>
          <h2>Data controls</h2>
          <p>Images, raw receipt text and chat transcripts are not retained by Shelf.</p>
        </Card>
        {account?.identityProvider === "magic" ? (
          <Card>
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
                  Network: {signingChallenge.network} · Wallet: {signingChallenge.walletAddress}
                </p>
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
        ) : null}
      </div>
      <div className="section actions">
        <button data-cta="C95" onClick={downloadExport}>
          Export my data
        </button>
        <button className="secondary" data-cta="C96" onClick={requestDeletion}>
          Delete my Shelf account
        </button>
        <button className="secondary" data-cta="C97" onClick={signOut}>
          Sign out
        </button>
        <button className="secondary" data-cta="C98" onClick={signOutEverywhere}>
          Sign out all sessions
        </button>
        <SupportAction id="C99" contact={supportContact}>
          Get support
        </SupportAction>
      </div>
      {message ? <ResultMessage>{message}</ResultMessage> : null}
      <ErrorMessage message={error} />
    </>
  );
}
