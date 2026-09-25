"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useState } from "react";
import type { Company, Product } from "@/domain/types";
import type { CreatedShare } from "@/domain/store";
import { companyById, productById } from "@/data/catalog";
import {
  apiRequest,
  authenticationIsRequired,
  postJson,
} from "@/lib/api-client";
import {
  CtaLink,
  EmptyState,
  ErrorMessage,
  PageIntro,
  ResultMessage,
} from "@/components/ui";
import { LoadingStatus, PendingButton } from "@/components/loading-feedback";
import { CopyButton } from "@/components/copy-button";
import { useNotification } from "@/components/notifications";
import { ProductArtwork } from "@/components/discovery-patterns";
import {
  companyResearchPath,
  readGuestIds,
  type SavedCollection,
} from "@/components/screens/research-saved";

type Snapshot = {
  products: Product[];
  companies: Company[];
  expiresAt?: string;
};
type ManagedShare = { id: string; expiresAt: string; revoked: boolean };

export function ShareScreen({ token }: { token?: string }) {
  const [data, setData] = useState<Snapshot>({ products: [], companies: [] });
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [shares, setShares] = useState<ManagedShare[]>([]);
  const [created, setCreated] = useState<CreatedShare | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const setMessage = useNotification();
  const [authRequired, setAuthRequired] = useState(false);
  const [checkedAt] = useState(() => Date.now());

  async function load() {
    await Promise.resolve();
    setLoading(true);
    setError(null);
    try {
      if (token)
        setData(
          await apiRequest<Snapshot>(`shares/${encodeURIComponent(token)}`)
        );
      else {
        const [shelf, companies, existing] = await Promise.all([
          apiRequest<SavedCollection>("shelf"),
          apiRequest<Company[]>("watchlist"),
          apiRequest<ManagedShare[]>("shelf/shares"),
        ]);
        setData({ products: shelf.items, companies });
        setShares(existing);
      }
    } catch (reason) {
      setAuthRequired(authenticationIsRequired(reason));
      setError(
        token
          ? "This collection is unavailable. The link may be expired, revoked or unknown."
          : "Your saved research could not be loaded. Sign in or retry before creating a link."
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
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function action(task: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setMessage("");
    try {
      await task();
    } catch (reason) {
      setError(
        `Sharing could not complete: ${
          reason instanceof Error
            ? reason.message.replaceAll("_", " ").toLowerCase()
            : "retry this action"
        }. Check Saved or the snapshot list before retrying; any earlier completed actions remain.`
      );
    } finally {
      setBusy(false);
    }
  }
  function select(id: string, type: "product" | "company", checked: boolean) {
    const update = (ids: string[]) =>
      checked ? [...new Set([...ids, id])] : ids.filter((item) => item !== id);
    if (type === "product") setSelectedProducts(update);
    else setSelectedCompanies(update);
    setAcknowledged(false);
  }
  async function saveSelected() {
    let member = false;
    try {
      await apiRequest("me");
      member = true;
    } catch (reason) {
      if (!authenticationIsRequired(reason)) throw reason;
    }
    if (member) {
      if (selectedProducts.length)
        await postJson("shelf/items", { productIds: selectedProducts });
      for (const companyId of selectedCompanies)
        await postJson("watchlist/items", { companyId });
    } else {
      if (selectedCompanies.some((id) => !id.startsWith("issuer:"))) {
        throw new Error("SIGN_IN_TO_SAVE_SELECTED_COMPANIES");
      }
      const ids = [
        ...new Set([...readGuestIds("shelf:guest-items"), ...selectedProducts]),
      ].filter((id) => productById(id));
      if (ids.length > 100) throw new Error("TEMPORARY_SAVED_LIMIT_REACHED");
      sessionStorage.setItem("shelf:guest-items", JSON.stringify(ids));
      const issuerIds = selectedCompanies.filter((id) =>
        id.startsWith("issuer:")
      );
      sessionStorage.setItem(
        "shelf:guest-issuer-assets",
        JSON.stringify([
          ...new Set([
            ...readGuestIds("shelf:guest-issuer-assets"),
            ...issuerIds,
          ]),
        ])
      );
    }
    setMessage(
      member
        ? "Selected research added to Saved. Existing saves were preserved."
        : "Selected Products and issuer references saved in this browser session. Sign in to keep Company research."
    );
  }
  const selectedCount = selectedProducts.length + selectedCompanies.length;
  return (
    <>
      <PageIntro
        eyebrow={token ? "Shared research collection" : "Saved / Share"}
        title={token ? "Research worth revisiting." : "Choose what to share."}
      >
        <p>
          {token
            ? "A read-only selection of Products and Companies. Saving research does not imply investment ownership."
            : "Create a seven-day snapshot of selected research. Anyone with the link can view it until expiry or revocation."}
        </p>
      </PageIntro>
      {loading ? (
        <LoadingStatus page>{`Loading ${token ? "shared" : "saved"} research…`}</LoadingStatus>
      ) : null}
      <ErrorMessage message={error} />
      {error ? (
        <div className="actions">
          <button
            className="secondary"
            disabled={loading || busy}
            onClick={load}
          >
            Retry collection
          </button>
          {authRequired ? (
            <CtaLink id="share-auth" href="/sign-in?returnTo=%2Fsaved%2Fshare">
              Sign in
            </CtaLink>
          ) : (
            <CtaLink id="share-recover" href="/discover" secondary>
              Explore Shelf
            </CtaLink>
          )}
        </div>
      ) : null}
      {!loading &&
      (!error || data.products.length + data.companies.length > 0) ? (
        <>
          <p className="notice">
            Only public entity details are included. No account identity,
            wallet, Holdings, amounts, receipts, notes or scan history.
          </p>
          {!data.products.length && !data.companies.length ? (
            <EmptyState
              title={
                token
                  ? "No available entities in this collection"
                  : "No saved research to share"
              }
              action={
                <CtaLink id="share-empty" href="/saved">
                  Return to Saved
                </CtaLink>
              }
            >
              Save Products or Companies before creating a snapshot. Retired
              entries may no longer be available.
            </EmptyState>
          ) : null}
          {data.products.length ? (
            <section className="research-section">
              <h2>Products</h2>
              <div className="research-rows">
                {data.products.map((product) => (
                  <article className="research-row" key={product.id}>
                    <input
                      type="checkbox"
                      disabled={busy}
                      aria-label={`Select ${product.name}`}
                      checked={selectedProducts.includes(product.id)}
                      onChange={(event) =>
                        select(product.id, "product", event.target.checked)
                      }
                    />
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
                  </article>
                ))}
              </div>
            </section>
          ) : null}
          {data.companies.length ? (
            <section className="research-section">
              <h2>Companies</h2>
              <div className="research-rows">
                {data.companies.map((company) => (
                  <article className="research-row" key={company.id}>
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        disabled={busy}
                        checked={selectedCompanies.includes(company.id)}
                        onChange={(event) =>
                          select(company.id, "company", event.target.checked)
                        }
                      />{" "}
                      Select {company.name}
                    </label>
                    <Link href={companyResearchPath(company) as Route}>
                      View research →
                    </Link>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
          <section className="research-section stack">
            <p>
              {selectedCount} {selectedCount === 1 ? "entity" : "entities"}{" "}
              selected.{" "}
              {token
                ? "Only your selection will be added to Saved."
                : "The checked entities above are the exact snapshot preview."}
            </p>
            {!token ? (
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  disabled={busy || !selectedCount}
                  checked={acknowledged}
                  onChange={(event) => setAcknowledged(event.target.checked)}
                />{" "}
                I have reviewed this selection and understand anyone with the
                link can view it.
              </label>
            ) : null}
            <div className="actions">
              {token ? (
                <PendingButton pending={busy} pendingLabel="Saving research…"
                  data-cta="C94"
                  disabled={busy || !selectedCount}
                  onClick={() => action(saveSelected)}
                >
                  Save selected research
                </PendingButton>
              ) : (
                <PendingButton pending={busy} pendingLabel="Creating snapshot…"
                  data-cta="C90"
                  disabled={busy || !selectedCount || !acknowledged}
                  onClick={() =>
                    action(async () => {
                      const share = await postJson<CreatedShare>(
                        "shelf/share",
                        {
                          productIds: selectedProducts,
                          companyIds: selectedCompanies,
                          expiresInDays: 7,
                        }
                      );
                      setCreated(share);
                      setShares((current) => [
                        {
                          id: share.id,
                          expiresAt: share.expiresAt,
                          revoked: false,
                        },
                        ...current,
                      ]);
                      setAcknowledged(false);
                    })
                  }
                >
                  {created ? "Create new snapshot" : "Create private link"}
                </PendingButton>
              )}
              <CtaLink id="share-saved" href="/saved" secondary>
                View Saved
              </CtaLink>
            </div>
            {created ? (
              <ResultMessage>
                <p>
                  Snapshot created. Expires{" "}
                  {new Date(created.expiresAt).toLocaleString()}.
                </p>
                <p>
                  <Link
                    data-testid="share-link"
                    href={`/share/${created.token}`}
                  >
                    /share/{created.token}
                  </Link>
                </p>
                <CopyButton cta="C91" value={`${window.location.origin}/share/${created.token}`} label="Copy link" copiedLabel="Share link copied" showLabel />
              </ResultMessage>
            ) : null}

          </section>
          {!token && shares.length ? (
            <section className="research-section">
              <h2>Manage snapshots</h2>
              <p className="muted">
                Existing snapshot links cannot be recovered. Create a new
                snapshot when needed.
              </p>
              <div className="research-rows">
                {shares.map((share) => (
                  <div className="research-row" key={share.id}>
                    <p>
                      {share.revoked
                        ? "Revoked"
                        : new Date(share.expiresAt).getTime() <= checkedAt
                        ? "Expired"
                        : "Active"}{" "}
                      · expires {new Date(share.expiresAt).toLocaleDateString()}
                    </p>
                    {!share.revoked ? (
                      revokeId === share.id ? (
                        <div>
                          <p>
                            Revoke this link? Anyone using it will lose access.
                          </p>
                          <div className="actions">
                            <button
                              disabled={busy}
                              data-cta="C92"
                              onClick={() =>
                                action(async () => {
                                  await apiRequest(`shelf/shares/${share.id}`, {
                                    method: "DELETE",
                                  });
                                  setShares((current) =>
                                    current.map((item) =>
                                      item.id === share.id
                                        ? { ...item, revoked: true }
                                        : item
                                    )
                                  );
                                  if (created?.id === share.id)
                                    setCreated(null);
                                  setRevokeId(null);
                                  setMessage(
                                    "Snapshot revoked. Your saved research is unchanged."
                                  );
                                })
                              }
                            >
                              Confirm revocation
                            </button>
                            <button
                              className="ghost"
                              disabled={busy}
                              onClick={() => setRevokeId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          className="secondary"
                          disabled={busy}
                          onClick={() => setRevokeId(share.id)}
                        >
                          Revoke link
                        </button>
                      )
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </>
  );
}
