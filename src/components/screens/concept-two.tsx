"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useRef, useState } from "react";
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

function formatMarketPrice(value: string) {
  const price = Number(value);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: price < 1 ? 4 : 2 }).format(price);
}

export function ConceptTwoHome() {
  const rootRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const storyRef = useRef<HTMLElement>(null);
  const [chapter, setChapter] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [storyVisible, setStoryVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [motionPaused, setMotionPaused] = useState(false);
  const [highlights, setHighlights] = useState<HomeHighlights | null>(null);
  const [highlightsUnavailable, setHighlightsUnavailable] = useState(false);
  const [directoryPreview, setDirectoryPreview] = useState<DirectoryListing[]>([]);
  const storyCompany = directoryPreview.find((listing) => listing.provider === "xstocks");

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
      const preferred = ["AAPLX", "MSFTX", "OPENAI"];
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
    const timer = window.setTimeout(() => setChapter((current) => (current + 1) % chapters.length), 6500);
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
        <div className="c2-section c2-story-grid"><div><p className="c2-kicker">Understanding</p><h2>From a company<br />to the full picture.</h2><div className="c2-chapters" aria-label="Research journey">{chapters.map((item, index) => <button key={item.label} type="button" aria-pressed={chapter === index} onClick={() => { setChapter(index); setCycle((value) => value + 1); }}><span>0{index + 1}</span><span><strong>{item.title}</strong><span className="c2-chapter-copy-wrap"><span className="c2-chapter-copy">{item.body}</span></span></span><ArrowUpRight size={18} aria-hidden="true" />{chapter === index && storyVisible && !motionPaused && !reducedMotion ? <span className="c2-chapter-progress" key={`${chapter}-${cycle}`} aria-hidden="true" /> : null}</button>)}</div></div>
          <div className="c2-story-visual"><div className="c2-orbit" aria-hidden="true"><span /><span /><span /></div>{chapters.map((item, index) => {
            const href = storyCompany ? `/assets/xstocks/${encodeURIComponent(storyCompany.asset.symbol)}` as Route : "/discover";
            return <div className={`c2-story-slide${chapter === index ? " active" : ""}`} aria-hidden={chapter !== index} key={item.label}>
              <div className="c2-story-object"><span>{item.label}</span>
                {index === 0 && storyCompany ? <IssuerLogo imageUrl={storyCompany.asset.logoUrl} name={storyCompany.asset.name} source="xstocks" large /> : <strong>{index === 0 ? "Discover" : index === 1 ? "Issuer record" : storyCompany?.asset.symbol ?? "xStocks"}</strong>}
                <p>{index === 0 && storyCompany ? storyCompany.asset.name : item.detail}</p>
                {index === 2 ? <small>Issuer-defined exposure.<br />Not an ordinary voting share.</small> : null}
                <Link href={href} tabIndex={chapter === index ? 0 : -1}>Research current listings <ArrowUpRight size={16} aria-hidden="true" /></Link>
              </div>
            </div>;
          })}</div>
        </div>
      </section>

      <section className="c2-notes c2-section" data-reveal><header><h2>A little context goes a long way.</h2><Link href="/learn">All research notes <ArrowUpRight size={16} aria-hidden="true" /></Link></header>{articles.slice(0, 3).map((article, index) => <Link href={("/learn/" + article.slug) as Route} key={article.slug}><span>0{index + 1}</span><strong>{article.title}</strong><span>Explainer</span><ArrowUpRight size={19} aria-hidden="true" /></Link>)}</section>
      <footer className="c2-close"><div><p>Your everyday. A new perspective.</p><h2>See what’s behind it.</h2><Link href="/discover">Start exploring <ArrowUpRight size={20} aria-hidden="true" /></Link></div><div className="c2-footer-line"><span>Shelf</span><p>Recognition. Research. Your decision.</p><Link href="/learn">Research notes</Link></div></footer>
    </div>
  );
}
