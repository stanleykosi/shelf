"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUpRight, Check, ChevronRight, Pause, Play, ScanLine, Search } from "@/components/studio-icons";
import { articles, companies, companyById, productById, products } from "@/data/catalog";
import { ProductArtwork, ResearchTable } from "@/components/discovery-patterns";
import { CapitalRelationship } from "@/components/capital-relationship";

const examples = ["product-doritos-snack", "product-apple-iphone", "product-tide-laundry"]
  .map((id) => productById(id))
  .filter((product) => product !== undefined);

const gallery = ["product-pepsi-drink", "product-apple-iphone", "product-lays-snack", "product-tide-laundry"]
  .map((id) => productById(id))
  .filter((product) => product !== undefined);

const chapters = [
  { title: "Start with recognition.", body: "The things you reach for every day are a way into understanding the businesses behind them.", label: "Product", detail: "A familiar starting point" },
  { title: "Follow the relationship.", body: "A product, its brand, and its parent company each tell a different part of the story. Shelf keeps the connections visible.", label: "Company", detail: "Ownership, backed by a source" },
  { title: "Understand the next layer.", body: "Some companies have a supported instrument. Research stands on its own; any investment is a separate, deliberate decision.", label: "Exposure", detail: "A separate instrument, a separate decision" },
];

export function ConceptTwoHome() {
  const rootRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [exampleIndex, setExampleIndex] = useState(0);
  const [chapter, setChapter] = useState(0);
  const [motionPaused, setMotionPaused] = useState(false);
  const product = examples[exampleIndex];
  const familiarCompanies = companies.filter((item) => products.some((entry) => entry.companyId === item.id));

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
          <div className="c2-research-board" ref={boardRef}>
            <header className="c2-board-header"><span className="c2-board-brand">Shelf<span>/ Research explorer</span></span><span className="c2-proof"><Check size={13} aria-hidden="true" /> Source-linked relationships</span></header>
            <div className="c2-board-body">
              <nav className="c2-example-nav" aria-label="Example product"><span>Start with a product</span>{examples.map((item, index) => <button key={item.id} aria-pressed={exampleIndex === index} onClick={() => setExampleIndex(index)} type="button"><span>{item.brand}</span><ChevronRight size={15} aria-hidden="true" /></button>)}<Link href="/discover">All products <ArrowUpRight size={14} aria-hidden="true" /></Link></nav>
              <div className="c2-board-content" key={product.id}>
                <div className="c2-board-title"><div><span>Relationship explorer</span><h2>Behind {product.brand}.</h2></div><span className="c2-board-index">0{exampleIndex + 1} / 03</span></div>
                <CapitalRelationship product={product} />
              </div>
            </div>
          </div>
        </div>
        <div className="c2-opening-foot"><a href="#c2-familiar">Explore the everyday <ArrowDown size={15} aria-hidden="true" /></a><button aria-pressed={motionPaused} onClick={() => setMotionPaused((paused) => !paused)} type="button">{motionPaused ? <Play size={13} aria-hidden="true" /> : <Pause size={13} aria-hidden="true" />}{motionPaused ? "Enable motion" : "Pause motion"}</button></div>
      </section>

      <section className="c2-familiar c2-section" id="c2-familiar" data-reveal>
        <header className="c2-section-heading"><div><p>01 / Recognition</p><h2>Begin with a Product,<br />not a ticker.</h2></div><div><p>Your next research question might<br />already be in your kitchen.</p><Link href="/discover">Discover all products <ArrowUpRight size={17} aria-hidden="true" /></Link></div></header>
        <div className="c2-product-gallery">{gallery.map((item, index) => <Link href={("/products/" + item.slug) as Route} key={item.id} className="c2-product"><div className="c2-product-frame"><span className="c2-product-number">0{index + 1}</span><ProductArtwork product={item} sizes="(max-width: 819px) 72vw, 300px" /><span className="c2-product-arrow"><ArrowUpRight size={21} aria-hidden="true" /></span></div><div className="c2-product-caption"><strong>{item.name}</strong><span>{companyById(item.companyId)?.name}</span></div></Link>)}</div>
        <p className="c2-image-note">Reviewed product families. Imagery may show a representative product or brand identity.</p>
      </section>

      <section className="c2-story" data-reveal>
        <div className="c2-section c2-story-grid"><div><p className="c2-kicker">02 / Understanding</p><h2>One familiar thing.<br />A bigger picture.</h2><div className="c2-chapters" aria-label="Research journey">{chapters.map((item, index) => <button key={item.label} type="button" aria-pressed={chapter === index} onClick={() => setChapter(index)}><span>0{index + 1}</span><span><strong>{item.title}</strong>{chapter === index ? <span className="c2-chapter-copy">{item.body}</span> : null}</span><ArrowUpRight size={18} aria-hidden="true" /></button>)}</div></div>
          <div className="c2-story-visual" key={chapter}><div className="c2-orbit" aria-hidden="true"><span /><span /><span /></div><div className="c2-story-object"><span>{chapters[chapter].label}</span>{chapter === 0 ? <ProductArtwork product={examples[0]} sizes="220px" /> : <strong>{chapter === 1 ? "PepsiCo" : "PEPx"}</strong>}<p>{chapters[chapter].detail}</p>{chapter === 2 ? <small>Issuer-defined exposure.<br />Not an ordinary voting share.</small> : null}<Link href={chapter === 0 ? "/products/doritos-snack" : "/companies/pepsico"}>Read the research <ArrowUpRight size={16} aria-hidden="true" /></Link></div></div>
        </div>
      </section>

      <section className="c2-section c2-companies" data-reveal><header className="c2-section-heading"><div><p>03 / Company research</p><h2>Familiar names.<br />Clearer connections.</h2></div><Link href="/discover">Company directory <ArrowUpRight size={17} aria-hidden="true" /></Link></header><ResearchTable companies={familiarCompanies} /></section>

      <section className="c2-method c2-section" data-reveal><div><p>Built on evidence</p><h2>Curiosity is the start.<br />Clarity is the point.</h2><p>Every relationship has a source. Every instrument has its own terms. Research is useful whether or not you invest.</p><Link href="/learn/brands-and-companies">How Shelf connects the dots <ArrowUpRight size={17} aria-hidden="true" /></Link></div><dl><div><dt>Reviewed companies</dt><dd>{companies.length.toString().padStart(2, "0")}</dd></div><div><dt>Product relationships</dt><dd>{products.length}</dd></div><div><dt>Companies with supported exposure</dt><dd>{companies.filter((item) => item.instrument).length}</dd></div></dl></section>

      <section className="c2-notes c2-section" data-reveal><header><h2>A little context goes a long way.</h2><Link href="/learn">All research notes <ArrowUpRight size={16} aria-hidden="true" /></Link></header>{articles.slice(0, 3).map((article, index) => <Link href={("/learn/" + article.slug) as Route} key={article.slug}><span>0{index + 1}</span><strong>{article.title}</strong><span>Explainer</span><ArrowUpRight size={19} aria-hidden="true" /></Link>)}</section>
      <footer className="c2-close"><div><p>Your everyday. A new perspective.</p><h2>See what’s behind it.</h2><Link href="/discover">Start exploring <ArrowUpRight size={20} aria-hidden="true" /></Link></div><div className="c2-footer-line"><span>Shelf</span><p>Recognition. Research. Your decision.</p><Link href="/learn">Research notes</Link></div></footer>
    </div>
  );
}
