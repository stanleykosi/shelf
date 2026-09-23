"use client";

import Link from "next/link";
import type { Route } from "next";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ScanLine, Search, SlidersHorizontal, X } from "lucide-react";
import { articles, brands, companies, companyById, productById, products } from "@/data/catalog";
import type { Category } from "@/domain/types";
import type { DiscoveryQueryResult, IssuerListing } from "@/domain/issuer-assets";
import { postJson } from "@/lib/api-client";
import { AI_PROCESSING_CONSENT_VERSION } from "@/lib/ai-consent";
import {
  BrandRow,
  ProductTile,
  RelationshipExplorer,
  ResearchTable,
  SearchCommand,
  SectionHeader,
} from "@/components/discovery-patterns";

const categoryLabels: Record<Category, string> = {
  groceries: "Groceries",
  beauty: "Beauty",
  electronics: "Electronics",
  clothing: "Clothing",
  household: "Household",
};

const entityModes = [
  ["all", "All"],
  ["product", "Products"],
  ["brand", "Brands"],
  ["company", "Companies"],
] as const;

export function ConceptHomeScreen() {
  const featuredProducts = [
    "product-doritos-snack",
    "product-apple-iphone",
    "product-tide-laundry",
    "product-nike-apparel",
    "product-olay-skincare",
  ].map((id) => productById(id)).filter((product) => product !== undefined);
  const familiarCompanies = companies
    .filter((company) => products.some((product) => product.companyId === company.id))
    .slice(0, 6);
  const relationshipProduct = productById("product-doritos-snack");
  const relationshipCompany = companyById("company-pepsico");
  const supportedCompanyCount = companies.filter((company) => company.instrument).length;

  return (
    <div className="research-home">
      <section className="research-hero" aria-labelledby="home-title">
        <div className="research-hero-copy">
          <p className="hero-context">Product-led company research</p>
          <h1 id="home-title">See the company behind what you know.</h1>
          <p className="research-hero-lede">
            Search a company against current xStocks and PreStocks listings. If it is a product,
            Shelf can suggest its owner with AI after you allow that lookup.
          </p>
          <form className="home-search-command" action="/discover" role="search">
            <Search size={20} aria-hidden="true" />
            <label className="sr-only" htmlFor="home-research-search">Search a company or product</label>
            <input id="home-research-search" name="q" placeholder="Search a company or product" type="search" />
            <button type="submit"><span>Search</span><ArrowRight size={17} aria-hidden="true" /></button>
          </form>
          <div className="hero-actions">
            <Link className="primary-scan" data-cta="C01" href="/scan"><ScanLine size={17} aria-hidden="true" />Scan a product</Link>
            <span>Camera, upload, barcode, or link</span>
          </div>
        </div>
        {relationshipProduct && relationshipCompany ? (
          <RelationshipExplorer company={relationshipCompany} product={relationshipProduct} />
        ) : null}
      </section>

      <section className="research-home-section product-discovery-section">
        <SectionHeader
          title="Start with something familiar"
          description="Products are the entry point—not tickers."
          action={<Link className="quiet-link" href="/discover?entity=product">All products <ArrowRight size={15} aria-hidden="true" /></Link>}
        />
        <div className="home-product-gallery">
          {featuredProducts.map((product) => <ProductTile key={product.id} product={product} />)}
        </div>
      </section>

      <section className="research-home-section company-research-section">
        <SectionHeader
          title="Companies behind familiar brands"
          description="Reviewed relationships with current issuer availability checked from live feeds."
          action={<Link className="quiet-link" href="/discover?entity=company">Reviewed companies <ArrowRight size={15} aria-hidden="true" /></Link>}
        />
        <ResearchTable companies={familiarCompanies} />
      </section>

      <section className="research-home-section methodology-section">
        <div className="methodology-copy">
          <h2>Research coverage</h2>
          <p>
            Shelf documents the path from Product to Company before showing whether a supported
            instrument exists. Familiarity is context, not a recommendation.
          </p>
          <Link className="quiet-link" href="/learn/brands-and-companies">How relationships are verified <ArrowRight size={15} aria-hidden="true" /></Link>
        </div>
        <dl className="coverage-metrics">
          <div><dt>Reviewed companies</dt><dd>{companies.length}</dd></div>
          <div><dt>Reviewed issuer records</dt><dd>{supportedCompanyCount}</dd></div>
          <div><dt>Verified relationships</dt><dd>{products.length}</dd></div>
        </dl>
        <div className="methodology-principles" aria-label="Research methodology principles">
          <span><strong>Reviewed relationships</strong>Ownership links are checked against named sources.</span>
          <span><strong>Source-linked research</strong>Dates and regional context remain attached.</span>
          <span><strong>Explicit availability</strong>Research-only and supported exposure stay distinct.</span>
        </div>
      </section>

      <section className="research-home-section learning-section">
        <SectionHeader title="Research notes" action={<Link className="quiet-link" href="/learn">All notes <ArrowRight size={15} aria-hidden="true" /></Link>} />
        <div className="editorial-list">
          {articles.slice(0, 3).map((article, index) => (
            <Link href={("/learn/" + article.slug) as Route} key={article.slug}>
              <span>{String(index + 1).padStart(2, "0")}</span><strong>{article.title}</strong><small>Explainer</small>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

type FilterProps = {
  availability: string;
  category: string;
  entity: string;
  market: string;
  setAvailability: (value: string) => void;
  setCategory: (value: string) => void;
  setMarket: (value: string) => void;
  setSort: (value: string) => void;
  sort: string;
};

function FilterFields({ availability, category, entity, market, setAvailability, setCategory, setMarket, setSort, sort }: FilterProps) {
  return (
    <div className="filter-fields">
      <label><span>Category</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All categories</option>{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      {entity === "company" ? (
        <>
          <label><span>Reviewed market</span><select value={market} onChange={(event) => setMarket(event.target.value)}><option value="">All companies</option><option value="public">Public</option><option value="private">Private</option></select></label>
          <label><span>Issuer record</span><select value={availability} onChange={(event) => setAvailability(event.target.value)}><option value="">Any record</option><option value="available">On record</option><option value="research">Research only</option></select></label>
        </>
      ) : null}
      <label><span>Sort</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="">Catalog order</option><option value="name">Name A–Z</option></select></label>
    </div>
  );
}

function EntityTabs({ entity, onChange }: { entity: string; onChange: (value: string) => void }) {
  return (
    <div className="research-entity-tabs" aria-label="Entity type">
      {entityModes.map(([value, label]) => <button aria-pressed={entity === value} className={entity === value ? "active" : ""} key={value} onClick={() => onChange(value)} type="button">{label}</button>)}
    </div>
  );
}

function LiveIssuerResult({ listing }: { listing: IssuerListing }) {
  const { provider, asset } = listing;
  return (
    <article className="live-issuer-card">
      <p className="eyebrow">{provider === "xstocks" ? "Public · xStocks" : "Private · PreStocks"}</p>
      <h3>{asset.name}</h3>
      <p>{asset.symbol} · Issuer mint <code className="breakable-code">{asset.mint}</code></p>
      <Link href={`/assets/${provider}/${encodeURIComponent(asset.symbol)}` as Route}>
        View {asset.symbol} issuer asset <ArrowRight size={15} aria-hidden="true" />
      </Link>
    </article>
  );
}

function LiveSearchResults({
  error,
  query,
  result,
  searching,
  onRetry,
}: {
  error: string | null;
  query: string | null;
  result: DiscoveryQueryResult | null;
  searching: boolean;
  onRetry: () => void;
}) {
  if (!query) return null;

  const matchedAssets = result?.matches.filter((match) => match.issuer && match.symbol) ?? [];
  const suggestedOwners = Array.from(new Set(result?.matches.map((match) => match.ownerName).filter(Boolean) ?? []));

  return (
    <section aria-live="polite" className="live-search-results">
      <div className="result-workspace-heading">
        <p>Live issuer search for <strong>“{query}”</strong></p>
        <span>xStocks + PreStocks</span>
      </div>
      {searching ? <p role="status">Checking issuer feeds and, if needed, product ownership…</p> : null}
      {error ? <div className="research-empty"><h2>Search unavailable</h2><p>{error}</p><button onClick={onRetry} type="button">Retry search</button></div> : null}
      {result?.unavailable.length ? <p className="live-search-caution">{result.unavailable.join(" and ")} feed unavailable. Results may be incomplete.</p> : null}
      {result?.stale.length ? <p className="live-search-caution">{result.stale.join(" and ")} feed is stale. Asset details will be rechecked.</p> : null}
      {result?.kind === "company" ? (
        <div className="live-issuer-grid">
          {result.listings.map((listing) => <LiveIssuerResult key={listing.asset.companyId} listing={listing} />)}
        </div>
      ) : null}
      {result?.kind === "consent_required" ? (
        <div className="research-empty">
          <h2>No company listing matched</h2>
          <p>If “{query}” is a product or brand, enable AI product lookup above. Shelf will then ask OpenRouter for its likely owner and check both issuer feeds again.</p>
        </div>
      ) : null}
      {result?.kind === "product" && matchedAssets.length ? (
        <>
          <p className="live-search-caution">AI suggested the product owner; the issuer feed confirms only the asset. Verify the relationship before acting.</p>
          <div className="live-issuer-grid">
            {matchedAssets.map((match) => (
              <article className="live-issuer-card" key={match.candidateId}>
                <p className="eyebrow">AI suggested owner: {match.ownerName}</p>
                <h3>{match.matchedIssuerName ?? match.ownerName}</h3>
                <p>{match.issuer === "xstocks" ? "Public · xStocks" : "Private · PreStocks"} · {match.symbol}</p>
                <p>Issuer mint <code className="breakable-code">{match.mint}</code></p>
                <Link href={`/assets/${match.issuer}/${encodeURIComponent(match.symbol!)}` as Route}>
                  View {match.symbol} issuer asset <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        </>
      ) : null}
      {result?.kind === "product" && !matchedAssets.length ? (
        <div className="research-empty">
          <h2>{suggestedOwners.length && result.unavailable.length
            ? "Issuer availability unconfirmed"
            : suggestedOwners.length ? "No supported asset available" : "No company found"}</h2>
          <p>{suggestedOwners.length
            ? `AI suggested ${suggestedOwners.join(", ")}, but no matching current xStocks or PreStocks asset was confirmed.`
            : "AI could not identify a reliable company behind this product. Try a more specific name."}</p>
        </div>
      ) : null}
    </section>
  );
}

export function ConceptDiscoverScreen({ initialAvailability, initialCategory, initialEntity, initialMarket, initialQuery, initialSort }: { initialAvailability?: string; initialCategory?: string; initialEntity?: string; initialMarket?: string; initialQuery?: string; initialSort?: string }) {
  const searchRef = useRef<HTMLInputElement>(null);
  const leavingDiscover = useRef(false);
  const searchRequest = useRef(0);
  const [query, setQuery] = useState(initialQuery ?? "");
  const [searchedQuery, setSearchedQuery] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<DiscoveryQueryResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [aiConsent, setAiConsent] = useState(false);
  const [category, setCategory] = useState(initialCategory ?? "");
  const [entity, setEntity] = useState(initialEntity ?? "all");
  const [market, setMarket] = useState(initialMarket ?? "");
  const [availability, setAvailability] = useState(initialAvailability ?? "");
  const [sort, setSort] = useState(initialSort ?? "");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const runSearch = useCallback(async (term: string, allowAi: boolean) => {
    const trimmed = term.trim();
    if (!trimmed) return;

    const requestId = ++searchRequest.current;
    setSearchedQuery(trimmed);
    setSearchResult(null);
    setSearchError(null);
    setSearching(true);
    try {
      const result = await postJson<DiscoveryQueryResult>("discovery/query", {
        query: trimmed,
        aiProcessingConsentAccepted: allowAi,
        aiProcessingConsentVersion: AI_PROCESSING_CONSENT_VERSION,
        acknowledgeAiProcessing: allowAi,
      });
      if (requestId === searchRequest.current) setSearchResult(result);
    } catch (reason) {
      if (requestId === searchRequest.current) {
        setSearchError(reason instanceof Error ? reason.message.replaceAll("_", " ") : "Search failed");
      }
    } finally {
      if (requestId === searchRequest.current) setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (!initialQuery?.trim()) return;
    const timer = window.setTimeout(() => void runSearch(initialQuery, false), 0);
    return () => window.clearTimeout(timer);
  }, [initialQuery, runSearch]);

  function changeQuery(value: string) {
    searchRequest.current += 1;
    setQuery(value);
    setSearchedQuery(null);
    setSearchResult(null);
    setSearchError(null);
    setSearching(false);
  }

  function changeAiConsent(accepted: boolean) {
    setAiConsent(accepted);
    if (accepted && searchedQuery === query.trim() &&
      (searching || searchResult?.kind === "consent_required")) {
      void runSearch(query, true);
    }
  }

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("focus") === "search") searchRef.current?.focus();
    function focusSearch(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  useEffect(() => {
    if (!filtersOpen) return;
    const previousOverflow = document.body.style.overflow;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setFiltersOpen(false);
    }
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [filtersOpen]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (leavingDiscover.current) return;
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (category) params.set("category", category);
      if (entity !== "all") params.set("entity", entity);
      if (entity === "company" && market) params.set("market", market);
      if (entity === "company" && availability) params.set("availability", availability);
      if (sort) params.set("sort", sort);
      window.history.replaceState(null, "", params.size ? `/discover?${params}` : "/discover");
    }, 250);
    return () => window.clearTimeout(timer);
  }, [availability, category, entity, market, query, sort]);

  const normalizedQuery = searchedQuery?.toLowerCase() ?? "";
  const productResults = useMemo(() => {
    const matches = products.filter((product) => {
      const company = companyById(product.companyId);
      const matchesQuery = !normalizedQuery || [product.name, product.brand, company?.name].filter(Boolean).some((value) => value!.toLowerCase().includes(normalizedQuery));
      return matchesQuery && (!category || product.category === category);
    });
    return sort === "name" ? matches.toSorted((a, b) => a.name.localeCompare(b.name)) : matches;
  }, [category, normalizedQuery, sort]);
  const brandResults = useMemo(() => {
    const matches = brands.filter((brand) => {
      const items = brand.productIds.map((id) => productById(id)).filter((product) => product !== undefined);
      const matchesQuery = !normalizedQuery || brand.name.toLowerCase().includes(normalizedQuery) || items.some((product) => product.name.toLowerCase().includes(normalizedQuery));
      return matchesQuery && (!category || items.some((product) => product.category === category));
    });
    return sort === "name" ? matches.toSorted((a, b) => a.name.localeCompare(b.name)) : matches;
  }, [category, normalizedQuery, sort]);
  const companyResults = useMemo(() => {
    const matches = companies.filter((company) => {
      const relatedProducts = products.filter((product) => product.companyId === company.id);
      const matchesQuery = !normalizedQuery || [company.name, company.ticker, ...relatedProducts.map((product) => product.brand)].filter(Boolean).some((value) => value!.toLowerCase().includes(normalizedQuery));
      const matchesCategory = !category || relatedProducts.some((product) => product.category === category);
      const matchesMarket = !market || (market === "public" && company.instrument?.provider === "xstocks") || (market === "private" && company.instrument?.provider === "prestocks");
      const matchesAvailability = !availability || (availability === "available" && Boolean(company.instrument)) || (availability === "research" && !company.instrument);
      return matchesQuery && matchesCategory && matchesMarket && matchesAvailability;
    });
    return sort === "name" ? matches.toSorted((a, b) => a.name.localeCompare(b.name)) : matches;
  }, [availability, category, market, normalizedQuery, sort]);

  const resultCount = (entity === "all" || entity === "product" ? productResults.length : 0) + (entity === "all" || entity === "brand" ? brandResults.length : 0) + (entity === "all" || entity === "company" ? companyResults.length : 0);
  const visibleProducts = entity === "all" ? productResults.slice(0, 8) : productResults;
  const visibleBrands = entity === "all" ? brandResults.slice(0, 6) : brandResults;
  const visibleCompanies = entity === "all" ? companyResults.slice(0, 6) : companyResults;
  const activeFilters = [
    category ? { label: categoryLabels[category as Category] ?? category, clear: () => setCategory("") } : null,
    sort ? { label: "Name A–Z", clear: () => setSort("") } : null,
    entity === "company" && market ? { label: market === "public" ? "Public" : "Private", clear: () => setMarket("") } : null,
    entity === "company" && availability ? { label: availability === "available" ? "Issuer on record" : "Research only", clear: () => setAvailability("") } : null,
  ].filter((filter) => filter !== null);

  function changeEntity(value: string) {
    setEntity(value);
    if (value !== "company") { setMarket(""); setAvailability(""); }
  }

  function clearAll() { changeQuery(""); setCategory(""); setMarket(""); setAvailability(""); setSort(""); }

  const filterProps: FilterProps = { availability, category, entity, market, setAvailability, setCategory, setMarket, setSort, sort };

  return (
    <div className="research-discover" onClickCapture={(event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (event.target instanceof Element && event.target.closest("a[href]")) leavingDiscover.current = true;
    }}>
      <header className="discover-title-row">
        <div>
          <h1>Discover</h1>
          <p>Search current xStocks and PreStocks listings, or explore reviewed product references.</p>
        </div>
        <span>{resultCount} reviewed references</span>
      </header>
      <div className="discover-command-area">
        <SearchCommand
          inputRef={searchRef}
          onChange={changeQuery}
          onClear={() => changeQuery("")}
          onSubmit={() => void runSearch(query, aiConsent)}
          searching={searching}
          value={query}
        />
      </div>
      <label className="ai-fallback-consent">
        <input checked={aiConsent} onChange={(event) => changeAiConsent(event.target.checked)} type="checkbox" />
        <span>
          If no company matches, send this search to OpenRouter for an AI product-owner suggestion.
          Ownership suggestions are unverified; only issuer feeds provide stock assets.
        </span>
      </label>
      <LiveSearchResults
        error={searchError}
        onRetry={() => void runSearch(query, aiConsent)}
        query={searchedQuery}
        result={searchResult}
        searching={searching}
      />
      <div className="reviewed-browser-heading">
        <h2>Reviewed product references</h2>
        <p>These examples explain product ownership. Current assets are checked against live issuer feeds.</p>
      </div>
      <EntityTabs entity={entity} onChange={changeEntity} />
      <div className="mobile-filter-command">
        <button aria-controls="mobile-discover-filters" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(true)} type="button"><SlidersHorizontal size={17} aria-hidden="true" />Filters{activeFilters.length ? <span aria-label={activeFilters.length + " active filters"}>{activeFilters.length}</span> : null}</button>
      </div>
      {activeFilters.length ? <div className="active-filter-list" aria-label="Active filters">{activeFilters.map((filter) => <button key={filter.label} onClick={filter.clear} type="button">{filter.label}<X size={13} aria-hidden="true" /></button>)}</div> : null}

      <div className="discover-workspace">
        <aside className="filter-rail" aria-label="Discover filters">
          <div className="filter-rail-heading"><strong>Filters</strong>{activeFilters.length || query ? <button onClick={clearAll} type="button">Reset</button> : null}</div>
          <FilterFields {...filterProps} />
        </aside>

        <main className="result-workspace">
          <div className="result-workspace-heading"><p>{normalizedQuery ? <>Reviewed references for <strong>“{searchedQuery}”</strong></> : "Browse reviewed examples"}</p><span>{resultCount} references</span></div>
          {resultCount ? (
            <div className="entity-result-groups">
              {(entity === "all" || entity === "product") && visibleProducts.length ? (
                <section className="database-section">
                  <SectionHeader title="Products" action={entity === "all" ? <button className="quiet-link" onClick={() => changeEntity("product")} type="button">View all {productResults.length}</button> : null} />
                  <div className="discover-product-grid">{visibleProducts.map((product) => <ProductTile key={product.id} product={product} />)}</div>
                </section>
              ) : null}
              {(entity === "all" || entity === "brand") && visibleBrands.length ? (
                <section className="database-section">
                  <SectionHeader title="Brands" action={entity === "all" ? <button className="quiet-link" onClick={() => changeEntity("brand")} type="button">View all {brandResults.length}</button> : null} />
                  <div className="brand-result-list"><div className="brand-row brand-row-header"><span /><span>Brand</span><span>Products</span><span>Company</span></div>{visibleBrands.map((brand) => <BrandRow brand={brand} key={brand.slug} />)}</div>
                </section>
              ) : null}
              {(entity === "all" || entity === "company") && visibleCompanies.length ? (
                <section className="database-section"><SectionHeader title="Companies" action={entity === "all" ? <button className="quiet-link" onClick={() => changeEntity("company")} type="button">View all {companyResults.length}</button> : null} /><ResearchTable companies={visibleCompanies} /></section>
              ) : null}
            </div>
          ) : (
            <div className="research-empty"><h2>No reviewed reference</h2><p>Reviewed examples cover selected products; the live search above checks both issuer feeds and can resolve other products with AI consent.</p><div><button onClick={clearAll} type="button">Clear filters</button><Link href="/scan">Scan a product</Link></div></div>
          )}
        </main>
      </div>

      {filtersOpen ? (
        <div className="mobile-filter-layer" role="presentation" onMouseDown={() => setFiltersOpen(false)}>
          <section aria-label="Discover filters" aria-modal="true" className="mobile-filter-sheet" id="mobile-discover-filters" onMouseDown={(event) => event.stopPropagation()} role="dialog">
            <header><strong>Filters</strong><button aria-label="Close filters" autoFocus onClick={() => setFiltersOpen(false)} type="button"><X size={20} aria-hidden="true" /></button></header>
            <FilterFields {...filterProps} />
            <footer><button className="sheet-reset" onClick={clearAll} type="button">Reset</button><button className="sheet-apply" onClick={() => setFiltersOpen(false)} type="button">Show {resultCount} results</button></footer>
          </section>
        </div>
      ) : null}
    </div>
  );
}
