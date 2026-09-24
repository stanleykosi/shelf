"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowRight, Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import { brands, companyById, productById, sources } from "@/data/catalog";
import { ProductArtwork } from "@/components/discovery-patterns";
import { CapitalRelationship } from "@/components/capital-relationship";
import { ScanProductSearch } from "@/components/scan-product-search";
import { changeScanCandidate, readScanSession, serverScanSession, subscribeScanSession } from "@/lib/scan-session";

const subscribeHydration = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

export function ScanResultsScreen() {
  const session = useSyncExternalStore(subscribeScanSession, readScanSession, serverScanSession);
  const ready = useSyncExternalStore(subscribeHydration, clientReady, serverReady);
  const [index, setIndex] = useState(0);
  const [notice, setNotice] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const changeRef = useRef<HTMLButtonElement>(null);
  const candidateHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    try { sessionStorage.removeItem("shelf:scan-results"); } catch { /* No storage required for results. */ }
  }, []);

  if (!ready) return <div className="scan-page"><h1>Scan results</h1><p role="status">Loading this scan…</p></div>;
  if (!session) return <div className="scan-page"><header className="scan-page-heading"><p className="scan-context">Scan results</p><h1>These scan results are no longer available.</h1><p>Results stay in this page session only. Start again or search the reviewed catalog.</p></header><div className="scan-actions"><Link className="scan-primary" href="/scan">Scan again <ArrowRight size={18} /></Link><Link className="scan-secondary" href="/scan?method=search">Search instead</Link></div></div>;
  const candidates = session.candidates;
  const active = candidates[Math.min(index, candidates.length - 1)];
  const product = active?.productId ? productById(active.productId) : undefined;
  const company = product ? companyById(product.companyId) : undefined;
  const reviewed = product && company && brands.some((brand) => brand.productIds.includes(product.id)) && sources.some((source) => product.sourceIds.includes(source.id));
  const confirmed = candidates.filter((candidate) => candidate.decision === "confirmed" && candidate.productId);
  const allRemoved = candidates.length > 0 && candidates.every((candidate) => candidate.decision === "excluded");
  const pending = candidates.filter((candidate) => candidate.decision === "proposed").length;
  const researchCompanies = [...new Set(confirmed.flatMap((candidate) => {
    const item = candidate.productId ? productById(candidate.productId) : undefined;
    return item && item.sourceIds.some((id) => sources.some((source) => source.id === id)) ? [item.companyId] : [];
  }))].flatMap((id) => { const item = companyById(id); return item ? [item] : []; });

  function move(next: number) { setIndex(next); setNotice(""); candidateHeading.current?.focus(); }
  function closeCorrection() { dialogRef.current?.close(); changeRef.current?.focus(); }
  function saveConfirmed() {
    try {
      const raw: unknown = JSON.parse(sessionStorage.getItem("shelf:guest-items") ?? "[]");
      const existing = Array.isArray(raw) ? raw.filter((id): id is string => typeof id === "string" && Boolean(productById(id))) : [];
      const ids = confirmed.flatMap((candidate) => candidate.productId ? [candidate.productId] : []);
      const combined = [...new Set([...existing, ...ids])];
      if (combined.length > 100) { setNotice("Your temporary Saved list is full. Remove some saved Products before adding more."); return; }
      sessionStorage.setItem("shelf:guest-items", JSON.stringify(combined));
      setNotice("Confirmed Products saved on this device for this session. Sign in and merge to keep them.");
    } catch { setNotice("Temporary saving is unavailable in this browser. You can still open the research."); }
  }

  return <div className="scan-page scan-results">
    <header className="scan-page-heading"><p className="scan-context">Scan / Verification</p><h1>Scan results</h1><p>{candidates.length ? `${candidates.length} possible ${candidates.length === 1 ? "Product" : "Products"} · ${confirmed.length} confirmed` : "No reviewed match found"}</p></header>
    {!active ? <section className="scan-empty"><h2>No reviewed match found</h2><p>A clearer view or a Product name can help. Shelf won’t guess a Company relationship.</p><div className="scan-actions"><Link className="scan-primary" href="/scan?method=search">Search manually</Link><Link className="scan-secondary" href="/scan">Try another image</Link></div></section> : <>
      {allRemoved ? <section className="scan-empty"><h2>All results excluded</h2><p>No Products are selected in this scan. Earlier saves are unchanged. Restore a candidate below, search manually, or try another image.</p><div className="scan-actions"><Link className="scan-primary" href="/scan?method=search">Search manually</Link><Link className="scan-secondary" href="/scan">Scan again</Link></div></section> : null}
      <div className="scan-results-grid">
        <nav className="scan-candidate-nav" aria-label="Product candidates"><h2>Check each Product</h2>{candidates.map((candidate, position) => <button key={candidate.id} aria-current={index === position ? "true" : undefined} onClick={() => move(position)}><span>{String(position + 1).padStart(2, "0")}</span><span><strong>{candidate.label}</strong><small>{candidate.decision === "confirmed" ? "Product confirmed" : candidate.decision === "excluded" ? "Excluded" : "Needs confirmation"}</small></span>{candidate.decision === "confirmed" ? <Check size={17} aria-hidden="true" /> : <ChevronRight size={17} aria-hidden="true" />}</button>)}</nav>
        <section className="scan-candidate-workspace" aria-labelledby="candidate-title">
          <div className="scan-candidate-pagination"><span>Product {index + 1} of {candidates.length}</span><div><button className="scan-secondary" aria-label="Previous candidate" disabled={index === 0} onClick={() => move(index - 1)}><ChevronLeft size={18} /></button><button className="scan-secondary" aria-label="Next candidate" disabled={index >= candidates.length - 1} onClick={() => move(index + 1)}><ChevronRight size={18} /></button></div></div>
          <div className="scan-candidate-identity">
            {product ? <ProductArtwork product={product} sizes="(max-width: 819px) 130px, 220px" /> : <div className="scan-unlisted-image">No reviewed<br />Product image</div>}
            <div><p className="scan-decision">{active.decision === "confirmed" ? <><Check size={16} aria-hidden="true" />Confirmed Product</> : active.decision === "excluded" ? "Excluded from this scan" : product ? "Possible match" : active.alternatives.length > 1 ? "Needs Product selection" : "Not in the reviewed catalog"}</p><h2 id="candidate-title" ref={candidateHeading} tabIndex={-1}>{product?.name ?? active.label}</h2>{product ? <p className="scan-brand">{product.brand} · Product</p> : null}<p>{active.decision === "confirmed" ? "You confirmed the Product identity. The catalog relationship is a separate fact." : active.decision === "excluded" ? "This candidate will not be saved or included in your research selection." : product ? "Does this match what you saw? Check the name and packaging before confirming." : "Choose a reviewed Product if you recognize it. Otherwise, exclude this candidate; no Company is inferred."}</p></div>
          </div>
          <div className="scan-actions scan-decision-actions">
            {active.decision === "excluded" ? <button className="scan-secondary" onClick={() => changeScanCandidate(active.id, { decision: "proposed" })}>Restore candidate</button> : <>
              {active.decision === "proposed" && product ? <button className="scan-primary" data-cta="C13" onClick={() => { changeScanCandidate(active.id, { decision: "confirmed" }); setNotice(`${product.name}: Product identity confirmed.`); }}>Confirm Product <Check size={17} aria-hidden="true" /></button> : null}
              <button className="scan-secondary" ref={changeRef} data-cta="C14" onClick={() => dialogRef.current?.showModal()}>Change match</button>
              <button className="scan-text-action" data-cta="C15" onClick={() => { changeScanCandidate(active.id, { decision: "excluded" }); setNotice(`${active.label} excluded. Other candidates are unchanged.`); }}>Exclude</button>
            </>}
          </div>
          {active.decision === "proposed" && !product && active.alternatives.length > 1 ? <section className="scan-alternatives"><h3>More than one Product fits</h3><p>The brand alone does not identify a Product. Choose the one you saw; nothing is selected automatically.</p><div className="scan-actions">{active.alternatives.map((id) => { const alternative = productById(id); return alternative ? <button className="scan-secondary" key={id} onClick={() => { changeScanCandidate(active.id, { productId: id, decision: "proposed" }); setNotice("Product selected. Check the identity before confirming."); }}>{alternative.name}</button> : null; })}</div></section> : null}
          {active.decision === "confirmed" && product ? reviewed ? <section className="scan-resolved-relationship"><div className="scan-section-heading"><h3>Relationship explorer</h3><span className="scan-meta"><Check size={14} aria-hidden="true" /> Reviewed catalog</span></div><CapitalRelationship product={product} discloseEvidence /><div className="scan-actions scan-research-actions"><Link className="scan-primary" data-cta="C16" href={("/companies/" + company.slug) as Route}>View research <ArrowRight size={18} aria-hidden="true" /></Link></div></section> : <p className="scan-alert">Product confirmed, but Shelf cannot establish a reviewed Company relationship. You can change the match or continue searching.</p> : null}
          <p className="scan-status" role="status">{notice}</p>
        </section>
      </div>
      <footer className="scan-results-completion"><div><h2>{pending ? `${pending} ${pending === 1 ? "Product needs" : "Products need"} your review` : confirmed.length ? "Your research is ready" : "No Products selected"}</h2><p>Confirm the Products you want to explore. Exclude the rest. Saving is research, not an investment.</p>{!pending && researchCompanies.length ? <div className="scan-actions scan-research-actions">{researchCompanies.map((item) => <Link key={item.id} className="scan-primary" href={("/companies/" + item.slug) as Route}>Explore {item.name}<ArrowRight size={16} aria-hidden="true" /></Link>)}</div> : null}</div><div className="scan-actions"><button className="scan-secondary" data-cta="C17" disabled={!confirmed.length} onClick={saveConfirmed}>Save confirmed Products</button><Link className="scan-text-action" href="/saved">View Saved <ArrowRight size={16} /></Link></div></footer>
      <dialog ref={dialogRef} className="scan-correction" aria-labelledby="correction-title" onCancel={() => changeRef.current?.focus()} onClose={() => changeRef.current?.focus()}>
        <header><div><p className="scan-context">Correct Product {index + 1} of {candidates.length}</p><h2 id="correction-title">Change match</h2></div><button className="scan-secondary" aria-label="Close replacement search" autoFocus onClick={closeCorrection}><X size={20} /></button></header>
        <p>Choose a replacement, then confirm it. Your other candidates stay unchanged.</p>
        <ScanProductSearch onSelect={(replacement) => { changeScanCandidate(active.id, { productId: replacement.id, decision: "proposed" }); setNotice(`Replacement selected: ${replacement.name}. Confirm the Product to see its reviewed relationship.`); closeCorrection(); }} />
      </dialog>
    </>}
  </div>;
}
