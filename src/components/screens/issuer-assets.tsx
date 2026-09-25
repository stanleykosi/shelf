"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { parseUsdc } from "@/domain/money";
import type { Order } from "@/domain/types";
import type { Company } from "@/domain/types";
import type { IssuerListing } from "@/domain/issuer-assets";
import type { XStocksDisclosures, XStocksMetadata } from "@/providers/xstocks";
import { apiRequest, authenticationIsRequired, postJson } from "@/lib/api-client";
import { Card, EmptyState, ErrorMessage, Field, PageIntro, ResultMessage } from "@/components/ui";
import { IssuerLogo } from "@/components/issuer-logo";
import { LoadingStatus } from "@/components/loading-feedback";
import { useNotification } from "@/components/notifications";

type Source = "xstocks" | "prestocks";

function useIssuerAsset(provider: Source, symbol: string) {
  const [asset, setAsset] = useState<IssuerListing | null>(null);
  const [metadata, setMetadata] = useState<XStocksMetadata | undefined>();
  const [lifecycle, setLifecycle] = useState<NonNullable<Company["instrument"]>["lifecycle"]>();
  const [loadedKey, setLoadedKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const assetKey = `${provider}:${symbol}`;

  useEffect(() => {
    let active = true;
    apiRequest<{
      listing: IssuerListing | null;
      metadata?: XStocksMetadata;
      lifecycle?: NonNullable<Company["instrument"]>["lifecycle"];
    }>(
      `issuer/asset/${provider}/${encodeURIComponent(symbol)}`,
    )
      .then(({ listing, metadata: currentMetadata, lifecycle: currentLifecycle }) => {
        if (!active) return;
        setAsset(listing);
        setMetadata(currentMetadata);
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
  }, [provider, symbol, assetKey, attempt]);

  return {
    asset,
    metadata,
    lifecycle,
    loading: loadedKey !== assetKey,
    error,
    retry: () => { setLoadedKey(""); setAttempt((value) => value + 1); },
  };
}

function issuerName(provider: Source) {
  return provider === "xstocks" ? "xStocks" : "PreStocks";
}

function formatUsd(value: string, compact = false) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function formatQuantity(value: string) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(Number(value));
}

function DetailMetric({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="issuer-detail-metric">
      <dt>{label}</dt>
      <dd>{value}</dd>
      {note ? <p className="muted">{note}</p> : null}
    </div>
  );
}

function XStocksDisclosureCard({ symbol }: { symbol: string }) {
  const [data, setData] = useState<XStocksDisclosures | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    apiRequest<XStocksDisclosures>(
      `issuer/asset/xstocks/${encodeURIComponent(symbol)}/disclosures`,
      { signal: controller.signal },
    )
      .then(setData)
      .catch(() => { if (!controller.signal.aborted) setData(null); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [symbol, attempt]);

  const reservesUrl = `https://api.xstocks.fi/api/v2/public/proof-of-reserves/${encodeURIComponent(symbol)}`;
  return (
    <Card className="stack">
      <div>
        <h2>Backing and corporate actions</h2>
        <p className="muted">Issuer-reported figures across all chains, separate from the price of a Shelf purchase.</p>
      </div>
      {loading ? <p role="status">Loading xStocks disclosures…</p> : null}
      {!loading && data?.reserves ? (
        <>
          <dl className="issuer-detail-metrics">
            <DetailMetric label="Underlying shares held" value={formatQuantity(data.reserves.sharesHeld)} />
            <DetailMetric label="xStock supply" value={formatQuantity(data.reserves.circulatingSupply)}
              note="Circulating tokens across all chains" />
          </dl>
          <p className="muted">Reserve snapshot: {new Date(data.reserves.timestamp).toLocaleString()}</p>
        </>
      ) : !loading ? <p className="muted">The issuer’s reserve snapshot is unavailable right now.</p> : null}
      {!loading && data?.multiplier ? (
        <div className="issuer-detail-multiplier">
          <p><strong>Solana balance multiplier:</strong> {formatQuantity(data.multiplier.current)}×</p>
          <p className="muted">This adjusts displayed token units for dividends and splits; it is not a price or a promised return.</p>
          {data.multiplier.pending ? <p className="notice">
            Scheduled multiplier: {formatQuantity(data.multiplier.pending.value)}× from {new Date(data.multiplier.pending.activatesAt).toLocaleString()}
            {data.multiplier.pending.reason ? ` · ${data.multiplier.pending.reason}` : ""}.
          </p> : null}
          <p className="muted">Multiplier checked {new Date(data.checkedAt).toLocaleString()}.</p>
        </div>
      ) : !loading ? <p className="muted">The current Solana multiplier is unavailable.</p> : null}
      <div className="actions">
        <a href={reservesUrl} target="_blank" rel="noreferrer">View issuer reserve data</a>
        {!loading && !data?.reserves && !data?.multiplier ? (
          <button className="ghost" onClick={() => { setLoading(true); setAttempt((value) => value + 1); }}>Retry disclosures</button>
        ) : null}
      </div>
    </Card>
  );
}

export function IssuerAssetScreen({ provider, symbol }: { provider: Source; symbol: string }) {
  const { asset: listing, metadata, lifecycle, loading, error, retry } = useIssuerAsset(provider, symbol);
  const [saving, setSaving] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");
  const notify = useNotification();
  if (loading) return <LoadingStatus page>Checking the current issuer feed…</LoadingStatus>;
  if (error) return <EmptyState title="Issuer details unavailable">
    <ErrorMessage message={error} />
    <button className="secondary" onClick={retry}>Try again</button>
  </EmptyState>;
  if (!listing) return <EmptyState title="Asset unavailable">This token is not in the current issuer feed.</EmptyState>;

  const { asset } = listing;
  const publicAsset = listing.provider === "xstocks" ? listing.asset : null;
  const privateAsset = listing.provider === "prestocks" ? listing.asset : null;
  const summary = asset.description.split(/\n\s*\n/)[0];
  const showSummary = summary && summary.toLowerCase() !== `${asset.name} xstock`.toLowerCase();

  async function saveToWatchlist() {
    if (saving) return;
    setSaving(true);
    try {
      await postJson("watchlist/items", { companyId: asset.companyId });
      notify("Saved to your private watchlist.", "success");
    } catch (reason) {
      notify(authenticationIsRequired(reason)
        ? "Sign in to save this asset to your private watchlist."
        : reason instanceof Error ? reason.message : "Could not save this asset", "error");
    } finally {
      setSaving(false);
    }
  }

  async function copyMint() {
    try {
      await navigator.clipboard.writeText(asset.mint);
      setCopyMessage("Mint copied.");
    } catch {
      setCopyMessage("Copy unavailable. Select the mint to copy it.");
    }
  }

  return (
    <>
      <PageIntro
        eyebrow={provider === "xstocks" ? "xStocks · Public equity tracker" : "PreStocks · Private-company exposure"}
        title={asset.name}
      >
        <div className="issuer-detail-intro">
          <IssuerLogo imageUrl={asset.logoUrl} large name={asset.name} source={provider} />
          <div>
            <p className="issuer-detail-symbol">{asset.symbol}</p>
            {showSummary ? <p>{summary}</p> : null}
            <p className="muted">{issuerName(provider)} feed checked {new Date(asset.observedAt).toLocaleString()}.</p>
          </div>
        </div>
      </PageIntro>
      {lifecycle ? <Card className="stack issuer-detail-notice">
          <h2>{lifecycle.title}</h2>
          <p>{lifecycle.description}</p>
          {lifecycle.deadline ? <p>Deadline: {new Date(lifecycle.deadline).toLocaleString()}</p> : null}
          {lifecycle.successorSymbol ? <p>Successor symbol: {lifecycle.successorSymbol}</p> : null}
          <a href={lifecycle.sourceUrl} target="_blank" rel="noreferrer">Read issuer notice</a>
        </Card> : null}
      <div className="issuer-detail-layout">
        <Card className="stack">
          <h2>What this token represents</h2>
          <p>
            {provider === "xstocks"
              ? `An xStocks tracker certificate linked to ${publicAsset?.underlyingSymbol || "an underlying public security"}. It gives economic exposure, not ordinary shares or voting rights.`
              : `A PreStocks token linked to SPV exposure to ${asset.name}. It is not a share in the company and does not grant voting or dividend rights.`}
          </p>
          {publicAsset ? <p className="muted">The underlying exchange and the token’s secondary market have different hours and prices.</p> :
            <p className="muted">Private-company valuations are estimates. Liquidity and exit are not guaranteed.</p>}
        </Card>
        <Card className="stack">
          <h2>Explore this token</h2>
          <p className="muted">A purchase review requests a fresh Jupiter route for your amount. No order is placed from this page.</p>
          {publicAsset?.tradingHalted ? <p className="notice">Shelf purchase review is paused while xStocks reports a trading halt.</p> :
            <Link className="button" href={`/assets/${provider}/${encodeURIComponent(asset.symbol)}/buy` as Route}>
              Review a purchase
            </Link>}
          <Link
            className="button secondary"
            href={`/assistant?provider=${provider}&symbol=${encodeURIComponent(asset.symbol)}` as Route}
          >
            Chat with AI
          </Link>
          <button className="secondary" disabled={saving} onClick={saveToWatchlist}>
            {saving ? "Saving…" : "Save to watchlist"}
          </button>
        </Card>
      </div>
      {publicAsset ? (
        <div className="issuer-detail-layout">
          <Card className="stack">
            <div>
              <h2>Underlying and issuer session</h2>
              <p className="muted">The xStocks issuer schedule does not establish Jupiter liquidity.</p>
            </div>
            <dl className="issuer-detail-facts">
              <div><dt>Underlying ticker</dt><dd>{publicAsset.underlyingSymbol || "Not supplied"}</dd></div>
              <div><dt>Exchange</dt><dd>{publicAsset.exchange}</dd></div>
              {metadata?.underlyingType ? <div><dt>Security type</dt><dd>{metadata.underlyingType}</dd></div> : null}
              {metadata?.listingCountry ? <div><dt>Listing country</dt><dd>{metadata.listingCountry}</dd></div> : null}
              {metadata?.underlyingCurrency ? <div><dt>Trading currency</dt><dd>{metadata.underlyingCurrency}</dd></div> : null}
              <div><dt>Issuer session</dt><dd>{metadata?.issuerTradingAvailable
                ? `${publicAsset.marketOpen ? "Open" : "Closed"} · ${publicAsset.marketPeriod}`
                : "Not available from issuer"}</dd></div>
              {publicAsset.nextChangeAt ? <div><dt>Next session change</dt>
                <dd>{new Date(publicAsset.nextChangeAt).toLocaleString()}</dd></div> : null}
            </dl>
            {publicAsset.tradingHalted ? <p className="notice">xStocks reports a trading halt for this token.</p> : null}
          </Card>
          <XStocksDisclosureCard symbol={asset.symbol} />
        </div>
      ) : privateAsset ? (
        <Card className="stack">
          <div>
            <h2>PreStocks reference values</h2>
            <p className="muted">These are issuer figures, not a live Jupiter execution price. PreStocks does not provide a per-value update time in this feed.</p>
          </div>
          <dl className="issuer-detail-metrics">
            <DetailMetric label="Token reference" value={formatUsd(privateAsset.tokenPriceUsd)} />
            <DetailMetric label="Issuer mark" value={formatUsd(privateAsset.markPriceUsd)} />
            <DetailMetric label="Difference from mark" value={privateAsset.premiumLabel} />
            <DetailMetric label="Implied company valuation" value={formatUsd(privateAsset.impliedValuationUsd, true)} />
            <DetailMetric label="Mark company valuation" value={formatUsd(privateAsset.markValuationUsd, true)} />
          </dl>
          <p className="muted">Feed checked {new Date(asset.observedAt).toLocaleString()}. The issuer page has further company material that is not in the public token feed.</p>
        </Card>
      ) : null}
      <Card className="stack">
        <h2>Token identity and sources</h2>
        <div className="issuer-detail-mint">
          <div><span className="muted">Solana token mint</span><code className="break-all">{asset.mint}</code></div>
          <button className="secondary" onClick={copyMint}>Copy mint</button>
        </div>
        {copyMessage ? <ResultMessage>{copyMessage}</ResultMessage> : null}
        {privateAsset ? <p><strong>Issuer-reported supply:</strong> {formatQuantity(privateAsset.supplyUi)} tokens</p> : null}
        {publicAsset && (metadata?.tokenIsin || metadata?.underlyingIsin) ? (
          <details>
            <summary>Security identifiers</summary>
            {metadata.tokenIsin ? <p><strong>xStock ISIN:</strong> {metadata.tokenIsin}</p> : null}
            {metadata.underlyingIsin ? <p><strong>Underlying ISIN:</strong> {metadata.underlyingIsin}</p> : null}
          </details>
        ) : null}
        <div className="actions">
          <a href={privateAsset?.issuerUrl ?? "https://xstocks.fi/products"} target="_blank" rel="noreferrer">
            View {issuerName(provider)} information
          </a>
          {publicAsset ? <a href="https://assets.backed.fi/legal-documentation" target="_blank" rel="noreferrer">
            Issuer terms and fees
          </a> : null}
          <a href={`https://solscan.io/token/${asset.mint}`} target="_blank" rel="noreferrer">View on Solscan</a>
        </div>
      </Card>
    </>
  );
}

export function IssuerBuyScreen({ provider, symbol }: { provider: Source; symbol: string }) {
  const router = useRouter();
  const { asset: listing, lifecycle, loading, error: feedError } = useIssuerAsset(provider, symbol);
  const [amount, setAmount] = useState("10");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  if (loading) return <LoadingStatus page>Checking the current issuer feed…</LoadingStatus>;
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
