"use client";

import { useEffect, useRef } from "react";
import type { CandlestickData, IChartApi, ISeriesApi, Time } from "lightweight-charts";
import type { MarketCandle } from "@/providers/geckoterminal";

function chartData(candles: MarketCandle[]): CandlestickData<Time>[] {
  return candles.map((candle) => ({
    time: candle.time as Time,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
  }));
}

export function IssuerPriceChart({ candles }: { candles: MarketCandle[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const candlesRef = useRef(candles);

  useEffect(() => {
    candlesRef.current = candles;
    if (!seriesRef.current) return;
    seriesRef.current.setData(chartData(candles));
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;

    void import("lightweight-charts").then(({ CandlestickSeries, createChart, ColorType }) => {
      if (disposed) return;
      const chart = createChart(container, {
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
      chartRef.current = chart;
      seriesRef.current = series;
      series.setData(chartData(candlesRef.current));
      chart.timeScale().fitContent();

      resizeObserver = new ResizeObserver(() => {
        chart.applyOptions({ width: container.clientWidth, height: container.clientHeight });
      });
      resizeObserver.observe(container);
    });

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      chartRef.current?.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  return <div className="issuer-price-chart" ref={containerRef} role="img"
    aria-label={`Interactive USD candlestick chart with ${candles.length} observed pool intervals`} />;
}
