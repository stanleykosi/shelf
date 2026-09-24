"use client";

import Link from "next/link";
import type { Route } from "next";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { companyById, productById } from "@/data/catalog";
import type { Company, Product } from "@/domain/types";
import { ProductArtwork } from "@/components/discovery-patterns";
import {
  CtaLink,
  EmptyState,
  ErrorMessage,
  Field,
  PageIntro,
  ResultMessage,
} from "@/components/ui";
import {
  apiRequest,
  authenticationIsRequired,
  postJson,
} from "@/lib/api-client";

export type SavedCollection = {
  name: string;
  version: number;
  items: Product[];
};
export function readGuestIds(key: string): string[] {
  const value: unknown = JSON.parse(sessionStorage.getItem(key) ?? "[]");
  return Array.isArray(value)
    ? [...new Set(value.filter((id): id is string => typeof id === "string"))]
    : [];
}
export function companyResearchPath(company: Company): string {
  return company.id.startsWith("issuer:") && company.instrument
    ? `/assets/${company.instrument.provider}/${encodeURIComponent(
        company.instrument.symbol
      )}`
    : `/companies/${company.slug}`;
}

export function ShelfScreen() {
  const params = useSearchParams();
  const view = params.get("view") === "companies" ? "companies" : "products";
  const [collection, setCollection] = useState<SavedCollection>({
    name: "Saved research",
    version: 1,
    items: [],
  });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [guestProducts, setGuestProducts] = useState<string[]>([]);
  const [guestIssuers, setGuestIssuers] = useState<string[]>([]);
  const [member, setMember] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [summary, setSummary] = useState("");
  const [proposed, setProposed] = useState<string[]>([]);
  const [previousOrder, setPreviousOrder] = useState<string[]>([]);
  const [removed, setRemoved] = useState<{
    product?: Product;
    company?: Company;
  } | null>(null);

  async function load() {
    await Promise.resolve();
    setLoading(true);
    setError(null);
    try {
      const ids = readGuestIds("shelf:guest-items").filter((id) =>
        productById(id)
      );
      setGuestProducts(ids);
      setGuestIssuers(readGuestIds("shelf:guest-issuer-assets"));
      try {
        const saved = await apiRequest<SavedCollection>("shelf");
        setCollection(saved);
        setName(saved.name);
        setMember(true);
        try {
          setCompanies(await apiRequest<Company[]>("watchlist"));
        } catch {
          setError(
            "Saved Products loaded, but Companies are unavailable. Reload to retry."
          );
        }
      } catch (reason) {
        if (!authenticationIsRequired(reason)) throw reason;
        setMember(false);
        setCollection({
          name: "Saved research",
          version: 1,
          items: ids.flatMap((id) => {
            const product = productById(id);
            return product ? [product] : [];
          }),
        });
      }
    } catch {
      setError(
        "Saved research could not be loaded. Your existing saves have not been changed."
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function action(task: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setMessage("");
    try {
      await task();
    } catch (reason) {
      setError(
        reason instanceof Error && reason.message === "VERSION_CONFLICT"
          ? "Saved research changed elsewhere. Reload before applying this change."
          : `Could not update Saved research: ${
              reason instanceof Error
                ? reason.message.replaceAll("_", " ").toLowerCase()
                : "please retry"
            }.`
      );
    } finally {
      setBusy(false);
    }
  }
  async function saveOrder(ids: string[]) {
    const updated = await apiRequest<SavedCollection>("shelf", {
      method: "PATCH",
      body: JSON.stringify({
        itemOrderIds: ids,
        expectedVersion: collection.version,
      }),
    });
    setCollection(updated);
  }
  async function merge() {
    if (guestProducts.length) {
      const updated = await postJson<SavedCollection>("shelf/merge", {
        productIds: guestProducts,
        expectedVersion: collection.version,
      });
      setCollection(updated);
      sessionStorage.removeItem("shelf:guest-items");
      setGuestProducts([]);
    }
    const remaining = [...guestIssuers];
    for (const companyId of guestIssuers) {
      setCompanies(await postJson<Company[]>("watchlist/items", { companyId }));
      remaining.splice(remaining.indexOf(companyId), 1);
      sessionStorage.setItem(
        "shelf:guest-issuer-assets",
        JSON.stringify(remaining)
      );
      setGuestIssuers([...remaining]);
    }
    setMessage(
      "Session saves merged into your account. Holdings are unchanged."
    );
  }
  async function removeProduct(product: Product) {
    const items = collection.items.filter((item) => item.id !== product.id);
    if (member)
      setCollection(
        await apiRequest<SavedCollection>(`shelf/items/${product.id}`, {
          method: "DELETE",
        })
      );
    else {
      sessionStorage.setItem(
        "shelf:guest-items",
        JSON.stringify(items.map((item) => item.id))
      );
      setCollection({ ...collection, items });
    }
    setRemoved({ product });
    setMessage(`${product.name} removed from Saved. Holdings are unchanged.`);
  }
  async function undo() {
    if (removed?.product) {
      if (member)
        setCollection(
          await postJson<SavedCollection>("shelf/items", {
            productIds: [removed.product.id],
            expectedVersion: collection.version,
          })
        );
      else {
        const items = [...collection.items, removed.product];
        sessionStorage.setItem(
          "shelf:guest-items",
          JSON.stringify(items.map((item) => item.id))
        );
        setCollection({ ...collection, items });
      }
    }
    if (removed?.company)
      setCompanies(
        await postJson<Company[]>("watchlist/items", {
          companyId: removed.company.id,
        })
      );
    setRemoved(null);
    setMessage("Restored to Saved research.");
  }
  const parentCount = new Set(collection.items.map((item) => item.companyId))
    .size;
  return (
    <>
      <PageIntro eyebrow="Private research collection" title="Saved research">
        <p>
          Keep Products and Companies to revisit. Saving is not ownership;
          removing research never sells a Holding.
        </p>
      </PageIntro>
      {loading ? <p role="status">Loading your saved research…</p> : null}
      <ErrorMessage message={error} />
      {error ? (
        <button className="secondary" onClick={load} disabled={busy || loading}>
          Reload saved research
        </button>
      ) : null}
      {!loading && member !== null ? (
        <>
          {!member ? (
            <p className="notice">
              Guest saves stay in this browser session.{" "}
              <Link href="/sign-in?returnTo=%2Fsaved">
                Sign in to keep them.
              </Link>
            </p>
          ) : null}
          {member && (guestProducts.length || guestIssuers.length) ? (
            <section className="notice">
              <h2>Keep this session’s research?</h2>
              <p>
                {guestProducts.length} Products and {guestIssuers.length} issuer
                assets are saved on this device. Nothing is imported
                automatically.
              </p>
              <button disabled={busy} onClick={() => action(merge)}>
                Merge session saves
              </button>
            </section>
          ) : null}
          <nav className="research-tabs" aria-label="Saved research view">
            <Link
              href="/saved?view=products"
              aria-current={view === "products" ? "page" : undefined}
            >
              Products ({collection.items.length})
            </Link>
            <Link
              href="/saved?view=companies"
              aria-current={view === "companies" ? "page" : undefined}
            >
              Companies ({companies.length})
            </Link>
          </nav>
          {message ? (
            <ResultMessage>
              {message}
              {removed ? (
                <button
                  className="ghost"
                  disabled={busy}
                  onClick={() => action(undo)}
                >
                  Undo removal
                </button>
              ) : null}
            </ResultMessage>
          ) : null}
          {view === "products" ? (
            <section className="research-section">
              <h2>{member ? collection.name : "Saved Products"}</h2>
              {collection.items.length ? (
                <>
                  <p className="muted">
                    {collection.items.length} Products · {parentCount} reviewed
                    parent {parentCount === 1 ? "company" : "companies"}.
                    Repeated Brands can lead to the same Company.
                  </p>
                  <div className="research-rows">
                    {collection.items.map((product) => (
                      <article className="research-row" key={product.id}>
                        <div className="research-identity">
                          <ProductArtwork product={product} sizes="80px" />
                          <div>
                            <h3>
                              <Link href={`/products/${product.slug}`}>
                                {product.name}
                              </Link>
                            </h3>
                            <p className="muted">
                              {product.brand} ·{" "}
                              {companyById(product.companyId)?.name ??
                                "Relationship unavailable"}
                            </p>
                          </div>
                        </div>
                        <button
                          className="ghost"
                          disabled={busy}
                          aria-label={`Remove ${product.name}`}
                          onClick={() => action(() => removeProduct(product))}
                        >
                          Remove
                        </button>
                      </article>
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState
                  title="No saved Products"
                  action={
                    <CtaLink id="saved-empty-scan" href="/scan">
                      Scan a product
                    </CtaLink>
                  }
                >
                  Start with something familiar, then save its reviewed
                  relationship.
                </EmptyState>
              )}
            </section>
          ) : (
            <section className="research-section">
              <h2>Saved Companies</h2>
              {companies.length ? (
                <div className="research-rows">
                  {companies.map((company) => (
                    <article className="research-row" key={company.id}>
                      <div>
                        <h3>
                          <Link href={companyResearchPath(company) as Route}>
                            {company.name}
                          </Link>
                        </h3>
                        <p className="muted">
                          {company.id.startsWith("issuer:")
                            ? "Issuer asset research · not a Holding"
                            : "Company research · not a Holding"}
                        </p>
                      </div>
                      <button
                        className="ghost"
                        disabled={busy}
                        aria-label={`Remove ${company.name}`}
                        onClick={() =>
                          action(async () => {
                            setCompanies(
                              await apiRequest<Company[]>(
                                `watchlist/items/${company.id}`,
                                { method: "DELETE" }
                              )
                            );
                            setRemoved({ company });
                            setMessage(
                              `${company.name} removed from Saved. Holdings are unchanged.`
                            );
                          })
                        }
                      >
                        Remove
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No saved Companies"
                  action={
                    <CtaLink id="saved-empty-companies" href="/discover">
                      Explore companies
                    </CtaLink>
                  }
                >
                  Keep Company research here without placing an order.
                </EmptyState>
              )}
            </section>
          )}
          {!member && guestIssuers.length ? (
            <section className="research-section">
              <h2>Issuer assets saved this session</h2>
              <p>
                These are instrument references, not confirmed Product
                relationships or Holdings.
              </p>
              {guestIssuers.map((id) => {
                const [, provider, symbol] = id.split(":");
                if (!symbol || !["xstocks", "prestocks"].includes(provider))
                  return null;
                return (
                  <div className="research-row" key={id}>
                    <Link
                      href={
                        `/assets/${provider}/${encodeURIComponent(
                          symbol
                        )}` as Route
                      }
                    >
                      {symbol} · {provider}
                    </Link>
                    <button
                      className="ghost"
                      onClick={() =>
                        action(async () => {
                          const next = guestIssuers.filter(
                            (item) => item !== id
                          );
                          sessionStorage.setItem(
                            "shelf:guest-issuer-assets",
                            JSON.stringify(next)
                          );
                          setGuestIssuers(next);
                        })
                      }
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </section>
          ) : null}
          {member ? (
            <section className="research-section">
              <h2>Collection tools</h2>
              <div className="actions">
                <CtaLink id="C29" href="/saved/share" secondary>
                  Share selected research
                </CtaLink>
                {companies.length ? (
                  <CtaLink id="C27" href="/invest/basket" secondary>
                    Review investment planning
                  </CtaLink>
                ) : null}
              </div>
              <details>
                <summary>Name and organize this collection</summary>
                <div className="stack">
                  <Field label="Collection name" htmlFor="saved-name">
                    <input
                      id="saved-name"
                      maxLength={60}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                    />
                  </Field>
                  <div className="actions">
                    <button
                      data-cta="C25"
                      disabled={busy || !name.trim()}
                      onClick={() =>
                        action(async () => {
                          setCollection(
                            await apiRequest<SavedCollection>("shelf", {
                              method: "PATCH",
                              body: JSON.stringify({
                                name: name.trim(),
                                itemOrderIds: collection.items.map(
                                  (item) => item.id
                                ),
                                expectedVersion: collection.version,
                              }),
                            })
                          );
                          setMessage("Collection name updated.");
                        })
                      }
                    >
                      Save name
                    </button>
                    <button
                      className="secondary"
                      data-cta="C28"
                      disabled={busy || !collection.items.length}
                      onClick={() =>
                        action(async () => {
                          const result = await postJson<{
                            summary: string;
                            proposedSortIds: string[];
                          }>("ai/shelf-summary", {
                            shelfVersion: collection.version,
                          });
                          setSummary(result.summary);
                          setProposed(result.proposedSortIds);
                        })
                      }
                    >
                      Summarize collection
                    </button>
                  </div>
                  {summary ? (
                    <div>
                      <p>{summary}</p>
                      {proposed.length ? (
                        <>
                          <h3>Proposed order</h3>
                          <ol>
                            {proposed.map((id) => (
                              <li key={id}>
                                {productById(id)?.name ?? "Unavailable Product"}
                              </li>
                            ))}
                          </ol>
                          <button
                            data-cta="C32"
                            disabled={busy}
                            onClick={() =>
                              action(async () => {
                                const current = collection.items.map(
                                  (item) => item.id
                                );
                                if (
                                  new Set(proposed).size !== current.length ||
                                  proposed.some((id) => !current.includes(id))
                                )
                                  throw new Error("VERSION_CONFLICT");
                                await saveOrder(proposed);
                                setPreviousOrder(current);
                                setProposed([]);
                                setMessage(
                                  "Organization applied. Product relationships are unchanged."
                                );
                              })
                            }
                          >
                            Apply organization
                          </button>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                  {previousOrder.length ? (
                    <button
                      className="secondary"
                      disabled={busy}
                      onClick={() =>
                        action(async () => {
                          await saveOrder(previousOrder);
                          setPreviousOrder([]);
                          setMessage("Previous order restored.");
                        })
                      }
                    >
                      Undo organization
                    </button>
                  ) : null}
                </div>
              </details>
            </section>
          ) : null}
        </>
      ) : null}
    </>
  );
}
