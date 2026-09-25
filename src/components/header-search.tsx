"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { products } from "@/data/catalog";
import type { IssuerListing } from "@/domain/issuer-assets";
import type { Product } from "@/domain/types";
import { apiRequest } from "@/lib/api-client";
import { ProductArtwork } from "@/components/discovery-patterns";
import { IssuerLogo } from "@/components/issuer-logo";

type SearchResult = { href: Route; label: string; detail: string; kind: "Product" | "Company"; product?: Product; issuer?: IssuerListing };
type IssuerSearchResponse = { listings: IssuerListing[]; unavailable: string[]; stale: string[] };

function matchingProducts(query: string): SearchResult[] {
  const words = query.toLocaleLowerCase();
  return products
    .filter((product) => `${product.name} ${product.brand}`.toLocaleLowerCase().includes(words))
    .slice(0, 5)
    .map((product) => ({
      href: `/products/${product.slug}` as Route,
      label: product.name,
      detail: `${product.brand} · Reviewed product`,
      kind: "Product" as const,
      product,
    }));
}

export function HeaderSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [issuerResults, setIssuerResults] = useState<IssuerListing[]>([]);
  const [issuerQuery, setIssuerQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const trimmed = query.trim();
  const productResults = trimmed.length >= 2 ? matchingProducts(trimmed) : [];
  const companyResults: SearchResult[] = issuerQuery === trimmed
    ? issuerResults.slice(0, 6).map((issuer) => {
      const { provider, asset } = issuer;
      return {
        href: `/assets/${provider}/${encodeURIComponent(asset.symbol)}` as Route,
        label: asset.name,
        detail: `${asset.symbol} · ${provider === "xstocks" ? "xStocks" : "PreStocks"}`,
        kind: "Company" as const,
        issuer,
      };
    })
    : [];
  const results = [...companyResults, ...productResults];
  const allResultsHref = `/discover?q=${encodeURIComponent(trimmed)}` as Route;

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
        window.requestAnimationFrame(() => inputRef.current?.focus());
      }
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setOpen(false), 0);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    if (trimmed.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(false);
      try {
        const response = await apiRequest<IssuerSearchResponse>(
          `issuer/search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal, cache: "no-store" },
        );
        if (!controller.signal.aborted) {
          setIssuerResults(response.listings);
          setIssuerQuery(trimmed);
          setError(response.unavailable.length > 0 || response.stale.length > 0);
        }
      } catch {
        if (!controller.signal.aborted) {
          setIssuerResults([]);
          setIssuerQuery(trimmed);
          setError(true);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  function closeSearch() {
    setOpen(false);
    inputRef.current?.blur();
  }

  function openSearch() {
    setOpen(true);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      closeSearch();
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => {
        if (!results.length) return -1;
        return event.key === "ArrowDown"
          ? (current + 1) % results.length
          : (current - 1 + results.length) % results.length;
      });
    }
    if (event.key === "Enter" && trimmed) {
      event.preventDefault();
      router.push(activeIndex >= 0 && results[activeIndex] ? results[activeIndex].href : allResultsHref);
      closeSearch();
    }
  }

  return (
    <div className="header-search" ref={rootRef}>
      <button aria-label="Search Shelf" aria-expanded={open} className="header-search-trigger" onClick={openSearch} type="button">
        <Search size={19} aria-hidden="true" />
      </button>
      <div className={`header-search-field${open ? " is-open" : ""}`}>
        <Search size={17} aria-hidden="true" />
        <input
          aria-activedescendant={activeIndex >= 0 && results[activeIndex] ? `header-search-result-${activeIndex}` : undefined}
          aria-autocomplete="list"
          aria-controls="header-search-results"
          aria-expanded={open && trimmed.length >= 2}
          aria-label="Search products and companies"
          maxLength={120}
          onChange={(event) => { setQuery(event.target.value); setActiveIndex(-1); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onInputKeyDown}
          placeholder="Search products or companies"
          ref={inputRef}
          role="combobox"
          type="search"
          value={query}
        />
        <kbd aria-hidden="true">⌘K</kbd>
        <button aria-label="Close search" className="header-search-close" onClick={closeSearch} type="button"><X size={18} aria-hidden="true" /></button>
      </div>
      {open && trimmed.length >= 2 ? (
        <div className="header-search-results" id="header-search-results" role="listbox">
          {results.map((result, index) => (
            <Link
              aria-selected={activeIndex === index}
              className={activeIndex === index ? "active" : ""}
              href={result.href}
              id={`header-search-result-${index}`}
              key={`${result.kind}-${result.href}`}
              onMouseMove={() => setActiveIndex(index)}
              role="option"
            >
              <span className="header-search-thumbnail">
                {result.product ? <ProductArtwork product={result.product} sizes="48px" /> : result.issuer ? (
                  <IssuerLogo imageUrl={result.issuer.asset.logoUrl} name={result.issuer.asset.name} source={result.issuer.provider} />
                ) : null}
              </span>
              <span className="header-search-result-copy"><span className="header-search-result-kind">{result.kind}</span><strong>{result.label}</strong><small>{result.detail}</small></span>
            </Link>
          ))}
          {loading || issuerQuery !== trimmed ? <p role="status">Checking current company listings…</p> : null}
          {!results.length && !loading && issuerQuery === trimmed ? <p>No matching reviewed products or current company listings.</p> : null}
          {error && issuerQuery === trimmed ? <p>Some company listings are unavailable. You can still search Discover.</p> : null}
          <Link className="header-search-all" href={allResultsHref}>
            Search Discover for “{trimmed}” <span aria-hidden="true">↗</span>
          </Link>
        </div>
      ) : null}
    </div>
  );
}
