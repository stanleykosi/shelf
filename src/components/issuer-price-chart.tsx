"use client";

import { useEffect, useRef } from "react";
import type { IChartApi, Time } from "lightweight-charts";
import type { MarketCandle } from "@/providers/geckoterminal";

export function IssuerPriceChart({ candles }: { candles: MarketCandle[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || candles.length < 2) return;

    let disposed = false;
    let chart: IChartApi | null = null;
    let resizeObserver: ResizeObserver | null = null;

    void import("lightweight-charts").then(({ CandlestickSeries, createChart, ColorType }) => {
      if (disposed) return;
      chart = createChart(container, {
        width: container.clientWidth,
        height: container.clientHeight || 360,
        layout: {
          background: { type: ColorType.Solid, color: "#14221b" },
          textColor: "#b2c7b8",
          attributionLogo: true,
          fontFamily: "Arial, Helvetica, sans-serif",
        },
        grid: {
          vertLines: { color: "#24382d" },
          horzLines: { color: "#24382d" },
        },
        rightPriceScale: { borderColor: "#365044" },
        timeScale: { borderColor: "#365044", timeVisible: true, secondsVisible: false },
        crosshair: {
          vertLine: { color: "#779d83", labelBackgroundColor: "#385b45" },
          horzLine: { color: "#779d83", labelBackgroundColor: "#385b45" },
        },
      });

      const series = chart.addSeries(CandlestickSeries, {
        upColor: "#9ce4bb",
        downColor: "#e28a78",
        wickUpColor: "#9ce4bb",
        wickDownColor: "#e28a78",
        borderVisible: false,
        priceFormat: { type: "price", precision: 4, minMove: 0.0001 },
      });
      series.setData(candles.map((candle) => ({
        time: candle.time as Time,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      })));
      chart.timeScale().fitContent();

      resizeObserver = new ResizeObserver(() => {
        if (chart) chart.applyOptions({ width: container.clientWidth, height: container.clientHeight });
      });
      resizeObserver.observe(container);
    });

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      chart?.remove();
    };
  }, [candles]);

  return <div className="issuer-price-chart" ref={containerRef} role="img"
    aria-label={`Interactive USD candlestick chart with ${candles.length} observed pool intervals`} />;
}
