"use client";

import { useEffect, useRef } from "react";
import type { CandlestickData, IChartApi, ISeriesApi, Time } from "lightweight-charts";
import type { MarketCandle } from "@/providers/geckoterminal";
import { marketRangeSeconds, type MarketRange } from "@/providers/geckoterminal";

function chartData(candles: MarketCandle[]): CandlestickData<Time>[] {
  return candles.map((candle) => ({
    time: candle.time as Time,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
  }));
}

function showSelectedWindow(chart: IChartApi, currentCandles: MarketCandle[], selectedRange: MarketRange) {
  const first = currentCandles[0]?.time;
  const last = currentCandles.at(-1)?.time;
  if (first === undefined || last === undefined) return;
  chart.timeScale().setVisibleRange({
    from: Math.max(first, last - marketRangeSeconds(selectedRange)) as Time,
    to: last as Time,
  });
}

export function IssuerPriceChart({ candles, range, onReachStart }: {
  candles: MarketCandle[];
  range: MarketRange;
  onReachStart: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const candlesRef = useRef(candles);
  const rangeRef = useRef(range);
  const onReachStartRef = useRef(onReachStart);
  const updatingRef = useRef(false);
  useEffect(() => { onReachStartRef.current = onReachStart; }, [onReachStart]);

  useEffect(() => {
    const previous = candlesRef.current;
    const rangeChanged = rangeRef.current !== range;
    candlesRef.current = candles;
    rangeRef.current = range;
    if (!seriesRef.current) return;
    const chart = chartRef.current;
    if (!chart) return;
    const visible = chart.timeScale().getVisibleLogicalRange();
    const prepended = previous.length && candles.length && candles[0].time < previous[0].time
      ? candles.filter((candle) => candle.time < previous[0].time).length : 0;
    updatingRef.current = true;
    seriesRef.current.setData(chartData(candles));
    if (rangeChanged) showSelectedWindow(chart, candles, range);
    else if (visible && prepended) chart.timeScale().setVisibleLogicalRange({
      from: visible.from + prepended,
      to: visible.to + prepended,
    });
    updatingRef.current = false;
  }, [candles, range]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;
    let onVisibleRangeChanged: (() => void) | null = null;

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
      showSelectedWindow(chart, candlesRef.current, rangeRef.current);

      let previousFrom = chart.timeScale().getVisibleLogicalRange()?.from ?? 0;
      onVisibleRangeChanged = () => {
        const visible = chart.timeScale().getVisibleLogicalRange();
        if (!visible || updatingRef.current) return;
        const movingLeft = visible.from < previousFrom - 0.2;
        previousFrom = visible.from;
        const bars = series.barsInLogicalRange(visible);
        if (movingLeft && bars && bars.barsBefore < 12) onReachStartRef.current();
      };
      chart.timeScale().subscribeVisibleLogicalRangeChange(onVisibleRangeChanged);

      resizeObserver = new ResizeObserver(() => {
        chart.applyOptions({ width: container.clientWidth, height: container.clientHeight });
      });
      resizeObserver.observe(container);
    });

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      if (onVisibleRangeChanged) chartRef.current?.timeScale().unsubscribeVisibleLogicalRangeChange(onVisibleRangeChanged);
      chartRef.current?.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  return <div className="issuer-price-chart" ref={containerRef} role="img"
    aria-label={`Interactive USD candlestick chart with ${candles.length} observed pool intervals`} />;
}
