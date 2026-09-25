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
import { ResearchJourney, JourneyHeading } from "@/components/research-journey";
import { ArrowRight, ArrowUpRight, Bookmark, ShieldCheck } from "@/components/studio-icons";
import { IssuerLogo } from "@/components/issuer-logo";

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

function IssuerState({ title, children, retry = false }: { title: string; children: React.ReactNode; retry?: boolean }) {
  return <ResearchJourney kind="issuer">
    <div className="journey-state"><ShieldCheck size={32} aria-hidden="true" />
      <EmptyState title={title} action={retry ? <button onClick={() => window.location.reload()}>Try again</button> : <Link className="button secondary" href="/discover">Return to Discover</Link>}>{children}</EmptyState>
    </div>
  </ResearchJourney>;
}

export function IssuerAssetScreen({ provider, symbol }: { provider: Source; symbol: string }) {
  const { asset: listing, lifecycle, loading, error } = useIssuerAsset(provider, symbol);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  if (loading) return <IssuerState title="Loading issuer asset"><span role="status">Checking the current feed.</span></IssuerState>;
  if (error) return <IssuerState title="Issuer information unavailable" retry>{error}. No current availability is inferred.</IssuerState>;
  if (!listing) return <IssuerState title="Asset unavailable">This token is not in the current issuer feed.</IssuerState>;

  const { asset } = listing;
  const publicAsset = listing.provider === "xstocks" ? listing.asset : null;
  const privateAsset = listing.provider === "prestocks" ? listing.asset : null;
  const issuerUrl = privateAsset?.issuerUrl ?? "https://xstocks.fi/";
  const observed = new Date(asset.observedAt);
  const observedLabel = Number.isNaN(observed.getTime()) ? "Observation time unavailable" : observed.toLocaleString();

  async function saveToWatchlist() {
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      await postJson("watchlist/items", { companyId: asset.companyId });
      setSaveMessage("Added to Saved research. This is not a Holding.");
    } catch (reason) {
      setSaveError(authenticationIsRequired(reason)
        ? "Sign in to keep this asset in Saved research."
        : reason instanceof Error ? reason.message : "Could not save this asset");
    } finally {
      setSaving(false);
    }
  }

  return <ResearchJourney kind="issuer">
    <header className="issuer-research-hero">
      <div className="issuer-research-identity">
        <IssuerLogo imageUrl={asset.logoUrl} large name={asset.name} source={provider} />
        <JourneyHeading eyebrow={provider === "xstocks" ? "Public equity tracker / xStocks" : "Private company exposure / PreStocks"} title={asset.name}>
          <p>{asset.symbol} <span>·</span> Issuer-defined investment exposure</p>
        </JourneyHeading>
      </div>
      <a className="journey-source-link" href={issuerUrl} target="_blank" rel="noreferrer">Issuer information <ArrowUpRight size={16} aria-hidden="true" /></a>
    </header>
    <div className="issuer-source-strip"><span><ShieldCheck size={16} aria-hidden="true" />Sourced from {issuerName(provider)}</span><span>Observed {observedLabel}</span></div>
    {lifecycle ? <section className="issuer-lifecycle" aria-label="Issuer lifecycle notice">
      <p className="studio-eyebrow">Issuer notice</p><h2>{lifecycle.title}</h2><p>{lifecycle.description}</p>
      {lifecycle.deadline ? <p>Deadline: {new Date(lifecycle.deadline).toLocaleString()}</p> : null}
      {lifecycle.successorSymbol ? <p>Successor symbol: {lifecycle.successorSymbol}</p> : null}
      <a href={lifecycle.sourceUrl} target="_blank" rel="noreferrer">Read issuer notice <ArrowUpRight size={15} aria-hidden="true" /></a>
    </section> : null}
    <div className="issuer-research-layout">
      <div className="issuer-research-main">
        <section className="research-section issuer-overview"><p className="studio-eyebrow">The wider picture</p><h2>About this exposure</h2><p>{asset.description || "Issuer description unavailable."}</p></section>
        <section className="research-section">
          <div className="journey-section-heading"><h2>{publicAsset ? "Public market" : "Private market"}</h2><span>Issuer reference</span></div>
          <dl className="journey-facts issuer-market-facts">
            {publicAsset ? <>
              <div><dt>Underlying</dt><dd>{publicAsset.underlyingSymbol || "Unavailable"}</dd></div>
              <div><dt>Exchange</dt><dd>{publicAsset.exchange}</dd></div>
              <div><dt>Session</dt><dd>{publicAsset.marketOpen ? "Open" : publicAsset.marketPeriod}</dd></div>
              <div><dt>Trading status</dt><dd>{publicAsset.tradingHalted ? "Halted" : "No issuer halt reported"}</dd></div>
              {publicAsset.nextChangeAt ? <div><dt>Next session change</dt><dd>{new Date(publicAsset.nextChangeAt).toLocaleString()}</dd></div> : null}
            </> : privateAsset ? <>
              <div><dt>Issuer mark</dt><dd>${privateAsset.markPriceUsd}</dd></div>
              <div><dt>Token reference</dt><dd>${privateAsset.tokenPriceUsd}</dd></div>
              <div><dt>Mark valuation</dt><dd>${privateAsset.markValuationUsd}</dd></div>
              <div><dt>Implied token valuation</dt><dd>${privateAsset.impliedValuationUsd}</dd></div>
              <div><dt>Issuer supply</dt><dd>{privateAsset.supplyUi} tokens</dd></div>
              <div><dt>Market signal</dt><dd>{privateAsset.premiumLabel}</dd></div>
            </> : null}
          </dl>
          {publicAsset?.tradingHalted ? <p className="notice">Issuer trading is halted.</p> : null}
          <p className="journey-source-note">Jupiter provides the executable USDC route only after a fresh quote. The displayed issuer values are references.</p>
        </section>
        <section className="research-section issuer-rights">
          <ShieldCheck size={24} aria-hidden="true" /><div><h2>Understand what you’re exploring</h2>
            <p>{publicAsset ? "Tracks a public security under the issuer’s terms; this token is not an ordinary voting share." : "Private company exposure under PreStocks terms, not ordinary shares. Liquidity and exit are not guaranteed."}</p>
            <Link href="/learn/stock-tokens">Understand instrument rights <ArrowUpRight size={16} aria-hidden="true" /></Link>
          </div>
        </section>
      </div>
      <aside className="issuer-instrument-panel" aria-label="Issuer token and next steps">
        <p className="studio-eyebrow">A separate instrument</p><h2>Issuer token</h2>
        <strong className="issuer-symbol-display">{asset.symbol}</strong>
        <p>{issuerName(provider)} · Solana</p>
        <details><summary>Token identity</summary><p>Solana mint</p><code className="break-all">{asset.mint}</code></details>
        <p className="issuer-action-context">Explore the terms, then choose your next step. Saving adds research to your watchlist.</p>
        <Link className="button" href={`/assets/${provider}/${encodeURIComponent(asset.symbol)}/buy` as Route}>Review a purchase <ArrowRight size={17} aria-hidden="true" /></Link>
        <button className="secondary" disabled={saving} onClick={saveToWatchlist}><Bookmark size={16} aria-hidden="true" />{saving ? "Saving…" : "Save to watchlist"}</button>
        {saveMessage ? <ResultMessage>{saveMessage}</ResultMessage> : null}<ErrorMessage message={saveError} />
        <a href={issuerUrl} target="_blank" rel="noreferrer">Read issuer information <ArrowUpRight size={14} aria-hidden="true" /></a>
      </aside>
    </div>
  </ResearchJourney>;
}

export function IssuerBuyScreen({ provider, symbol }: { provider: Source; symbol: string }) {
  const router = useRouter();
  const { asset: listing, lifecycle, loading, error: feedError } = useIssuerAsset(provider, symbol);
  const [amount, setAmount] = useState("10");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  if (loading) return <IssuerState title="Loading issuer asset">Checking the current feed.</IssuerState>;
  if (feedError) return <IssuerState title="Purchase information unavailable" retry>{feedError}. No purchase has been submitted.</IssuerState>;
  if (!listing) return <IssuerState title="Asset unavailable">The issuer no longer lists this token.</IssuerState>;
  const { asset } = listing;
  const issuerUnavailable = listing.provider === "xstocks" &&
    listing.asset.tradingHalted;

  async function createPurchase() {
    if (submitting || issuerUnavailable) return;
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
    <ResearchJourney kind="purchase" backHref={`/assets/${provider}/${encodeURIComponent(asset.symbol)}` as Route} backLabel="Back to instrument">
      <PageIntro eyebrow={`Buy ${asset.symbol} · ${issuerName(provider)}`} title={`Choose an amount for ${asset.name}`}>
        <p>The issuer supplied the token mint. Shelf checks that mint on chain and rechecks the issuer feed before requesting a Jupiter route. Nothing moves until a separate review and wallet approval.</p>
      </PageIntro>
      <ol className="purchase-steps" aria-label="Purchase steps"><li aria-current="step"><span>01</span>Choose amount</li><li><span>02</span>Review quote</li><li><span>03</span>Approve in wallet</li></ol>
      <Card className="stack purchase-amount-panel">
        {lifecycle ? <p className="notice"><strong>{lifecycle.title}</strong><br />{lifecycle.description}{lifecycle.deadline ? ` Deadline: ${new Date(lifecycle.deadline).toLocaleString()}.` : ""}</p> : null}
        <p className="notice">
          {provider === "prestocks"
            ? "This is private company exposure, not ordinary stock. Liquidity, redemption and valuation may differ."
            : "This is a public equity tracker certificate, not an ordinary voting share."}
        </p>
        <h2>{asset.name}</h2><p>{asset.symbol} · {issuerName(provider)} instrument</p>
        <details><summary>Issuer token identity</summary><p><strong>Issuer mint:</strong> <code className="break-all">{asset.mint}</code></p></details>
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
          <Link className="button secondary" href={`/assets/${provider}/${encodeURIComponent(asset.symbol)}` as Route}>Return to instrument</Link>
        </div>
        <ErrorMessage message={error} />
      </Card>
    </ResearchJourney>
  );
}
