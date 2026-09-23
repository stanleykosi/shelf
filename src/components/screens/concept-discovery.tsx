"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  PackageSearch,
  ScanLine,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Tags,
  X,
} from "lucide-react";
import {
  articles,
  brands,
  companies,
  companyById,
  productById,
  products,
} from "@/data/catalog";
import type { Category } from "@/domain/types";
import {
  BrandPreview,
  CompanyPreview,
  ProductPreview,
  RelationshipTrail,
  SectionHeader,
} from "@/components/discovery-patterns";
import { CtaLink, EmptyState } from "@/components/ui";

const categoryLabels: Record<Category, string> = {
  groceries: "Groceries",
  beauty: "Beauty",
  electronics: "Electronics",
  clothing: "Clothing",
  household: "Household",
};

export function ConceptHomeScreen() {
  const featuredProducts = [
    "product-doritos-snack",
    "product-apple-iphone",
    "product-tide-laundry",
    "product-nike-apparel",
    "product-olay-skincare",
  ]
    .map((id) => productById(id))
    .filter((product) => product !== undefined);
  const familiarCompanies = companies
    .filter((company) => products.some((product) => product.companyId === company.id))
    .slice(0, 4);
  const supportedCompanyCount = companies.filter((company) => company.instrument).length;
  const relationshipProduct = productById("product-doritos-snack");
  const relationshipCompany = companyById("company-pepsico");

  return (
    <div className="home-experience">
      <section className="home-intro" aria-labelledby="home-title">
        <div className="home-intro-copy">
          <p className="eyebrow">Start with something familiar</p>
          <h1 id="home-title">See the company behind what you know.</h1>
          <p className="home-lede">
            Shelf connects reviewed Products to their Brands and Companies, then shows whether a
            separate investment exposure exists.
          </p>
          <form className="hero-search" action="/discover" role="search">
            <Search size={20} aria-hidden="true" />
            <label className="sr-only" htmlFor="home-search">
              Search products, brands and companies
            </label>
            <input
              id="home-search"
              name="q"
              placeholder="Try Doritos, Apple, Tide…"
              type="search"
            />
            <button type="submit" aria-label="Search">
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </form>
          <div className="home-primary-actions">
            <Link className="scan-entry" data-cta="C01" href="/scan">
              <ScanLine size={18} aria-hidden="true" />
              Scan a product
            </Link>
            <span>Camera, upload, barcode, link and more</span>
          </div>
        </div>
        {relationshipProduct && relationshipCompany ? (
          <RelationshipTrail company={relationshipCompany} product={relationshipProduct} />
        ) : null}
      </section>

      <section className="home-section">
        <SectionHeader
          eyebrow="Familiar starting points"
          title="Begin with a Product, not a ticker"
          action={
            <Link className="text-link" href="/discover?entity=product">
              Browse all Products <ArrowRight size={16} aria-hidden="true" />
            </Link>
          }
        >
          <p>Reviewed catalog examples across everyday categories.</p>
        </SectionHeader>
        <div className="horizontal-collection">
          {featuredProducts.map((product) => (
            <ProductPreview featured key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section className="home-section relationship-explainer">
        <SectionHeader eyebrow="Go one layer deeper" title="Explore what is behind familiar Products">
          <p>
            A Product, a Brand, and a Company are different things. Shelf keeps each layer visible
            and links only reviewed relationships.
          </p>
        </SectionHeader>
        <div className="company-glance-list">
          {familiarCompanies.map((company) => {
            const relatedProducts = products.filter((product) => product.companyId === company.id);
            const relatedBrands = Array.from(
              new Set(relatedProducts.map((product) => product.brand)),
            );
            return (
              <Link
                className="company-glance"
                href={("/companies/" + company.slug) as Route}
                key={company.id}
              >
                <span className="company-glance-mark" aria-hidden="true">
                  {company.name.slice(0, 2).toUpperCase()}
                </span>
                <span>
                  <small>Company</small>
                  <strong>{company.name}</strong>
                  <span>{relatedBrands.slice(0, 4).join(" · ")}</span>
                </span>
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            );
          })}
        </div>
      </section>

      <section className="home-section exposure-transition">
        <div>
          <p className="eyebrow">A separate layer</p>
          <h2>Research first. Exposure only when it exists.</h2>
          <p>
            Some reviewed Companies have a supported instrument. Others are useful for research
            only. Shelf makes that boundary explicit and never turns familiarity into a
            recommendation.
          </p>
          <Link className="text-link" href="/discover?entity=company&availability=available">
            Explore supported Company exposure <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <dl className="exposure-facts">
          <div>
            <dt>Reviewed Companies</dt>
            <dd>{companies.length}</dd>
          </div>
          <div>
            <dt>With supported exposure</dt>
            <dd>{supportedCompanyCount}</dd>
          </div>
          <div>
            <dt>Automatic investment claims</dt>
            <dd>None</dd>
          </div>
        </dl>
      </section>

      <section className="home-section trust-section">
        <SectionHeader eyebrow="Why the trail matters" title="Evidence is part of the Product">
          <p>Compact on discovery pages, complete when you go deeper.</p>
        </SectionHeader>
        <div className="trust-points">
          <div>
            <ShieldCheck size={21} aria-hidden="true" />
            <strong>Reviewed relationships</strong>
            <span>Sources and dates support the Product → Brand → Company trail.</span>
          </div>
          <div>
            <CheckCircle2 size={21} aria-hidden="true" />
            <strong>Explicit availability</strong>
            <span>Research-only and supported exposure are never presented as the same state.</span>
          </div>
          <div>
            <PackageSearch size={21} aria-hidden="true" />
            <strong>Honest catalog limits</strong>
            <span>An unknown product stays unknown; Shelf does not fabricate ownership.</span>
          </div>
        </div>
      </section>

      <section className="home-section learn-strip">
        <SectionHeader
          eyebrow="Learn as you explore"
          title="Understand the unfamiliar layer"
          action={
            <Link className="text-link" href="/learn">
              View all learning <ArrowRight size={16} aria-hidden="true" />
            </Link>
          }
        />
        <div className="learning-links">
          {articles.slice(0, 3).map((article) => (
            <Link href={("/learn/" + article.slug) as Route} key={article.slug}>
              <span>Reviewed explainer</span>
              <strong>{article.title}</strong>
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export function ConceptDiscoverScreen({
  initialAvailability,
  initialCategory,
  initialEntity,
  initialMarket,
  initialQuery,
  initialSort,
}: {
  initialAvailability?: string;
  initialCategory?: string;
  initialEntity?: string;
  initialMarket?: string;
  initialQuery?: string;
  initialSort?: string;
}) {
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
    if (new URLSearchParams(window.location.search).get("focus") === "search") {
      searchRef.current?.focus();
    }
    function focusSearch(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (category) params.set("category", category);
      if (entity !== "all") params.set("entity", entity);
      if (entity === "company" && market) params.set("market", market);
      if (entity === "company" && availability) params.set("availability", availability);
      if (sort) params.set("sort", sort);
      router.replace((params.size ? "/discover?" + params : "/discover") as Route, {
        scroll: false,
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [availability, category, entity, market, query, router, sort]);

  function clearFilters() {
    setQuery("");
    setCategory("");
    setMarket("");
    setAvailability("");
    setSort("");
  }

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const productResults = useMemo(() => {
    const matches = products.filter((product) => {
      const company = companyById(product.companyId);
      const matchesQuery =
        !normalizedQuery ||
        [product.name, product.brand, company?.name]
          .filter(Boolean)
          .some((value) => value!.toLocaleLowerCase().includes(normalizedQuery));
      return matchesQuery && (!category || product.category === category);
    });
    return sort === "name" ? matches.toSorted((a, b) => a.name.localeCompare(b.name)) : matches;
  }, [category, normalizedQuery, sort]);
  const brandResults = useMemo(() => {
    const matches = brands.filter((brand) => {
      const brandProducts = brand.productIds
        .map((id) => productById(id))
        .filter((product) => product !== undefined);
      const matchesQuery =
        !normalizedQuery ||
        brand.name.toLocaleLowerCase().includes(normalizedQuery) ||
        brandProducts.some((product) =>
          product.name.toLocaleLowerCase().includes(normalizedQuery),
        );
      return (
        matchesQuery &&
        (!category || brandProducts.some((product) => product.category === category))
      );
    });
    return sort === "name" ? matches.toSorted((a, b) => a.name.localeCompare(b.name)) : matches;
  }, [category, normalizedQuery, sort]);
  const companyResults = useMemo(() => {
    const matches = companies.filter((company) => {
      const relatedProducts = products.filter((product) => product.companyId === company.id);
      const matchesQuery =
        !normalizedQuery ||
        [company.name, company.ticker, ...relatedProducts.map((product) => product.brand)]
          .filter(Boolean)
          .some((value) => value!.toLocaleLowerCase().includes(normalizedQuery));
      const matchesCategory =
        !category || relatedProducts.some((product) => product.category === category);
      const matchesMarket =
        !market ||
        (market === "public" && company.instrument?.provider === "xstocks") ||
        (market === "private" && company.instrument?.provider === "prestocks");
      const matchesAvailability =
        !availability ||
        (availability === "available" && Boolean(company.instrument)) ||
        (availability === "research" && !company.instrument);
      return matchesQuery && matchesCategory && matchesMarket && matchesAvailability;
    });
    return sort === "name" ? matches.toSorted((a, b) => a.name.localeCompare(b.name)) : matches;
  }, [availability, category, market, normalizedQuery, sort]);
  const resultCount =
    (entity === "all" || entity === "product" ? productResults.length : 0) +
    (entity === "all" || entity === "brand" ? brandResults.length : 0) +
    (entity === "all" || entity === "company" ? companyResults.length : 0);
  const initialBrowse = !normalizedQuery && !category && !market && !availability;
  const visibleProducts =
    initialBrowse && entity === "all" ? productResults.slice(0, 6) : productResults;
  const visibleBrands = initialBrowse && entity === "all" ? brandResults.slice(0, 6) : brandResults;
  const visibleCompanies =
    initialBrowse && entity === "all" ? companyResults.slice(0, 6) : companyResults;
  const modes = [
    ["all", "All"],
    ["product", "Products"],
    ["brand", "Brands"],
    ["company", "Companies"],
  ] as const;
  const activeFilterCount = [
    category,
    sort,
    entity === "company" ? market : "",
    entity === "company" ? availability : "",
  ].filter(Boolean).length;

  return (
    <div className="discover-experience">
      <header className="discover-heading">
        <p className="eyebrow">Reviewed catalog</p>
        <h1>Discover</h1>
        <p>Search something you know, then follow the verified relationship.</p>
      </header>

      <section
        className={"discover-workbench" + (filtersOpen ? " filters-open" : "")}
        aria-label="Catalog search and filters"
      >
        <div className="discover-search" role="search">
          <Search size={21} aria-hidden="true" />
          <label className="sr-only" htmlFor="catalog-search">
            Search products, brands or companies
          </label>
          <input
            id="catalog-search"
            maxLength={120}
            placeholder="Search a Product, Brand, or Company"
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-describedby="search-scope"
          />
          {query ? (
            <button className="search-clear" onClick={() => setQuery("")} type="button">
              Clear
            </button>
          ) : (
            <kbd>⌘ K</kbd>
          )}
        </div>
        <p className="sr-only" id="search-scope">
          Search results distinguish Products, Brands and Companies.
        </p>

        <div className="entity-modes" aria-label="Entity type">
          {modes.map(([value, label]) => (
            <button
              aria-pressed={entity === value}
              className={entity === value ? "active" : ""}
              key={value}
              onClick={() => {
                setEntity(value);
                if (value !== "company") {
                  setMarket("");
                  setAvailability("");
                }
              }}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mobile-filter-bar">
          <button
            aria-controls="discovery-filter-panel"
            aria-expanded={filtersOpen}
            className="mobile-filter-toggle"
            onClick={() => setFiltersOpen((open) => !open)}
            type="button"
          >
            <SlidersHorizontal size={17} aria-hidden="true" />
            Filters
            {activeFilterCount ? (
              <span className="active-filter-count" aria-label={activeFilterCount + " active filters"}>
                {activeFilterCount}
              </span>
            ) : null}
          </button>
          {activeFilterCount ? (
            <span className="active-filter-summary">{activeFilterCount} active</span>
          ) : (
            <span className="active-filter-summary">Category and sort</span>
          )}
        </div>

        <div
          className={"discovery-controls" + (filtersOpen ? " is-open" : "")}
          id="discovery-filter-panel"
        >
          <label>
            <span>Category</span>
            <select
              id="category-filter"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="">All categories</option>
              {Object.entries(categoryLabels).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {entity === "company" ? (
            <>
              <label>
                <span>Market context</span>
                <select value={market} onChange={(event) => setMarket(event.target.value)}>
                  <option value="">All Companies</option>
                  <option value="public">Public Companies</option>
                  <option value="private">Private Companies</option>
                </select>
              </label>
              <label>
                <span>Availability</span>
                <select
                  value={availability}
                  onChange={(event) => setAvailability(event.target.value)}
                >
                  <option value="">Any availability</option>
                  <option value="available">Supported exposure</option>
                  <option value="research">Research only</option>
                </select>
              </label>
            </>
          ) : null}
          <label>
            <span>Sort</span>
            <select value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="">Catalog order</option>
              <option value="name">Name A–Z</option>
            </select>
          </label>
          <button className="filter-reset" data-cta="C04" onClick={clearFilters} type="button">
            Reset
          </button>
          <button className="filter-done" onClick={() => setFiltersOpen(false)} type="button">
            <X size={16} aria-hidden="true" /> Done
          </button>
        </div>
      </section>

      {initialBrowse ? (
        <section className="discovery-lenses" aria-labelledby="discovery-lenses-title">
          <div>
            <p className="eyebrow">Browse a useful starting point</p>
            <h2 id="discovery-lenses-title">Explore the reviewed catalog</h2>
          </div>
          <div className="lens-links">
            <Link href="/discover?category=groceries">
              <PackageSearch size={17} aria-hidden="true" /> Everyday groceries
            </Link>
            <Link href="/discover?entity=brand">
              <Tags size={17} aria-hidden="true" /> Browse all Brands
            </Link>
            <Link href="/discover?entity=company&availability=available">
              <Building2 size={17} aria-hidden="true" /> Companies with exposure
            </Link>
          </div>
        </section>
      ) : null}

      <div className="result-summary" aria-live="polite">
        <span>
          <strong>{resultCount}</strong> reviewed {resultCount === 1 ? "result" : "results"}
        </span>
        <span>Product, Brand, and Company are shown as separate entity types.</span>
      </div>

      {resultCount ? (
        <div className="discovery-results">
          {(entity === "all" || entity === "product") && visibleProducts.length ? (
            <section className="result-group product-group">
              <SectionHeader
                title="Products"
                action={
                  entity === "all" ? (
                    <button className="text-link" onClick={() => setEntity("product")} type="button">
                      View all {productResults.length} <ArrowRight size={15} aria-hidden="true" />
                    </button>
                  ) : null
                }
              >
                <p>Recognizable items connected to a reviewed Brand and Company.</p>
              </SectionHeader>
              <div className="entity-result-list product-result-list">
                {visibleProducts.map((product) => (
                  <ProductPreview key={product.id} product={product} />
                ))}
              </div>
            </section>
          ) : null}

          {(entity === "all" || entity === "brand") && visibleBrands.length ? (
            <section className="result-group brand-group">
              <SectionHeader
                title="Brands"
                action={
                  entity === "all" ? (
                    <button className="text-link" onClick={() => setEntity("brand")} type="button">
                      View all {brandResults.length} <ArrowRight size={15} aria-hidden="true" />
                    </button>
                  ) : null
                }
              >
                <p>Consumer identities kept distinct from their related Companies.</p>
              </SectionHeader>
              <div className="entity-result-list">
                {visibleBrands.map((brand) => (
                  <BrandPreview brand={brand} key={brand.slug} />
                ))}
              </div>
            </section>
          ) : null}

          {(entity === "all" || entity === "company") && visibleCompanies.length ? (
            <section className="result-group company-group">
              <SectionHeader
                title="Companies"
                action={
                  entity === "all" ? (
                    <button className="text-link" onClick={() => setEntity("company")} type="button">
                      View all {companyResults.length} <ArrowRight size={15} aria-hidden="true" />
                    </button>
                  ) : null
                }
              >
                <p>Company context, familiar connections, and explicit exposure availability.</p>
              </SectionHeader>
              <div className="entity-result-list">
                {visibleCompanies.map((company) => (
                  <CompanyPreview company={company} key={company.id} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : (
        <EmptyState
          title="No reviewed match"
          action={
            <CtaLink id="C01" href="/scan">
              Scan instead
            </CtaLink>
          }
        >
          Try another spelling, reset the filters, or scan the package. Shelf will not invent a
          relationship from an unknown name.
        </EmptyState>
      )}

      <section className="catalog-note">
        <ShieldCheck size={19} aria-hidden="true" />
        <div>
          <strong>A small, reviewed catalog by design</strong>
          <p>
            Search results come from verified catalog identities. Similar names never create a
            ticker, Company relationship, or recommendation.
          </p>
        </div>
      </section>
    </div>
  );
}
