"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useState } from "react";
import { companyById } from "@/data/catalog";
import type { MarketFeed } from "@/domain/market-data";
import type { MarketHistoryPoint } from "@/domain/types";
import type { PreStocksListing } from "@/providers/prestocks";
import type { XStocksListing } from "@/providers/xstocks";
import { apiRequest, authenticationIsRequired, postJson } from "@/lib/api-client";
import { Card, CtaLink, EmptyState, ErrorMessage, PageIntro, ResultMessage } from "@/components/ui";

type MarketLane = "all" | "public" | "private";

function compactUsd(value: string): string {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value));
}

function laneLink(lane: MarketLane, current: MarketLane, label: string) {
  const href =
    lane === "all" ? "/discover?entity=company" : `/discover?entity=company&market=${lane}`;
  return (
    <Link className={`market-tab ${lane === current ? "active" : ""}`} href={href as Route}>
      {label}
    </Link>
  );
}

export function MarketScreen({ lane = "all" }: { lane?: MarketLane }) {
  const [preStocks, setPreStocks] = useState<MarketFeed<PreStocksListing> | null>(null);
  const [xStocks, setXStocks] = useState<MarketFeed<XStocksListing> | null>(null);
  const [watched, setWatched] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const requests: Promise<void>[] = [];
    apiRequest<Array<{ id: string }>>("watchlist")
      .then((items) => setWatched(items.map((item) => item.id)))
      .catch((requestError) => {
        if (!authenticationIsRequired(requestError)) {
          setError(requestError instanceof Error ? requestError.message : "Watchlist unavailable");
        }
      });
    if (lane !== "public") {
      requests.push(
        apiRequest<MarketFeed<PreStocksListing>>("catalog/prestocks").then(setPreStocks),
      );
    }
    if (lane !== "private") {
      requests.push(apiRequest<MarketFeed<XStocksListing>>("catalog/xstocks").then(setXStocks));
    }
    Promise.all(requests).catch((requestError) => {
      setError(requestError instanceof Error ? requestError.message : "Markets are unavailable");
    });
  }, [lane]);

  async function watch(companyId: string) {
    try {
      const companies = await postJson<Array<{ id: string }>>("watchlist/items", { companyId });
      setWatched(companies.map((company) => company.id));
      setMessage("Added to your private watchlist.");
      setError(null);
    } catch (requestError) {
      setError(
        authenticationIsRequired(requestError)
          ? "Sign in to keep a private company watchlist."
          : requestError instanceof Error
            ? requestError.message
            : "Watchlist update failed",
      );
    }
  }

  const title =
    lane === "public"
      ? "Public companies, onchain"
      : lane === "private"
        ? "Private markets you can understand"
        : "Two markets. One clear path.";

  return (
    <>
      <PageIntro eyebrow="Shelf markets" title={title}>
        <p>
          xStocks provides public-equity tracker certificates. PreStocks provides economic exposure
          to private companies. Shelf keeps their rights, pricing, and lifecycle separate while
          using the same review-first investment flow.
        </p>
      </PageIntro>

      <nav className="market-tabs" aria-label="Market type">
        {laneLink("all", lane, "Compare")}
        {laneLink("public", lane, "Public · xStocks")}
        {laneLink("private", lane, "Private · PreStocks")}
      </nav>

      {lane === "all" ? <MarketComparison /> : null}
      <ErrorMessage message={error} />
      {message ? <ResultMessage>{message}</ResultMessage> : null}

      {lane !== "private" ? (
        <PublicMarketSection feed={xStocks} watched={watched} onWatch={watch} />
      ) : null}
      {lane !== "public" ? (
        <PrivateMarketSection feed={preStocks} watched={watched} onWatch={watch} />
      ) : null}
    </>
  );
}

function MarketComparison() {
  return (
    <section className="section comparison-grid" aria-label="Compare market products">
      <Card className="market-card public-market-card">
        <span className="badge">Public market</span>
        <h2>xStocks</h2>
        <p>Tracker certificates backed 1:1 by publicly traded shares or ETFs.</p>
        <dl className="facts">
          <div>
            <dt>Reference</dt>
            <dd>Exchange-listed equity</dd>
          </div>
          <div>
            <dt>Corporate actions</dt>
            <dd>Issuer multiplier</dd>
          </div>
          <div>
            <dt>Primary liquidity</dt>
            <dd>Issuer redemption</dd>
          </div>
        </dl>
        <p className="muted">Economic exposure only; no shareholder voting rights.</p>
        <CtaLink id="market-public" href="/discover?entity=company&market=public">
          Explore public companies
        </CtaLink>
      </Card>
      <Card className="market-card private-market-card">
        <span className="badge private-badge">Private market</span>
        <h2>PreStocks</h2>
        <p>Issuer-defined token exposure to private-company SPV interests.</p>
        <dl className="facts">
          <div>
            <dt>Reference</dt>
            <dd>Private valuation mark</dd>
          </div>
          <div>
            <dt>Key signal</dt>
            <dd>Token premium/discount</dd>
          </div>
          <div>
            <dt>Liquidity</dt>
            <dd>Not guaranteed</dd>
          </div>
        </dl>
        <p className="muted">No company shares, voting, dividend, or information rights.</p>
        <CtaLink id="market-private" href="/discover?entity=company&market=private">
          Explore private companies
        </CtaLink>
      </Card>
    </section>
  );
}

function PublicMarketSection({
  feed,
  watched,
  onWatch,
}: {
  feed: MarketFeed<XStocksListing> | null;
  watched: string[];
  onWatch: (companyId: string) => Promise<void>;
}) {
  return (
    <section className="section">
      <p className="eyebrow">Public companies · xStocks</p>
      <h2>Public-company exposure with issuer protections</h2>
      <p className="muted">
        Shelf verifies the Solana mint against xStocks. Jupiter will determine the executable route;
        the exchange session shown here does not promise secondary-market liquidity.
      </p>
      {!feed ? (
        <p className="muted">Loading the public-company registry…</p>
      ) : feed.listings.length ? (
        <div className="grid">
          {feed.listings.map((listing) => (
            <Card className="market-card public-market-card" key={listing.mint}>
              <div className="market-card-heading">
                <span className="badge">Public equity token</span>
                <span className={`market-state ${listing.marketOpen ? "open" : "closed"}`}>
                  {listing.marketOpen ? "Underlying open" : "Underlying closed"}
                </span>
              </div>
              <h3>{listing.name}</h3>
              <p className="market-symbol">
                {listing.symbol} <span>tracks {listing.underlyingSymbol}</span>
              </p>
              <p className="muted">
                {listing.exchange} ·{" "}
                {listing.supportsAtomicSwaps ? "issuer atomic swaps" : "secondary only"}
                {feed.state === "stale" ? " · stale metadata" : ""}
              </p>
              <MarketCardActions
                companyId={listing.companyId}
                watched={watched.includes(listing.companyId)}
                onWatch={onWatch}
              />
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No public instruments available">
          The reviewed xStocks registry could not return an instrument.
        </EmptyState>
      )}
    </section>
  );
}

function PrivateMarketSection({
  feed,
  watched,
  onWatch,
}: {
  feed: MarketFeed<PreStocksListing> | null;
  watched: string[];
  onWatch: (companyId: string) => Promise<void>;
}) {
  return (
    <section className="section">
      <p className="eyebrow private-eyebrow">Private companies · PreStocks</p>
      <h2>Compare the market token with the issuer mark</h2>
      <p className="muted">
        A premium means the token trades above the issuer’s private-company valuation mark. It is a
        market signal, not proof that either price is fair or redeemable.
      </p>
      {!feed ? (
        <p className="muted">Loading private-market references…</p>
      ) : feed.listings.length ? (
        <div className="grid">
          {feed.listings.map((listing) => {
            const company = companyById(listing.companyId);
            return (
              <Card className="market-card private-market-card" key={listing.mint}>
                <div className="market-card-heading">
                  <span className="badge private-badge">Pre-IPO exposure</span>
                  <span
                    className={
                      listing.premiumBps && listing.premiumBps > 0 ? "premium" : "discount"
                    }
                  >
                    {listing.premiumLabel}
                  </span>
                </div>
                <h3>{listing.name}</h3>
                <p className="market-symbol">{listing.symbol}</p>
                <dl className="facts">
                  <div>
                    <dt>Token reference</dt>
                    <dd>${listing.tokenPriceUsd}</dd>
                  </div>
                  <div>
                    <dt>Issuer mark</dt>
                    <dd>${listing.markPriceUsd}</dd>
                  </div>
                  <div>
                    <dt>Implied valuation</dt>
                    <dd>{compactUsd(listing.impliedValuationUsd)}</dd>
                  </div>
                </dl>
                {company?.instrument?.lifecycle?.state === "transition" ? (
                  <p className="notice">{company.instrument.lifecycle.title}</p>
                ) : null}
                <MarketCardActions
                  companyId={listing.companyId}
                  watched={watched.includes(listing.companyId)}
                  onWatch={onWatch}
                />
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState title="No private instruments available">
          The reviewed PreStocks feed could not return an instrument.
        </EmptyState>
      )}
      <div className="section actions">
        <CtaLink id="private-basket" href="/invest/basket?market=private">
          Build a private-market basket
        </CtaLink>
        <CtaLink id="private-share" href="/saved/share" secondary>
          Share your research shelf
        </CtaLink>
      </div>
    </section>
  );
}

function MarketCardActions({
  companyId,
  watched,
  onWatch,
}: {
  companyId: string;
  watched: boolean;
  onWatch: (companyId: string) => Promise<void>;
}) {
  return (
    <div className="actions market-actions">
      <Link className="button" href={`/companies/${companyId}`}>
        Research
      </Link>
      <button className="secondary" disabled={watched} onClick={() => onWatch(companyId)}>
        {watched ? "On watchlist" : "Add to watchlist"}
      </button>
    </div>
  );
}

export function MarketHistoryChart({
  points,
  mode,
}: {
  points: MarketHistoryPoint[];
  mode: "observed" | "unavailable";
}) {
  const values = points.flatMap((point) =>
    [point.markPriceUsd, point.tokenPriceUsd, point.referencePriceUsd]
      .filter((value): value is string => Boolean(value))
      .map(Number),
  );
  if (values.length < 2) {
    return <p className="muted">Historical reference data will appear after more observations.</p>;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pathFor = (key: keyof MarketHistoryPoint) =>
    points
      .map((point, index) => {
        const raw = point[key];
        if (typeof raw !== "string") return null;
        const x = points.length === 1 ? 0 : (index / (points.length - 1)) * 100;
        const y = 58 - ((Number(raw) - min) / range) * 52;
        return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .filter(Boolean)
      .join(" ");

  return (
    <div className="market-chart">
      <svg
        role="img"
        aria-label="Historical issuer and token reference prices"
        viewBox="0 0 100 64"
      >
        <path className="chart-line mark-line" d={pathFor("markPriceUsd")} />
        <path className="chart-line token-line" d={pathFor("tokenPriceUsd")} />
        <path className="chart-line public-line" d={pathFor("referencePriceUsd")} />
      </svg>
      <div className="chart-legend">
        <span>
          <i className="mark-key" />
          Issuer mark
        </span>
        <span>
          <i className="token-key" />
          Token reference
        </span>
        <span>{mode === "observed" ? "Observed by Shelf" : "History unavailable"}</span>
      </div>
    </div>
  );
}
