"use client";

import { useEffect, useRef, useState } from "react";
import type { IssuerMarketView } from "@/domain/issuer-market";
import { marketRanges, type MarketRange } from "@/providers/geckoterminal";
import { apiRequest } from "@/lib/api-client";
import { IssuerPriceChart } from "@/components/issuer-price-chart";

function usd(value: string) {
  const amount = Number(value);
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: amount < 1 ? 4 : 2,
  }).format(amount);
}

export function IssuerMarketPanel({ symbol }: { symbol: string }) {
  const [range, setRange] = useState<MarketRange>("1D");
  const [market, setMarket] = useState<IssuerMarketView | null>(null);
  const [displayedRange, setDisplayedRange] = useState<MarketRange>("1D");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const cache = useRef(new Map<string, IssuerMarketView>());

  useEffect(() => {
    const key = `${symbol}:${range}`;
    const cached = cache.current.get(key);
    if (cached && !attempt) {
      setMarket(cached);
      setDisplayedRange(range);
      setLoading(false);
      setError(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(false);
    // A short delay avoids requesting every intermediate range while users click through the controls.
    const timer = window.setTimeout(() => {
      void apiRequest<IssuerMarketView>(
        `issuer/asset/xstocks/${encodeURIComponent(symbol)}/market?range=${range}`,
        { signal: controller.signal },
      ).then((result) => {
        if (controller.signal.aborted) return;
        if (result.historyState !== "error") {
          setMarket(result);
          setDisplayedRange(range);
          cache.current.set(key, result);
        } else {
          setMarket((current) => current ? {
            ...current,
            priceUsd: result.priceUsd ?? current.priceUsd,
            change24hPct: result.change24hPct ?? current.change24hPct,
            liquidityUsd: result.liquidityUsd ?? current.liquidityUsd,
            venue: result.venue ?? current.venue,
          } : result);
          setError(true);
        }
      }).catch(() => {
        if (!controller.signal.aborted) setError(true);
      }).finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    }, 120);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [symbol, range, attempt]);

  const change = market?.change24hPct;
  const changeLabel = change === undefined ? null : `${change > 0 ? "+" : ""}${change.toFixed(2)}%`;
  const candles = market?.candles ?? [];
  const high = candles.length ? Math.max(...candles.map((candle) => candle.high)) : null;
  const low = candles.length ? Math.min(...candles.map((candle) => candle.low)) : null;

  return (
    <section className="issuer-market-panel" aria-labelledby="issuer-market-title">
      <div className="issuer-market-heading">
        <div>
          <p className="issuer-market-kicker">Solana secondary market</p>
          <h2 id="issuer-market-title">Pool price</h2>
          <div className="issuer-market-price-line">
            <strong>{market?.priceUsd ? usd(market.priceUsd) : "Unavailable"}</strong>
            {changeLabel ? <span className={change! < 0 ? "is-down" : "is-up"}>{changeLabel} <small>24h</small></span> : null}
          </div>
          <p className="issuer-market-unit">USD per xStock token · indicative pool price</p>
        </div>
        <div className="issuer-market-range" role="group" aria-label="Chart range">
          {marketRanges.map((option) => (
            <button key={option} type="button" aria-pressed={range === option}
              onClick={() => { setAttempt(0); setRange(option); }}>{option}</button>
          ))}
        </div>
      </div>

      <div className="issuer-market-plot">
        {candles.length > 1 ? <>
          <IssuerPriceChart candles={candles} />
          {loading || error ? <div className="issuer-market-overlay" role="status">
            <span>{loading ? `Loading ${range} history…` : `Showing ${displayedRange} history. ${range} is temporarily unavailable.`}</span>
            {error ? <button type="button" onClick={() => setAttempt((value) => value + 1)}>Retry {range}</button> : null}
          </div> : null}
        </> : loading ? <div className="issuer-market-placeholder" role="status">Loading observed pool history…</div> :
          error ? <div className="issuer-market-placeholder" role="status">
            <p>Price history could not load right now.</p>
            <button type="button" onClick={() => setAttempt((value) => value + 1)}>Retry {range}</button>
          </div> :
          <div className="issuer-market-placeholder" role="status">
            <p>No observed price history is available for this pool and range.</p>
            <p>Try another range or check the issuer details below.</p>
          </div>}
      </div>

      <div className="issuer-market-stats">
        <div><span>Range high</span><strong>{high === null ? "—" : usd(String(high))}</strong></div>
        <div><span>Range low</span><strong>{low === null ? "—" : usd(String(low))}</strong></div>
        <div><span>Pool liquidity</span><strong>{market?.liquidityUsd === undefined ? "—" : usd(String(market.liquidityUsd))}</strong></div>
        <div><span>Venue</span><strong>{market?.venue ?? "—"}</strong></div>
      </div>
    </section>
  );
}
