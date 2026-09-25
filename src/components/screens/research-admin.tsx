"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useState } from "react";
import { products, companies, brands } from "@/data/catalog";
import type { CatalogReport } from "@/domain/store";
import type { Order } from "@/domain/types";
import { apiRequest, freshApiRequest, postAdminJson } from "@/lib/api-client";
import { LoadingStatus, PendingButton } from "@/components/loading-feedback";
import { useNotification } from "@/components/notifications";
import { ErrorMessage, Field, PageIntro } from "@/components/ui";

type Area = "overview" | "catalog" | "access" | "operations" | "audit";
type Health = {
  environment: string;
  providerStatus: string;
  network: string;
  realTrading: boolean;
  pendingOrders: number;
  openGates: string[];
};
type Audit = {
  action: string;
  at: string;
  actorId?: string;
  reason?: string;
  scope?: string;
  reference?: string;
};
type Budget = {
  sponsorSpentLamports: string;
  sponsorReservedLamports: string;
  aiSpentMicrousd: number;
};
const areas: { id: Area; title: string; href: Route }[] = [
  { id: "overview", title: "Overview", href: "/admin" },
  { id: "catalog", title: "Catalog", href: "/admin/catalog" },
  { id: "access", title: "Access", href: "/admin/access" },
  { id: "operations", title: "Operations", href: "/admin/operations" },
  { id: "audit", title: "Audit", href: "/admin/audit" },
];

export function ResearchAdminScreen({ area }: { area: Area }) {
  const [health, setHealth] = useState<Health | null>(null);
  const [reports, setReports] = useState<CatalogReport[]>([]);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const setMessage = useNotification();
  const [pending, setPending] = useState(false);
  const [reason, setReason] = useState("");
  const [email, setEmail] = useState("");
  const [inviteId, setInviteId] = useState("");
  const [reportId, setReportId] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [query, setQuery] = useState("");
  const [unknownOrders, setUnknownOrders] = useState<Order[] | null>(null);
  const [diagnosticOrderId, setDiagnosticOrderId] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const nextHealth = await apiRequest<Health>("admin/health");
        if (!active) return;
        setHealth(nextHealth);
        if (area === "catalog") {
          const data = await apiRequest<{ pending: CatalogReport[] }>(
            "admin/catalog/review"
          );
          if (active) setReports(data.pending);
        }
        if (area === "audit") {
          const data = await apiRequest<Audit[]>("admin/audit");
          if (active) setAudits(data);
        }
        if (area === "operations") {
          const [data, orders] = await Promise.all([
            apiRequest<Budget>("admin/budgets"),
            apiRequest<Order[]>("admin/orders"),
          ]);
          if (active) {
            setBudget(data);
            setUnknownOrders(orders);
          }
        }
      } catch (failure) {
        if (active)
          setError(
            failure instanceof Error
              ? failure.message
              : "This workspace is unavailable."
          );
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [area, revision]);

  async function act(
    path: string,
    body: Record<string, unknown>,
    success: string
  ) {
    if (pending || !reason.trim() || !confirmed) return;
    setPending(true);
    setError(null);
    setMessage("");
    try {
      const response = await postAdminJson<{ id?: string }>(path, {
        ...body,
        reason: reason.trim(),
      });
      if (path === "admin/invites" && response.id) setInviteId(response.id);
      setMessage(success);
      setConfirmed(false);
      setReason("");
      setRevision((value) => value + 1);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Action could not be completed."
      );
    } finally {
      setPending(false);
    }
  }
  async function downloadDiagnostic() {
    const orderId = diagnosticOrderId.trim();
    if (!orderId || exporting) return;
    setExporting(true);
    setError(null);
    setMessage("");
    try {
      const diagnostic = await freshApiRequest<{
        orderId: string;
        status: string;
        containsSignedBytes: boolean;
        containsSecrets: boolean;
      }>(`admin/diagnostics/${encodeURIComponent(orderId)}`, "admin_action");
      if (diagnostic.containsSecrets !== false || diagnostic.containsSignedBytes !== false) {
        throw new Error("Diagnostic export was blocked because its redaction could not be verified.");
      }
      // Export only the supported, redacted fields. Never serialize an entire API response.
      const safeData = {
        orderId: diagnostic.orderId,
        status: diagnostic.status,
        generatedAt: new Date().toISOString(),
        containsSignedBytes: false,
        containsSecrets: false,
      };
      const url = URL.createObjectURL(new Blob([JSON.stringify(safeData, null, 2)], {
        type: "application/json",
      }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "shelf-redacted-diagnostic.json";
      document.body.append(anchor);
      try { anchor.click(); }
      finally { anchor.remove(); URL.revokeObjectURL(url); }
      setMessage("Redacted diagnostic downloaded. An unknown status is not proof of failure or completion.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Diagnostic export failed. Try again.");
    } finally {
      setExporting(false);
    }
  }
  const locked = pending || !reason.trim() || !confirmed;
  const acknowledgement = (
    <div className="stack research-section">
      <Field label="Reason for this action" htmlFor="admin-action-reason">
        <textarea
          id="admin-action-reason"
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            setConfirmed(false);
          }}
        />
      </Field>
      <label className="share-option">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
        />{" "}
        I have checked the target and understand this action will be audited.
      </label>
      <p className="muted">
        A reason, acknowledgement and fresh owner authentication are required.
        This console cannot change balances or sign for users.
      </p>
    </div>
  );
  const selectedReport = reports.find((report) => report.id === reportId);
  const filteredProducts = products.filter((product) =>
    `${product.name} ${product.brand}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );
  const filteredAudit = audits.filter((event) =>
    `${event.action} ${event.reason ?? ""} ${event.actorId ?? ""}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  return (
    <>
      <PageIntro
        eyebrow="Owner administration"
        title={areas.find((item) => item.id === area)!.title}
      >
        <p>
          Private-beta controls. Research evidence and financial records remain
          authoritative.
        </p>
      </PageIntro>
      <div className="research-admin-layout">
        <nav className="research-admin-nav" aria-label="Administration">
          {areas.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              aria-current={area === item.id ? "page" : undefined}
            >
              {item.title}
            </Link>
          ))}
        </nav>
        <div className="stack">
          {loading ? <LoadingStatus page>Loading owner workspace…</LoadingStatus> : null}
          <ErrorMessage message={error} />
          {pending ? <LoadingStatus>Completing the owner action…</LoadingStatus> : null}
          {error ? (
            <button
              className="secondary"
              onClick={() => {
                setError(null);
                setLoading(true);
                setRevision((value) => value + 1);
              }}
            >
              Retry workspace
            </button>
          ) : null}

          {!loading && health ? (
            <>
              {area === "overview" ? (
                <>
                  <section className="research-section">
                    <h2>Environment and readiness</h2>
                    <dl className="facts">
                      <div>
                        <dt>Environment</dt>
                        <dd>{health.environment}</dd>
                      </div>
                      <div>
                        <dt>Network</dt>
                        <dd>{health.network}</dd>
                      </div>
                      <div>
                        <dt>Provider configuration</dt>
                        <dd>{health.providerStatus}</dd>
                      </div>
                      <div>
                        <dt>Real trading</dt>
                        <dd>{health.realTrading ? "Enabled" : "Off"}</dd>
                      </div>
                      <div>
                        <dt>Pending orders</dt>
                        <dd>{health.pendingOrders}</dd>
                      </div>
                    </dl>
                    <p>
                      Open gates:{" "}
                      {health.openGates.join(", ") || "None reported"}.
                      Configuration is not approval to activate real money.
                    </p>
                  </section>
                  <div className="research-rows">
                    {areas.slice(1).map((item) => (
                      <Link
                        className="research-row"
                        key={item.id}
                        href={item.href}
                      >
                        <h2>{item.title}</h2>
                        <span>Open workspace →</span>
                      </Link>
                    ))}
                  </div>
                </>
              ) : null}
              {area === "catalog" ? (
                <>
                  <section className="research-section">
                    <h2>Relationship review</h2>
                    <p>
                      {reports.length} open{" "}
                      {reports.length === 1 ? "report" : "reports"}. Decisions
                      review reports; they do not silently rewrite catalog
                      relationships.
                    </p>
                    <Field label="Report" htmlFor="admin-report">
                      <select
                        id="admin-report"
                        value={reportId}
                        onChange={(event) => {
                          setReportId(event.target.value);
                          setConfirmed(false);
                        }}
                      >
                        <option value="">Select a report</option>
                        {reports.map((report) => (
                          <option key={report.id} value={report.id}>
                            {report.reasonCode} ·{" "}
                            {report.productId ??
                              report.relationshipId ??
                              report.id}
                          </option>
                        ))}
                      </select>
                    </Field>
                    {selectedReport ? (
                      <div className="notice">
                        <p>
                          {selectedReport.safeNote ||
                            "No additional note supplied."}
                        </p>
                        <p>
                          Target:{" "}
                          {selectedReport.productId ??
                            selectedReport.relationshipId ??
                            "General report"}
                        </p>
                      </div>
                    ) : null}
                    {acknowledgement}
                    <div className="actions">
                      <button
                        disabled={locked || !selectedReport}
                        onClick={() =>
                          act(
                            `admin/catalog/reports/${reportId}/review`,
                            { decision: "approved" },
                            "Report approved and recorded."
                          )
                        }
                      >
                        Approve report
                      </button>
                      <button
                        className="secondary"
                        disabled={locked || !selectedReport}
                        onClick={() =>
                          act(
                            `admin/catalog/reports/${reportId}/review`,
                            { decision: "rejected" },
                            "Report rejected and recorded."
                          )
                        }
                      >
                        Reject report
                      </button>
                    </div>
                  </section>
                  <section className="research-section">
                    <h2>Reviewed registry</h2>
                    <p>
                      {products.length} Products · {brands.length} Brands ·{" "}
                      {companies.length} Companies. Published catalog editing
                      remains a reviewed release operation.
                    </p>
                    <Field label="Find a Product" htmlFor="admin-catalog-query">
                      <input
                        id="admin-catalog-query"
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                      />
                    </Field>
                    <div className="research-rows">
                      {filteredProducts.map((product) => (
                        <div className="research-row" key={product.id}>
                          <Link href={`/products/${product.slug}`}>
                            {product.name}
                          </Link>
                          <span>{product.brand} · Reviewed relationship</span>
                        </div>
                      ))}
                      {!filteredProducts.length ? (
                        <p>No matching Products.</p>
                      ) : null}
                    </div>
                  </section>
                </>
              ) : null}
              {area === "access" ? (
                <section className="research-section stack">
                  <h2>Beta access</h2>
                  <p>
                    Create an invitation or revoke an existing invitation by ID.
                    Revocation does not erase settled financial records. The
                    service does not expose a member directory.
                  </p>
                  <Field label="Invitation email" htmlFor="admin-email">
                    <input
                      id="admin-email"
                      type="email"
                      autoComplete="off"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        setConfirmed(false);
                      }}
                    />
                  </Field>
                  <Field
                    label="Invitation ID to revoke"
                    htmlFor="admin-invite-id"
                  >
                    <input
                      id="admin-invite-id"
                      value={inviteId}
                      onChange={(event) => {
                        setInviteId(event.target.value);
                        setConfirmed(false);
                      }}
                    />
                  </Field>
                  {acknowledgement}
                  <div className="actions">
                    <button
                      disabled={
                        locked || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
                      }
                      onClick={() =>
                        act(
                          "admin/invites",
                          { email },
                          "Invitation created. Its ID is available above."
                        )
                      }
                    >
                      Create invitation
                    </button>
                    <button
                      className="secondary"
                      disabled={locked || !inviteId.trim()}
                      onClick={() =>
                        act(
                          "admin/invites/revoke",
                          { inviteId },
                          "Beta access revoked; historical records preserved."
                        )
                      }
                    >
                      Revoke invitation
                    </button>
                  </div>
                </section>
              ) : null}
              {area === "operations" ? (
                <>
                  <section className="research-section">
                    <h2>Unknown transaction outcomes</h2>
                    <p>Inspect the persisted order before taking action. Do not submit a replacement while its outcome is unknown.</p>
                    {unknownOrders?.length ? <div className="research-rows">
                      {unknownOrders.map((order) => <div className="research-row" key={order.id}>
                        <div><h3>{order.type} · outcome unknown</h3><p className="break-all">{order.id}</p><p>{new Date(order.createdAt).toLocaleString()}</p></div>
                        <button className="secondary" onClick={() => setDiagnosticOrderId(order.id)}>Inspect diagnostic</button>
                      </div>)}
                    </div> : <p>{unknownOrders ? "No unknown outcomes reported." : "Unknown-outcome data is unavailable. Retry the workspace before drawing conclusions."}</p>}
                  </section>
                  <section className="research-section">
                    <h2>Budgets and safeguards</h2>
                    {budget ? (
                      <dl className="facts">
                        <div>
                          <dt>Sponsor spent · lamports</dt>
                          <dd>{budget.sponsorSpentLamports}</dd>
                        </div>
                        <div>
                          <dt>Sponsor reserved · lamports</dt>
                          <dd>{budget.sponsorReservedLamports}</dd>
                        </div>
                        <div>
                          <dt>Processing spent · micro-USD</dt>
                          <dd>{budget.aiSpentMicrousd}</dd>
                        </div>
                      </dl>
                    ) : null}
                    <p>
                      Raw accounting units. These are operational budgets, not
                      user balances.
                    </p>
                  </section>
                  <section className="research-section">
                    <h2>Operational controls</h2>
                    <p>
                      Pause controls cannot bypass eligibility, readiness gates
                      or chain reconciliation. Resuming submissions does not
                      enable real trading.
                    </p>
                    {acknowledgement}
                    <div className="actions">
                      <button
                        disabled={locked}
                        onClick={() =>
                          act(
                            "admin/pauses",
                            { scope: "buys", enabled: true },
                            "Purchase pause enabled."
                          )
                        }
                      >
                        Pause purchases
                      </button>
                      <button
                        className="secondary"
                        disabled={locked}
                        onClick={() =>
                          act(
                            "admin/pauses",
                            { scope: "submissions", enabled: true },
                            "Submission pause enabled."
                          )
                        }
                      >
                        Pause submissions
                      </button>
                      <button
                        className="secondary"
                        disabled={locked}
                        onClick={() =>
                          act(
                            "admin/pauses",
                            { scope: "submissions", enabled: false },
                            "Submission pause removed; other gates remain enforced."
                          )
                        }
                      >
                        Resume submissions
                      </button>
                      <button
                        className="secondary"
                        disabled={locked}
                        onClick={() =>
                          act(
                            "admin/pauses",
                            { scope: "suggestions", enabled: true },
                            "Allocation suggestions paused."
                          )
                        }
                      >
                        Pause suggestions
                      </button>
                      <button
                        className="secondary"
                        disabled={locked}
                        onClick={() =>
                          act(
                            "admin/reconcile",
                            { walletId: "all-wallets" },
                            "Reconciliation requested. Chain outcomes were not rewritten."
                          )
                        }
                      >
                        Request reconciliation
                      </button>
                    </div>
                  </section>
                  <section className="research-section stack">
                    <h2>Redacted diagnostic</h2>
                    <p>Download the supported order reference and status only. No signing material, secrets, user images or account data are included. Export requires fresh owner authentication and does not change the order.</p>
                    <Field label="Diagnostic order ID" htmlFor="admin-diagnostic-order">
                      <input id="admin-diagnostic-order" value={diagnosticOrderId} maxLength={200} autoComplete="off" onChange={(event) => setDiagnosticOrderId(event.target.value)} />
                    </Field>
                    <div className="actions"><PendingButton pending={exporting} pendingLabel="Preparing diagnostic…" className="secondary" data-cta="C109" disabled={exporting || !diagnosticOrderId.trim()} onClick={downloadDiagnostic}>Export redacted diagnostic</PendingButton></div>
                  </section>
                </>
              ) : null}
              {area === "audit" ? (
                <section className="research-section">
                  <h2>Recorded actions</h2>
                  <p>
                    Read-only administrative history. No signing material or
                    user images are included.
                  </p>
                  <Field
                    label="Filter recorded actions"
                    htmlFor="admin-audit-query"
                  >
                    <input
                      id="admin-audit-query"
                      type="search"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                    />
                  </Field>
                  {filteredAudit.length ? (
                    <table className="research-table">
                      <thead>
                        <tr>
                          <th>Action</th>
                          <th>Time</th>
                          <th>Actor</th>
                          <th>Reason / target</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAudit.map((event, index) => (
                          <tr key={`${event.at}-${index}`}>
                            <td data-label="Action">{event.action}</td>
                            <td data-label="Time">{event.at}</td>
                            <td data-label="Actor">
                              {event.actorId ?? "System"}
                            </td>
                            <td data-label="Reason / target">
                              {event.reason ?? "No reason recorded"}
                              {event.scope ? ` · ${event.scope}` : ""}
                              {event.reference ? ` · ${event.reference}` : ""}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p>No recorded actions match this view.</p>
                  )}
                </section>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}
