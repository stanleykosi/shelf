"use client";

import Link from "next/link";
import { ArrowDownLeftIcon, ArrowUpRightIcon, BanknotesIcon, ChartPieIcon, ClockIcon, MagnifyingGlassIcon, ShieldCheckIcon, SparklesIcon, WalletIcon } from "@heroicons/react/24/outline";
import { LoadingStatus, PendingButton } from "@/components/loading-feedback";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { companyById, companyBySlug } from "@/data/catalog";
import type { CorporateActionView } from "@/domain/issuer-assets";
import { formatRaw, parseTokenAmount, parseUsdc } from "@/domain/money";
import type { Company, FinancialRecord, Holding, Order, Quote } from "@/domain/types";
import { apiRequest, freshApiRequest, freshPostJson, postJson } from "@/lib/api-client";
import { financialRecordsCsv } from "@/lib/csv";
import { isSolanaPublicKey } from "@/lib/solana-signing";
import { signMagicSolanaTransaction } from "@/providers/magic-browser";
import {
  Card,
  CtaLink,
  EmptyState,
  ErrorMessage,
  Field,
  PageIntro,
  ResultMessage,
  SupportAction,
} from "@/components/ui";

function messageFrom(error: unknown) {
  return error instanceof Error
    ? error.message.replaceAll("_", " ").toLowerCase()
    : "Request failed";
}

const orderTitles: Record<Order["status"], string> = {
  draft: "Order requires review", in_progress: "Transaction processing",
  awaiting_user: "Your approval is required", complete: "Order completed",
  partially_complete: "Partly completed", failed: "Transaction failed",
  stopped: "Order stopped", outcome_unknown: "Transaction outcome pending",
};

function Recovery({ title, error, href = "/portfolio" }: { title: string; error: string; href?: string }) {
  return <EmptyState title={title} action={<><button onClick={() => window.location.reload()}>Try again</button><CtaLink id="financial-recovery" href={href} secondary>Return</CtaLink></>}>
    {error}. No transaction outcome is inferred from this error.
  </EmptyState>;
}

type Allocation = { companyId: string; amount: string; selected: boolean };

export function InvestmentScreen({ companySlug }: { companySlug: string }) {
  const company = companyBySlug(companySlug);
  const router = useRouter();
  const [amount, setAmount] = useState("10");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function review() {
    if (!company?.instrument || busy) return;
    setBusy(true);
    try {
      const order = await postJson<Order>("orders", { clientIntentId: crypto.randomUUID(), type: "buy", companyId: company.id, amountUsdcRaw: parseUsdc(amount).toString(), slippageBps: 50 });
      router.push(`/orders/${order.id}/review`);
    } catch (reason) { setError(messageFrom(reason)); setBusy(false); }
  }
  if (!company?.instrument) return <EmptyState title="No supported exposure" action={<CtaLink id="investment-research" href={`/discover?q=${encodeURIComponent(company?.name ?? companySlug)}`} secondary>Search current listings</CtaLink>}>No investment instrument is inferred from the reviewed catalog.</EmptyState>;
  const instrument = company.instrument;
  return <>
    <PageIntro eyebrow="Investment / Amount" title={`Review an investment in ${company.name}`}>
      <p>Choose an amount for the instrument below. No purchase is submitted here.</p>
    </PageIntro>
    <div className="research-split">
      <section className="research-section">
        <h2>{company.name}</h2>
        <p>{company.description}</p>
        <h3>{instrument.symbol} · {instrument.issuer}</h3>
        <p className="notice">{instrument.provider === "prestocks"
          ? "Private company exposure. Liquidity, redemption and valuation differ from public shares. No ordinary share ownership is implied."
          : "Public equity tracker. This instrument is not an ordinary voting share in the company."}</p>
        <details>
          <summary>Instrument and issuer details</summary>
          <p>Issuer: {instrument.issuer}</p>
          <p className="break-all">Solana mint: {instrument.mint}</p>
          <a href={instrument.referenceUrl} target="_blank" rel="noreferrer">Issuer reference</a>
        </details>
      </section>
      <section className="research-section">
        <h2>Investment amount</h2>
        <Field label="Amount in USDC" htmlFor="investment-amount" hint="Minimum 5 USDC · beta maximum 100 USDC. Final availability and fees are checked before approval.">
          <input id="investment-amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} />
        </Field>
        <p>Review shows a fresh quote, fees and minimum output. You decide whether to approve.</p>
        <div className="actions">
          <PendingButton pending={busy} pendingLabel="Preparing review…" data-cta="C57" disabled={busy || !instrument.capabilities.buy} onClick={review}>Review investment</PendingButton>
          <CtaLink id="C58" href="/account/wallet/deposit" secondary>Deposit USDC</CtaLink>
        </div>
        {!instrument.capabilities.buy ? <p role="status">Purchases are currently unavailable for this instrument.</p> : null}
        <ErrorMessage message={error}/>
        <CtaLink id="investment-return" href={`/assets/${instrument.provider}/${encodeURIComponent(instrument.symbol)}`} secondary>View token details</CtaLink>
      </section>
    </div>
  </>;
}

export function BasketScreen({ market }: { market?: string }) {
  const router = useRouter();
  const [eligibleCompanies, setEligibleCompanies] = useState<Company[]>([]);
  const [budget, setBudget] = useState("30");
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  let allocationSummary = "Enter valid amounts to see the remaining budget.";
  try {
    const allocated = allocations.filter((item) => item.selected).reduce((sum, item) => sum + parseUsdc(item.amount), 0n);
    const remaining = parseUsdc(budget) - allocated;
    allocationSummary = `${formatRaw(allocated)} USDC allocated · ${remaining < 0n ? `${formatRaw(-remaining)} USDC over budget` : `${formatRaw(remaining)} USDC unallocated`}`;
  } catch { /* Invalid input remains editable; review validates before posting. */ }

  useEffect(() => {
    apiRequest<Company[]>("watchlist")
      .then((watched) => {
        const eligible = watched.filter((company) => {
          if (!company.instrument?.capabilities.buy) return false;
          if (market === "private") return company.instrument.provider === "prestocks";
          if (market === "public") return company.instrument.provider === "xstocks";
          return true;
        });
        setEligibleCompanies(eligible);
        let saved: Array<{ companyId: string; amountUsdcRaw: string }> = [];
        try {
          const draft: unknown = JSON.parse(sessionStorage.getItem("shelf:allocation-draft") ?? "[]");
          if (Array.isArray(draft)) saved = draft.filter((item) => item && typeof item.companyId === "string" && typeof item.amountUsdcRaw === "string" && /^\d+$/.test(item.amountUsdcRaw));
        } catch { /* A missing or damaged optional draft never blocks manual allocation. */ }
        setAllocations(eligible.map((company) => {
          const proposed = saved.find((item) => item.companyId === company.id);
          return {
            companyId: company.id,
            amount: proposed ? formatRaw(proposed.amountUsdcRaw) : "10",
            selected: Boolean(proposed),
          };
        }));
      })
      .catch((reason: unknown) => setError(messageFrom(reason)))
      .finally(() => setLoading(false));
  }, [market]);

  function splitEqually() {
    const selected = allocations.filter((item) => item.selected);
    if (!selected.length) return;
    let rawBudget: bigint;
    try { rawBudget = parseUsdc(budget); } catch (reason) { setError(messageFrom(reason)); return; }
    const base = rawBudget / BigInt(selected.length);
    let remainder = rawBudget % BigInt(selected.length);

    setAllocations((current) =>
      current.map((item) => {
        if (!item.selected) return item;
        const extra = remainder > 0n ? 1n : 0n;
        remainder -= extra;
        return { ...item, amount: formatRaw(base + extra) };
      }),
    );
  }

  async function createBasket() {
    if (busy) return;
    setBusy(true);
    try {
      const selected = allocations.filter((item) => item.selected);
      if (!selected.length || selected.length > 5) throw new Error("Choose between one and five companies.");
      if (selected.reduce((sum, item) => sum + parseUsdc(item.amount), 0n) > parseUsdc(budget)) throw new Error("Allocations exceed your total budget.");
      const order = await postJson<Order>("orders", {
        clientIntentId: crypto.randomUUID(),
        type: "basket",
        budgetUsdcRaw: parseUsdc(budget).toString(),
        allocations: selected.map((item) => ({
          companyId: item.companyId,
          amountUsdcRaw: parseUsdc(item.amount).toString(),
        })),
        slippageBps: 50,
      });
      router.push(`/orders/${order.id}/review`);
    } catch (requestError) {
      setError(messageFrom(requestError));
      setBusy(false);
    }
  }

  async function suggestAllocation() {
    const companyIds = allocations.filter((item) => item.selected).map((item) => item.companyId);
    if (!companyIds.length || companyIds.length > 5) return;
    try {
      const draft = await postJson<{ allocations: Array<{ companyId: string; amountUsdcRaw: string }> }>(
        "ai/allocation-drafts",
        { budgetUsdcRaw: parseUsdc(budget).toString(), companyIds },
      );
      setAllocations((current) => current.map((item) => {
        const suggestion = draft.allocations.find((entry) => entry.companyId === item.companyId);
        return suggestion
          ? { ...item, amount: formatRaw(suggestion.amountUsdcRaw), selected: true }
          : { ...item, selected: false };
      }));
      setError(null);
    } catch (reason) {
      setError(messageFrom(reason));
    }
  }

  function removeCompany(companyId: string) {
    setAllocations((current) =>
      current.map((item) => {
        return item.companyId === companyId ? { ...item, selected: false } : item;
      }),
    );
  }

  return (
    <>
      <PageIntro
        eyebrow={market === "private" ? "PreStocks private-market basket" : "Multi-company budget"}
        title="Split one budget into separate purchases"
      >
        <p>
          Each company is a separate quote, approval and transaction. Prices can change between
          purchases, and a partial outcome remains partial.
        </p>
      </PageIntro>
      <Card className="stack">
        <p className="muted">Choose up to five assets from your saved issuer watchlist. Add more through a scan or issuer search.</p>
        <div className="chips">
          {eligibleCompanies.map((company) => (
            <button key={company.id} aria-pressed={allocations.some((item) => item.companyId === company.id && item.selected)} className={allocations.some((item) =>
              item.companyId === company.id && item.selected) ? "" : "secondary"}
              onClick={() => setAllocations((current) => current.map((item) =>
                item.companyId === company.id ? { ...item, selected: !item.selected } : item,
              ))}>
              {company.name} · {company.instrument?.symbol}
            </button>
          ))}
        </div>
        {loading ? <LoadingStatus>Loading saved company instruments…</LoadingStatus> : null}
        {!loading && !eligibleCompanies.length ? <CtaLink id="basket-discover" href="/discover" secondary>
          Find an issuer asset
        </CtaLink> : null}
        <Field label="Total budget in USDC" htmlFor="basket-budget">
          <input
            id="basket-budget"
            inputMode="decimal"
            value={budget}
            onChange={(event) => setBudget(event.target.value)}
          />
        </Field>
        {allocations
          .filter((item) => item.selected)
          .map((item) => (
            <div className="research-section" key={item.companyId}>
              <h3>{eligibleCompanies.find((company) => company.id === item.companyId)?.name}</h3>
              <p className="muted">
                {eligibleCompanies.find((company) => company.id === item.companyId)?.instrument?.provider === "prestocks"
                  ? "Private exposure · PreStocks"
                  : "Public equity tracker · xStocks"}
              </p>
              <Field label="Allocation in USDC" htmlFor={`allocation-${item.companyId}`}>
                <input
                  id={`allocation-${item.companyId}`}
                  inputMode="decimal"
                  value={item.amount}
                  onChange={(event) =>
                    setAllocations((current) =>
                      current.map((candidate) =>
                        candidate.companyId === item.companyId
                          ? { ...candidate, amount: event.target.value }
                          : candidate,
                      ),
                    )
                  }
                />
              </Field>
              <button
                className="ghost"
                data-cta="C60"
                onClick={() => removeCompany(item.companyId)}
              >
                Remove company
              </button>
            </div>
          ))}
        <div className="actions">
          <button className="secondary" data-cta="C59" onClick={splitEqually}>
            Split equally
          </button>
          <PendingButton pending={busy} pendingLabel="Preparing review…" data-cta="C61" disabled={busy || !allocations.some((item) => item.selected) ||
            allocations.filter((item) => item.selected).length > 5} onClick={createBasket}>Review basket</PendingButton>
          <button className="secondary" data-cta="C62"
            disabled={!allocations.some((item) => item.selected) ||
              allocations.filter((item) => item.selected).length > 5}
            onClick={suggestAllocation}>Suggest an editable allocation</button>
        </div>
        <p role="status">{allocationSummary}</p>
        <p className="muted">Suggestions remain editable and are not advice or approval. Each instrument needs its own quote and explicit wallet approval.</p>
        <ErrorMessage message={error} />
      </Card>
    </>
  );
}

export function SellScreen({ instrumentId }: { instrumentId: string }) {
  const router = useRouter();
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [holding, setHolding] = useState<Holding | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiRequest<Holding>(`portfolio/${encodeURIComponent(instrumentId)}`)
      .then(setHolding)
      .catch((reason: unknown) => setError(messageFrom(reason)));
  }, [instrumentId]);

  async function createSale(sellAll = false) {
    if (!holding || busy) return;
    setBusy(true);
    try {
      const order = await postJson<Order>("orders", {
        clientIntentId: crypto.randomUUID(),
        type: "sell",
        instrumentId,
        ...(sellAll
          ? { sellAll: true }
          : { amountRaw: parseTokenAmount(quantity, holding?.decimals ?? 0).toString() }),
      });
      router.push(`/orders/${order.id}/review`);
    } catch (requestError) {
      setError(messageFrom(requestError));
      setBusy(false);
    }
  }

  return (
    <>
      <PageIntro eyebrow="Sell to USDC" title="Choose how much to sell">
        <p>
          Sell all uses the exact tracked raw amount, independent of the rounded quantity shown in
          the interface.
        </p>
      </PageIntro>
      <Card className="stack">
        {holding ? <><h2>{holding.symbol}</h2><p>{companyById(holding.companyId)?.name ?? "Issuer instrument"} · tracked holding</p><p>Available: {formatRaw(BigInt(holding.rawAmount) - BigInt(holding.reservedRaw), holding.decimals)} units. Reserved units cannot be sold.</p></> : error ? <p role="status">Holding could not be loaded.</p> : <LoadingStatus>Loading your holding…</LoadingStatus>}
        <Field label="Displayed token quantity" htmlFor="sell-quantity">
          <input
            id="sell-quantity"
            inputMode="decimal"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </Field>
        <div className="actions">
          <button className="secondary" data-cta="C80" disabled={!holding || busy} onClick={() => createSale(true)}>
            Sell all
          </button>
          <PendingButton pending={busy} pendingLabel="Preparing review…" data-cta="C81" disabled={!holding || busy} onClick={() => createSale(false)}>Review sale</PendingButton>
        </div>
        <ErrorMessage message={error} />
        <CtaLink id="sell-cancel" href={`/portfolio/${instrumentId}`} secondary>Return to holding</CtaLink>
      </Card>
    </>
  );
}

export function TransferScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const [assetId, setAssetId] = useState(params.get("asset") || "usdc");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("2.5");
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [external, setExternal] = useState<Holding[]>([]);
  const scope = assetId === "usdc" ? "cash" : params.get("scope") === "external" ? "external" : "tracked";
  const availableAssets = params.get("scope") === "external" ? external : holdings;
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiRequest<{ holdings: Holding[] }>("portfolio")
      .then((data) => setHoldings(data.holdings))
      .catch((reason: unknown) => setError(messageFrom(reason)));
    apiRequest<{ externalInventory: Holding[] }>("wallet").then((data) => setExternal(data.externalInventory)).catch((reason) => setError(messageFrom(reason)));
  }, []);

  async function approveTransfer() {
    if (busy || !reviewing) return;
    setBusy(true);
    try {
      if (!isSolanaPublicKey(recipient.trim())) throw new Error("Enter a valid Solana destination address.");
      const decimals =
        assetId === "usdc"
          ? 6
          : availableAssets.find((holding) => holding.instrumentId === assetId)?.decimals;
      if (decimals === undefined) throw new Error("ASSET_UNSUPPORTED");
      const order = await freshPostJson<Order>("orders", "transfer", {
        clientIntentId: crypto.randomUUID(),
        type: "transfer",
        assetId,
        inventoryScope: scope,
        recipientAddress: recipient.trim(),
        amountRaw: parseTokenAmount(amount, decimals).toString(),
      });
      router.push(`/orders/${order.id}/review`);
    } catch (requestError) {
      setError(messageFrom(requestError));
      setBusy(false);
    }
  }

  return (
    <>
      <PageIntro eyebrow="Send on Solana" title="Transfer a supported asset">
        <p>Check the complete destination. Transfers are irreversible and do not count as sales.</p>
      </PageIntro>
      <Card className="stack">
        <p>Inventory source: {scope === "cash" ? "Wallet cash" : scope === "external" ? "Received outside Shelf · not a Portfolio holding" : "Shelf-origin tracked holding"}</p>
        <Field label="Asset" htmlFor="transfer-asset">
          <select
            id="transfer-asset" disabled={busy}
            value={assetId}
            onChange={(event) => { setAssetId(event.target.value); setReviewing(false); }}
          >
            <option value="usdc">USDC</option>
            {availableAssets.filter((holding) => BigInt(params.get("scope") === "external" ? holding.externalRaw : holding.rawAmount) > 0n).map((holding) => (
              <option value={holding.instrumentId} key={holding.instrumentId}>
                {scope === "external" ? "External" : "Tracked"} {holding.symbol}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Destination Solana address" htmlFor="recipient">
          <input
            id="recipient" disabled={busy}
            value={recipient}
            onChange={(event) => {
              setRecipient(event.target.value);
              setReviewing(false);
            }}
          />
        </Field>
        <Field label="Amount" htmlFor="transfer-amount">
          <input
            id="transfer-amount" disabled={busy}
            inputMode="decimal"
            value={amount}
            onChange={(event) => { setAmount(event.target.value); setReviewing(false); }}
          />
        </Field>
        {reviewing ? (
          <ResultMessage>
            Destination: {recipient}
            <br />
            Asset: {assetId}
            <br />
            Amount: {amount}
            <br />
            Network cost and final fee are shown when execution is activated. App fee: 0.
          </ResultMessage>
        ) : null}
        <div className="actions">
          {!reviewing ? <button data-cta="C82" disabled={!recipient.trim() || !amount || busy} onClick={() => setReviewing(true)}>
            Review transfer
          </button> : <>
            <PendingButton pending={busy} pendingLabel="Preparing review…" data-cta="C83" disabled={busy} onClick={approveTransfer}>Continue to order review</PendingButton>
            <button className="ghost" data-cta="C84" disabled={busy} onClick={() => { setReviewing(false); document.getElementById("recipient")?.focus(); }}>
              Edit recipient
            </button>
          </>}
        </div>
        <ErrorMessage message={error} />
      </Card>
    </>
  );
}

function QuoteFacts({ order, quote, company }: { order: Order; quote: Quote; company?: Company | null }) {
  const leg = order.legs.find((item) => item.quote?.id === quote.id)
    ?? order.legs.find((item) => item.status !== "finalized" && item.status !== "cancelled")
    ?? order.legs[0];
  const instrument = company?.instrument;
  const tokenAmount = (raw: string) => instrument
    ? `${formatRaw(raw, instrument.decimals)} ${instrument.symbol}`
    : `${raw} raw asset units (unit metadata unavailable)`;
  const cashTransfer = leg.side === "transfer" && leg.inventoryScope === "cash";
  return (
    <dl className="facts">
      <div>
        <dt>Action</dt>
        <dd>{leg.side}</dd>
      </div>
      <div>
        <dt>Input</dt>
        <dd>
          {leg.side === "buy" || cashTransfer ? `${formatRaw(quote.inputRaw)} USDC` : tokenAmount(quote.inputRaw)}
        </dd>
      </div>
      <div>
        <dt>Estimated output</dt>
        <dd>{leg.side === "sell" || cashTransfer ? `${formatRaw(quote.estimatedOutputRaw)} USDC` : tokenAmount(quote.estimatedOutputRaw)}</dd>
      </div>
      <div>
        <dt>Minimum output</dt>
        <dd>{leg.side === "sell" || cashTransfer ? `${formatRaw(quote.minimumOutputRaw)} USDC` : tokenAmount(quote.minimumOutputRaw)}</dd>
      </div>
      <div>
        <dt>Shelf fee</dt>
        <dd>
          {formatRaw(quote.feeRaw)} USDC ({quote.feeBps / 100}%)
        </dd>
      </div>
      <div>
        <dt>Slippage</dt>
        <dd>{quote.slippageBps === null ? "Not applicable" : `${quote.slippageBps / 100}%`}</dd>
      </div>
      <div>
        <dt>Price impact</dt>
        <dd>
          {quote.priceImpactBps === null ? "Not applicable" : `${quote.priceImpactBps / 100}%`}
        </dd>
      </div>
      <div>
        <dt>Network cost</dt>
        <dd>
          {quote.source === "jupiter"
            ? "Shelf sponsorship begins after activation"
            : `Covered by Shelf · ${quote.estimatedLamports} lamports estimated`}
        </dd>
      </div>
      <div>
        <dt>Route</dt>
        <dd>{quote.routeLabel}</dd>
      </div>
    </dl>
  );
}

export function OrderReviewScreen({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [issuerCompany, setIssuerCompany] = useState<Company | null>(null);
  const [now, setNow] = useState(0);
  const [quoting, setQuoting] = useState(false);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  const expired = Boolean(quote && now >= Date.parse(quote.expiresAt));

  useEffect(() => {
    apiRequest<Order>(`orders/${orderId}`)
      .then(setOrder)
      .catch((requestError) => setError(messageFrom(requestError)));
  }, [orderId]);

  useEffect(() => {
    const companyId = order?.legs.find((leg) => leg.status !== "finalized")?.companyId;
    if (!companyId?.startsWith("issuer:")) return;
    apiRequest<Company>(`companies/${encodeURIComponent(companyId)}`)
      .then(setIssuerCompany)
      .catch(() => setIssuerCompany(null));
  }, [order]);

  async function loadQuote() {
    if (!order || quoting) return;
    const nextLeg = order.legs.find((leg) => leg.status !== "finalized");
    if (!nextLeg) return;
    setQuoting(true);
    setQuote(null);
    try {
      const freshQuote = await postJson<Quote>(`orders/${order.id}/legs/${nextLeg.id}/quote`, {
        expectedOrderVersion: order.version,
      });
      setQuote(freshQuote);
      setNow(Date.now());
      setError(null);
    } catch (requestError) {
      setError(messageFrom(requestError));
    } finally { setQuoting(false); }
  }

  async function cancelOrder() {
    try { await postJson(`orders/${orderId}/stop`, {}); router.push(`/orders/${orderId}`); }
    catch (reason) { setError(messageFrom(reason)); }
  }

  async function approveOrder() {
    if (!order || !quote || approving || Date.now() >= Date.parse(quote.expiresAt)) return;
    const nextLeg = order.legs.find((leg) => leg.status !== "finalized");
    if (!nextLeg) return;
    setApproving(true);
    try {
      const preparation = await postJson<{
        preparationId: string;
        transactionBase64: string;
      }>(`orders/${order.id}/legs/${nextLeg.id}/prepare`, {
        reviewDigest: quote.reviewDigest,
      });
      const signedTransactionBase64 = await signMagicSolanaTransaction(
        preparation.transactionBase64,
      );
      await postJson(`preparations/${preparation.preparationId}/signature`, {
        signedTransactionBase64,
      });
      await postJson(`preparations/${preparation.preparationId}/broadcast`, {});
      router.push(`/orders/${order.id}`);
    } catch (requestError) {
      if (messageFrom(requestError).includes("quote expired")) setQuote(null);
      setError(messageFrom(requestError));
      setApproving(false);
    }
  }

  if (!order && error) return <Recovery title="Order unavailable" error={error} />;
  if (!order)
    return <LoadingStatus page>Retrieving the private order…</LoadingStatus>;
  const actionId = order.type === "sell" ? "C64" : "C63";
  const activeLeg = order.legs.find((leg) => leg.status !== "finalized") ?? order.legs[0];
  const activeCompany = issuerCompany ??
    (activeLeg.companyId ? companyById(activeLeg.companyId) : undefined);

  return (
    <>
      <PageIntro
        eyebrow="Order review"
        title={
          order.type === "sell"
            ? "Review sale"
            : order.type === "transfer"
              ? "Review transfer"
              : "Review purchase"
        }
      >
        <p>
          Quotes use Jupiter when available. Signing and broadcast remain unavailable until
          Shelf’s funding, eligibility and execution gates are satisfied.
        </p>
      </PageIntro>
      <Card className="stack">
        <h2>{activeCompany?.name ?? activeLeg.instrumentId ?? "Transfer"}</h2>
        {activeLeg.recipientAddress ? <p className="break-all">Recipient · {activeLeg.recipientAddress}</p> : null}
        <p>Order reference: {order.id} · Transaction {activeLeg.position + 1} of {order.legs.length}</p>
        {activeCompany?.instrument ? <p>Instrument: {activeCompany.instrument.symbol} · {activeCompany.instrument.issuer}</p> : null}
        <p>Requested input: {activeLeg.side === "buy"
          ? `${formatRaw(activeLeg.requestedInputRaw, 6)} USDC`
          : activeCompany?.instrument
            ? `${formatRaw(activeLeg.requestedInputRaw, activeCompany.instrument.decimals)} ${activeCompany.instrument.symbol}`
            : `${activeLeg.requestedInputRaw} raw units`}. Final output and fees require a current quote.</p>
        {activeCompany?.instrument ? (
          <p className="notice">
            <strong>
              {activeCompany.instrument.provider === "prestocks"
                ? "Private exposure · PreStocks"
                : "Public equity tracker · xStocks"}
            </strong>
            <br />
            {activeCompany.instrument.provider === "prestocks"
              ? "No ordinary ownership rights or guaranteed liquidity."
              : "No shareholder voting rights; issuer and secondary-market terms apply."}
          </p>
        ) : null}
        {activeCompany?.instrument?.lifecycle ? <p className="notice" role="status">
          <strong>{activeCompany.instrument.lifecycle.title}</strong><br />
          {activeCompany.instrument.lifecycle.description}
          {activeCompany.instrument.lifecycle.deadline
            ? ` Deadline: ${new Date(activeCompany.instrument.lifecycle.deadline).toLocaleString()}.` : ""}
          <br /><a href={activeCompany.instrument.lifecycle.sourceUrl} target="_blank" rel="noreferrer">Read issuer notice</a>
        </p> : null}
        {quote ? (
          <>
            <QuoteFacts order={order} quote={quote} company={activeCompany} />
            <p role="status">{expired ? "This quote has expired. Request a fresh quote and review the updated amounts." : `Quote valid until ${new Date(quote.expiresAt).toLocaleTimeString()}.`}</p>
            {!quote.executionAvailable ? (
              <p className="notice" role="status">
                <strong>Live route verified · execution unavailable</strong>
                <br />
                Shelf assembled and checked the unsigned transaction. Sponsor funding and the fee
                account must be activated before you can approve it.
              </p>
            ) : null}
          </>
        ) : (
          <p>No current quote. Request one when you are ready to review.</p>
        )}
        <div className="actions">
          {!quote || expired ? (
            <PendingButton pending={quoting} pendingLabel="Checking quote…" data-cta="C67" disabled={quoting} onClick={loadQuote}>Get fresh quote</PendingButton>
          ) : (
            <PendingButton pending={approving} pendingLabel="Waiting for wallet…"
              data-cta={actionId}
              disabled={!quote.executionAvailable || approving || expired}
              onClick={approveOrder}
            >{order.type === "sell"
                  ? "Approve sale"
                  : order.type === "transfer"
                    ? "Approve transfer"
                    : "Approve purchase"}</PendingButton>
          )}
          <button className="secondary" data-cta="C65" onClick={() => history.back()}>
            Edit amount
          </button>
          <button className="secondary" data-cta="C66" onClick={cancelOrder}>
            Cancel order
          </button>
        </div>
        <ErrorMessage message={error} />
      </Card>
    </>
  );
}

export function OrderStatusScreen({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadOrder() {
    try {
      const current = await postJson<{ status: string; order: Order }>(
        `orders/${orderId}/status`,
        {},
      );
      setOrder(current.order);
      setError(null);
    } catch (requestError) {
      setError(messageFrom(requestError));
    }
  }

  useEffect(() => {
    apiRequest<Order>(`orders/${orderId}`)
      .then(setOrder)
      .catch((requestError: unknown) => setError(messageFrom(requestError)));
  }, [orderId]);

  async function stopRemaining() {
    try { setOrder(await postJson<Order>(`orders/${orderId}/stop`, {})); setError(null); }
    catch (reason) { setError(messageFrom(reason)); }
  }
  if (!order && error) return <Recovery title="Order status unavailable" error={error} />;
  if (!order)
    return (
      <LoadingStatus page>Checking the persisted transaction outcome…</LoadingStatus>
    );
  const nextLeg = order.legs.find((leg) => leg.status !== "finalized" && leg.status !== "cancelled");
  const canReviewNext = nextLeg && ["draft", "quoted"].includes(nextLeg.status);
  const canRetry = nextLeg && ["failed", "expired"].includes(nextLeg.status);
  const hasUnsignedLeg = order.legs.some((leg) =>
    ["draft", "quoted", "prepared", "awaiting_signature"].includes(leg.status));

  return (
    <>
      <PageIntro
        eyebrow="Order status"
        title={orderTitles[order.status]}
      >
        <p>
          Finalized chain facts are recorded once after reconciliation.
          {order.status === "outcome_unknown" ? " Do not submit another order while the outcome is unknown. Check this order’s status." : ""}
        </p>
      </PageIntro>
      <div className="research-rows" aria-live="polite">
        {order.legs.map((leg) => (
          <Card key={leg.id}>
            <span className="badge">{leg.status.replaceAll("_", " ")}</span>
            <h3>{leg.side === "transfer" ? "Transfer" : "Transaction"} {leg.position + 1}</h3>
            <p>{leg.companyId
              ? companyById(leg.companyId)?.name ?? leg.companyId.split(":").at(-1)?.toUpperCase()
              : "Transfer"}</p>
            <p className="muted">Input raw: {leg.requestedInputRaw}</p>
          </Card>
        ))}
      </div>
      <div className="section actions">
        {order.legs[0]?.signature ? (
          <a
            className="button secondary"
            data-cta="C68"
            href={`https://explorer.solana.com/tx/${order.legs[0].signature}`}
            target="_blank"
            rel="noreferrer"
          >
            View transaction
          </a>
        ) : null}
        <button className="secondary" data-cta="C69" onClick={loadOrder}>
          Check status
        </button>
        {canReviewNext ? (
          <CtaLink id="C70" href={`/orders/${order.id}/review`}>
            Review next purchase
          </CtaLink>
        ) : null}
        <button className="secondary" data-cta="C71" disabled={!hasUnsignedLeg} onClick={stopRemaining}>
          Stop remaining purchases
        </button>
        {canRetry ? (
          <CtaLink id="C72" href={`/orders/${order.id}/review`} secondary>
            Retry remaining purchase
          </CtaLink>
        ) : null}
      </div>
      <div className="section actions">
        <CtaLink id="C73" href="/portfolio">
          View holding
        </CtaLink>
        <CtaLink id="C85" href="/portfolio/activity" secondary>
          View record
        </CtaLink>
        <CtaLink id="C75" href="/" secondary>
          Keep discovering
        </CtaLink>
      </div>
      <ErrorMessage message={error} />
    </>
  );
}

export function PortfolioScreen() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [cashRaw, setCashRaw] = useState("0");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  useEffect(() => {
    apiRequest<{ holdings: Holding[]; cashRaw: string }>("portfolio").then((data) => {
      setHoldings(data.holdings);
      setCashRaw(data.cashRaw);
    }).catch((reason) => setError(messageFrom(reason))).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingStatus page>Retrieving your holdings and wallet cash…</LoadingStatus>;
  if (error) return <Recovery title="Portfolio unavailable" error={error} />;

  const totalCost = holdings.reduce((sum, holding) => sum + BigInt(holding.totalCostUsdcRaw), 0n);
  const matching = holdings.filter((holding) => `${holding.symbol} ${companyById(holding.companyId)?.name ?? ""}`.toLowerCase().includes(search.toLowerCase().trim()));
  return (
    <div className="portfolio-studio">
      <header className="portfolio-studio-heading">
        <div><p className="studio-eyebrow">Your investment workspace</p><h1>Your Shelf investments</h1><p>The things you chose to own. All in one place.</p></div>
        <Link className="button secondary" data-cta="C74" href="/portfolio/activity"><ClockIcon aria-hidden="true" /> View history</Link>
      </header>
      <div className="portfolio-overview">
        <section className="portfolio-cost-card" aria-label="Acquisition cost summary">
          <span className="portfolio-card-label"><ChartPieIcon aria-hidden="true" /> Acquisition cost</span>
          <p className="portfolio-total">{formatRaw(totalCost)} <span>USDC</span></p>
          <p className="portfolio-value-note">Cost of your current holdings. Current market valuation is unavailable.</p>
          <div className="portfolio-cost-strip" aria-hidden="true">{holdings.map((holding, index) => <span key={holding.instrumentId} data-color={index % 4} style={{ flexGrow: totalCost > 0n ? Number(BigInt(holding.totalCostUsdcRaw) * 10000n / totalCost) : 1 }} />)}</div>
          <div className="portfolio-cost-key"><span>{holdings.length} tracked {holdings.length === 1 ? "position" : "positions"}</span><span>Shelf-origin only</span></div>
        </section>
        <section className="portfolio-wallet-card" aria-label="Separate wallet cash">
          <span className="portfolio-card-label"><WalletIcon aria-hidden="true" /> Tracked wallet cash</span>
          <p className="portfolio-total">{formatRaw(cashRaw)} <span>USDC</span></p>
          <p>Cash is separate from your stock holdings.</p>
          <Link href="/account/wallet">Open your wallet <ArrowUpRightIcon aria-hidden="true" /></Link>
        </section>
      </div>
      <div className="portfolio-studio-layout">
        <section className="portfolio-holdings" aria-label="Your holdings">
          <div className="portfolio-holdings-toolbar"><h2>Holdings <span>{holdings.length}</span></h2><label className="portfolio-search"><MagnifyingGlassIcon aria-hidden="true" /><span className="feedback-sr-only">Search holdings</span><input type="search" placeholder="Find a holding" value={search} onChange={(event) => setSearch(event.target.value)} /></label></div>
          {holdings.length ? <div className="portfolio-holdings-list">{matching.map((holding, index) => {
            const company = companyById(holding.companyId);
            const isPrivate = holding.companyId.startsWith("issuer:prestocks:") || company?.instrument?.provider === "prestocks";
            return <article className="portfolio-holding-row" key={holding.instrumentId}>
              <span className="portfolio-company-mark" data-color={index % 4} aria-hidden="true">{holding.symbol.slice(0, 2)}</span>
              <div className="portfolio-holding-name"><h3><Link href={`/portfolio/${holding.instrumentId}`}>{company?.name ?? holding.symbol}</Link></h3><p>{holding.symbol} <span>· {isPrivate ? "PreStocks" : "xStocks"}</span></p></div>
              <div className="portfolio-holding-units"><strong>{formatRaw(holding.rawAmount, holding.decimals)}</strong><span>displayed units</span></div>
              <div className="portfolio-holding-cost"><strong>{formatRaw(holding.totalCostUsdcRaw)} <small>USDC</small></strong><span>acquisition cost</span></div>
              <Link className="portfolio-holding-link" data-cta="C73" href={`/portfolio/${holding.instrumentId}`} aria-label={`View holding ${holding.symbol}`}><ArrowUpRightIcon aria-hidden="true" /></Link>
            </article>;
          })}{!matching.length ? <div className="portfolio-no-results"><p>No holdings match “{search}”.</p><button className="ghost" onClick={() => setSearch("")}>Clear search</button></div> : null}</div>
          : <EmptyState title="No Shelf investments yet" action={<CtaLink id="C75" href="/discover">Discover companies</CtaLink>}>Your cash and saved research are still available. You do not need to invest to use Shelf.</EmptyState>}
          <p className="portfolio-tracking-note"><ShieldCheckIcon aria-hidden="true" /> Only finalized acquisitions made through Shelf appear here.</p>
        </section>
        <aside className="portfolio-research-note"><SparklesIcon aria-hidden="true" /><p className="studio-eyebrow">A little perspective</p><h2>Know what<br />you own.</h2><p>Explore the companies, understand the instruments, and make your next decision with context.</p><Link href="/discover">Explore current tokens <ArrowUpRightIcon aria-hidden="true" /></Link><details><summary>How your portfolio works</summary><p>Acquisition cost is not today’s market value. Externally received assets are shown in your Wallet, separately from Shelf purchases.</p><Link href="/learn/splits-and-dividends">Understand quantity changes</Link></details></aside>
      </div>
    </div>
  );
}

export function HoldingScreen({ instrumentId }: { instrumentId: string }) {
  const [holding, setHolding] = useState<Holding | null>(null);
  const [relevantActions, setRelevantActions] = useState<CorporateActionView[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    apiRequest<Holding>(`portfolio/${instrumentId}`)
      .then((response) => {
        setHolding(response);
        setError(null);
      })
      .catch((requestError: unknown) => setError(messageFrom(requestError)));
    apiRequest<CorporateActionView[]>(
      `corporate-actions?instrumentId=${encodeURIComponent(instrumentId)}`,
    ).then(setRelevantActions).catch(() => setRelevantActions([]));
  }, [instrumentId]);
  if (error)
    return (
      <EmptyState title="Holding unavailable">
        Shelf could not load this holding: {error}. Return to Portfolio and try again.
      </EmptyState>
    );
  if (!holding)
    return (
      <LoadingStatus page>Retrieving the current tracked position…</LoadingStatus>
    );
  return (
    <div className="holding-studio">
      <PageIntro eyebrow="Tracked holding" title={holding.symbol}>
        <p>
          Current display uses multiplier {holding.multiplier}; historical records retain their
          original unit snapshots.
        </p>
      </PageIntro>
      <Card className="holding-position-card">
        <div className="holding-position-top"><span className="holding-symbol-mark" aria-hidden="true">{holding.symbol.slice(0, 2)}</span><div><p className="studio-eyebrow">Your position</p><h2>{companyById(holding.companyId)?.name ?? "Issuer instrument"}</h2><span>{holding.symbol}</span></div><span className="holding-position-tag"><ShieldCheckIcon aria-hidden="true" /> Shelf tracked</span></div>
        <p className="holding-amount">{formatRaw(holding.rawAmount, holding.decimals)} <span>units</span></p>
        <div className="holding-metrics"><div><span>Available to sell or send</span><strong>{formatRaw(BigInt(holding.rawAmount) - BigInt(holding.reservedRaw), holding.decimals)} units</strong></div><div><span>Acquisition cost</span><strong>{formatRaw(holding.totalCostUsdcRaw)} USDC</strong></div><div><span>Current market value</span><strong>Unavailable</strong></div></div>
        <details><summary>Exact unit and accounting details</summary>
        <dl className="facts">
          <div>
            <dt>Tracked raw</dt>
            <dd>{holding.rawAmount}</dd>
          </div>
          <div>
            <dt>Reserved raw</dt>
            <dd>{holding.reservedRaw}</dd>
          </div>
          <div>
            <dt>External raw</dt>
            <dd>{holding.externalRaw}</dd>
          </div>
          <div>
            <dt>Acquisition cost</dt>
            <dd>{formatRaw(holding.totalCostUsdcRaw)} USDC</dd>
          </div>
        </dl>
        </details>
        <div className="actions">
          <CtaLink id="C76" href={`/portfolio/${holding.instrumentId}/sell`}>
            <BanknotesIcon aria-hidden="true" /> Sell
          </CtaLink>
          <CtaLink
            id="C77"
            href={`/account/wallet/send?asset=${holding.instrumentId}&scope=tracked`}
            secondary
          >
            <ArrowUpRightIcon aria-hidden="true" /> Send
          </CtaLink>
          <CtaLink
            id="C78"
            href={holding.companyId.startsWith("issuer:")
              ? `/assets/${holding.companyId.split(":")[1]}/${encodeURIComponent(holding.symbol)}`
              : `/discover?q=${encodeURIComponent(companyById(holding.companyId)?.name ?? holding.symbol)}`}
            secondary
          >
            {holding.companyId.startsWith("issuer:") ? "View token details" : "Search issuer listings"}
          </CtaLink>
          <CtaLink id="C79" href="/learn/splits-and-dividends" secondary>
            Why did my quantity change?
          </CtaLink>
        </div>
      </Card>
      {relevantActions.map((action) => (
        <Card className="section" key={action.id}>
          <span className="badge">{action.status}</span>
          <h2>Issuer quantity update</h2>
          <p>{action.explanation}</p>
          <p className="muted">
            Effective {new Date(action.effectiveAt).toLocaleString()} · source {action.sourceId}
          </p>
        </Card>
      ))}
    </div>
  );
}

function exportRecords(records: FinancialRecord[], format: "csv" | "json") {
  const content =
    format === "json" ? JSON.stringify(records, null, 2) : financialRecordsCsv(records);
  const blob = new Blob([content], { type: format === "json" ? "application/json" : "text/csv" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `shelf-activity.${format}`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function HistoryScreen() {
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const visible = records.filter((record) => (!params.get("type") || record.type === params.get("type")) && (!params.get("status") || record.status === params.get("status")));
  function filter(key: string, value: string) { const next = new URLSearchParams(params.toString()); if (value) next.set(key, value); else next.delete(key); router.replace(`/portfolio/activity?${next}`); }
  useEffect(() => {
    apiRequest<FinancialRecord[]>("history").then(setRecords).catch((reason) => setError(messageFrom(reason))).finally(() => setLoading(false));
  }, []);

  async function download(format: "csv" | "json") {
    setExporting(true);
    try {
    const exportableRecords = await freshApiRequest<FinancialRecord[]>(
      "exports/activity",
      "activity_export",
    );
    exportRecords(exportableRecords, format);
    setError(null);
    } catch (reason) { setError(messageFrom(reason)); } finally { setExporting(false); }
  }
  return (
    <div className="activity-studio">
      <PageIntro eyebrow="Portfolio / Activity" title="Activity">
        <p>
          Exact raw amounts, unit context, fees and chain references stay attached to each factual
          record.
        </p>
      </PageIntro>
      <div className="research-tabs">
        <Field label="Activity type" htmlFor="activity-type"><select id="activity-type" value={params.get("type") || ""} onChange={(event) => filter("type", event.target.value)}><option value="">All activity</option>{["buy", "sell", "transfer", "deposit", "corporate_action"].map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}</select></Field>
        <Field label="Status" htmlFor="activity-status"><select id="activity-status" value={params.get("status") || ""} onChange={(event) => filter("status", event.target.value)}><option value="">All statuses</option>{["pending", "finalized", "failed"].map((status) => <option key={status}>{status}</option>)}</select></Field>
      </div>
      <ErrorMessage message={error} />
      <div className="actions">
        <PendingButton pending={exporting} pendingLabel="Preparing export…" data-cta="C86" disabled={exporting || loading} onClick={() => download("csv")}>
          Download CSV
        </PendingButton>
        <button className="secondary" data-cta="C87" disabled={exporting || loading} onClick={() => download("json")}>
          Download JSON
        </button>
      </div>
      <section className="section">
        {loading ? <LoadingStatus>Loading activity…</LoadingStatus> : error && !records.length ? <Recovery title="Activity unavailable" error={error} /> : visible.length ? (
          <div className="table-wrap">
            <table className="research-table">
              <caption>{visible.length} activity records · exact raw amounts</caption>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Asset</th>
                  <th>Amount raw</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((record) => (
                  <tr key={record.id}>
                    <td data-label="Time">{new Date(record.recordedAt).toLocaleString()}</td>
                    <td data-label="Type"><span className="activity-kind">{record.type === "buy" || record.type === "deposit" ? <ArrowDownLeftIcon aria-hidden="true" /> : <ArrowUpRightIcon aria-hidden="true" />}{record.type.replaceAll("_", " ")}</span></td>
                    <td data-label="Status"><span className="activity-status" data-status={record.status}>{record.status}</span></td>
                    <td data-label="Asset">{record.asset}</td>
                    <td data-label="Raw amount">{record.rawAmount}</td>
                    <td data-label="Record">
                      <Link data-cta="C85" href={`/portfolio/activity/${record.id}`}>
                        View record
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title={records.length ? "No matching activity" : "No activity yet"} action={records.length ? <Link href="/portfolio/activity">Clear filters</Link> : <Link href="/portfolio">View Portfolio</Link>}>
            {records.length ? "Change or clear your filters to see other records." : "Purchases, sells, transfers and corporate actions will appear here."}
          </EmptyState>
        )}
      </section>
    </div>
  );
}

export function RecordScreen({
  recordId,
  supportContact,
}: {
  recordId: string;
  supportContact?: string;
}) {
  const [record, setRecord] = useState<FinancialRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    apiRequest<FinancialRecord>(`history/${recordId}`).then(setRecord).catch((reason) => setError(messageFrom(reason)));
  }, [recordId]);
  if (error) return <Recovery title="Activity record unavailable" error={error} href="/portfolio/activity" />;
  if (!record)
    return (
      <LoadingStatus page>Retrieving the recorded activity facts…</LoadingStatus>
    );
  return (
    <>
      <PageIntro eyebrow="Activity record" title={`${record.type} · ${record.status}`} />
      <Card>
        <h2>{record.asset}</h2>
        <p>{formatRaw(record.usdcRaw)} USDC recorded · {formatRaw(record.feeRaw)} USDC Shelf fee</p>
        <p>Recorded {new Date(record.recordedAt).toLocaleString()}. {record.status === "pending" ? "This record is not final." : "This is a factual activity record, not a current valuation."}</p>
        <details><summary>Exact record details</summary>
        <dl className="facts">
          <div>
            <dt>Recorded</dt>
            <dd>{record.recordedAt}</dd>
          </div>
          <div>
            <dt>Asset</dt>
            <dd>{record.asset}</dd>
          </div>
          <div>
            <dt>Raw amount</dt>
            <dd>{record.rawAmount}</dd>
          </div>
          <div>
            <dt>USDC raw</dt>
            <dd>{record.usdcRaw}</dd>
          </div>
          <div>
            <dt>Shelf fee raw</dt>
            <dd>{record.feeRaw}</dd>
          </div>
          <div>
            <dt>Multiplier snapshot</dt>
            <dd>{record.multiplier}</dd>
          </div>
        </dl>
        </details>
        <div className="actions">
          <CtaLink id="record-return" href="/portfolio/activity" secondary>Back to Activity</CtaLink>
          {record.signature ? (
            <a
              className="button"
              data-cta="C88"
              href={`https://explorer.solana.com/tx/${record.signature}`}
              target="_blank"
              rel="noreferrer"
            >
              View on Solana
            </a>
          ) : null}
          <SupportAction
            id="C89"
            contact={supportContact}
            subject={`Shelf record ${record.id}`}
          >
            Get help with this record
          </SupportAction>
        </div>
      </Card>
    </>
  );
}
