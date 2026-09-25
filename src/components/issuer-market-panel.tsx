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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const cache = useRef(new Map<string, IssuerMarketView>());

  useEffect(() => {
    const key = `${symbol}:${range}`;
    const cached = cache.current.get(key);
    if (cached && !attempt) {
      setMarket(cached);
      setLoading(false);
      setError(false);
      return;
    }

    const controller = new AbortController();
    setMarket(null);
    setLoading(true);
    setError(false);
    void apiRequest<IssuerMarketView>(
      `issuer/asset/xstocks/${encodeURIComponent(symbol)}/market?range=${range}`,
      { signal: controller.signal },
    ).then((result) => {
      if (controller.signal.aborted) return;
      cache.current.set(key, result);
      setMarket(result);
    }).catch(() => {
      if (!controller.signal.aborted) setError(true);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
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
              onClick={() => setRange(option)}>{option}</button>
          ))}
        </div>
      </div>

      <div className="issuer-market-plot">
        {loading ? <div className="issuer-market-placeholder" role="status">Loading observed pool history…</div> :
          error ? <div className="issuer-market-placeholder" role="status">
            <p>Market data is unavailable right now.</p>
            <button type="button" onClick={() => setAttempt((value) => value + 1)}>Retry market data</button>
          </div> : candles.length > 1 ? <IssuerPriceChart candles={candles} /> :
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
      <p className="issuer-market-source">
        Current pool price and 24h move: DEX Screener. Observed candles: GeckoTerminal.
        {market ? ` Checked ${new Date(market.checkedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.` : ""}
        {" "}This pool is separate from the underlying stock market and is not an executable quote.
        {candles.length > 1 ? <> Chart by <a href="https://www.tradingview.com/" target="_blank" rel="noreferrer">TradingView</a>.</> : null}
      </p>
    </section>
  );
}
