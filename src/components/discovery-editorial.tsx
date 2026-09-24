import Link from "next/link";
import { ArrowDown, ArrowUpRight, Layers3, ScanLine, ShieldCheck } from "lucide-react";
import type { IssuerSpotlight } from "@/domain/issuer-spotlight";

/** Editorial illustrations describe a theme; they never represent market data. */
function ThemeArtwork({ kind }: { kind: "technology" | "everyday" | "private" }) {
  if (kind === "technology") {
    return <svg viewBox="0 0 300 200" fill="none" aria-hidden="true" className="discovery-theme-art">
      <g transform="translate(150 102) scale(1 .55) rotate(-45)">
        {[146, 116, 86].map((size) => <rect key={size} x={-size / 2} y={-size / 2} width={size} height={size} rx="6" stroke="currentColor" opacity=".22" />)}
        {[-48, -24, 0, 24, 48].map((offset) => <g key={offset} stroke="currentColor" opacity=".5"><path d={`M${offset} -57v-46m0 160v46M-57 ${offset}h-46m160 0h46`} /><circle cx={offset} cy="-107" r="3" /><circle cx="107" cy={offset} r="3" /></g>)}
        <rect x="-52" y="-52" width="104" height="104" rx="5" fill="#243c33" stroke="#7ca992" />
        <rect x="-41" y="-41" width="82" height="82" rx="3" fill="#b6efd2" />
        {[-22, -7, 8, 23].map((offset) => <path key={offset} d={`M-29 ${offset}H29M${offset} -29V29`} stroke="#4e8468" opacity=".6" />)}
      </g>
      <path d="M102 140v12l48 27 48-27v-12M150 152v27" stroke="currentColor" opacity=".4" />
    </svg>;
  }
  if (kind === "everyday") {
    return <svg viewBox="0 0 300 200" fill="none" aria-hidden="true" className="discovery-theme-art">
      <ellipse cx="165" cy="169" rx="92" ry="9" fill="#bd9f72" opacity=".14" />
      <g transform="rotate(-12 122 100)">
        <path d="M89 52h65l-5 105c-1 13-54 13-55 0z" fill="#e4d0a6" stroke="#b1976c" />
        <ellipse cx="121.5" cy="52" rx="32.5" ry="9" fill="#f0e6cf" stroke="#b1976c" />
        <ellipse cx="121.5" cy="53" rx="15" ry="4" stroke="#b1976c" />
        <path d="M95 94h54v43H95" fill="#516b4d" />
        <path d="M106 105h32m-32 8h22m-22 8h28" stroke="#e2e7ca" strokeWidth="2" />
      </g>
      <g transform="rotate(12 203 104)">
        <path d="M180 56h44v17l10 13v70q0 12-15 12h-35q-15 0-15-12V86l11-13z" fill="#f1e9d7" stroke="#b1976c" />
        <rect x="180" y="44" width="44" height="16" rx="3" fill="#6b7753" />
        <path d="M170 104h64v39h-64" fill="#c19660" />
        <circle cx="202" cy="123" r="12" stroke="#f1e9d7" />
        <path d="m198 123 3 3 6-7" stroke="#f1e9d7" />
      </g>
    </svg>;
  }
  return <svg viewBox="0 0 300 200" fill="none" aria-hidden="true" className="discovery-theme-art">
    {[26, 13, 0].map((offset) => <g key={offset} transform={`translate(0 ${offset})`}>
      <path d="m76 89 91-51 78 43v7l-91 51-78-44z" fill="#9da7cb" stroke="#828eaf" />
      <path d="m76 89 91-51 78 43-91 51z" fill={offset === 0 ? "#e5e8f6" : "#bdc6e0"} stroke="#828eaf" />
    </g>)}
    <path d="m115 82 49-27 29 16-49 28z" fill="#7d8eb5" />
    <path d="m158 105 50-28m-39 34 50-28" stroke="#8b98bb" strokeWidth="2" />
    <path d="m153 70 5 8 11-12" stroke="#e5e8f6" strokeWidth="2" />
  </svg>;
}

export function DiscoveryThemes({ spotlight, onSelect }: {
  spotlight: IssuerSpotlight | null;
  onSelect: (sector: string, market: string) => void;
}) {
  const themes = [
    { kind: "technology" as const, label: "Technology", title: "Behind the digital world.", description: "Explore the companies building what’s next.", sector: "Technology", market: "" },
    { kind: "everyday" as const, label: "Food & drink", title: "Part of your every day.", description: "Familiar products. A bigger company story.", sector: "Food & drink", market: "" },
    { kind: "private" as const, label: "Private companies", title: "Before the public market.", description: "Get to know the PreStocks universe.", sector: "", market: "private" },
  ];
  return <section className="discovery-themes" aria-label="Explore company themes">
    {themes.map((theme, index) => {
      const count = spotlight?.listings.filter((listing) => theme.market === "private" ? listing.provider === "prestocks" : listing.sector === theme.sector).length;
      return <button key={theme.kind} className={`discovery-theme discovery-theme-${theme.kind}`} onClick={() => onSelect(theme.sector, theme.market)} type="button">
        <span className="discovery-theme-label"><span>{String(index + 1).padStart(2, "0")}</span>{theme.label}</span>
        <ThemeArtwork kind={theme.kind} />
        <span className="discovery-theme-copy"><strong>{theme.title}</strong><span>{theme.description}</span></span>
        <span className="discovery-theme-footer"><span>{count === undefined ? "Explore theme" : `${count} ${count === 1 ? "company" : "companies"} in the spotlight`}</span><ArrowUpRight size={17} /></span>
      </button>;
    })}
  </section>;
}

export function DiscoveryScanLink() {
  return <Link className="discovery-scan-link" href="/scan" data-cta="C01">
    <span className="discovery-scan-icon"><ScanLine size={24} strokeWidth={1.4} /></span>
    <span><strong>Start with what’s around you.</strong><span>Scan a product. Find its company.</span></span>
    <ArrowUpRight size={19} />
  </Link>;
}

export function DiscoveryFootnote() {
  return <footer className="discovery-footnote">
    <span><ShieldCheck size={16} aria-hidden="true" />Issuer-sourced assets. Independently explored.</span>
    <Link href="/learn/stock-tokens">Understand what you’re exploring <ArrowUpRight size={15} aria-hidden="true" /></Link>
  </footer>;
}

export function ScanIllustration() {
  return <div className="scan-object" aria-hidden="true">
    <svg viewBox="0 0 280 176" fill="none">
      <path d="M50 46V22h24m132 0h24v24M50 128v24h24m132 0h24v-24" stroke="#8eac9c" strokeWidth="1.5" />
      <g transform="rotate(-13 140 85)">
        <path d="M110 30h60l-3 111c0 14-54 14-54 0z" fill="#284b3d" stroke="#8dbfa6" />
        <ellipse cx="140" cy="30" rx="30" ry="8" fill="#a9d6bd" stroke="#b6efd2" />
        <ellipse cx="140" cy="31" rx="12" ry="3" stroke="#416b55" />
        <path d="M112 62h57v56h-57" fill="#b6efd2" />
        <path d="M127 76h26m-26 7h26m-26 7h17" stroke="#284b3d" strokeWidth="3" />
        <circle cx="147" cy="104" r="6" stroke="#284b3d" />
      </g>
      <path d="M37 87h62m80 0h64" stroke="#b6efd2" strokeDasharray="3 5" opacity=".35" />
      <circle cx="230" cy="22" r="3" fill="#b6efd2" />
    </svg>
  </div>;
}

export function ScanExplainer() {
  return <section className="scan-explainer" aria-label="How identification works">
    <span className="studio-eyebrow">A small discovery. A bigger picture.</span>
    <div><ScanLine size={18} /><span><strong>Start with a product</strong><span>A label, a photo, or a name.</span></span></div>
    <ArrowDown size={14} className="scan-explainer-connector" aria-hidden="true" />
    <div><Layers3 size={18} /><span><strong>Meet the company</strong><span>Review the suggested connection.</span></span></div>
    <p>You’re here to explore. What happens next is always your choice.</p>
  </section>;
}
