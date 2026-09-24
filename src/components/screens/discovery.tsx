"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  articles,
  brands,
  companies,
  companyById,
  products,
  productById,
  sources,
} from "@/data/catalog";
import type { MarketFeed } from "@/domain/market-data";
import type { Brand, Category, Company, MarketHistoryPoint } from "@/domain/types";
import type { PreStocksListing } from "@/providers/prestocks";
import type { XStocksListing } from "@/providers/xstocks";
import { apiRequest, authenticationIsRequired, postJson } from "@/lib/api-client";
import { MarketHistoryChart } from "@/components/screens/markets";
import {
  Card,
  CtaLink,
  EmptyState,
  ErrorMessage,
  Field,
  PageIntro,
  ResultMessage,
} from "@/components/ui";

const categoryLabels: Record<Category, string> = {
  groceries: "Groceries",
  beauty: "Beauty",
  electronics: "Electronics",
  clothing: "Clothing",
  household: "Household",
};

export function DiscoverScreen() {
  return (
    <>
      <PageIntro
        eyebrow="Discover what you already know"
        title="Scan a product. Discover the company."
      >
        <p>
          Trace familiar products to reviewed parent-company relationships, learn what the
          connection means, and decide whether to save or explore it.
        </p>
      </PageIntro>
      <div className="hero-actions">
        <CtaLink id="C01" href="/scan">
          Scan a product
        </CtaLink>
        <CtaLink id="C02" href="/discover?focus=search" secondary>
          Search products
        </CtaLink>
      </div>
      <section className="section">
        <div className="chips" aria-label="Browse by category">
          {(Object.keys(categoryLabels) as Category[]).map((category) => (
            <Link className="chip" href={`/discover?category=${category}`} key={category}>
              {categoryLabels[category]}
            </Link>
          ))}
        </div>
      </section>
      <section className="section">
        <p className="eyebrow">Two verified issuer sources</p>
        <h2>Explore public and pre-IPO exposure</h2>
        <p className="muted">
          xStocks instruments track public equities. PreStocks instruments provide tokenized
          economic exposure to private companies and do not confer ordinary shareholder rights.
        </p>
        <div className="actions">
          <CtaLink id="market-compare-home" href="/discover?entity=company">
            Compare both markets
          </CtaLink>
          <CtaLink id="market-private-home" href="/discover?entity=company&market=private" secondary>
            Explore private companies
          </CtaLink>
        </div>
        <div className="grid">
          {companies
            .filter((company) => company.instrument)
            .slice(0, 6)
            .map((company) => (
              <CompanyCard company={company} key={company.id} />
            ))}
        </div>
      </section>
      <section className="section">
        <p className="eyebrow">A small, reviewed catalog</p>
        <h2>Start with familiar products</h2>
        <div className="grid">
          {products.slice(0, 6).map((product) => (
            <ProductCard key={product.id} productId={product.id} />
          ))}
        </div>
      </section>
      <section className="section">
        <p className="eyebrow">Learn without funding</p>
        <div className="grid">
          {articles.slice(0, 3).map((article) => (
            <Card key={article.slug}>
              <h3>{article.title}</h3>
              <p className="muted">Reviewed learning note · version {article.version}</p>
              <Link className="button ghost" href={`/learn/${article.slug}`}>
                Read the explainer
              </Link>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}

function ProductCard({ productId }: { productId: string }) {
  const product = productById(productId)!;
  const company = companyById(product.companyId)!;

  return (
    <Card>
      <div className="product-art" aria-hidden="true">
        {product.brand.slice(0, 1)}
      </div>
      <span className="badge">{categoryLabels[product.category]}</span>
      <h3>{product.name}</h3>
      <p className="muted">
        {product.brand} → {company.name}
      </p>
      <Link className="button ghost" data-cta="C03" href={`/products/${product.slug}`}>
        View product
      </Link>
    </Card>
  );
}

function CompanyCard({ company }: { company: Company }) {
  const instrument = company.instrument;
  return (
    <Card>
      <span className="badge">
        {instrument?.assetClass === "pre_ipo_exposure" ? "Pre-IPO exposure" : "Public equity"}
      </span>
      <h3>{company.name}</h3>
      <p className="muted">
        {instrument?.symbol} · issued through {instrument?.issuer}
      </p>
      <Link className="button ghost" href={`/companies/${company.slug}`}>
        View company
      </Link>
    </Card>
  );
}

export function SearchScreen({
  initialCategory,
  initialEntity,
  initialMarket,
  initialQuery,
}: {
  initialCategory?: string;
  initialEntity?: string;
  initialMarket?: string;
  initialQuery?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery ?? "");
  const [category, setCategory] = useState(initialCategory ?? "");
  const [results, setResults] = useState(products);
  const [companyResults, setCompanyResults] = useState(companies);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (query) params.set("q", query);
        if (category) params.set("category", category);
        const [productMatches, companyMatches] = await Promise.all([
          apiRequest<typeof products>(`catalog/search?${params}`),
          category
            ? Promise.resolve([])
            : apiRequest<Company[]>(
                `catalog/companies?q=${encodeURIComponent(query)}${
                  initialMarket ? `&provider=${initialMarket === "private" ? "prestocks" : "xstocks"}` : ""
                }`,
              ),
        ]);
        setResults(productMatches);
        setCompanyResults(companyMatches);
        setError(null);
        if (initialEntity) params.set("entity", initialEntity);
        if (initialMarket) params.set("market", initialMarket);
        router.replace((params.size ? `/discover?${params}` : "/discover") as Route, {
          scroll: false,
        });
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Search failed");
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, category, initialEntity, initialMarket, router]);

  function clearFilters() {
    setQuery("");
    setCategory("");
  }

  return (
    <>
      <PageIntro eyebrow="Explore" title="Find products, brands and companies">
        <p>
          Search only returns reviewed catalog identities. A similar name never creates a ticker or
          investment.
        </p>
      </PageIntro>
      <div className="card stack">
        <Field label="Product, brand or company" htmlFor="catalog-search">
          <input
            id="catalog-search"
            maxLength={120}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </Field>
        <Field label="Category" htmlFor="category-filter">
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
        </Field>
        <button className="secondary" data-cta="C04" onClick={clearFilters}>
          Clear filters
        </button>
        <ErrorMessage message={error} />
      </div>
      {initialEntity !== "company" ? <section className="section">
        {results.length ? (
          <div className="grid">
            {results.map((product) => (
              <ProductCard key={product.id} productId={product.id} />
            ))}
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
            Try another spelling or scan the package. Shelf will not invent an investment from an
            unknown name.
          </EmptyState>
        )}
      </section> : null}
      <section className="section">
        <h2>Companies and investment products</h2>
        {companyResults.length ? (
          <div className="grid">
            {companyResults.map((company) => (
              <CompanyCard company={company} key={company.id} />
            ))}
          </div>
        ) : (
          <p className="muted">No reviewed company or issuer instrument matches these filters.</p>
        )}
      </section>
    </>
  );
}

export function BrandScreen({ brand }: { brand: Brand }) {
  const brandProducts = brand.productIds
    .map((productId) => productById(productId))
    .filter((product) => product !== undefined);

  return (
    <>
      <PageIntro eyebrow="Reviewed brand" title={brand.name}>
        <p>
          A brand is a consumer identity, not automatically a legal company or investment.
          Shelf keeps the reviewed relationship and regional context visible.
        </p>
      </PageIntro>
      <section className="section">
        <h2>Products in Shelf&apos;s reviewed catalog</h2>
        <div className="grid">
          {brandProducts.map((product) => (
            <ProductCard productId={product.id} key={product.id} />
          ))}
        </div>
      </section>
      <section className="section">
        <h2>Reviewed company relationships</h2>
        <div className="grid">
          {brand.companyRelationships.map((relationship) => {
            const company = companyById(relationship.companyId);
            if (!company) return null;
            return (
              <Card key={`${relationship.companyId}-${relationship.relationship}-${relationship.region}`}>
                <span className="badge">{relationship.relationship.replaceAll("_", " ")}</span>
                <h3>{company.name}</h3>
                <p className="muted">{relationship.region}</p>
                <Link className="button ghost" href={`/companies/${company.slug}`}>
                  View company
                </Link>
              </Card>
            );
          })}
        </div>
      </section>
    </>
  );
}


export function ProductScreen({ productId }: { productId: string }) {
  const product = productById(productId);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  if (!product)
    return (
      <EmptyState title="Product unavailable">This catalog entry may have been retired.</EmptyState>
    );
  const company = companyById(product.companyId)!;
  const brand = brands.find((candidate) => candidate.name === product.brand);
  const source = sources.find((item) => product.sourceIds.includes(item.id));
  const selectedProductId = product.id;

  async function toggleSave() {
    try {
      if (saved) {
        await apiRequest(`shelf/items/${selectedProductId}`, { method: "DELETE" });
        setSaved(false);
        return;
      }
      await postJson("shelf/items", { productIds: [selectedProductId] });
      setSaved(true);
      setSaveError(null);
    } catch (requestError) {
      setSaveError(requestError instanceof Error ? requestError.message : "Shelf update failed");
    }
  }

  return (
    <>
      <PageIntro
        eyebrow={`${categoryLabels[product.category]} · ${product.brand}`}
        title={product.name}
      >
        <p>
          {product.brand} has a reviewed {product.relationship.replaceAll("_", " ")} relationship
          with {company.name}.
        </p>
      </PageIntro>
      <div className="grid">
        <Card>
          <div className="product-art">{product.brand[0]}</div>
          <h2>Relationship path</h2>
          <p>
            {product.name} →{" "}
            {brand ? <Link href={`/brands/${brand.slug}`}>{product.brand}</Link> : product.brand} →{" "}
            {company.name}
          </p>
          <p className="muted">{product.region}</p>
          {source ? (
            <a href={source.url} target="_blank" rel="noreferrer">
              {source.title} · checked {source.verifiedAt}
            </a>
          ) : null}
        </Card>
        <Card>
          <h2>Keep exploring</h2>
          <div className="actions">
            <button data-cta={saved ? "C19" : "C18"} onClick={toggleSave}>
              {saved ? "Remove from shelf" : "Save to shelf"}
            </button>
            <CtaLink id="C20" href={`/companies/${company.slug}`} secondary>
              Explore company
            </CtaLink>
          </div>
          <ErrorMessage message={saveError} />
        </Card>
      </div>
    </>
  );
}

export function CompanyScreen({ companyId }: { companyId: string }) {
  const company = companyById(companyId);
  const [preStocksListing, setPreStocksListing] = useState<PreStocksListing | null>(null);
  const [xStocksListing, setXStocksListing] = useState<XStocksListing | null>(null);
  const [history, setHistory] = useState<{
    mode: "observed" | "unavailable";
    points: MarketHistoryPoint[];
  }>({ mode: "unavailable", points: [] });
  const [watched, setWatched] = useState(false);
  const [watchlistError, setWatchlistError] = useState<string | null>(null);
  const [marketState, setMarketState] = useState<"current" | "stale" | "unavailable">(
    "unavailable",
  );

  useEffect(() => {
    if (!company?.instrument) return;
    apiRequest<Array<{ id: string }>>("watchlist")
      .then((items) => setWatched(items.some((item) => item.id === company.id)))
      .catch((requestError: unknown) => {
        setWatched(false);
        if (!authenticationIsRequired(requestError)) {
          setWatchlistError(
            requestError instanceof Error ? requestError.message : "Watchlist unavailable",
          );
        }
      });
    apiRequest<{ mode: "observed" | "unavailable"; points: MarketHistoryPoint[] }>(
      `markets/history/${company.id}`,
    )
      .then(setHistory)
      .catch(() => setHistory({ mode: "unavailable", points: [] }));

    if (company.instrument.provider === "prestocks") {
      apiRequest<MarketFeed<PreStocksListing>>("catalog/prestocks")
        .then((response) => {
          setPreStocksListing(
            response.listings.find((listing) => listing.mint === company.instrument?.mint) ?? null,
          );
          setMarketState(response.state);
        })
        .catch(() => setMarketState("unavailable"));
      return;
    }

    apiRequest<MarketFeed<XStocksListing>>("catalog/xstocks")
      .then((response) => {
        setXStocksListing(
          response.listings.find((listing) => listing.mint === company.instrument?.mint) ?? null,
        );
        setMarketState(response.state);
      })
      .catch(() => setMarketState("unavailable"));
  }, [company]);

  async function addToWatchlist() {
    try {
      const items = await postJson<Array<{ id: string }>>("watchlist/items", { companyId });
      setWatched(items.some((item) => item.id === companyId));
      setWatchlistError(null);
    } catch (requestError) {
      setWatchlistError(
        authenticationIsRequired(requestError)
          ? "Sign in to keep this company on your private watchlist."
          : requestError instanceof Error
            ? requestError.message
            : "Watchlist update failed",
      );
    }
  }

  if (!company)
    return (
      <EmptyState title="Company unavailable">
        This company is not in the reviewed registry.
      </EmptyState>
    );
  const relatedProducts = products.filter((product) => product.companyId === company.id);

  return (
    <>
      <PageIntro eyebrow={`${company.exchange} · ${company.ticker}`} title={company.name}>
        <p>{company.description}</p>
      </PageIntro>
      <div className="grid">
        <Card>
          <h2>{relatedProducts.length ? "Brands in the reviewed catalog" : "Registry source"}</h2>
          <p>
            {relatedProducts.length
              ? [...new Set(relatedProducts.map((product) => product.brand))].join(", ")
              : `${company.instrument?.issuer} lists this private-company exposure instrument.`}
          </p>
          <details>
            <summary data-cta="C23">View sources</summary>
            <p className="muted">
              Relationships are supported by reviewed company sources and dated evidence. Exact
              local products can vary.
            </p>
            {company.instrument ? (
              <a href={company.instrument.referenceUrl} target="_blank" rel="noreferrer">
                Open issuer source
              </a>
            ) : null}
          </details>
        </Card>
        <Card>
          {company.instrument ? (
            <span className="badge">
              {company.instrument.assetClass === "pre_ipo_exposure"
                ? "Pre-IPO exposure token"
                : "Public equity token"}
            </span>
          ) : null}
          <h2>{company.instrument ? company.instrument.symbol : "Discovery only"}</h2>
          {company.instrument ? (
            <>
              <p>
                A tokenized instrument from {company.instrument.issuer}.{" "}
                {company.instrument.assetClass === "pre_ipo_exposure"
                  ? "It provides issuer-defined economic exposure to a private company; it is not company stock and does not grant ordinary shareholder rights."
                  : "It is not an ordinary voting share."}
              </p>
              {preStocksListing ? (
                <div className="stack" aria-label="PreStocks reference market data">
                  <p>
                    <strong>Issuer mark:</strong> ${preStocksListing.markPriceUsd}
                    <br />
                    <strong>Token reference:</strong> ${preStocksListing.tokenPriceUsd}
                    <br />
                    <strong>Market signal:</strong> {preStocksListing.premiumLabel}
                  </p>
                  <p className="muted">
                    Reference data from PreStocks · {marketState}. A Jupiter quote, when available,
                    determines executable terms.
                  </p>
                </div>
              ) : company.instrument.provider === "prestocks" ? (
                <p className="muted">Current PreStocks reference pricing is unavailable.</p>
              ) : null}
              {xStocksListing ? (
                <div className="stack" aria-label="xStocks issuer metadata">
                  <p>
                    <strong>Underlying:</strong> {xStocksListing.underlyingSymbol} on{" "}
                    {xStocksListing.exchange}
                    <br />
                    <strong>Underlying session:</strong>{" "}
                    {xStocksListing.marketOpen ? "open" : xStocksListing.marketPeriod}
                  </p>
                  <p className="muted">
                    xStocks metadata · {marketState}. Jupiter determines executable secondary-market
                    terms; issuer redemption has separate eligibility and minimums.
                  </p>
                </div>
              ) : null}
              {company.instrument.lifecycle ? (
                <div className="notice">
                  <strong>{company.instrument.lifecycle.title}</strong>
                  <p>{company.instrument.lifecycle.description}</p>
                  {company.instrument.lifecycle.deadline ? (
                    <p>
                      Issuer deadline:{" "}
                      {new Date(company.instrument.lifecycle.deadline).toLocaleString()}
                      {company.instrument.lifecycle.successorSymbol
                        ? ` · referenced successor ${company.instrument.lifecycle.successorSymbol}`
                        : ""}
                    </p>
                  ) : null}
                  <a href={company.instrument.lifecycle.sourceUrl} target="_blank" rel="noreferrer">
                    Review issuer notice
                  </a>
                </div>
              ) : null}
              {company.instrument.provider === "prestocks" ? (
                <MarketHistoryChart points={history.points} mode={history.mode} />
              ) : null}
              <details>
                <summary data-cta="C24">View token details</summary>
                <p className="muted">
                  Mint: {company.instrument.mint}
                  <br />
                  Program: {company.instrument.tokenProgram}
                  <br />
                  Source: {company.instrument.provider === "prestocks" ? "PreStocks" : "xStocks"}
                </p>
              </details>
              <div className="actions">
                <button className="secondary" disabled={watched} onClick={addToWatchlist}>
                  {watched ? "On watchlist" : "Add to watchlist"}
                </button>
                {company.instrument.capabilities.buy ? (
                  <CtaLink id="C21" href={`/invest/${company.slug}`}>
                    Choose amount
                  </CtaLink>
                ) : null}
                <CtaLink id="C22" href={`/assistant?companyId=${company.id}`} secondary>
                  Ask about this company
                </CtaLink>
              </div>
              <ErrorMessage message={watchlistError} />
            </>
          ) : (
            <p>Not available to buy on Shelf. You can still save and learn about it.</p>
          )}
        </Card>
      </div>
      <section className="section">
        <h2>Products you may recognize</h2>
        <div className="grid">
          {relatedProducts.map((product) => (
            <ProductCard key={product.id} productId={product.id} />
          ))}
        </div>
      </section>
    </>
  );
}

export function ShelfScreen() {
  const [guestIds, setGuestIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    return JSON.parse(sessionStorage.getItem("shelf:guest-items") ?? "[]") as string[];
  });
  const [summary, setSummary] = useState("");
  const [name, setName] = useState("My shelf");
  const [version, setVersion] = useState(1);
  const [proposedOrder, setProposedOrder] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [watchedCompanies, setWatchedCompanies] = useState<Company[]>([]);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const startedWithGuestItems = useRef(guestIds.length > 0);

  useEffect(() => {
    apiRequest("me")
      .then(async () => {
        setSignedIn(true);
        const [companies, shelf] = await Promise.all([
          apiRequest<Company[]>("watchlist"),
          apiRequest<{ name: string; version: number; items: Array<{ id: string }> }>("shelf"),
        ]);
        setWatchedCompanies(companies);
        setName(shelf.name);
        setVersion(shelf.version);
        if (!startedWithGuestItems.current) setGuestIds(shelf.items.map((item) => item.id));
      })
      .catch((requestError: unknown) => {
        if (authenticationIsRequired(requestError)) {
          setSignedIn(false);
        } else {
          setError(requestError instanceof Error ? requestError.message : "Shelf unavailable");
        }
      });
  }, []);

  async function summarize() {
    const response = await postJson<{ summary: string; proposedSortIds: string[] }>(
      "ai/shelf-summary",
      { shelfVersion: version },
    );
    setSummary(response.summary);
    setProposedOrder(response.proposedSortIds);
  }

  async function renameShelf() {
    const requestedName = window.prompt("Shelf name", name)?.trim().slice(0, 60);
    if (!requestedName) return;
    const shelf = await apiRequest<{ name: string; version: number }>("shelf", {
      method: "PATCH",
      body: JSON.stringify({
        name: requestedName,
        itemOrderIds: guestIds,
        expectedVersion: version,
      }),
    });
    setName(shelf.name);
    setVersion(shelf.version);
  }

  async function removeItem(productId: string) {
    if (!signedIn) {
      const remaining = guestIds.filter((item) => item !== productId);
      setGuestIds(remaining);
      sessionStorage.setItem("shelf:guest-items", JSON.stringify(remaining));
      return;
    }
    const shelf = await apiRequest<{ version: number }>(`shelf/items/${productId}`, {
      method: "DELETE",
    });
    setGuestIds((items) => items.filter((item) => item !== productId));
    setVersion(shelf.version);
  }

  async function removeWatchedCompany(companyId: string) {
    const items = await apiRequest<Company[]>(`watchlist/items/${companyId}`, { method: "DELETE" });
    setWatchedCompanies(items);
  }

  async function applyOrganization() {
    const currentIds = new Set(guestIds);
    const sortedIds = proposedOrder.filter((id) => currentIds.has(id));
    if (sortedIds.length !== guestIds.length) {
      setError("The suggested order is stale. Generate a new summary.");
      return;
    }
    const shelf = await apiRequest<{ version: number }>("shelf", {
      method: "PATCH",
      body: JSON.stringify({ itemOrderIds: sortedIds, expectedVersion: version }),
    });
    setGuestIds(sortedIds);
    setVersion(shelf.version);
    setSummary("Organization applied. Your products and company relationships are unchanged.");
  }

  return (
    <>
      <PageIntro eyebrow="Private by default" title={name}>
        <p>
          Saved discoveries are separate from investments. Removing a product here never sells a
          holding.
        </p>
      </PageIntro>
      <div className="notice">
        {signedIn
          ? "This private shelf is saved to your account. Saved discoveries remain separate from holdings."
          : "Guest saves stay in this browser session. Sign in before closing the session if you want to keep them."}
      </div>
      <div className="section actions">
        {signedIn ? (
          <button data-cta="C25" onClick={renameShelf}>
            Rename shelf
          </button>
        ) : null}
        <CtaLink id="C26" href="/scan" secondary>
          Scan another product
        </CtaLink>
        <CtaLink id="C27" href="/invest/basket" secondary>
          Choose companies to invest in
        </CtaLink>
        {signedIn ? (
          <>
            <button className="secondary" data-cta="C28" onClick={summarize}>
              Summarize my shelf
            </button>
            <CtaLink id="C29" href="/saved/share" secondary>
              Share by link
            </CtaLink>
          </>
        ) : (
          <CtaLink id="C31" href="/sign-in" secondary>
            Sign in to keep this shelf
          </CtaLink>
        )}
      </div>
      {summary ? (
        <ResultMessage>
          {summary}
          <div className="actions">
            <button data-cta="C32" onClick={applyOrganization}>
              Apply organization
            </button>
          </div>
        </ResultMessage>
      ) : null}
      <ErrorMessage message={error} />
      {signedIn ? (
        <section className="section">
          <p className="eyebrow">Market watchlist</p>
          <h2>Companies you are researching</h2>
          <p className="muted">
            Watching is separate from owning. Public xStocks and private PreStocks remain visibly
            labeled here.
          </p>
          {watchedCompanies.length ? (
            <div className="grid">
              {watchedCompanies.map((company) => (
                <Card
                  className={
                    company.instrument?.provider === "prestocks"
                      ? "private-market-card"
                      : "public-market-card"
                  }
                  key={company.id}
                >
                  <span className="badge">
                    {company.instrument?.provider === "prestocks"
                      ? "Private · PreStocks"
                      : "Public · xStocks"}
                  </span>
                  <h3>{company.name}</h3>
                  <p className="muted">{company.instrument?.symbol}</p>
                  <div className="actions">
                    <Link className="button" href={`/companies/${company.slug}`}>
                      Research
                    </Link>
                    <button className="ghost" onClick={() => removeWatchedCompany(company.id)}>
                      Remove
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No companies watched"
              action={
                <CtaLink id="market-watch-empty" href="/discover?entity=company">
                  Explore companies
                </CtaLink>
              }
            >
              Add companies from either market without placing an order.
            </EmptyState>
          )}
        </section>
      ) : null}
      <section className="section grid">
        {(guestIds.length ? guestIds : ["product-doritos-snack", "product-olay-skincare"]).map(
          (id) => (
            <Card key={id}>
              <ProductCard productId={id} />
              <button className="ghost" data-cta="C30" onClick={() => removeItem(id)}>
                Remove item
              </button>
            </Card>
          ),
        )}
      </section>
    </>
  );
}

export function LearnScreen({ slug }: { slug?: string }) {
  if (slug) {
    const article = articles.find((item) => item.slug === slug);
    if (!article)
      return (
        <EmptyState title="Explainer unavailable">
          Return to the learning library and choose another topic.
        </EmptyState>
      );
    return (
      <>
        <PageIntro eyebrow={`Reviewed ${article.reviewedAt}`} title={article.title} />
        <Card>
          {article.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <div className="actions">
            <CtaLink id="C33" href="/discover">
              Explore related brands
            </CtaLink>
            <CtaLink id="C34" href="/assistant" secondary>
              Ask a question
            </CtaLink>
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageIntro eyebrow="Learning library" title="Understand each layer before acting" />
      <div className="grid">
        {articles.map((article) => (
          <Card key={article.slug}>
            <h2>{article.title}</h2>
            <p className="muted">
              Version {article.version} · reviewed {article.reviewedAt}
            </p>
            <Link className="button ghost" href={`/learn/${article.slug}`}>
              Read
            </Link>
          </Card>
        ))}
      </div>
    </>
  );
}

export function AssistantScreen() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function ask() {
    try {
      const response = await postJson<{ answer: string }>("ai/answer", {
        question,
        includeShelf: false,
      });
      setAnswer(response.answer);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "AI request failed");
    }
  }

  return (
    <>
      <PageIntro eyebrow="AI assistant" title="Ask about products, companies and stock tokens">
        <p>
          AI may be wrong. Answers use reviewed Shelf sources and cannot place orders or sign
          transactions.
        </p>
      </PageIntro>
      <Card className="stack">
        <Field label="Your question" htmlFor="assistant-question">
          <textarea
            id="assistant-question"
            maxLength={2000}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
          />
        </Field>
        <div className="actions">
          <button data-cta="C35" disabled={!question.trim()} onClick={ask}>
            Send question
          </button>
          <button
            className="secondary"
            data-cta="C36"
            onClick={() => setError("Response stopped. Provider cancellation is best effort.")}
          >
            Stop response
          </button>
          <button
            className="ghost"
            data-cta="C37"
            onClick={() => {
              setQuestion("");
              setAnswer("");
            }}
          >
            Clear conversation
          </button>
          <CtaLink id="C38" href="/invest/basket?source=ai" secondary>
            Suggest an allocation
          </CtaLink>
        </div>
        <ErrorMessage message={error} />
        {answer ? (
          <ResultMessage>
            {answer}
            <div className="actions">
              <CtaLink id="C39" href="/invest/basket?source=ai">
                Use this draft
              </CtaLink>
            </div>
          </ResultMessage>
        ) : null}
      </Card>
    </>
  );
}

export function AllocationScreen() {
  const router = useRouter();
  const [budget, setBudget] = useState("30");
  const [draft, setDraft] = useState<Array<{ companyId: string; amountUsdcRaw: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  async function generateDraft() {
    try {
      const raw = (BigInt(budget) * 1_000_000n).toString();
      const response = await postJson<{
        allocations: Array<{ companyId: string; amountUsdcRaw: string }>;
      }>("ai/allocation-drafts", {
        budgetUsdcRaw: raw,
        companyIds: companies
          .filter((company) => company.instrument?.capabilities.buy)
          .slice(0, 5)
          .map((company) => company.id),
        includeShelf: true,
      });
      setDraft(response.allocations);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Draft failed");
    }
  }

  function updateAllocation(companyId: string, amount: string) {
    setDraft((current) =>
      current.map((item) =>
        item.companyId === companyId ? { ...item, amountUsdcRaw: amount } : item,
      ),
    );
  }

  function applyDraft() {
    sessionStorage.setItem("shelf:allocation-draft", JSON.stringify(draft));
    router.push("/invest/basket");
  }

  return (
    <>
      <PageIntro eyebrow="Editable proposal" title="Build an allocation proposal">
        <p>
          This is not a return prediction or suitability assessment. Shelf uses only verified
          supported candidates you explicitly selected.
        </p>
      </PageIntro>
      <Card className="stack">
        <Field label="Budget in USDC" htmlFor="allocation-budget">
          <input
            id="allocation-budget"
            inputMode="decimal"
            value={budget}
            onChange={(event) => setBudget(event.target.value)}
          />
        </Field>
        <label>
          <input type="checkbox" /> Use my shelf context
        </label>
        <button data-cta="C40" onClick={generateDraft}>
          Generate draft
        </button>
        <ErrorMessage message={error} />
      </Card>
      {draft.length ? (
        <section className="section stack">
          <div className="notice">
            Limited catalog and token issuer risks apply. Familiarity is not valuation.
          </div>
          {draft.map((item) => (
            <Card key={item.companyId}>
              <h3>{companyById(item.companyId)?.name}</h3>
              <Field label="Allocation in raw USDC" htmlFor={`draft-${item.companyId}`}>
                <input
                  id={`draft-${item.companyId}`}
                  data-cta="C41"
                  inputMode="numeric"
                  value={item.amountUsdcRaw}
                  onChange={(event) => updateAllocation(item.companyId, event.target.value)}
                />
              </Field>
            </Card>
          ))}
          <button data-cta="C42" onClick={applyDraft}>
            Apply to basket
          </button>
        </section>
      ) : null}
    </>
  );
}
