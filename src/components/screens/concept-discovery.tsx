"use client";

import Link from "next/link";
import type { Route } from "next";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ScanLine, Search, SlidersHorizontal, X } from "lucide-react";
import { articles, companies, companyById, productById, products } from "@/data/catalog";
import type { DiscoveryQueryResult, IssuerListing } from "@/domain/issuer-assets";
import { issuerSectors, type IssuerSector, type IssuerSpotlight, type SpotlightListing } from "@/domain/issuer-spotlight";
import { apiRequest, postJson } from "@/lib/api-client";
import { IssuerLogo } from "@/components/issuer-logo";
import {
  ProductTile,
  RelationshipExplorer,
  ResearchTable,
  SearchCommand,
  SectionHeader,
} from "@/components/discovery-patterns";

const searchErrorMessages: Record<string, string> = {
  AI_PROVIDER_UNAVAILABLE: "Product ownership lookup is temporarily unavailable. Try again later.",
  AI_PRIVACY_UNAVAILABLE: "Product ownership lookup is unavailable under Shelf's privacy settings.",
  AI_DAILY_LIMIT_REACHED: "Today's AI search limit has been reached. Direct company searches still work.",
  AI_MONTHLY_LIMIT_REACHED: "This month's AI search limit has been reached. Direct company searches still work.",
  AI_USER_LIMIT_REACHED: "You've reached today's AI search limit. Direct company searches still work.",
};

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
            Search a company against current xStocks and PreStocks listings. If neither matches,
            Shelf sends the term to OpenRouter to suggest a product owner.
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
          action={<Link className="quiet-link" href="/discover">Explore companies <ArrowRight size={15} aria-hidden="true" /></Link>}
        />
        <div className="home-product-gallery">
          {featuredProducts.map((product) => <ProductTile key={product.id} product={product} />)}
        </div>
      </section>

      <section className="research-home-section company-research-section">
        <SectionHeader
          title="Companies behind familiar brands"
          description="Reviewed relationships with current issuer availability checked from live feeds."
          action={<Link className="quiet-link" href="/discover">Explore issuers <ArrowRight size={15} aria-hidden="true" /></Link>}
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
  market: string;
  setMarket: (value: string) => void;
  setSort: (value: string) => void;
  sort: string;
};

function FilterFields({ market, setMarket, setSort, sort }: FilterProps) {
  return (
    <div className="filter-fields">
      <label><span>Market</span><select value={market} onChange={(event) => setMarket(event.target.value)}><option value="">Both markets</option><option value="public">Public · xStocks</option><option value="private">PreStocks exposure</option></select></label>
      <label><span>Order</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="">Featured order</option><option value="name">Name A–Z</option></select></label>
    </div>
  );
}

function SectorTabs({ available, selected, onChange }: {
  available: IssuerSector[];
  selected: string;
  onChange: (sector: string) => void;
}) {
  return (
    <div aria-label="Filter by sector" className="issuer-sector-tabs">
      <button aria-pressed={!selected} onClick={() => onChange("")} type="button">All sectors</button>
      {available.map((sector) => (
        <button aria-pressed={selected === sector} key={sector} onClick={() => onChange(sector)} type="button">
          {sector}
        </button>
      ))}
    </div>
  );
}

function LiveIssuerResult({ listing }: { listing: IssuerListing }) {
  const { provider, asset } = listing;
  return (
    <article className="live-issuer-card">
      <div className="live-issuer-identity">
        <IssuerLogo imageUrl={asset.logoUrl} name={asset.name} source={provider} />
        <div>
          <p className="eyebrow">{provider === "xstocks" ? "Public · xStocks" : "Private · PreStocks"}</p>
          <h3>{asset.name}</h3>
        </div>
      </div>
      <p>{asset.symbol} · Issuer mint <code className="breakable-code">{asset.mint}</code></p>
      <Link href={`/assets/${provider}/${encodeURIComponent(asset.symbol)}` as Route}>
        View {asset.symbol} issuer asset <ArrowRight size={15} aria-hidden="true" />
      </Link>
    </article>
  );
}

function SpotlightCompanyTable({ listings }: { listings: SpotlightListing[] }) {
  return (
    <div className="issuer-spotlight-table-wrap">
      <table className="issuer-spotlight-table">
        <thead>
          <tr><th>Company</th><th>Sector</th><th>Market</th><th>Symbol</th><th><span className="sr-only">Details</span></th></tr>
        </thead>
        <tbody>
          {listings.map(({ provider, asset, sector }, index) => {
            const detailsUrl = `/assets/${provider}/${encodeURIComponent(asset.symbol)}` as Route;
            return (
              <tr key={asset.companyId}>
                <td data-label="Company">
                  <Link aria-label={`View ${asset.name} details`} className="spotlight-company-link" href={detailsUrl}>
                    <IssuerLogo eager={index < 5} imageUrl={asset.logoUrl} large name={asset.name} source={provider} />
                    <span><strong>{asset.name}</strong><small>{provider === "xstocks" ? "xStocks issuer asset" : "PreStocks issuer asset"}</small></span>
                  </Link>
                </td>
                <td data-label="Sector"><span className="spotlight-sector">{sector}</span></td>
                <td data-label="Market">{provider === "xstocks" ? "Public tracker" : "Private exposure"}</td>
                <td data-label="Symbol"><strong>{asset.symbol}</strong></td>
                <td className="spotlight-details-cell"><Link aria-label={`Open ${asset.name} details`} href={detailsUrl}><ArrowRight size={18} aria-hidden="true" /></Link></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
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
      {result?.kind === "product" && matchedAssets.length ? (
        <>
          <p className="live-search-caution">AI suggested the product owner; the issuer feed confirms only the asset. Verify the relationship before acting.</p>
          <div className="live-issuer-grid">
            {matchedAssets.map((match) => (
              <article className="live-issuer-card" key={match.candidateId}>
                <div className="live-issuer-identity">
                  <IssuerLogo imageUrl={match.logoUrl} name={match.matchedIssuerName ?? match.ownerName ?? "Issuer"} source={match.issuer!} />
                  <div>
                    <p className="eyebrow">AI suggested owner: {match.ownerName}</p>
                    <h3>{match.matchedIssuerName ?? match.ownerName}</h3>
                  </div>
                </div>
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

export function ConceptDiscoverScreen({ initialMarket, initialQuery, initialSector, initialSort }: { initialMarket?: string; initialQuery?: string; initialSector?: string; initialSort?: string }) {
  const searchRef = useRef<HTMLInputElement>(null);
  const leavingDiscover = useRef(false);
  const searchRequest = useRef(0);
  const [query, setQuery] = useState(initialQuery ?? "");
  const [searchedQuery, setSearchedQuery] = useState<string | null>(initialQuery?.trim() || null);
  const [searchResult, setSearchResult] = useState<DiscoveryQueryResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(Boolean(initialQuery?.trim()));
  const [spotlight, setSpotlight] = useState<IssuerSpotlight | null>(null);
  const [spotlightError, setSpotlightError] = useState(false);
  const [spotlightLoading, setSpotlightLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [sector, setSector] = useState(initialSector ?? "");
  const [market, setMarket] = useState(initialMarket ?? "");
  const [sort, setSort] = useState(initialSort ?? "");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const loadSpotlight = useCallback(async () => {
    setSpotlightLoading(true);
    setSpotlightError(false);
    try {
      const result = await apiRequest<IssuerSpotlight>("issuer/spotlight", { cache: "no-store" });
      setSpotlight(result);
    } catch {
      setSpotlightError(true);
    } finally {
      setSpotlightLoading(false);
    }
  }, []);

  useEffect(() => {
    if (searchedQuery || query.trim() || spotlight) return;
    const timer = window.setTimeout(() => void loadSpotlight(), 0);
    return () => window.clearTimeout(timer);
  }, [loadSpotlight, query, searchedQuery, spotlight]);

  const runSearch = useCallback(async (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;

    const requestId = ++searchRequest.current;
    setSearchedQuery(trimmed);
    setSearchResult(null);
    setSearchError(null);
    setSearching(true);
    setFiltersOpen(false);
    try {
      const result = await postJson<DiscoveryQueryResult>("discovery/query", { query: trimmed });
      if (requestId === searchRequest.current) setSearchResult(result);
    } catch (reason) {
      if (requestId === searchRequest.current) {
        const code = reason instanceof Error ? reason.message : "";
        setSearchError(searchErrorMessages[code] ?? "Search failed. Please try again.");
      }
    } finally {
      if (requestId === searchRequest.current) setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (!initialQuery?.trim()) return;
    const timer = window.setTimeout(() => void runSearch(initialQuery), 0);
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
      if (sector) params.set("sector", sector);
      if (market) params.set("market", market);
      if (sort) params.set("sort", sort);
      window.history.replaceState(null, "", params.size ? `/discover?${params}` : "/discover");
    }, 250);
    return () => window.clearTimeout(timer);
  }, [market, query, sector, sort]);

  const availableSectors = issuerSectors.filter((candidate) =>
    spotlight?.listings.some((listing) => listing.sector === candidate),
  );
  const matchingListings = useMemo(() => {
    const matches = spotlight?.listings.filter((listing) =>
      (!sector || listing.sector === sector) &&
      (!market || (market === "public" ? listing.provider === "xstocks" : listing.provider === "prestocks")),
    ) ?? [];
    return sort === "name"
      ? matches.toSorted((a, b) => a.asset.name.localeCompare(b.asset.name))
      : matches;
  }, [market, sector, sort, spotlight]);
  const showingFullList = showAll || Boolean(sector || market || sort);
  const visibleListings = showingFullList ? matchingListings : spotlight?.featured ?? [];
  const activeFilters = [
    sector ? { label: sector, clear: () => setSector("") } : null,
    sort ? { label: "Name A–Z", clear: () => setSort("") } : null,
    market ? { label: market === "public" ? "Public · xStocks" : "PreStocks exposure", clear: () => setMarket("") } : null,
  ].filter((filter) => filter !== null);

  function clearFilters() { setSector(""); setMarket(""); setSort(""); setShowAll(false); }

  const filterProps: FilterProps = { market, setMarket, setSort, sort };

  return (
    <div className="research-discover" onClickCapture={(event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (event.target instanceof Element && event.target.closest("a[href]")) leavingDiscover.current = true;
    }}>
      <header className="discover-title-row">
        <div>
          <h1>Discover</h1>
          <p>Search current xStocks and PreStocks listings. If neither matches, OpenRouter suggests a likely product owner.</p>
        </div>
        <span>{spotlight ? `${spotlight.listings.length} live spotlight companies` : "Live issuer feeds"}</span>
      </header>
      <div className="discover-command-area">
        <SearchCommand
          inputRef={searchRef}
          onChange={changeQuery}
          onClear={() => changeQuery("")}
          onSubmit={() => void runSearch(query)}
          searching={searching}
          value={query}
        />
      </div>
      {searchedQuery ? (
        <>
          <LiveSearchResults
            error={searchError}
            onRetry={() => void runSearch(query)}
            query={searchedQuery}
            result={searchResult}
            searching={searching}
          />
          <button className="back-to-companies" onClick={() => changeQuery("")} type="button">
            Explore featured companies <ArrowRight size={16} aria-hidden="true" />
          </button>
        </>
      ) : (
        <section aria-labelledby="spotlight-heading" className="issuer-spotlight">
          <div className="issuer-spotlight-heading">
            <div>
              <p className="eyebrow">Live company discovery</p>
              <h2 id="spotlight-heading">Companies to explore</h2>
              <p>A changing selection from current xStocks and PreStocks listings. These are familiar names, not a performance ranking or recommendation. Search covers the full issuer feeds.</p>
            </div>
            <button disabled={spotlightLoading} onClick={() => void loadSpotlight()} type="button">Refresh mix</button>
          </div>
          {spotlight?.unavailable.length ? <p className="live-search-caution">{spotlight.unavailable.join(" and ")} feed unavailable. This selection may be incomplete.</p> : null}
          {spotlight?.stale.length ? <p className="live-search-caution">{spotlight.stale.join(" and ")} feed is stale. Asset details will be rechecked.</p> : null}
          {spotlightError && spotlight ? <p className="live-search-caution">Could not refresh the company mix. Showing the previous selection.</p> : null}
          <SectorTabs available={availableSectors} onChange={setSector} selected={sector} />
          <div className="mobile-filter-command">
            <button aria-controls="mobile-discover-filters" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(true)} type="button"><SlidersHorizontal size={17} aria-hidden="true" />Filters{activeFilters.length ? <span aria-label={activeFilters.length + " active filters"}>{activeFilters.length}</span> : null}</button>
          </div>
          {activeFilters.length ? <div className="active-filter-list" aria-label="Active filters">{activeFilters.map((filter) => <button key={filter.label} onClick={filter.clear} type="button">{filter.label}<X size={13} aria-hidden="true" /></button>)}</div> : null}

          <div className="discover-workspace">
            <aside className="filter-rail" aria-label="Discover filters">
              <div className="filter-rail-heading"><strong>Filters</strong>{activeFilters.length || showAll ? <button onClick={clearFilters} type="button">Reset</button> : null}</div>
              <FilterFields {...filterProps} />
            </aside>
            <div className="result-workspace">
              <div className="result-workspace-heading">
                <p><strong>{showingFullList ? "Spotlight directory" : "Featured companies"}</strong></p>
                <span>{visibleListings.length} companies</span>
              </div>
              {spotlightLoading && !spotlight ? <p className="spotlight-status" role="status">Loading current issuer listings…</p> : null}
              {spotlightError && !spotlight ? (
                <div className="research-empty"><h3>Company listings unavailable</h3><p>We could not load the issuer feeds. Search and scan remain available.</p><button onClick={() => void loadSpotlight()} type="button">Retry listings</button></div>
              ) : null}
              {spotlight && !visibleListings.length ? (
                spotlight.unavailable.length && !spotlight.listings.length ? (
                  <div className="research-empty"><h3>Issuer feeds unavailable</h3><p>We could not load current company listings. Search and scan remain available.</p><button onClick={() => void loadSpotlight()} type="button">Retry listings</button></div>
                ) : (
                  <div className="research-empty"><h3>No companies in this selection</h3><p>Try another sector or market. Only current issuer listings appear here.</p><button onClick={clearFilters} type="button">Clear filters</button></div>
                )
              ) : null}
              {visibleListings.length ? <SpotlightCompanyTable listings={visibleListings} /> : null}
              {spotlight && spotlight.listings.length > spotlight.featured.length && !activeFilters.length ? (
                <button className="spotlight-more" onClick={() => setShowAll(!showAll)} type="button">
                  {showAll ? "Show featured mix" : `Show all ${spotlight.listings.length} spotlight companies`}
                </button>
              ) : null}
            </div>
          </div>
        </section>
      )}

      {filtersOpen && !searchedQuery ? (
        <div className="mobile-filter-layer" role="presentation" onMouseDown={() => setFiltersOpen(false)}>
          <section aria-label="Discover filters" aria-modal="true" className="mobile-filter-sheet" id="mobile-discover-filters" onMouseDown={(event) => event.stopPropagation()} role="dialog">
            <header><strong>Filters</strong><button aria-label="Close filters" autoFocus onClick={() => setFiltersOpen(false)} type="button"><X size={20} aria-hidden="true" /></button></header>
            <FilterFields {...filterProps} />
            <footer><button className="sheet-reset" onClick={clearFilters} type="button">Reset</button><button className="sheet-apply" onClick={() => setFiltersOpen(false)} type="button">Show {visibleListings.length} companies</button></footer>
          </section>
        </div>
      ) : null}
    </div>
  );
}
