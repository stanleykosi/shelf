"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Company, Product } from "@/domain/types";
import type { CatalogReport, CreatedShare } from "@/domain/store";
import { apiRequest, postAdminJson, postJson } from "@/lib/api-client";
import { Card, EmptyState, ErrorMessage, Field, PageIntro, ResultMessage } from "@/components/ui";

export function ShareScreen({ token }: { token?: string }) {
  const [selected, setSelected] = useState(["product-doritos-snack", "product-olay-skincare"]);
  const [share, setShare] = useState<CreatedShare | null>(null);
  const [sharedProducts, setSharedProducts] = useState<Product[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [availableCompanies, setAvailableCompanies] = useState<Company[]>([]);
  const [sharedCompanies, setSharedCompanies] = useState<Company[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      apiRequest<Company[]>("watchlist")
        .then((companies) => {
          setAvailableCompanies(companies);
          setSelectedCompanies(companies.map((company) => company.id));
        })
        .catch((requestError) =>
          setError(requestError instanceof Error ? requestError.message : "Watchlist unavailable"),
        );
      return;
    }
    apiRequest<{ products: Product[]; companies: Company[] }>(`shares/${token}`)
      .then((response) => {
        setSharedProducts(response.products);
        setSharedCompanies(response.companies);
      })
      .catch((requestError) =>
        setError(requestError instanceof Error ? requestError.message : "Link unavailable"),
      );
  }, [token]);

  async function createLink() {
    try {
      setShare(
        await postJson<CreatedShare>("shelf/share", {
          productIds: selected,
          companyIds: selectedCompanies,
          expiresInDays: 7,
        }),
      );
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Share failed");
    }
  }

  async function copyLink() {
    if (!share) return;
    try {
      await navigator.clipboard.writeText(`${location.origin}/share/${share.token}`);
      setError(null);
    } catch {
      setError("Clipboard permission was blocked. Select and copy the share path manually.");
    }
  }

  async function revokeLink() {
    if (!share) return;
    await apiRequest(`shelf/shares/${share.id}`, { method: "DELETE" });
    setShare(null);
  }

  if (token) {
    if (error)
      return (
        <EmptyState title="This share is unavailable">
          The link may be expired, revoked or unknown.
        </EmptyState>
      );
    return (
      <>
        <PageIntro eyebrow="Shared Shelf snapshot" title="Research someone chose to share">
          <p>
            This read-only snapshot contains selected products and watched companies only. It has no
            identity, holdings, wallet, balances, allocation amounts, or shopping history.
          </p>
        </PageIntro>
        <div className="grid">
          {sharedProducts.map((product) => (
            <Card key={product.id}>
              <h2>{product.name}</h2>
              <p>{product.brand}</p>
            </Card>
          ))}
          {sharedCompanies.map((company) => (
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
              <h2>{company.name}</h2>
              <p className="muted">Research watchlist entry · no position information</p>
              <Link className="button secondary" href={`/companies/${company.slug}`}>
                View company
              </Link>
            </Card>
          ))}
        </div>
        <div className="section actions">
          <button
            data-cta="C94"
            onClick={() =>
              sessionStorage.setItem(
                "shelf:guest-items",
                JSON.stringify(sharedProducts.map((product) => product.id)),
              )
            }
          >
            Save these discoveries
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <PageIntro eyebrow="Bearer link" title="Preview a private shelf snapshot">
        <p>
          Anyone with the link can view the selected products for seven days. Amounts, holdings,
          identity, wallet and dates are excluded.
        </p>
      </PageIntro>
      <Card className="stack">
        {availableCompanies.length ? (
          <div>
            <h2>Market research</h2>
            <p className="muted">Share watched companies without balances or holdings.</p>
            {availableCompanies.map((company) => (
              <label className="share-option" key={company.id}>
                <input
                  type="checkbox"
                  checked={selectedCompanies.includes(company.id)}
                  onChange={(event) =>
                    setSelectedCompanies((current) =>
                      event.target.checked
                        ? [...current, company.id]
                        : current.filter((id) => id !== company.id),
                    )
                  }
                />
                <span>
                  {company.name} ·{" "}
                  {company.instrument?.provider === "prestocks" ? "PreStocks" : "xStocks"}
                </span>
              </label>
            ))}
          </div>
        ) : null}
        <label>
          <input
            type="checkbox"
            checked={selected.includes("product-doritos-snack")}
            onChange={(event) =>
              setSelected(
                event.target.checked
                  ? [...selected, "product-doritos-snack"]
                  : selected.filter((id) => id !== "product-doritos-snack"),
              )
            }
          />{" "}
          Doritos snack
        </label>
        <label>
          <input
            type="checkbox"
            checked={selected.includes("product-olay-skincare")}
            onChange={(event) =>
              setSelected(
                event.target.checked
                  ? [...selected, "product-olay-skincare"]
                  : selected.filter((id) => id !== "product-olay-skincare"),
              )
            }
          />{" "}
          Olay skincare
        </label>
        <div className="actions">
          <button data-cta="C90" onClick={createLink}>
            Create private link
          </button>
          <button className="secondary" data-cta="C91" disabled={!share} onClick={copyLink}>
            Copy link
          </button>
          <button className="secondary" data-cta="C92" disabled={!share} onClick={revokeLink}>
            Revoke link
          </button>
          <button className="secondary" data-cta="C93" onClick={createLink}>
            Create new snapshot
          </button>
        </div>
        {share ? (
          <ResultMessage>
            Share path:{" "}
            <Link data-testid="share-link" href={`/share/${share.token}`}>
              /share/{share.token}
            </Link>
            <br />
            Expires: {share.expiresAt}
          </ResultMessage>
        ) : null}
        <ErrorMessage message={error} />
      </Card>
    </>
  );
}

type AdminHealth = {
  environment: string;
  providerStatus: "configured" | "incomplete";
  network: string;
  realTrading: boolean;
  pendingOrders: number;
  openGates: string[];
};

export function AdminScreen() {
  const [health, setHealth] = useState<AdminHealth | null>(null);
  const [pendingReports, setPendingReports] = useState<CatalogReport[]>([]);
  const [selectedReportId, setSelectedReportId] = useState("");
  const [reason, setReason] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteId, setInviteId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<AdminHealth>("admin/health")
      .then(setHealth)
      .catch((requestError: unknown) => {
        setError(requestError instanceof Error ? requestError.message : "Admin health failed");
      });
    apiRequest<{ pending: CatalogReport[] }>("admin/catalog/review")
      .then(({ pending }) => setPendingReports(pending))
      .catch((requestError: unknown) => {
        setError(requestError instanceof Error ? requestError.message : "Relationship review failed");
      });
  }, []);

  async function reviewReport(decision: "approved" | "rejected") {
    if (!selectedReportId || !reason.trim()) return;
    try {
      await postAdminJson(`admin/catalog/reports/${selectedReportId}/review`, {
        decision,
        reason,
      });
      setPendingReports((reports) => reports.filter((report) => report.id !== selectedReportId));
      setSelectedReportId("");
      setReason("");
      setMessage(`Relationship report ${decision}.`);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Relationship review failed");
    }
  }

  async function setPause(scope: "buys" | "submissions" | "suggestions", enabled: boolean) {
    try {
      const response = await postAdminJson<Record<string, boolean>>("admin/pauses", {
        scope,
        enabled,
        reason,
      });
      setMessage(`${scope} pause is now ${response[scope] ? "enabled" : "disabled"}.`);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Pause update failed");
    }
  }

  async function reconcile() {
    try {
      await postAdminJson("admin/reconcile", { walletId: "all-wallets", reason });
      setMessage("Reconciliation request recorded without changing chain facts.");
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Reconciliation failed");
    }
  }

  async function invite() {
    try {
      const invitation = await postAdminJson<{ id: string }>("admin/invites", {
        email: inviteEmail,
        reason,
      });
      setInviteId(invitation.id);
      setMessage(`Invitation ${invitation.id} recorded.`);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Invitation failed");
    }
  }

  async function revokeInvite() {
    await postAdminJson("admin/invites/revoke", { inviteId, reason });
    setMessage("Beta access revoked; settled records remain.");
  }

  async function reviewBudget() {
    const budget = await apiRequest<{ sponsorSpentLamports: string; aiSpentMicrousd: string }>(
      "admin/budgets",
      {},
    );
    setMessage(
      `Sponsor spent ${budget.sponsorSpentLamports} lamports; AI spent ${budget.aiSpentMicrousd} micro-USD.`,
    );
  }

  function downloadDiagnostic() {
    const safeData = JSON.stringify(
      { health, generatedAt: new Date().toISOString(), containsSecrets: false },
      null,
      2,
    );
    const url = URL.createObjectURL(new Blob([safeData], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "shelf-redacted-diagnostic.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageIntro eyebrow="Owner console" title="Operate the private beta without rewriting facts">
        <p>
          Every material action requires a reason and audit record. This console cannot sign
          for users, edit balances or mark chain outcomes complete.
        </p>
      </PageIntro>
      {health ? (
        <div className="grid">
          <Card>
            <p className="eyebrow">Environment</p>
            <h2>{health.environment}</h2>
            <p>
              Provider configuration: {health.providerStatus} · {health.network}
            </p>
          </Card>
          <Card>
            <p className="eyebrow">Pending orders</p>
            <h2>{health.pendingOrders}</h2>
            <p>Real trading: {health.realTrading ? "enabled" : "off"}</p>
          </Card>
          <Card>
            <p className="eyebrow">Open readiness gates</p>
            <h2>{health.openGates.length}</h2>
            <p>{health.openGates.join(", ")}</p>
          </Card>
        </div>
      ) : null}
      <Card className="section stack">
        <Field
          label="Relationship report to review"
          htmlFor="catalog-report"
          hint={pendingReports.length ? undefined : "There are no open relationship reports."}
        >
          <select
            id="catalog-report"
            value={selectedReportId}
            onChange={(event) => setSelectedReportId(event.target.value)}
          >
            <option value="">Select an open report</option>
            {pendingReports.map((report) => (
              <option value={report.id} key={report.id}>
                {report.reasonCode} · {report.productId ?? report.relationshipId ?? report.id}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Reason for this action" htmlFor="admin-reason">
          <input
            id="admin-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </Field>
        <Field label="Invitation email" htmlFor="invite-email">
          <input
            id="invite-email"
            type="email"
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
          />
        </Field>
        <Field label="Invitation ID to revoke" htmlFor="invite-id">
          <input
            id="invite-id"
            value={inviteId}
            onChange={(event) => setInviteId(event.target.value)}
          />
        </Field>
        <div className="actions">
          <button
            data-cta="C100"
            disabled={!selectedReportId || !reason.trim()}
            onClick={() => reviewReport("approved")}
          >
            Approve mapping report
          </button>
          <button
            className="secondary"
            data-cta="C101"
            disabled={!selectedReportId || !reason.trim()}
            onClick={() => reviewReport("rejected")}
          >
            Reject mapping report
          </button>
          <button className="secondary" data-cta="C102" onClick={() => setPause("buys", true)}>
            Pause purchases
          </button>
          <button
            className="secondary"
            data-cta="C103"
            onClick={() => setPause("submissions", true)}
          >
            Pause all submission
          </button>
          <button
            className="secondary"
            data-cta="C104"
            onClick={() => setPause("submissions", false)}
          >
            Resume after checks
          </button>
          <button className="secondary" data-cta="C105" onClick={reconcile}>
            Run reconciliation
          </button>
          <button className="secondary" data-cta="C106" onClick={invite}>
            Invite beta user
          </button>
          <button className="secondary" data-cta="C107" onClick={revokeInvite}>
            Revoke beta access
          </button>
          <button className="secondary" data-cta="C108" onClick={reviewBudget}>
            Review budget
          </button>
          <button className="secondary" data-cta="C109" onClick={downloadDiagnostic}>
            Export redacted diagnostic
          </button>
        </div>
        {message ? <ResultMessage>{message}</ResultMessage> : null}
        <ErrorMessage message={error} />
      </Card>
    </>
  );
}
