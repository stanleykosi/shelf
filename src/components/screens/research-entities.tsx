"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useState } from "react";
import {
  brands,
  brandBySlug,
  companyById,
  products,
  productById,
  sources,
} from "@/data/catalog";
import type { Company, Product } from "@/domain/types";
import { CapitalRelationship } from "@/components/capital-relationship";
import { ResearchBand, ResearchCanvas } from "@/components/platform-composition";
import { ProductArtwork } from "@/components/discovery-patterns";
import { useReviewedIssuerLinks } from "@/components/use-reviewed-issuer-links";
import {
  apiRequest,
  authenticationIsRequired,
  postJson,
} from "@/lib/api-client";
import { ResearchJourney, JourneyHeading } from "@/components/research-journey";
import { ArrowRight, ArrowUpRight, Bookmark, ShieldCheck } from "@/components/studio-icons";
import { ErrorMessage } from "@/components/ui";

import { useNotification } from "@/components/notifications";
import { LoadingStatus, PendingButton } from "@/components/loading-feedback";

function guestProducts(): string[] {
  const value: unknown = JSON.parse(
    sessionStorage.getItem("shelf:guest-items") ?? "[]"
  );
  return Array.isArray(value)
    ? value.filter(
        (id): id is string => typeof id === "string" && Boolean(productById(id))
      )
    : [];
}

function SaveResearch({
  id,
  kind,
}: {
  id: string;
  kind: "Product" | "Company";
}) {
  const [member, setMember] = useState<boolean | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const notify = useNotification();
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    const request =
      kind === "Product"
        ? apiRequest<{ items: Array<{ id: string }> }>("shelf").then(
            (data) => data.items
          )
        : apiRequest<Company[]>("watchlist");
    request
      .then((items) => {
        if (active) {
          setMember(true);
          setSaved(items.some((item) => item.id === id));
          setError(null);
        }
      })
      .catch((reason: unknown) => {
        if (!active) return;
        if (authenticationIsRequired(reason)) {
          setMember(false);
          try {
            setSaved(kind === "Product" && guestProducts().includes(id));
          } catch {
            setError(
              "Temporary saving is unavailable in this browser. Research remains available."
            );
          }
        } else
          setError(
            "Saved research could not be loaded. Retry before changing your saved items."
          );
      });
    return () => {
      active = false;
    };
  }, [id, kind, revision]);

  async function toggle() {
    if (busy || member === null) return;
    setBusy(true);
    setError(null);
    try {
      if (member) {
        const endpoint = kind === "Product" ? "shelf/items" : "watchlist/items";
        if (saved)
          await apiRequest(`${endpoint}/${encodeURIComponent(id)}`, {
            method: "DELETE",
          });
        else
          await postJson(
            endpoint,
            kind === "Product" ? { productIds: [id] } : { companyId: id }
          );
      } else if (kind === "Product") {
        const existing = guestProducts();
        if (!saved && existing.length >= 100) throw new Error("SAVED_LIMIT");
        sessionStorage.setItem(
          "shelf:guest-items",
          JSON.stringify(
            saved
              ? existing.filter((value) => value !== id)
              : [...new Set([...existing, id])]
          )
        );
      } else return;
      setSaved(!saved);
      notify(
        saved
          ? `${kind} removed from Saved. Holdings are unchanged.`
          : `${kind} saved for research${
              member ? "." : " for this browser session."
            }`, "success"
      );
    } catch {
      notify("This saved item could not be updated. Your research is still available; please retry.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="actions">
        {member === false && kind === "Company" ? (
          <Link
            className="button secondary"
            href={
              `/sign-in?returnTo=${encodeURIComponent(
                `/discover?q=${encodeURIComponent(companyById(id)?.name ?? "")}`
              )}` as Route
            }
          >
            Sign in to save company
          </Link>
        ) : (
          <PendingButton
            pending={busy}
            pendingLabel="Updating Saved…"
            className="secondary"
            disabled={member === null}
            onClick={toggle}
          >
            {saved
              ? `Remove ${kind.toLowerCase()} from Saved`
              : `Save ${kind.toLowerCase()}`}
          </PendingButton>
        )}
        <Link className="button ghost" href="/saved">
          View Saved
        </Link>
      </div>
      {member === null && !error ? (
        <LoadingStatus>Checking saved status…</LoadingStatus>
      ) : null}
      {member === false && kind === "Product" ? (
        <p className="muted">
          Guest saves last for this browser session. Sign in to keep them.
        </p>
      ) : null}
      <ErrorMessage message={error} />
      {error && member === null ? (
        <button
          className="secondary"
          onClick={() => setRevision((value) => value + 1)}
        >
          Retry saved status
        </button>
      ) : null}
    </div>
  );
}

function Evidence({ items }: { items: Product[] }) {
  const ids = new Set(items.flatMap((item) => item.sourceIds));
  return (
    <details>
      <summary>Relationship evidence and regional context</summary>
      <div className="research-rows">
        {sources
          .filter((source) => ids.has(source.id))
          .map((source) => (
            <div className="research-row" key={source.id}>
              <div>
                <h3>
                  <a href={source.url} target="_blank" rel="noreferrer">
                    {source.title}
                  </a>
                </h3>
                <p className="muted">
                  {source.publisher} · reviewed {source.verifiedAt}
                </p>
              </div>
            </div>
          ))}
      </div>
      <p>
        These are reviewed product-family relationships, not a guarantee for
        every local SKU, license or historical owner. Check the source and
        packaging for your region.
      </p>
      {items.length ? (
        <p className="muted">
          {[
            ...new Set(
              items.map((item) => item.relationship.replaceAll("_", " "))
            ),
          ].join(" · ")}
        </p>
      ) : (
        <p>No reviewed Product relationships are available for this Company.</p>
      )}
    </details>
  );
}

function ProductList({ items }: { items: Product[] }) {
  return items.length ? (
    <div className="research-products">
      {items.map((product) => (
        <Link href={`/products/${product.slug}`} key={product.id}>
          <ProductArtwork
            product={product}
            sizes="(max-width: 819px) 160px, 240px"
          />
          <h3>{product.name}</h3>
          <p className="muted">{product.brand} · Product</p>
        </Link>
      ))}
    </div>
  ) : (
    <p className="muted">No reviewed Products have been linked here yet.</p>
  );
}

export function ResearchProductScreen({ productId }: { productId: string }) {
  const product = productById(productId)!;
  const company = companyById(product.companyId);
  const brand = brands.find((item) => item.productIds.includes(product.id));
  const [report, setReport] = useState(false);
  const notify = useNotification();
  const [reportSignIn, setReportSignIn] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);
  async function reportRelationship() {
    if (reportBusy) return;
    setReportBusy(true);
    setReportSignIn(false);
    try {
      await postJson("catalog/reports", {
        productId: product.id,
        reasonCode: "relationship_review",
        note: "User requested review from Product research.",
      });
      notify("Review requested. The current catalog relationship has not been changed.", "success");
    } catch (error) {
      setReportSignIn(authenticationIsRequired(error));
      notify(
        authenticationIsRequired(error)
          ? "Sign in to submit a relationship report."
          : "The review request could not be sent. Please try again.", "error"
      );
    } finally {
      setReportBusy(false);
    }
  }
  return (
    <ResearchJourney kind="product">
      <div className="product-research-hero">
        <div className="product-research-object">
          <span className="studio-eyebrow">The familiar starting point</span>
          <ProductArtwork product={product} sizes="(max-width: 819px) 320px, 480px" />
          <span className="product-image-note">Product or brand reference · packaging may vary</span>
        </div>
        <div className="product-research-intro">
          <JourneyHeading eyebrow={`Product / ${product.category}`} title={product.name}>
            <p>{brand ? <Link href={`/brands/${brand.slug}`}>{brand.name} <ArrowUpRight size={15} aria-hidden="true" /></Link> : product.brand} · {product.region}</p>
          </JourneyHeading>
          <p className="journey-lede">A familiar product. Follow its reviewed connection to the company behind it.</p>
          <dl className="journey-facts">
            <div><dt>Category</dt><dd>{product.category}</dd></div>
            <div><dt>Company</dt><dd>{company?.name ?? "Not established"}</dd></div>
          </dl>
          {company ? <Link className="button" href={`/discover?q=${encodeURIComponent(company.name)}`}>Search current tokens <ArrowRight size={17} aria-hidden="true" /></Link> : null}
          <p className="journey-source-note"><ShieldCheck size={16} aria-hidden="true" />Reviewed catalog relationship. Check the regional evidence below.</p>
        </div>
      </div>
      <div className="research-split">
        <section className="research-section">
          <h2>Behind this Product</h2>
          <p>
            {company?.description ??
              "No reviewed Company context is available."}
          </p>
          <p className="muted">
            Recognizing a Product does not establish ownership of a Company or
            an investment instrument.
          </p>
          <Evidence items={[product]} />
          <details
            open={report}
            onToggle={(event) => setReport(event.currentTarget.open)}
          >
            <summary>Report a relationship concern</summary>
            <p>
              Request an evidence review. Do not include personal or payment
              information.
            </p>
            <PendingButton
              pending={reportBusy}
              pendingLabel="Submitting review request…"
              className="secondary"
              onClick={reportRelationship}
            >
              Request review
            </PendingButton>
            {reportSignIn ? (
              <Link
                href={
                  `/sign-in?returnTo=${encodeURIComponent(
                    `/products/${product.slug}`
                  )}` as Route
                }
              >
                Sign in to report
              </Link>
            ) : null}
          </details>
        </section>
        <section className="research-section">
          <h2><Bookmark size={21} aria-hidden="true" />Keep for research</h2>
          <p>
            Saving a Product does not buy an asset or verify a current issuer
            listing.
          </p>
          <SaveResearch id={product.id} kind="Product" />
        </section>
      </div>
      {products.some((item) => item.brand === product.brand && item.id !== product.id) ? <section className="research-section">
        <h2>More from {product.brand}</h2>
        <ProductList
          items={products.filter(
            (item) => item.brand === product.brand && item.id !== product.id
          )}
        />
      </section> : null}
    </ResearchJourney>
  );
}

export function ResearchBrandScreen({ slug }: { slug: string }) {
  const brand = brandBySlug(slug)!;
  const items = products.filter((product) =>
    brand.productIds.includes(product.id)
  );
  return (
    <ResearchJourney kind="brand">
      <div className="brand-research-hero">
        <JourneyHeading eyebrow="Brand research" title={brand.name}>
          <p>The name you recognize. Explore the products and reviewed company relationships behind it.</p>
        </JourneyHeading>
        <div className="brand-identity-object" aria-hidden="true"><span>{brand.name.slice(0, 1)}</span><small>A familiar identity</small></div>
      </div>
      <div className="brand-research-context"><span>{items.length} reviewed product {items.length === 1 ? "family" : "families"}</span><p>A Brand is the identity you recognize on a Product. It is not necessarily a separate Company.</p></div>
      <section className="research-section">
        <h2>Products you may know</h2>
        <ProductList items={items} />
      </section>
      {brand.companyRelationships.map((relationship) => {
        const company = companyById(relationship.companyId);
        const example = items.find((item) =>
          relationship.productIds.includes(item.id)
        );
        return (
          <section
            className="research-section"
            key={`${relationship.companyId}-${relationship.region}`}
          >
            <h2>Company relationship</h2>
            {example ? (
              <CapitalRelationship product={example} discloseEvidence studio />
            ) : null}
            <p>{relationship.region}</p>
            {company ? (
              <Link className="button" href={`/discover?q=${encodeURIComponent(company.name)}`}>
                Find {company.name} tokens
              </Link>
            ) : (
              <p>No reviewed Company relationship is available.</p>
            )}
          </section>
        );
      })}
      <Evidence items={items} />
    </ResearchJourney>
  );
}

export function ResearchCompanyScreen({ companyId }: { companyId: string }) {
  const company = companyById(companyId)!;
  const items = products.filter((product) => product.companyId === company.id);
  const { links, error } = useReviewedIssuerLinks();
  const listings = links?.byCompany[company.id] ?? [];
  const incomplete = Boolean(links?.unavailable.length || links?.stale.length);
  const [selectedProduct, setSelectedProduct] = useState(0);
  const example = items[selectedProduct] ?? items[0];
  return (
    <ResearchJourney kind="company">
    <ResearchCanvas>
      <header className="company-identity-stage">
        <div className="company-masthead">
          <p className="studio-eyebrow"><span className="studio-marker" />Company research</p>
          <h1>{company.name}</h1>
          <p className="company-listing">
          {company.ticker && company.exchange !== "Private"
            ? `${company.ticker} · ${company.exchange}`
            : "Private company context"}
          </p>
        </div>
        <div className="company-context">
          <p>{company.description}</p>
          <SaveResearch id={company.id} kind="Company" />
        </div>
      </header>
      <nav className="company-section-nav" aria-label="Company sections">
        <a href="#known-for">Known for</a>
        <a href="#company-evidence">Evidence</a>
        <a href="#company-exposure">Exposure</a>
      </nav>
      <section className="company-exhibits" id="known-for">
        <header><h2>Known for</h2><p>Everyday products. One wider picture.</p></header>
        {items.length ? <div className="company-product-field">{items.map((item, index) => (
          <Link href={`/products/${item.slug}`} key={item.id} className="company-exhibit">
            <div className="company-exhibit-media"><span>{String(index + 1).padStart(2, "0")}</span><ProductArtwork product={item} sizes="(max-width: 819px) 270px, 340px" /></div>
            <div className="company-exhibit-caption"><strong>{item.brand}</strong><span>{item.name} <ArrowUpRight size={16} aria-hidden="true" /></span></div>
          </Link>
        ))}</div> : <p>No reviewed Products have been linked here yet.</p>}
        <p className="platform-caption">Reviewed product families. Images may represent a product or brand identity.</p>
      </section>
      <ResearchBand id="company-evidence">
        <header className="company-evidence-heading"><div><p className="platform-label">Evidence and relationships</p><h2>Familiar on the outside.<br />Connected underneath.</h2></div><p>A recognizable name is a starting point.<br />A reviewed source makes the connection.</p></header>
        {example ? (
          <div className="company-relationship-stage">
            <nav aria-label="Explore product relationships">{items.map((item, index) => <button type="button" key={item.id} aria-pressed={selectedProduct === index} onClick={() => setSelectedProduct(index)}>{item.brand}<ArrowUpRight size={15} aria-hidden="true" /></button>)}</nav>
            <div className="company-relationship-object"><CapitalRelationship product={example} discloseEvidence studio /></div>
          </div>
        ) : (
          <p>
            No reviewed consumer Product relationship is recorded. Company
            exposure does not establish one.
          </p>
        )}
        <div className="company-evidence-notes"><Evidence items={items} /></div>
      </ResearchBand>
      <section className="company-research-note">
        <h2>Company, not Instrument</h2>
        <div><p>The business behind these products is separate from any issuer-defined asset. Saving is research; it does not create a Holding.</p><Link href={`/discover?q=${encodeURIComponent(company.name)}` as Route}>Find current tokens <ArrowUpRight size={16} aria-hidden="true" /></Link></div>
      </section>
      <section className="company-exposure-stage" id="company-exposure">
        <p className="platform-label">The next layer</p>
        <h2>Separate investment exposure</h2>
        <p className="research-reading">
          Issuer-defined instruments have their own rights, restrictions and
          liquidity. They are not ordinary voting shares in {company.name}.
          Current issuer feeds—not recognition suggestions—establish the asset
          identity.
        </p>
        {!links && !error ? (
          <LoadingStatus>Checking current issuer listings…</LoadingStatus>
        ) : null}
        {error || incomplete ? (
          <p className="notice">
            Some issuer information is unavailable or stale. Research remains
            available; current investment availability is not confirmed.
          </p>
        ) : null}
        {links && !listings.length && !incomplete ? (
          <p className="notice">
            No current supported instrument matches this Company. You can still
            research and save it.
          </p>
        ) : null}
        {listings.map(({ provider, asset }) => (
          <div className="research-row" key={`${provider}-${asset.symbol}`}>
            <div>
              <h3>
                {asset.name} · {asset.symbol}
              </h3>
              <p>
                {provider === "prestocks"
                  ? "Pre-IPO exposure token · PreStocks"
                  : "Public equity tracker · xStocks"}
              </p>
              <p className="muted">
                {provider === "prestocks"
                  ? "No direct Company shares, voting or information rights. Private marks are not executable prices."
                  : "Issuer-defined exposure, not an ordinary voting share. Trading access and liquidity are separate checks."}
              </p>
            </div>
            <Link
              className="button secondary"
              href={
                `/assets/${provider}/${encodeURIComponent(
                  asset.symbol
                )}` as Route
              }
            >
              View exposure details
            </Link>
          </div>
        ))}
        <Link className="button ghost" href="/learn/stock-tokens">
          Understand instrument rights
        </Link>
      </section>
    </ResearchCanvas>
    </ResearchJourney>
  );
}
