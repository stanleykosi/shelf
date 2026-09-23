"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ScanLine, Search, SlidersHorizontal, X } from "lucide-react";
import { articles, brands, companies, companyById, productById, products } from "@/data/catalog";
import type { Category } from "@/domain/types";
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
            Start with a familiar product. Shelf connects it to the Brand and Company, then keeps
            market exposure separate from the research.
          </p>
          <form className="home-search-command" action="/discover" role="search">
            <Search size={20} aria-hidden="true" />
            <label className="sr-only" htmlFor="home-research-search">Search products, brands, or companies</label>
            <input id="home-research-search" name="q" placeholder="Search products, brands, or companies" type="search" />
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
          description="Reviewed relationships, market context, and exposure status in one view."
          action={<Link className="quiet-link" href="/discover?entity=company">Company directory <ArrowRight size={15} aria-hidden="true" /></Link>}
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
          <div><dt>Supported exposure</dt><dd>{supportedCompanyCount}</dd></div>
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
          <label><span>Market status</span><select value={market} onChange={(event) => setMarket(event.target.value)}><option value="">All companies</option><option value="public">Public</option><option value="private">Private</option></select></label>
          <label><span>Exposure</span><select value={availability} onChange={(event) => setAvailability(event.target.value)}><option value="">Any availability</option><option value="available">Available</option><option value="research">Research only</option></select></label>
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

export function ConceptDiscoverScreen({ initialAvailability, initialCategory, initialEntity, initialMarket, initialQuery, initialSort }: { initialAvailability?: string; initialCategory?: string; initialEntity?: string; initialMarket?: string; initialQuery?: string; initialSort?: string }) {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(initialQuery ?? "");
  const [category, setCategory] = useState(initialCategory ?? "");
  const [entity, setEntity] = useState(initialEntity ?? "all");
  const [market, setMarket] = useState(initialMarket ?? "");
  const [availability, setAvailability] = useState(initialAvailability ?? "");
  const [sort, setSort] = useState(initialSort ?? "");
  const [filtersOpen, setFiltersOpen] = useState(false);

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
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (category) params.set("category", category);
      if (entity !== "all") params.set("entity", entity);
      if (entity === "company" && market) params.set("market", market);
      if (entity === "company" && availability) params.set("availability", availability);
      if (sort) params.set("sort", sort);
      router.replace((params.size ? "/discover?" + params : "/discover") as Route, { scroll: false });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [availability, category, entity, market, query, router, sort]);

  const normalizedQuery = query.trim().toLowerCase();
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
  const visibleProducts = entity === "all" ? productResults.slice(0, normalizedQuery ? 8 : 8) : productResults;
  const visibleBrands = entity === "all" ? brandResults.slice(0, 6) : brandResults;
  const visibleCompanies = entity === "all" ? companyResults.slice(0, 6) : companyResults;
  const activeFilters = [
    category ? { label: categoryLabels[category as Category] ?? category, clear: () => setCategory("") } : null,
    sort ? { label: "Name A–Z", clear: () => setSort("") } : null,
    entity === "company" && market ? { label: market === "public" ? "Public" : "Private", clear: () => setMarket("") } : null,
    entity === "company" && availability ? { label: availability === "available" ? "Exposure available" : "Research only", clear: () => setAvailability("") } : null,
  ].filter((filter) => filter !== null);

  function changeEntity(value: string) {
    setEntity(value);
    if (value !== "company") { setMarket(""); setAvailability(""); }
  }

  function clearAll() { setQuery(""); setCategory(""); setMarket(""); setAvailability(""); setSort(""); }

  const filterProps: FilterProps = { availability, category, entity, market, setAvailability, setCategory, setMarket, setSort, sort };

  return (
    <div className="research-discover">
      <header className="discover-title-row"><div><h1>Discover</h1><p>Research Products, Brands, and Companies from a reviewed catalog.</p><Link className="quiet-link" href="/discover?source=issuer">Browse current issuer assets <ArrowRight size={15} aria-hidden="true" /></Link></div><span>{resultCount} results</span></header>
      <div className="discover-command-area">
        <SearchCommand inputRef={searchRef} onChange={setQuery} onClear={() => setQuery("")} value={query} />
        <EntityTabs entity={entity} onChange={changeEntity} />
      </div>
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
          <div className="result-workspace-heading"><p>{normalizedQuery ? <>Results for <strong>“{query.trim()}”</strong></> : "Reviewed catalog"}</p><span>{resultCount} matches</span></div>
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
            <div className="research-empty"><h2>No reviewed match</h2><p>Try another spelling or clear the current filters. Shelf will not infer a Company from an unverified name.</p><div><button onClick={clearAll} type="button">Clear filters</button><Link href="/scan">Scan a product</Link></div></div>
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
