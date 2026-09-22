"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { companies, companyById, corporateActions } from "@/data/catalog";
import { formatRaw, parseUsdc } from "@/domain/money";
import type { FinancialRecord, Holding, Order, Quote } from "@/domain/types";
import { apiRequest, freshApiRequest, freshPostJson, postJson } from "@/lib/api-client";
import { financialRecordsCsv } from "@/lib/csv";
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

export function BuyScreen({ companyId }: { companyId: string }) {
  const router = useRouter();
  const company = companyById(companyId);
  const [amount, setAmount] = useState("10");
  const [error, setError] = useState<string | null>(null);

  if (!company) {
    return <EmptyState title="Company unavailable">This reviewed company could not be found.</EmptyState>;
  }
  const selectedCompanyId = company.id;

  async function createPurchase() {
    try {
      const order = await postJson<Order>("orders", {
        clientIntentId: crypto.randomUUID(),
        type: "buy",
        companyId: selectedCompanyId,
        amountUsdcRaw: parseUsdc(amount).toString(),
        slippageBps: 50,
      });
      router.push(`/orders/${order.id}/review`);
    } catch (requestError) {
      setError(messageFrom(requestError));
    }
  }

  return (
    <>
      <PageIntro
        eyebrow={`Buy ${company.ticker} exposure`}
        title={`Choose an amount for ${company.name}`}
      >
        <p>
          The amount is your maximum total USDC debit, including Shelf’s 0.50% fee. Nothing is
          purchased until you review and approve.
        </p>
      </PageIntro>
      <Card className="stack">
        {company.instrument?.assetClass === "pre_ipo_exposure" ? (
          <p className="notice">
            This is an issuer-defined pre-IPO exposure token, not company stock. It does not grant
            ordinary ownership, voting, information, or dividend rights, and liquidity is not
            guaranteed.
          </p>
        ) : (
          <p className="notice">
            This xStocks tracker certificate provides economic exposure to a public equity. It is
            backed under the issuer’s terms but is not an ordinary voting share. A fresh Jupiter
            quote determines executable secondary-market terms.
          </p>
        )}
        <p>
          Funding remains disabled until the live-money activation run.
        </p>
        <Field
          label="Amount in USDC"
          htmlFor="buy-amount"
          hint="Minimum 5 USDC · beta maximum 100 USDC"
        >
          <input
            id="buy-amount"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </Field>
        <div className="chips">
          {["5", "10", "25"].map((preset) => (
            <button className="secondary" onClick={() => setAmount(preset)} key={preset}>
              {preset} USDC
            </button>
          ))}
        </div>
        <div className="actions">
          <button data-cta="C57" onClick={createPurchase}>
            Review purchase
          </button>
          <CtaLink id="C58" href="/account/wallet/deposit" secondary>
            Deposit USDC
          </CtaLink>
        </div>
        <ErrorMessage message={error} />
      </Card>
    </>
  );
}

type Allocation = { companyId: string; amount: string; selected: boolean };

export function BasketScreen({ market }: { market?: string }) {
  const router = useRouter();
  const eligibleCompanies = companies
    .filter((company) => company.instrument?.capabilities.buy)
    .filter((company) => {
      if (market === "private") return company.instrument?.provider === "prestocks";
      if (market === "public") return company.instrument?.provider === "xstocks";
      return true;
    });
  const [budget, setBudget] = useState("30");
  const [allocations, setAllocations] = useState<Allocation[]>(() => {
    if (typeof window === "undefined") {
      return eligibleCompanies.map((company, index) => ({
        companyId: company.id,
        amount: "10",
        selected: index < 3,
      }));
    }
    const saved = sessionStorage.getItem("shelf:allocation-draft");
    if (!saved) {
      return eligibleCompanies.map((company, index) => ({
        companyId: company.id,
        amount: "10",
        selected: index < 3,
      }));
    }
    const draft = JSON.parse(saved) as Array<{ companyId: string; amountUsdcRaw: string }>;
    return eligibleCompanies.map((company) => {
      const proposed = draft.find((item) => item.companyId === company.id);
      return {
        companyId: company.id,
        amount: proposed ? formatRaw(proposed.amountUsdcRaw) : "10",
        selected: Boolean(proposed),
      };
    });
  });
  const [error, setError] = useState<string | null>(null);

  function splitEqually() {
    const selected = allocations.filter((item) => item.selected);
    if (!selected.length) return;
    const rawBudget = parseUsdc(budget);
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
    try {
      const selected = allocations.filter((item) => item.selected);
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
            <div className="card" key={item.companyId}>
              <h3>{companyById(item.companyId)?.name}</h3>
              <p className="muted">
                {companyById(item.companyId)?.instrument?.provider === "prestocks"
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
          <button data-cta="C61" onClick={createBasket}>
            Review basket
          </button>
          <CtaLink id="C62" href="/invest/basket?source=ai" secondary>
            Get an AI draft
          </CtaLink>
        </div>
        <ErrorMessage message={error} />
      </Card>
    </>
  );
}

export function SellScreen({ instrumentId }: { instrumentId: string }) {
  const router = useRouter();
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState<string | null>(null);

  async function createSale(sellAll = false) {
    try {
      const order = await postJson<Order>("orders", {
        clientIntentId: crypto.randomUUID(),
        type: "sell",
        instrumentId,
        ...(sellAll ? { sellAll: true } : { amountRaw: parseUsdc(quantity).toString() }),
      });
      router.push(`/orders/${order.id}/review`);
    } catch (requestError) {
      setError(messageFrom(requestError));
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
        <Field label="Displayed token quantity" htmlFor="sell-quantity">
          <input
            id="sell-quantity"
            inputMode="decimal"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </Field>
        <div className="actions">
          <button className="secondary" data-cta="C80" onClick={() => createSale(true)}>
            Sell all
          </button>
          <button data-cta="C81" onClick={() => createSale(false)}>
            Review sale
          </button>
        </div>
        <ErrorMessage message={error} />
      </Card>
    </>
  );
}

export function TransferScreen() {
  const router = useRouter();
  const [assetId, setAssetId] = useState("usdc");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("2.5");
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function approveTransfer() {
    try {
      if (recipient.length < 32) throw new Error("RECIPIENT_INVALID");
      const order = await freshPostJson<Order>("orders", "transfer", {
        clientIntentId: crypto.randomUUID(),
        type: "transfer",
        assetId,
        inventoryScope: assetId === "usdc" ? "cash" : "tracked",
        recipientAddress: recipient,
        amountRaw: parseUsdc(amount).toString(),
      });
      router.push(`/orders/${order.id}/review`);
    } catch (requestError) {
      setError(messageFrom(requestError));
    }
  }

  return (
    <>
      <PageIntro eyebrow="Send on Solana" title="Transfer a supported asset">
        <p>Check the complete destination. Transfers are irreversible and do not count as sales.</p>
      </PageIntro>
      <Card className="stack">
        <Field label="Asset" htmlFor="transfer-asset">
          <select
            id="transfer-asset"
            value={assetId}
            onChange={(event) => setAssetId(event.target.value)}
          >
            <option value="usdc">USDC</option>
            <option value="instrument-pepx">Tracked PEPx</option>
          </select>
        </Field>
        <Field label="Destination Solana address" htmlFor="recipient">
          <input
            id="recipient"
            value={recipient}
            onChange={(event) => {
              setRecipient(event.target.value);
              setReviewing(false);
            }}
          />
        </Field>
        <Field label="Amount" htmlFor="transfer-amount">
          <input
            id="transfer-amount"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
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
          <button className="secondary" data-cta="C82" onClick={() => setReviewing(true)}>
            Review transfer
          </button>
          <button data-cta="C83" disabled={!reviewing} onClick={approveTransfer}>
            Approve transfer
          </button>
          <button className="ghost" data-cta="C84" onClick={() => setReviewing(false)}>
            Edit recipient
          </button>
        </div>
        <ErrorMessage message={error} />
      </Card>
    </>
  );
}

function QuoteFacts({ order, quote }: { order: Order; quote: Quote }) {
  const leg = order.legs.find((item) => item.quote?.id === quote.id) ?? order.legs[0];
  return (
    <dl className="facts">
      <div>
        <dt>Action</dt>
        <dd>{leg.side}</dd>
      </div>
      <div>
        <dt>Input</dt>
        <dd>
          {formatRaw(quote.inputRaw)} {leg.side === "sell" ? "tokens" : "USDC"}
        </dd>
      </div>
      <div>
        <dt>Estimated output</dt>
        <dd>{formatRaw(quote.estimatedOutputRaw)}</dd>
      </div>
      <div>
        <dt>Minimum output</dt>
        <dd>{formatRaw(quote.minimumOutputRaw)}</dd>
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

  useEffect(() => {
    apiRequest<Order>(`orders/${orderId}`)
      .then(setOrder)
      .catch((requestError) => setError(messageFrom(requestError)));
  }, [orderId]);

  async function loadQuote() {
    if (!order) return;
    const nextLeg = order.legs.find((leg) => leg.status !== "finalized");
    if (!nextLeg) return;
    try {
      const freshQuote = await postJson<Quote>(`orders/${order.id}/legs/${nextLeg.id}/quote`, {
        expectedOrderVersion: order.version,
      });
      setQuote(freshQuote);
      setError(null);
    } catch (requestError) {
      setError(messageFrom(requestError));
    }
  }

  async function cancelOrder() {
    await postJson(`orders/${orderId}/stop`, {});
    router.push("/portfolio");
  }

  if (!order)
    return <EmptyState title="Loading order">The private order is being retrieved.</EmptyState>;
  const actionId = order.type === "sell" ? "C64" : "C63";
  const activeLeg = order.legs.find((leg) => leg.status !== "finalized") ?? order.legs[0];
  const activeCompany = activeLeg.companyId ? companyById(activeLeg.companyId) : undefined;

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
          This is a live Jupiter market route. Signing and broadcast stay unavailable until Shelf
          activates the funded sponsor.
        </p>
      </PageIntro>
      <Card className="stack">
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
        {quote ? (
          <>
            <QuoteFacts order={order} quote={quote} />
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
          {!quote ? (
            <button data-cta="C67" onClick={loadQuote}>
              Get fresh quote
            </button>
          ) : (
            <button data-cta={actionId} disabled={!quote.executionAvailable}>
              {order.type === "sell"
                ? "Approve sale"
                : order.type === "transfer"
                  ? "Approve transfer"
                  : "Approve purchase"}
            </button>
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
      setOrder(await apiRequest<Order>(`orders/${orderId}`));
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
    setOrder(await postJson<Order>(`orders/${orderId}/stop`, {}));
  }
  if (!order)
    return (
      <EmptyState title="Checking transaction outcome">
        Shelf is loading the persisted order.
      </EmptyState>
    );
  const nextLeg = order.legs.find((leg) => leg.status !== "finalized");

  return (
    <>
      <PageIntro
        eyebrow="Order status"
        title={order.status === "complete" ? "Complete" : "Partly completed"}
      >
        <p>
          Finalized chain facts are recorded once after reconciliation.
        </p>
      </PageIntro>
      <div className="grid">
        {order.legs.map((leg) => (
          <Card key={leg.id}>
            <span className="badge">{leg.status}</span>
            <h3>Leg {leg.position + 1}</h3>
            <p>{leg.companyId ? companyById(leg.companyId)?.name : "Transfer"}</p>
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
        {nextLeg ? (
          <CtaLink id="C70" href={`/orders/${order.id}/review`}>
            Review next purchase
          </CtaLink>
        ) : null}
        <button className="secondary" data-cta="C71" disabled={!nextLeg} onClick={stopRemaining}>
          Stop remaining purchases
        </button>
        {nextLeg ? (
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
  useEffect(() => {
    apiRequest<{ holdings: Holding[]; cashRaw: string }>("portfolio").then((data) => {
      setHoldings(data.holdings);
      setCashRaw(data.cashRaw);
    });
  }, []);

  return (
    <>
      <PageIntro eyebrow="Shelf-origin portfolio" title="Your Shelf investments">
        <p>
          Only finalized acquisitions made through Shelf appear as holdings. Externally received
          assets stay in Wallet.
        </p>
      </PageIntro>
      <Card>
        <p className="eyebrow">Cash</p>
        <h2>{formatRaw(cashRaw)} USDC</h2>
      </Card>
      <section className="section">
        {holdings.length ? (
          <div className="grid">
            {holdings.map((holding) => (
              <Card
                className={
                  companyById(holding.companyId)?.instrument?.provider === "prestocks"
                    ? "private-market-card"
                    : "public-market-card"
                }
                key={holding.instrumentId}
              >
                <span className="badge">
                  {companyById(holding.companyId)?.instrument?.provider === "prestocks"
                    ? "Private · PreStocks"
                    : "Public · xStocks"}
                </span>
                <h2>{holding.symbol}</h2>
                <p>{formatRaw(holding.rawAmount, holding.decimals)} displayed units</p>
                <p className="muted">
                  Acquisition cost: {formatRaw(holding.totalCostUsdcRaw)} USDC
                </p>
                <Link className="button" data-cta="C73" href={`/portfolio/${holding.instrumentId}`}>
                  View holding
                </Link>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No Shelf investments yet"
            action={
              <CtaLink id="C75" href="/discover">
                Discover companies
              </CtaLink>
            }
          >
            Your cash and discovery shelf are still available. You do not need to invest to use
            Shelf.
          </EmptyState>
        )}
      </section>
      <div className="section actions">
        <CtaLink id="C74" href="/portfolio/activity" secondary>
          View history
        </CtaLink>
      </div>
    </>
  );
}

export function HoldingScreen({ instrumentId }: { instrumentId: string }) {
  const [holding, setHolding] = useState<Holding | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    apiRequest<Holding>(`portfolio/${instrumentId}`)
      .then((response) => {
        setHolding(response);
        setError(null);
      })
      .catch((requestError: unknown) => setError(messageFrom(requestError)));
  }, [instrumentId]);
  if (error)
    return (
      <EmptyState title="Holding unavailable">
        Shelf could not load this holding: {error}.
      </EmptyState>
    );
  if (!holding)
    return (
      <EmptyState title="Loading holding">Shelf is retrieving the current tracked position.</EmptyState>
    );
  const relevantActions = corporateActions.filter((action) => action.instrumentId === instrumentId);
  return (
    <>
      <PageIntro eyebrow="Tracked holding" title={holding.symbol}>
        <p>
          Current display uses multiplier {holding.multiplier}; historical records retain their
          original unit snapshots.
        </p>
      </PageIntro>
      <Card>
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
        <div className="actions">
          <CtaLink id="C76" href={`/portfolio/${holding.instrumentId}/sell`}>
            Sell
          </CtaLink>
          <CtaLink
            id="C77"
            href={`/account/wallet/send?asset=${holding.instrumentId}&scope=tracked`}
            secondary
          >
            Send
          </CtaLink>
          <CtaLink
            id="C78"
            href={`/companies/${companyById(holding.companyId)?.slug ?? holding.companyId}`}
            secondary
          >
            View company
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
    </>
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
  useEffect(() => {
    apiRequest<FinancialRecord[]>("history").then(setRecords);
  }, []);

  async function download(format: "csv" | "json") {
    const exportableRecords = await freshApiRequest<FinancialRecord[]>(
      "exports/activity",
      "activity_export",
    );
    exportRecords(exportableRecords, format);
  }
  return (
    <>
      <PageIntro eyebrow="Private records" title="History and exports">
        <p>
          Exact raw amounts, unit context, fees and chain references stay attached to each factual
          record.
        </p>
      </PageIntro>
      <div className="actions">
        <button data-cta="C86" onClick={() => download("csv")}>
          Download CSV
        </button>
        <button className="secondary" data-cta="C87" onClick={() => download("json")}>
          Download JSON
        </button>
      </div>
      <section className="section">
        {records.length ? (
          <div className="table-wrap">
            <table>
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
                {records.map((record) => (
                  <tr key={record.id}>
                    <td>{new Date(record.recordedAt).toLocaleString()}</td>
                    <td>{record.type}</td>
                    <td>{record.status}</td>
                    <td>{record.asset}</td>
                    <td>{record.rawAmount}</td>
                    <td>
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
          <EmptyState title="No activity yet">
            Completed purchases, sells, transfers and corporate actions will appear here.
          </EmptyState>
        )}
      </section>
    </>
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
  useEffect(() => {
    apiRequest<FinancialRecord>(`history/${recordId}`).then(setRecord);
  }, [recordId]);
  if (!record)
    return (
      <EmptyState title="Loading record">
        Shelf is retrieving the immutable activity facts.
      </EmptyState>
    );
  return (
    <>
      <PageIntro eyebrow="Activity record" title={`${record.type} · ${record.status}`} />
      <Card>
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
        <div className="actions">
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
