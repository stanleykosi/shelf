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
import { ProductArtwork } from "@/components/discovery-patterns";
import { useReviewedIssuerLinks } from "@/components/use-reviewed-issuer-links";
import {
  apiRequest,
  authenticationIsRequired,
  postJson,
} from "@/lib/api-client";
import { ErrorMessage, PageIntro, ResultMessage } from "@/components/ui";

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
  const [notice, setNotice] = useState("");
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
      setNotice(
        saved
          ? `${kind} removed from Saved. Holdings are unchanged.`
          : `${kind} saved for research${
              member ? "." : " for this browser session."
            }`
      );
    } catch {
      setError(
        "This saved item could not be updated. Your research is still available; please retry."
      );
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
                `/companies/${companyById(id)?.slug ?? ""}`
              )}` as Route
            }
          >
            Sign in to save company
          </Link>
        ) : (
          <button
            className="secondary"
            disabled={member === null || busy}
            onClick={toggle}
          >
            {busy
              ? "Updating Saved…"
              : saved
              ? `Remove ${kind.toLowerCase()} from Saved`
              : `Save ${kind.toLowerCase()}`}
          </button>
        )}
        <Link className="button ghost" href="/saved">
          View Saved
        </Link>
      </div>
      {member === null && !error ? (
        <p role="status">Checking saved status…</p>
      ) : null}
      {member === false && kind === "Product" ? (
        <p className="muted">
          Guest saves last for this browser session. Sign in to keep them.
        </p>
      ) : null}
      {notice ? <ResultMessage>{notice}</ResultMessage> : null}
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
  const [reportState, setReportState] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  async function reportRelationship() {
    if (reportBusy) return;
    setReportBusy(true);
    try {
      await postJson("catalog/reports", {
        productId: product.id,
        reasonCode: "relationship_review",
        note: "User requested review from Product research.",
      });
      setReportState(
        "Review requested. The current catalog relationship has not been changed."
      );
    } catch (error) {
      setReportState(
        authenticationIsRequired(error)
          ? "Sign in to submit a relationship report."
          : "The review request could not be sent. Please try again."
      );
    } finally {
      setReportBusy(false);
    }
  }
  return (
    <>
      <div className="research-identity">
        <ProductArtwork
          product={product}
          sizes="(max-width: 819px) 110px, 240px"
        />
        <PageIntro
          eyebrow={`Product / ${product.category}`}
          title={product.name}
        >
          <p>
            {brand ? (
              <Link href={`/brands/${brand.slug}`}>{brand.name}</Link>
            ) : (
              product.brand
            )}{" "}
            · {product.region}
          </p>
        </PageIntro>
      </div>
      <div className="actions">
        {company ? (
          <Link className="button" href={`/companies/${company.slug}`}>
            View company research
          </Link>
        ) : null}
      </div>
      <section className="research-section section">
        <h2>Relationship explorer</h2>
        <CapitalRelationship product={product} discloseEvidence />
      </section>
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
            <button
              className="secondary"
              disabled={reportBusy}
              onClick={reportRelationship}
            >
              {reportBusy ? "Submitting…" : "Request review"}
            </button>
            <p role="status">{reportState}</p>
            {reportState.startsWith("Sign in") ? (
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
          <h2>Keep for research</h2>
          <p>
            Saving a Product does not buy an asset or verify a current issuer
            listing.
          </p>
          <SaveResearch id={product.id} kind="Product" />
        </section>
      </div>
      <section className="research-section">
        <h2>More from {product.brand}</h2>
        <ProductList
          items={products.filter(
            (item) => item.brand === product.brand && item.id !== product.id
          )}
        />
      </section>
    </>
  );
}

export function ResearchBrandScreen({ slug }: { slug: string }) {
  const brand = brandBySlug(slug)!;
  const items = products.filter((product) =>
    brand.productIds.includes(product.id)
  );
  return (
    <>
      <PageIntro eyebrow="Brand research" title={brand.name}>
        <p>
          A Brand is the identity you recognize on a Product. It is not
          necessarily a separate Company.
        </p>
      </PageIntro>
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
              <CapitalRelationship product={example} discloseEvidence />
            ) : null}
            <p>{relationship.region}</p>
            {company ? (
              <Link className="button" href={`/companies/${company.slug}`}>
                View {company.name} research
              </Link>
            ) : (
              <p>No reviewed Company relationship is available.</p>
            )}
          </section>
        );
      })}
      <Evidence items={items} />
    </>
  );
}

export function ResearchCompanyScreen({ companyId }: { companyId: string }) {
  const company = companyById(companyId)!;
  const items = products.filter((product) => product.companyId === company.id);
  const { links, error } = useReviewedIssuerLinks();
  const listings = links?.byCompany[company.id] ?? [];
  const incomplete = Boolean(links?.unavailable.length || links?.stale.length);
  return (
    <>
      <PageIntro eyebrow="Company research" title={company.name}>
        <p>
          {company.ticker && company.exchange !== "Private"
            ? `${company.ticker} · ${company.exchange}`
            : "Private company context"}
          . {company.description}
        </p>
      </PageIntro>
      <nav className="research-tabs" aria-label="Company sections">
        <a href="#known-for">Known for</a>
        <a href="#company-evidence">Evidence</a>
        <a href="#company-exposure">Exposure</a>
      </nav>
      <div className="research-split">
        <section className="research-section">
          <h2>Company, not Instrument</h2>
          <p>
            The business behind the reviewed relationships below is separate
            from any issuer-defined asset. Saving is research; it does not
            create a Holding.
          </p>
          <SaveResearch id={company.id} kind="Company" />
        </section>
        <section className="research-section">
          <h2>Continue your research</h2>
          <p>
            Start with familiar Products, then inspect their sources and the
            separate terms of any available exposure.
          </p>
          <Link
            className="button secondary"
            href={`/assistant?company=${company.slug}&from=company` as Route}
          >
            Ask about this Company
          </Link>
        </section>
      </div>
      <section className="research-section" id="known-for">
        <h2>Known for</h2>
        <ProductList items={items} />
      </section>
      <section className="research-section" id="company-evidence">
        <h2>Evidence and relationships</h2>
        {items[0] ? (
          <CapitalRelationship product={items[0]} discloseEvidence />
        ) : (
          <p>
            No reviewed consumer Product relationship is recorded. Company
            exposure does not establish one.
          </p>
        )}
        <Evidence items={items} />
      </section>
      <section className="research-section" id="company-exposure">
        <h2>Separate investment exposure</h2>
        <p className="research-reading">
          Issuer-defined instruments have their own rights, restrictions and
          liquidity. They are not ordinary voting shares in {company.name}.
          Current issuer feeds—not recognition suggestions—establish the asset
          identity.
        </p>
        {!links && !error ? (
          <p role="status">Checking current issuer listings…</p>
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
    </>
  );
}
