"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { parseUsdc } from "@/domain/money";
import type { Order } from "@/domain/types";
import type { Company } from "@/domain/types";
import type { IssuerListing } from "@/domain/issuer-assets";
import { apiRequest, authenticationIsRequired, postJson } from "@/lib/api-client";
import { Card, EmptyState, ErrorMessage, Field, PageIntro, ResultMessage } from "@/components/ui";

type Source = "xstocks" | "prestocks";

function useIssuerAsset(provider: Source, symbol: string) {
  const [asset, setAsset] = useState<IssuerListing | null>(null);
  const [lifecycle, setLifecycle] = useState<NonNullable<Company["instrument"]>["lifecycle"]>();
  const [loadedKey, setLoadedKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const assetKey = `${provider}:${symbol}`;

  useEffect(() => {
    let active = true;
    apiRequest<{ listing: IssuerListing | null; lifecycle?: NonNullable<Company["instrument"]>["lifecycle"] }>(
      `issuer/asset/${provider}/${encodeURIComponent(symbol)}`,
    )
      .then(({ listing, lifecycle: currentLifecycle }) => {
        if (!active) return;
        setAsset(listing);
        setLifecycle(currentLifecycle);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Issuer feed unavailable");
      })
      .finally(() => {
        if (active) setLoadedKey(assetKey);
      });
    return () => { active = false; };
  }, [provider, symbol, assetKey]);

  return { asset, lifecycle, loading: loadedKey !== assetKey, error };
}

function issuerName(provider: Source) {
  return provider === "xstocks" ? "xStocks" : "PreStocks";
}

export function IssuerAssetScreen({ provider, symbol }: { provider: Source; symbol: string }) {
  const { asset: listing, lifecycle, loading, error } = useIssuerAsset(provider, symbol);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  if (loading) return <EmptyState title="Loading issuer asset">Checking the current feed.</EmptyState>;
  if (error) return <ErrorMessage message={error} />;
  if (!listing) return <EmptyState title="Asset unavailable">This token is not in the current issuer feed.</EmptyState>;

  const { asset } = listing;
  const publicAsset = listing.provider === "xstocks" ? listing.asset : null;
  const privateAsset = listing.provider === "prestocks" ? listing.asset : null;

  async function saveToWatchlist() {
    try {
      await postJson("watchlist/items", { companyId: asset.companyId });
      setSaveMessage("Saved to your private watchlist.");
      setSaveError(null);
    } catch (reason) {
      setSaveError(authenticationIsRequired(reason)
        ? "Sign in to save this asset to your private watchlist."
        : reason instanceof Error ? reason.message : "Could not save this asset");
    }
  }
  return (
    <>
      <PageIntro
        eyebrow={provider === "xstocks" ? "Public equity tracker · xStocks" : "Private company exposure · PreStocks"}
        title={asset.name}
      >
        <p>{asset.description || "Issuer description unavailable."}</p>
      </PageIntro>
      <div className="grid">
        {lifecycle ? <Card className="stack">
          <h2>{lifecycle.title}</h2>
          <p>{lifecycle.description}</p>
          {lifecycle.deadline ? <p>Deadline: {new Date(lifecycle.deadline).toLocaleString()}</p> : null}
          {lifecycle.successorSymbol ? <p>Successor symbol: {lifecycle.successorSymbol}</p> : null}
          <a href={lifecycle.sourceUrl} target="_blank" rel="noreferrer">Read issuer notice</a>
        </Card> : null}
        <Card className="stack">
          <h2>Issuer token</h2>
          <p><strong>Symbol:</strong> {asset.symbol}</p>
          <p><strong>Solana mint:</strong> <code className="break-all">{asset.mint}</code></p>
          <p><strong>Source:</strong> {issuerName(provider)} · observed {new Date(asset.observedAt).toLocaleString()}</p>
          <p className="muted">
            {provider === "xstocks"
              ? "Tracks a public security under the issuer’s terms; this token is not an ordinary voting share."
              : "Private company exposure under PreStocks terms, not ordinary shares. Liquidity and exit are not guaranteed."}
          </p>
          <a href={privateAsset?.issuerUrl ?? "https://xstocks.fi/"}
            target="_blank" rel="noreferrer">Read issuer information</a>
        </Card>
        <Card className="stack">
          <h2>{provider === "xstocks" ? "Public market" : "Private market"}</h2>
          {publicAsset ? (
            <>
              <p><strong>Underlying:</strong> {publicAsset.underlyingSymbol || "Unavailable"}</p>
              <p><strong>Exchange:</strong> {publicAsset.exchange}</p>
              <p><strong>Session:</strong> {publicAsset.marketOpen ? "open" : publicAsset.marketPeriod}</p>
              {publicAsset.nextChangeAt ? <p><strong>Next session change:</strong> {new Date(publicAsset.nextChangeAt).toLocaleString()}</p> : null}
              {publicAsset.tradingHalted ? <p className="notice">Issuer trading is halted.</p> : null}
            </>
          ) : privateAsset ? (
            <>
              <p><strong>Issuer mark:</strong> ${privateAsset.markPriceUsd}</p>
              <p><strong>Token reference:</strong> ${privateAsset.tokenPriceUsd}</p>
              <p><strong>Mark valuation:</strong> ${privateAsset.markValuationUsd}</p>
              <p><strong>Implied token valuation:</strong> ${privateAsset.impliedValuationUsd}</p>
              <p><strong>Issuer supply:</strong> {privateAsset.supplyUi} tokens</p>
              <p><strong>Market signal:</strong> {privateAsset.premiumLabel}</p>
            </>
          ) : null}
          <p className="muted">Jupiter provides the executable USDC route only after a fresh quote. The displayed issuer values are references.</p>
          <Link className="button" href={`/assets/${provider}/${encodeURIComponent(asset.symbol)}/buy` as Route}>
            Review a purchase
          </Link>
          <button className="secondary" onClick={saveToWatchlist}>Save to watchlist</button>
          {saveMessage ? <ResultMessage>{saveMessage}</ResultMessage> : null}
          <ErrorMessage message={saveError} />
        </Card>
      </div>
    </>
  );
}

export function IssuerBuyScreen({ provider, symbol }: { provider: Source; symbol: string }) {
  const router = useRouter();
  const { asset: listing, lifecycle, loading, error: feedError } = useIssuerAsset(provider, symbol);
  const [amount, setAmount] = useState("10");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  if (loading) return <EmptyState title="Loading issuer asset">Checking the current feed.</EmptyState>;
  if (feedError) return <ErrorMessage message={feedError} />;
  if (!listing) return <EmptyState title="Asset unavailable">The issuer no longer lists this token.</EmptyState>;
  const { asset } = listing;
  const issuerUnavailable = listing.provider === "xstocks" &&
    listing.asset.tradingHalted;

  async function createPurchase() {
    setSubmitting(true);
    setError(null);
    try {
      const order = await postJson<Order>("orders", {
        clientIntentId: crypto.randomUUID(),
        type: "buy",
        companyId: asset.companyId,
        amountUsdcRaw: parseUsdc(amount).toString(),
        slippageBps: 50,
      });
      router.push(`/orders/${order.id}/review`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message.replaceAll("_", " ") : "Purchase review failed");
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageIntro eyebrow={`Buy ${asset.symbol} · ${issuerName(provider)}`} title={`Choose an amount for ${asset.name}`}>
        <p>The issuer supplied the token mint. Shelf checks that mint on chain and rechecks the issuer feed before requesting a Jupiter route. Nothing moves until a separate review and wallet approval.</p>
      </PageIntro>
      <Card className="stack">
        {lifecycle ? <p className="notice"><strong>{lifecycle.title}</strong><br />{lifecycle.description}{lifecycle.deadline ? ` Deadline: ${new Date(lifecycle.deadline).toLocaleString()}.` : ""}</p> : null}
        <p className="notice">
          {provider === "prestocks"
            ? "This is private company exposure, not ordinary stock. Liquidity, redemption and valuation may differ."
            : "This is a public equity tracker certificate, not an ordinary voting share."}
        </p>
        <p><strong>Issuer mint:</strong> <code className="break-all">{asset.mint}</code></p>
        <Field label="Amount in USDC" htmlFor="issuer-buy-amount" hint="Minimum 5 USDC · beta maximum 100 USDC">
          <input id="issuer-buy-amount" inputMode="decimal" value={amount}
            onChange={(event) => setAmount(event.target.value)} />
        </Field>
        {issuerUnavailable ? <p className="notice">This xStocks asset is not currently available for Shelf purchase.</p> : null}
        <div className="actions">
          <button data-cta="C57" disabled={issuerUnavailable || submitting} onClick={createPurchase}>
            {submitting ? "Preparing review…" : "Review purchase"}
          </button>
          <Link className="button secondary" data-cta="C58" href="/account/wallet/deposit">Deposit USDC</Link>
        </div>
        <ErrorMessage message={error} />
      </Card>
    </>
  );
}
