"use client";

import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { useState } from "react";
import { ArrowRight, Check, Search } from "lucide-react";
import { companyById, products, sources } from "@/data/catalog";
import type { Company, Product } from "@/domain/types";
import { useReviewedIssuerLinks } from "@/components/use-reviewed-issuer-links";

const reviewedProductImages: Partial<
  Record<Product["slug"], { alt: string; src: string; fit: "cover" | "contain" }>
> = {
  "pepsi-drink": {
    alt: "Pepsi Wild Cherry cans",
    src: "https://digitalassets.pepsico.com/transform/0a1d7eec-1408-44a3-bb60-213d61f3f728/PEP_Photography_Product_WildCherry_05_PZSWC_RGB?q=75&w=3840",
    fit: "cover",
  },
  "doritos-snack": {
    alt: "Doritos product identity",
    src: "https://digitalassets.pepsico.com/transform/d38d63a9-f2cb-4626-880f-25e822c776a3/doritos-full-offwhite?q=75&w=3840",
    fit: "contain",
  },
  "lays-snack": {
    alt: "Lay's product identity",
    src: "https://digitalassets.pepsico.com/transform/WEBP_Original/076c9337-2eb5-4a77-865a-c76b2994ce10/lays-ad-classic-example-confidential-until-20251009?q=75&w=3840",
    fit: "contain",
  },
  "cheetos-snack": {
    alt: "Cheetos product identity",
    src: "https://digitalassets.pepsico.com/transform/ec574b24-5500-4942-a13a-fa45ba8e43ce/cheetos-full-offwhite?q=75&w=3840",
    fit: "contain",
  },
  "tide-laundry": {
    alt: "Tide brand identity",
    src: "https://images.ctfassets.net/oggad6svuzkv/sR0yOc87zEkW2QUCQQKaa/728711310b005180c35a4b41ef44232e/Tide200x200.jpg?fm=webp",
    fit: "contain",
  },
  "olay-skincare": {
    alt: "Olay brand identity",
    src: "https://images.ctfassets.net/oggad6svuzkv/3PNis6ONrOsoaCYuQ2WC2Y/d5b47a1c379da36e5d46e85d11129ab5/Olay.png?fm=webp",
    fit: "contain",
  },
  "apple-iphone": {
    alt: "Apple iPhone",
    src: "https://www.apple.com/v/iphone/home/ck/images/overview/consider_modals/chip-battery/modal_power__eei2l6rul8qe_large.jpg",
    fit: "cover",
  },
};

function initials(value: string) {
  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function SectionHeader({
  action,
  title,
  description,
}: {
  action?: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <header className="research-section-header">
      <div>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {action ? <div className="research-section-action">{action}</div> : null}
    </header>
  );
}

export function StatusText({ children, verified = false }: { children: React.ReactNode; verified?: boolean }) {
  return (
    <span className={verified ? "status-text is-verified" : "status-text"}>
      {verified ? <Check size={13} aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

export function ProductArtwork({ product, sizes = "240px" }: { product: Product; sizes?: string }) {
  const image = reviewedProductImages[product.slug];
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const source = image?.src.replace("w=3840", "w=1280");
  return (
    <span className={"research-product-image category-" + product.category}>
      {image && source && failedSource !== source ? (
        <Image
          alt={image.alt}
          className={"research-product-photo fit-" + image.fit}
          fill
          sizes={sizes}
          src={source}
          onError={() => setFailedSource(source)}
        />
      ) : (
        <span className="research-product-placeholder">
          <span aria-hidden="true">{initials(product.brand)}</span>
          <small>{image ? "Image unavailable" : "Image pending review"}</small>
        </span>
      )}
    </span>
  );
}

export function ProductTile({ product }: { product: Product }) {
  const company = companyById(product.companyId);
  return (
    <Link className="product-tile" href={("/products/" + product.slug) as Route}>
      <ProductArtwork product={product} sizes="(max-width: 819px) 68vw, 260px" />
      <span className="product-tile-copy">
        <strong>{product.name}</strong>
        <span>{product.brand}</span>
        <small>{company?.name ?? "Company under review"}</small>
      </span>
    </Link>
  );
}

function companyDetails(company: Company) {
  const relatedProducts = products.filter((product) => product.companyId === company.id);
  const knownBrands = Array.from(new Set(relatedProducts.map((product) => product.brand)));
  const source = sources.find((candidate) =>
    relatedProducts.some((product) => product.sourceIds.includes(candidate.id)),
  );
  return { knownBrands, source };
}

export function ResearchTable({ companies: rows }: { companies: Company[] }) {
  const { links, error } = useReviewedIssuerLinks();

  return (
    <div className="research-table-wrap">
      <table className="research-table">
        <thead><tr><th>Company</th><th>Known for</th><th>Market</th><th>Exposure</th><th>Reviewed</th></tr></thead>
        <tbody>
          {rows.map((company) => {
            const details = companyDetails(company);
            const matched = links?.byCompany[company.id] ?? [];
            const feedIncomplete = Boolean(links?.unavailable.length || links?.stale.length);
            return (
              <tr key={company.id}>
                <td data-label="Company">
                  <Link className="company-identity" href={`/discover?q=${encodeURIComponent(company.name)}` as Route}>
                    <span aria-hidden="true">{initials(company.name)}</span><strong>{company.name}</strong>
                  </Link>
                </td>
                <td data-label="Known for">{details.knownBrands.slice(0, 4).join(" · ") || "Company research"}</td>
                <td data-label="Market">{matched.length
                  ? Array.from(new Set(matched.map(({ provider }) => provider === "xstocks" ? "Public" : "Private"))).join(" · ")
                  : "Research"}</td>
                <td data-label="Exposure">{matched.length ? matched.map(({ provider, asset }) => (
                  <Link key={asset.companyId} href={`/assets/${provider}/${encodeURIComponent(asset.symbol)}` as Route}>
                    <StatusText verified={!links?.stale.includes(provider === "xstocks" ? "xStocks" : "PreStocks")}>
                      {asset.symbol} · {provider === "xstocks" ? "xStocks" : "PreStocks"}
                    </StatusText>
                  </Link>
                )) : <StatusText>{error ? "Feed unavailable" : !links ? "Checking live feeds" : feedIncomplete ? "Unconfirmed" : "No current asset"}</StatusText>}</td>
                <td data-label="Reviewed">{details.source?.verifiedAt ?? "Issuer registry"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function RelationshipExplorer({ product, company }: { product: Product; company: Company }) {
  const source = sources.find((candidate) => product.sourceIds.includes(candidate.id));
  const brandSlug = product.brand.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <aside className="relationship-explorer" aria-labelledby="relationship-explorer-title">
      <div className="relationship-explorer-heading">
        <span id="relationship-explorer-title">Relationship explorer</span>
        <StatusText verified>Reviewed</StatusText>
      </div>
      <div className="relationship-chain">
        <Link className="relationship-product" href={("/products/" + product.slug) as Route}>
          <ProductArtwork product={product} sizes="96px" />
          <span><small>Product</small><strong>{product.name}</strong></span>
        </Link>
        <ArrowRight aria-hidden="true" />
        <Link href={("/brands/" + brandSlug) as Route}>
          <span className="relationship-fallback" aria-hidden="true">{initials(product.brand)}</span>
          <span><small>Brand</small><strong>{product.brand}</strong></span>
        </Link>
        <ArrowRight aria-hidden="true" />
        <Link href={("/companies/" + company.slug) as Route}>
          <span className="relationship-fallback company" aria-hidden="true">{initials(company.name)}</span>
          <span><small>Company</small><strong>{company.name}</strong></span>
        </Link>
      </div>
      <dl className="relationship-evidence">
        <div><dt>Relationship</dt><dd>Global parent</dd></div>
        <div><dt>Source</dt><dd>{source?.publisher ?? "Catalog review"}</dd></div>
        <div><dt>Reviewed</dt><dd>{source?.verifiedAt ?? "Pending"}</dd></div>
        <div><dt>Region</dt><dd>Global; SKU may vary</dd></div>
      </dl>
    </aside>
  );
}

export function SearchCommand({
  icon,
  inputRef,
  onChange,
  onClear,
  onSubmit,
  searching = false,
  value,
}: {
  icon?: React.ReactNode;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  onChange: (value: string) => void;
  onClear: () => void;
  onSubmit: () => void;
  searching?: boolean;
  value: string;
}) {
  return (
    <form className="search-command" role="search" onSubmit={(event) => {
      event.preventDefault();
      onSubmit();
    }}>
      {icon ?? <Search size={20} aria-hidden="true" />}
      <label className="sr-only" htmlFor="catalog-search">Search a company or product</label>
      <input id="catalog-search" maxLength={120} onChange={(event) => onChange(event.target.value)} placeholder="Company or product" ref={inputRef} type="search" value={value} />
      {value ? <button onClick={onClear} type="button">Clear</button> : <kbd>⌘ K</kbd>}
      <button className="search-submit" disabled={!value.trim() || searching} type="submit">
        {searching ? "Searching…" : "Search"}
      </button>
    </form>
  );
}
