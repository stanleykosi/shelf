import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, Building2, Check, Package, Tags } from "lucide-react";
import { companyById, productById, products, sources } from "@/data/catalog";
import type { Brand, Company, Product } from "@/domain/types";

export function SectionHeader({
  action,
  eyebrow,
  title,
  children,
}: {
  action?: React.ReactNode;
  eyebrow?: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="section-header">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2>{title}</h2>
        {children ? <div className="section-description">{children}</div> : null}
      </div>
      {action ? <div className="section-action">{action}</div> : null}
    </header>
  );
}

export function EntityTypeBadge({ type }: { type: "Product" | "Brand" | "Company" }) {
  const Icon = type === "Product" ? Package : type === "Brand" ? Tags : Building2;
  return (
    <span className={"entity-type entity-type-" + type.toLowerCase()}>
      <Icon size={13} aria-hidden="true" />
      {type}
    </span>
  );
}

export function EvidenceStatus({ label = "Reviewed relationship" }: { label?: string }) {
  return (
    <span className="evidence-status">
      <Check size={13} aria-hidden="true" />
      {label}
    </span>
  );
}

const reviewedProductImages: Partial<
  Record<Product["slug"], { alt: string; src: string; treatment: "cover" | "contain" }>
> = {
  "pepsi-drink": {
    alt: "Pepsi Wild Cherry cans from PepsiCo's reviewed catalog",
    src: "https://digitalassets.pepsico.com/transform/0a1d7eec-1408-44a3-bb60-213d61f3f728/PEP_Photography_Product_WildCherry_05_PZSWC_RGB?q=75&w=3840",
    treatment: "cover",
  },
  "doritos-snack": {
    alt: "Doritos product identity from PepsiCo's reviewed catalog",
    src: "https://digitalassets.pepsico.com/transform/d38d63a9-f2cb-4626-880f-25e822c776a3/doritos-full-offwhite?q=75&w=3840",
    treatment: "contain",
  },
  "lays-snack": {
    alt: "Lay's product identity from PepsiCo's reviewed catalog",
    src: "https://digitalassets.pepsico.com/transform/WEBP_Original/076c9337-2eb5-4a77-865a-c76b2994ce10/lays-ad-classic-example-confidential-until-20251009?q=75&w=3840",
    treatment: "contain",
  },
  "cheetos-snack": {
    alt: "Cheetos product identity from PepsiCo's reviewed catalog",
    src: "https://digitalassets.pepsico.com/transform/ec574b24-5500-4942-a13a-fa45ba8e43ce/cheetos-full-offwhite?q=75&w=3840",
    treatment: "contain",
  },
  "tide-laundry": {
    alt: "Tide brand identity from Procter & Gamble's reviewed catalog",
    src: "https://images.ctfassets.net/oggad6svuzkv/sR0yOc87zEkW2QUCQQKaa/728711310b005180c35a4b41ef44232e/Tide200x200.jpg?fm=webp",
    treatment: "contain",
  },
  "olay-skincare": {
    alt: "Olay brand identity from Procter & Gamble's reviewed catalog",
    src: "https://images.ctfassets.net/oggad6svuzkv/3PNis6ONrOsoaCYuQ2WC2Y/d5b47a1c379da36e5d46e85d11129ab5/Olay.png?fm=webp",
    treatment: "contain",
  },
  "apple-iphone": {
    alt: "iPhone photographed on Apple's reviewed iPhone page",
    src: "https://www.apple.com/v/iphone/home/ck/images/overview/consider_modals/chip-battery/modal_power__eei2l6rul8qe_large.jpg",
    treatment: "cover",
  },
};

export function ProductArtwork({ product, featured = false }: { product: Product; featured?: boolean }) {
  const reviewedImage = reviewedProductImages[product.slug];
  return (
    <div
      className={
        "product-visual product-visual-" +
        product.category +
        (reviewedImage ? " has-reviewed-image" : " has-placeholder")
      }
    >
      {reviewedImage ? (
        <Image
          alt={reviewedImage.alt}
          className={"reviewed-product-image image-" + reviewedImage.treatment}
          fill
          sizes={featured ? "(max-width: 819px) 76vw, 260px" : "76px"}
          src={reviewedImage.src}
        />
      ) : (
        <>
          <span className="product-placeholder-mark" aria-hidden="true">
            {product.brand.slice(0, 2).toUpperCase()}
          </span>
          <span className="product-visual-brand">{product.brand}</span>
          <span className="product-visual-name">{product.name}</span>
          <span className="product-visual-note">Image not yet reviewed</span>
        </>
      )}
      {reviewedImage && featured ? (
        <span className="product-image-caption">Reviewed catalog image</span>
      ) : null}
    </div>
  );
}

export function RelationshipTrail({ product, company }: { product: Product; company: Company }) {
  const brandInitials = product.brand.slice(0, 2).toUpperCase();
  const companyInitials = company.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <div className="relationship-story" aria-label="Product to Brand to Company example">
      <div className="relationship-node product-node">
        <span className="relationship-step"><Package size={14} aria-hidden="true" /> 01 · Product</span>
        <ProductArtwork featured product={product} />
        <strong>{product.name}</strong>
        <span>What you recognize</span>
      </div>
      <ArrowRight className="relationship-arrow" aria-hidden="true" />
      <div className="relationship-node brand-node">
        <span className="relationship-step"><Tags size={14} aria-hidden="true" /> 02 · Brand</span>
        <span className="relationship-identity relationship-brand-mark" aria-hidden="true">{brandInitials}</span>
        <strong>{product.brand}</strong>
        <span>The identity on the package</span>
      </div>
      <ArrowRight className="relationship-arrow" aria-hidden="true" />
      <div className="relationship-node company-node">
        <span className="relationship-step"><Building2 size={14} aria-hidden="true" /> 03 · Company</span>
        <span className="relationship-identity relationship-company-mark" aria-hidden="true">{companyInitials}</span>
        <strong>{company.name}</strong>
        <span>The company linked by evidence</span>
      </div>
      <div className="relationship-proof">
        <EvidenceStatus label="Relationship reviewed" />
        <span>Source, date, and regional context stay attached to this trail.</span>
      </div>
    </div>
  );
}

export function ProductPreview({
  product,
  featured = false,
}: {
  product: Product;
  featured?: boolean;
}) {
  const company = companyById(product.companyId);
  return (
    <Link
      className={"entity-preview product-preview" + (featured ? " featured" : "")}
      href={("/products/" + product.slug) as Route}
    >
      <ProductArtwork featured={featured} product={product} />
      <span className="entity-preview-body">
        <span className="entity-preview-topline">
          <Package size={14} aria-hidden="true" />
          <span className="entity-meta">{product.category}</span>
        </span>
        <strong className="entity-name">{product.name}</strong>
        <span className="entity-context">
          {product.brand} <span aria-hidden="true">→</span> {company?.name ?? "Company under review"}
        </span>
        <span className="entity-preview-footer">
          <span className="relationship-meta">Reviewed trail</span>
          <span className="preview-link">
            Explore <ArrowRight size={15} aria-hidden="true" />
          </span>
        </span>
      </span>
    </Link>
  );
}

export function BrandPreview({ brand }: { brand: Brand }) {
  const sampleProducts = brand.productIds
    .slice(0, 3)
    .map((id) => productById(id))
    .filter((product) => product !== undefined);
  const relatedCompanies = brand.companyRelationships
    .map((relationship) => companyById(relationship.companyId)?.name)
    .filter(Boolean);

  return (
    <Link className="entity-preview brand-preview" href={("/brands/" + brand.slug) as Route}>
      <span className="brand-monogram" aria-hidden="true">
        {brand.name.slice(0, 2).toUpperCase()}
      </span>
      <span className="entity-preview-body">
        <span className="entity-preview-topline">
          <Tags size={14} aria-hidden="true" />
          <span className="entity-meta">Brand · {brand.productIds.length} products</span>
        </span>
        <strong className="entity-name">{brand.name}</strong>
        <span className="entity-context">Connected to {relatedCompanies.join(", ")}</span>
        <span className="brand-product-examples">
          {sampleProducts.map((product) => product.name).join(" · ")}
        </span>
        <span className="entity-preview-footer">
          <span className="relationship-meta">Relationships reviewed</span>
          <span className="preview-link">
            Explore <ArrowRight size={15} aria-hidden="true" />
          </span>
        </span>
      </span>
    </Link>
  );
}

export function CompanyPreview({ company }: { company: Company }) {
  const relatedProducts = products.filter((product) => product.companyId === company.id);
  const relatedBrands = Array.from(new Set(relatedProducts.map((product) => product.brand)));
  const source = sources.find((candidate) =>
    relatedProducts.some((product) => product.sourceIds.includes(candidate.id)),
  );
  const classification = company.instrument
    ? company.instrument.assetClass === "pre_ipo_exposure"
      ? "Private company"
      : "Public company"
    : "Company research";
  const availability = company.instrument ? "Exposure available" : "Research only";

  return (
    <Link className="entity-preview company-preview" href={("/companies/" + company.slug) as Route}>
      <span className="company-mark" aria-hidden="true">
        {company.name
          .split(/\s+/)
          .slice(0, 2)
          .map((part) => part[0])
          .join("")}
      </span>
      <span className="entity-preview-body">
        <span className="entity-preview-topline">
          <Building2 size={14} aria-hidden="true" />
          <span className="entity-meta">{classification} · {availability}</span>
        </span>
        <strong className="entity-name">{company.name}</strong>
        <span className="entity-context">
          {relatedBrands.length
            ? "Known here through " + relatedBrands.slice(0, 4).join(", ")
            : company.description}
        </span>
        <span className="entity-preview-footer">
          <span className="relationship-meta">
            {source ? "Reviewed " + source.verifiedAt : "Issuer registry reviewed"}
          </span>
          <span className="preview-link">
            Research <ArrowRight size={15} aria-hidden="true" />
          </span>
        </span>
      </span>
    </Link>
  );
}
