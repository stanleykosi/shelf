"use client";

import Link from "next/link";
import type { Route } from "next";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, RefreshCw, SlidersHorizontal, X } from "lucide-react";
import type { DiscoveryQueryResult, IssuerListing } from "@/domain/issuer-assets";
import { issuerSectors, selectFeaturedCompanies, type DirectoryListing, type IssuerDirectory, type IssuerSector } from "@/domain/issuer-spotlight";
import { apiRequest, postJson } from "@/lib/api-client";
import { IssuerLogo } from "@/components/issuer-logo";
import { DiscoveryFootnote, DiscoveryScanLink, DiscoveryThemes } from "@/components/discovery-editorial";
import {
  SearchCommand,
} from "@/components/discovery-patterns";

const searchErrorMessages: Record<string, string> = {
  AI_PROVIDER_UNAVAILABLE: "Product ownership lookup is temporarily unavailable. Try again later.",
  AI_PRIVACY_UNAVAILABLE: "Product ownership lookup is unavailable under Shelf's privacy settings.",
  AI_DAILY_LIMIT_REACHED: "Today's AI search limit has been reached. Direct company searches still work.",
  AI_MONTHLY_LIMIT_REACHED: "This month's AI search limit has been reached. Direct company searches still work.",
  AI_USER_LIMIT_REACHED: "You've reached today's AI search limit. Direct company searches still work.",
};

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

function SpotlightCompanyTable({ listings }: { listings: DirectoryListing[] }) {
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
                <td data-label="Market"><span className={`discovery-market-badge ${provider}`}>{provider === "xstocks" ? "Public tracker" : "Private exposure"}</span></td>
                <td data-label="Symbol"><strong className="discovery-symbol">{asset.symbol}</strong></td>
                <td className="spotlight-details-cell"><Link aria-label={`Open ${asset.name} details`} href={detailsUrl}><ArrowUpRight size={18} aria-hidden="true" /></Link></td>
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

export function DiscoverStudioScreen({ initialFeatured, initialMarket, initialPage, initialQuery, initialSector, initialSort, initialView }: { initialFeatured?: DirectoryListing[]; initialMarket?: string; initialPage?: string; initialQuery?: string; initialSector?: string; initialSort?: string; initialView?: string }) {
  const searchRef = useRef<HTMLInputElement>(null);
  const directoryRef = useRef<HTMLHeadingElement>(null);
  const leavingDiscover = useRef(false);
  const searchRequest = useRef(0);
  const [query, setQuery] = useState(initialQuery ?? "");
  const [searchedQuery, setSearchedQuery] = useState<string | null>(initialQuery?.trim() || null);
  const [searchResult, setSearchResult] = useState<DiscoveryQueryResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(Boolean(initialQuery?.trim()));
  const [spotlight, setSpotlight] = useState<IssuerDirectory | null>(null);
  const [featured, setFeatured] = useState<DirectoryListing[]>(initialFeatured ?? []);
  const [spotlightError, setSpotlightError] = useState(false);
  const [spotlightLoading, setSpotlightLoading] = useState(true);
  const [showAll, setShowAll] = useState(initialView === "all" || Number(initialPage) > 1);
  const [page, setPage] = useState(() => {
    const value = Number(initialPage);
    return Number.isSafeInteger(value) && value > 0 ? value : 1;
  });
  const [sector, setSector] = useState(initialSector ?? "");
  const [market, setMarket] = useState(initialMarket ?? "");
  const [sort, setSort] = useState(initialSort ?? "");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterDialogRef = useRef<HTMLDialogElement>(null);
  const filterTriggerRef = useRef<HTMLButtonElement>(null);

  const loadSpotlight = useCallback(async () => {
    setSpotlightLoading(true);
    setSpotlightError(false);
    try {
      const result = await apiRequest<IssuerDirectory>("issuer/directory", { cache: "no-store" });
      setSpotlight(result);
      setFeatured(selectFeaturedCompanies(result.listings));
    } catch {
      setSpotlightError(true);
    } finally {
      setSpotlightLoading(false);
    }
  }, []);

  useEffect(() => {
    if (searchedQuery || spotlight) return;
    const timer = window.setTimeout(() => void loadSpotlight(), 0);
    return () => window.clearTimeout(timer);
  }, [loadSpotlight, searchedQuery, spotlight]);

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
    const dialog = filterDialogRef.current;
    const trigger = filterTriggerRef.current;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
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
      if (showAll) params.set("view", "all");
      if (page > 1) params.set("page", String(page));
      window.history.replaceState(null, "", params.size ? `/discover?${params}` : "/discover");
    }, 250);
    return () => window.clearTimeout(timer);
  }, [market, page, query, sector, showAll, sort]);

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
  const pageCount = Math.max(1, Math.ceil(matchingListings.length / 10));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * 10;
  const visibleListings = showingFullList ? matchingListings.slice(pageStart, pageStart + 10) : featured;
  const activeFilters = [
    sector ? { label: sector, clear: () => setSector("") } : null,
    sort ? { label: "Name A–Z", clear: () => setSort("") } : null,
    market ? { label: market === "public" ? "Public · xStocks" : "PreStocks exposure", clear: () => setMarket("") } : null,
  ].filter((filter) => filter !== null);

  function clearFilters() { setSector(""); setMarket(""); setSort(""); setShowAll(false); setPage(1); }

  const filterProps: FilterProps = { market, setMarket: (value) => { setMarket(value); setPage(1); }, setSort: (value) => { setSort(value); setPage(1); }, sort };

  return (
    <div className="research-discover discovery-studio" onClickCapture={(event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (event.target instanceof Element && event.target.closest("a[href]")) leavingDiscover.current = true;
    }}>
      <header className="discovery-masthead">
        <div className="discovery-masthead-copy">
          <p className="studio-eyebrow"><span className="studio-marker" />Discover / A different starting point</p>
          <h1>A world of companies.<br /><span>Already part of your world.</span></h1>
          <p>Follow your curiosity. Find the companies behind the things you know.</p>
        </div>
        <DiscoveryScanLink />
      </header>
      <div className="discover-command-area discovery-search-area">
        <SearchCommand
          inputRef={searchRef}
          onChange={changeQuery}
          onClear={() => changeQuery("")}
          onSubmit={() => void runSearch(query)}
          searching={searching}
          value={query}
        />
        <div className="discovery-search-context">
          <p>Company names check issuer feeds first. Unmatched terms go to OpenRouter for an AI ownership suggestion.</p>
          <div aria-label="Example searches"><span>Try</span>{["Apple", "Nike", "OpenAI"].map((term) => <button key={term} onClick={() => { changeQuery(term); searchRef.current?.focus(); }} type="button">{term}<ArrowUpRight size={12} aria-hidden="true" /></button>)}</div>
        </div>
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
            <ArrowLeft size={16} aria-hidden="true" />Explore featured companies
          </button>
        </>
      ) : (
        <>
        <div className="discovery-section-label"><span>Follow a thread</span><span>Three ways into the bigger picture</span></div>
        <DiscoveryThemes spotlight={spotlight} onSelect={(nextSector, nextMarket) => {
          changeQuery("");
          setSector(nextSector); setMarket(nextMarket); setSort(""); setShowAll(true); setPage(1);
          directoryRef.current?.focus({ preventScroll: true });
          directoryRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
        }} />
        <section aria-labelledby="spotlight-heading" className="issuer-spotlight">
          <div className="issuer-spotlight-heading">
            <div>
              <p className="studio-eyebrow">The company directory</p>
              <h2 id="spotlight-heading" ref={directoryRef} tabIndex={-1}>Companies to explore<span className="discovery-count">{spotlight?.listings.length ?? "—"}</span></h2>
              <p>A rotating spotlight from xStocks and PreStocks. An invitation to research, not a performance ranking.</p>
            </div>
            <button disabled={spotlightLoading} onClick={() => void loadSpotlight()} type="button"><RefreshCw size={14} aria-hidden="true" />{spotlightLoading && spotlight ? "Refreshing…" : "Refresh mix"}</button>
          </div>
          {spotlight?.unavailable.length ? <p className="live-search-caution">{spotlight.unavailable.join(" and ")} feed unavailable. This selection may be incomplete.</p> : null}
          {spotlight?.stale.length ? <p className="live-search-caution">{spotlight.stale.join(" and ")} feed is stale. Asset details will be rechecked.</p> : null}
          {spotlightError && spotlight ? <p className="live-search-caution">Could not refresh the company mix. Showing the previous selection.</p> : null}
          <div className="discovery-directory-controls">
          <SectorTabs available={availableSectors} onChange={setSector} selected={sector} />
          <div className="mobile-filter-command">
            <button ref={filterTriggerRef} aria-controls="mobile-discover-filters" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(true)} type="button"><SlidersHorizontal size={17} aria-hidden="true" />Filters{activeFilters.length ? <span aria-label={activeFilters.length + " active filters"}>{activeFilters.length}</span> : null}</button>
          </div>
          </div>
          {activeFilters.length ? <div className="active-filter-list" aria-label="Active filters">{activeFilters.map((filter) => <button key={filter.label} onClick={filter.clear} type="button">{filter.label}<X size={13} aria-hidden="true" /></button>)}</div> : null}

          <div className="discover-workspace">
            <div className="discovery-desktop-filters" aria-label="Discover filters">
              <span className="discovery-directory-caption">{showingFullList ? "Spotlight directory" : "Featured companies"}<span>{visibleListings.length} companies</span></span>
              <FilterFields {...filterProps} />
              {activeFilters.length || showAll ? <button className="discovery-reset" onClick={clearFilters} type="button">Reset</button> : null}
            </div>
            <div className="result-workspace">
              <div className="result-workspace-heading">
                <p><strong>{showingFullList ? "Spotlight directory" : "Featured companies"}</strong></p>
                <span>{visibleListings.length} companies</span>
              </div>
              {spotlightLoading && !spotlight ? <div className="discovery-loading" role="status"><span>Loading current issuer listings…</span><div aria-hidden="true">{[0, 1, 2, 3].map((row) => <div key={row}><i /><span /><span /><span /></div>)}</div></div> : null}
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
              {spotlight && spotlight.listings.length > featured.length && !activeFilters.length ? (
                <button className="spotlight-more" onClick={() => { setShowAll(!showAll); setPage(1); }} type="button">
                  {showAll ? "Show featured mix" : `Show all ${spotlight.listings.length} spotlight companies`}
                </button>
              ) : null}
              {showingFullList && matchingListings.length > 10 ? (
                <nav aria-label="Directory pages" className="directory-pagination">
                  <button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} type="button">Previous</button>
                  <label>Page <select aria-label="Choose directory page" onChange={(event) => setPage(Number(event.target.value))} value={currentPage}>
                    {Array.from({ length: pageCount }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}
                  </select> of {pageCount}</label>
                  <button disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} type="button">Next</button>
                </nav>
              ) : null}
              {spotlight && visibleListings.length ? <div className="discovery-directory-note"><span><i />{spotlight.unavailable.length || spotlight.stale.length ? "Some feeds need a refresh" : "Sourced from issuer feeds"}</span><span>Sector labels are editorial. Search covers the full feeds.</span></div> : null}
            </div>
          </div>
        </section>
        </>
      )}

      <DiscoveryFootnote />

      {filtersOpen && !searchedQuery ? (
        <dialog ref={filterDialogRef} aria-label="Discover filters" id="mobile-discover-filters" className="mobile-filter-layer" style={{ margin: 0, padding: 0, border: 0, width: "100%", height: "100%", maxWidth: "none", maxHeight: "none" }} onCancel={() => setFiltersOpen(false)} onMouseDown={(event) => { if (event.target === event.currentTarget) setFiltersOpen(false); }}>
          <section className="mobile-filter-sheet">
            <header><strong>Filters</strong><button aria-label="Close filters" autoFocus onClick={() => setFiltersOpen(false)} type="button"><X size={20} aria-hidden="true" /></button></header>
            <FilterFields {...filterProps} />
            <footer><button className="sheet-reset" onClick={clearFilters} type="button">Reset</button><button className="sheet-apply" onClick={() => setFiltersOpen(false)} type="button">Show {visibleListings.length} companies</button></footer>
          </section>
        </dialog>
      ) : null}
    </div>
  );
}
