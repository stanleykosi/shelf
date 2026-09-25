"use client";

import Link from "next/link";
import Image from "next/image";
import type { Route } from "next";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { siApple, siNvidia } from "simple-icons";
import { ArrowDown, ArrowUpRight, Check, Pause, Play, ScanLine, Search } from "@/components/studio-icons";
import { ArrowDownRight, Minus } from "lucide-react";
import { articles } from "@/data/catalog";
import { IssuerLogo } from "@/components/issuer-logo";
import type { DirectoryListing, IssuerDirectory } from "@/domain/issuer-spotlight";
import type { HomeHighlights } from "@/domain/home-highlights";
import { apiRequest } from "@/lib/api-client";

const chapters = [
  { title: "Find a company.", body: "Start with a current issuer listing, then explore what the business does and how it appears on Shelf.", label: "Discover", detail: "A current company listing" },
  { title: "Check the evidence.", body: "Follow the issuer record, token symbol, exact Solana mint, and source before drawing a conclusion.", label: "Research", detail: "Details backed by an issuer feed" },
  { title: "Understand the instrument.", body: "A token has its own terms and market risks. Research comes first; any investment is a separate decision.", label: "Exposure", detail: "A separate instrument, a separate decision" },
];

const coinCompanies = [
  { name: "Apple", mark: "AAPL", logoPath: siApple.path },
  { name: "Microsoft", mark: "MSFT", logoPath: "M0 0h11v11H0z M13 0h11v11H13z M0 13h11v11H0z M13 13h11v11H13z" },
  { name: "NVIDIA", mark: "NVDA", logoPath: siNvidia.path },
];

type RollContext = { direction: 1 | -1; quiet: boolean; paused: boolean };
const settledCoin = "translate3d(0%, 0%, 0) rotate(0deg)";
const rollingEase = [0.42, 0, 0.18, 1] as const;

function rollTransition({ quiet, paused }: RollContext) {
  return { duration: paused ? 0 : quiet ? 0.16 : 0.92, ease: rollingEase };
}

// The rail rises on both sides, more on the right. Lift each rolling coin's center
// with that side of the rail so its rim stays in contact while it rotates.
const coinVariants = {
  enter: (context: RollContext) => ({
    transform: context.quiet ? settledCoin : `translate3d(${context.direction * 145}%, ${context.direction === 1 ? "-26%" : "-19%"}, 0) rotate(${context.direction * 210}deg)`,
    opacity: context.quiet ? 0 : 1,
    transition: rollTransition(context),
  }),
  center: (context: RollContext) => ({ transform: settledCoin, opacity: 1, transition: rollTransition(context) }),
  exit: (context: RollContext) => ({
    transform: context.quiet ? settledCoin : `translate3d(${-context.direction * 145}%, ${context.direction === 1 ? "-19%" : "-26%"}, 0) rotate(${-context.direction * 210}deg)`,
    opacity: context.quiet ? 0 : 1,
    transition: rollTransition(context),
  }),
};

function formatMarketPrice(value: string) {
  const price = Number(value);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: price < 1 ? 4 : 2 }).format(price);
}

export function ConceptTwoHome() {
  const rootRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const storyRef = useRef<HTMLElement>(null);
  const [chapter, setChapter] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [cycle, setCycle] = useState(0);
  const [storyVisible, setStoryVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [motionPaused, setMotionPaused] = useState(false);
  const [highlights, setHighlights] = useState<HomeHighlights | null>(null);
  const [highlightsUnavailable, setHighlightsUnavailable] = useState(false);
  const [directoryPreview, setDirectoryPreview] = useState<DirectoryListing[]>([]);
  const selectedCoin = coinCompanies[chapter];

  function chooseChapter(index: number) {
    if (index !== chapter) {
      setDirection((index - chapter + chapters.length) % chapters.length === 1 ? 1 : -1);
      setChapter(index);
    }
    setCycle((value) => value + 1);
  }

  useEffect(() => {
    let active = true;
    void apiRequest<HomeHighlights>("home/highlights").then((result) => {
      if (active) setHighlights(result);
    }).catch(() => {
      if (active) setHighlightsUnavailable(true);
    });
    void apiRequest<IssuerDirectory>("issuer/directory").then((directory) => {
      const companyListings = directory.listings.filter((listing) =>
        listing.sector !== "Funds & ETFs" &&
        !/\b(etf|fund|index|trust)\b|sp500/i.test(listing.asset.name),
      );
      const preferred = ["AAPLX", "MSFTX", "NVDAX"];
      const preview = companyListings.toSorted((left, right) => {
        const leftRank = preferred.indexOf(left.asset.symbol.toUpperCase());
        const rightRank = preferred.indexOf(right.asset.symbol.toUpperCase());
        return (leftRank < 0 ? 99 : leftRank) - (rightRank < 0 ? 99 : rightRank);
      }).slice(0, 3);
      if (active) setDirectoryPreview(preview);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const section = storyRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(([entry]) => setStoryVisible(entry.isIntersecting), { threshold: 0.3 });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!storyVisible || motionPaused || reducedMotion) return;
    const timer = window.setTimeout(() => {
      setDirection(1);
      setChapter((current) => (current + 1) % chapters.length);
    }, 6500);
    return () => window.clearTimeout(timer);
  }, [chapter, cycle, storyVisible, motionPaused, reducedMotion]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let observer: IntersectionObserver | undefined;
    let frame = 0;
    const sections = root.querySelectorAll<HTMLElement>("[data-reveal]");

    function configureMotion() {
      observer?.disconnect();
      window.removeEventListener("scroll", updateBoard);
      cancelAnimationFrame(frame);
      if (motionPaused || reducedMotion.matches) {
        sections.forEach((section) => section.removeAttribute("data-waiting"));
        if (boardRef.current) boardRef.current.style.transform = "none";
        return;
      }
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.removeAttribute("data-waiting");
            observer?.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12 });
      sections.forEach((section) => {
        if (section.getBoundingClientRect().top > window.innerHeight) {
          section.setAttribute("data-waiting", "true");
          observer?.observe(section);
        }
      });
      window.addEventListener("scroll", updateBoard, { passive: true });
      updateBoard();
    }

    function updateBoard() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const board = boardRef.current;
        if (!board || window.innerWidth < 820) return;
        const progress = Math.max(0, Math.min(1, window.scrollY / 600));
        board.style.transform = "perspective(1800px) rotateX(" + (5 * (1 - progress)) + "deg)";
      });
    }

    configureMotion();
    reducedMotion.addEventListener("change", configureMotion);
    return () => {
      observer?.disconnect();
      window.removeEventListener("scroll", updateBoard);
      reducedMotion.removeEventListener("change", configureMotion);
      cancelAnimationFrame(frame);
    };
  }, [motionPaused]);

  return (
    <div className="c2-home" ref={rootRef} data-motion={motionPaused ? "paused" : "enabled"}>
      <section className="c2-opening" aria-labelledby="c2-title">
        <div className="c2-hero-copy">
          <p className="c2-kicker"><span /> Familiar products. A wider perspective.</p>
          <h1 id="c2-title">The things you know.<br /><span>The companies behind them.</span></h1>
          <p className="c2-intro">A new starting point for company research.<br className="c2-desktop-break" /> Connect everyday products to the businesses that make them.</p>
          <form action="/discover" className="c2-search" role="search">
            <Search size={19} aria-hidden="true" />
            <label htmlFor="c2-search" className="sr-only">Search products, brands, or companies</label>
            <input id="c2-search" name="q" type="search" placeholder="Try Doritos, Apple, Tide…" />
            <button type="submit">Discover <ArrowUpRight size={17} aria-hidden="true" /></button>
          </form>
          <div className="c2-hero-secondary"><Link href="/scan"><ScanLine size={17} aria-hidden="true" /> Scan a product</Link><span>Start with curiosity. No investment required.</span></div>
        </div>

        <div className="c2-board-stage">
          <div className="c2-field" aria-hidden="true"><i /><i /><i /></div>
          <div className="c2-research-board c2-discover-board" ref={boardRef} aria-label="Preview of the Discover page">
            <header className="c2-board-header"><span className="c2-board-brand">Shelf<span>/ Discover</span></span><span className="c2-proof"><Check size={13} aria-hidden="true" /> Current issuer listings</span></header>
            <div className="c2-discover-preview">
              <aside className="c2-discover-rail" aria-hidden="true"><strong>Explore</strong><span className="selected">Discover</span><span>Companies</span><span>Products</span><span>Research notes</span></aside>
              <div className="c2-discover-canvas">
                <p className="c2-preview-eyebrow">Discover / Company directory</p>
                <div className="c2-preview-heading"><div><h2>Meet the companies.</h2><p>Start with a name. Follow the issuer record.</p></div><Link href="/discover">Open Discover <ArrowUpRight size={16} aria-hidden="true" /></Link></div>
                <div className="c2-preview-search"><Search size={18} aria-hidden="true" /><span>Search companies or products</span><span className="c2-preview-shortcut">⌘K</span></div>
                <div className="c2-preview-filters" aria-hidden="true"><span>All sectors</span><span>Public · xStocks</span><span>Private · PreStocks</span></div>
                <div className="c2-preview-list">
                  {directoryPreview.length ? directoryPreview.map(({ provider, asset }) => (
                    <Link href={`/assets/${provider}/${encodeURIComponent(asset.symbol)}` as Route} key={`${provider}-${asset.symbol}`}>
                      <IssuerLogo imageUrl={asset.logoUrl} name={asset.name} source={provider} />
                      <span><strong>{asset.name}</strong><small>{provider === "xstocks" ? "Public · xStocks" : "Private · PreStocks"}</small></span>
                      <span className="c2-preview-symbol">{asset.symbol}</span><ArrowUpRight size={18} aria-hidden="true" />
                    </Link>
                  )) : <p>Current company listings appear here when the issuer directory is available.</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="c2-opening-foot"><a href="#c2-familiar">Explore companies <ArrowDown size={15} aria-hidden="true" /></a><button aria-pressed={motionPaused} onClick={() => setMotionPaused((paused) => !paused)} type="button">{motionPaused ? <Play size={13} aria-hidden="true" /> : <Pause size={13} aria-hidden="true" />}{motionPaused ? "Enable motion" : "Pause motion"}</button></div>
      </section>

      <section className="c2-familiar c2-section" id="c2-familiar" data-reveal>
        <header className="c2-section-heading"><div><p>Company discovery</p><h2>Follow the companies<br />moving right now.</h2></div><div><p>Four familiar xStocks companies, ordered by their one-hour Solana pool change.</p><Link href="/discover">Explore company directory <ArrowUpRight size={17} aria-hidden="true" /></Link></div></header>
        {highlights?.items.length ? (
          <div className="c2-market-gallery">{highlights.items.map((item) => {
            const rising = item.change1hPct > 0;
            const falling = item.change1hPct < 0;
            return <Link href={`/assets/xstocks/${encodeURIComponent(item.symbol)}` as Route} key={item.symbol} className="c2-market-card">
              <span className="c2-market-card-top"><IssuerLogo imageUrl={item.logoUrl} name={item.name} source="xstocks" /><span>xStocks · Solana</span><ArrowUpRight size={19} aria-hidden="true" /></span>
              <span className="c2-market-card-name"><strong>{item.name}</strong><small>{item.symbol}</small></span>
              <span className="c2-market-card-price"><small>Pool price · USD</small><strong>{formatMarketPrice(item.priceUsd)}</strong></span>
              <span className={`c2-market-card-change${rising ? " is-up" : falling ? " is-down" : ""}`}>
                {rising ? <ArrowUpRight size={17} aria-hidden="true" /> : falling ? <ArrowDownRight size={17} aria-hidden="true" /> : <Minus size={17} aria-hidden="true" />}
                {rising ? "+" : ""}{item.change1hPct.toFixed(2)}% <small>past 1h</small>
              </span>
              <span className="c2-market-card-foot"><span>Research {item.symbol}</span><ArrowUpRight size={18} aria-hidden="true" /></span>
            </Link>;
          })}</div>
        ) : <div className="c2-market-empty" role="status"><p>{highlightsUnavailable ? "Current market comparisons are unavailable right now." : highlights ? "No xStocks have a qualifying one-hour pool comparison right now." : "Checking current xStocks and Solana markets…"}</p><Link href="/discover">Browse current issuer listings <ArrowUpRight size={16} aria-hidden="true" /></Link></div>}
        <p className="c2-image-note">{highlights ? `Checked ${new Date(highlights.checkedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}. ` : ""}The company selection is editorial. xStocks verifies each issuer and mint; DEX Screener supplies the most liquid qualifying Solana pool price and one-hour change. Pool prices are indicative, not executable quotes or investment recommendations.{highlights?.incomplete ? " Some market feeds were unavailable." : ""}</p>
      </section>

      <section className="c2-story" data-reveal ref={storyRef}>
        <div className="c2-section c2-story-grid"><div><p className="c2-kicker">Understanding</p><h2>From a company<br />to the full picture.</h2><div className="c2-chapters" aria-label="Research journey">{chapters.map((item, index) => <button key={item.label} type="button" aria-pressed={chapter === index} onClick={() => chooseChapter(index)}><span>0{index + 1}</span><span><strong>{item.title}</strong><span className="c2-chapter-copy-wrap"><span className="c2-chapter-copy">{item.body}</span></span></span><ArrowUpRight size={18} aria-hidden="true" />{chapter === index && storyVisible && !motionPaused && !reducedMotion ? <span className="c2-chapter-progress" key={`${chapter}-${cycle}`} aria-hidden="true" /> : null}</button>)}</div></div>
          <div className="c2-story-visual">
            <div className="c2-coin-scene" aria-hidden="true">
              <svg className="c2-silver-rail" viewBox="0 0 560 560" preserveAspectRatio="none" aria-hidden="true">
                <defs><linearGradient id="c2-rail-metal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f9ffff" /><stop offset=".27" stopColor="#b7c8ca" /><stop offset=".58" stopColor="#657e83" /><stop offset="1" stopColor="#243a3b" /></linearGradient></defs>
                <path className="c2-rail-shadow" d="M-28 357 C92 345 171 387 280 391 S449 368 588 331" />
                <path className="c2-rail-body" d="M-28 357 C92 345 171 387 280 391 S449 368 588 331" />
                <path className="c2-rail-highlight" d="M-28 354 C92 342 171 384 280 388 S449 365 588 328" />
              </svg>
              <AnimatePresence initial={false} custom={{ direction, quiet: reducedMotion || motionPaused, paused: motionPaused }}>
                <motion.div
                  key={selectedCoin.mark}
                  className="c2-company-coin"
                  data-company={selectedCoin.mark}
                  custom={{ direction, quiet: reducedMotion || motionPaused, paused: motionPaused }}
                  variants={coinVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                >
                  <Image src="/images/understanding/silver-coin.png" alt="" fill sizes="(max-width: 819px) 280px, 360px" />
                  <svg className="c2-coin-engraving" viewBox="0 0 24 24" aria-hidden="true"><path className="c2-coin-mark-shadow" d={selectedCoin.logoPath} /><path className="c2-coin-mark-highlight" d={selectedCoin.logoPath} /><path className="c2-coin-mark-face" d={selectedCoin.logoPath} /></svg>
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="c2-coin-caption" aria-live="polite">
              <span className="c2-coin-caption-label">A familiar name, a closer look</span>
              <div key={selectedCoin.mark} className="c2-coin-caption-content">
                <span><strong>{selectedCoin.name}</strong><small>{chapters[chapter].detail}</small></span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="c2-notes c2-section" data-reveal><header><h2>A little context goes a long way.</h2><Link href="/learn">All research notes <ArrowUpRight size={16} aria-hidden="true" /></Link></header>{articles.slice(0, 3).map((article, index) => <Link href={("/learn/" + article.slug) as Route} key={article.slug}><span>0{index + 1}</span><strong>{article.title}</strong><span>Explainer</span><ArrowUpRight size={19} aria-hidden="true" /></Link>)}</section>
      <footer className="c2-close"><div><p>Your everyday. A new perspective.</p><h2>See what’s behind it.</h2><Link href="/discover">Start exploring <ArrowUpRight size={20} aria-hidden="true" /></Link></div><div className="c2-footer-line"><span>Shelf</span><p>Recognition. Research. Your decision.</p><Link href="/learn">Research notes</Link></div></footer>
    </div>
  );
}
