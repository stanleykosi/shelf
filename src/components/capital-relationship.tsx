import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { brands, companyById, sources } from "@/data/catalog";
import type { Product } from "@/domain/types";
import { ProductArtwork } from "@/components/discovery-patterns";

// The accepted Home explorer, shared without a second visual interpretation.
export function CapitalRelationship({ product, discloseEvidence = false }: { product: Product; discloseEvidence?: boolean }) {
  const company = companyById(product.companyId);
  const brand = brands.find((item) => item.productIds.includes(product.id));
  const source = sources.find((item) => product.sourceIds.includes(item.id));
  if (!company || !brand || !source) return <p>No reviewed company relationship is available for this Product.</p>;
  const relationship = product.relationship.replaceAll("_", " ");
  const evidence = <div className="c2-evidence-ledger"><div><span>Relationship</span><strong>{relationship[0].toUpperCase() + relationship.slice(1)}</strong></div><div><span>Source</span><a href={source.url} target="_blank" rel="noreferrer">{source.publisher} <ArrowUpRight size={12} aria-hidden="true" /></a></div><div><span>Reviewed</span><strong>{source.verifiedAt}</strong></div><div><span>Scope</span><strong>Family-level · region may vary</strong></div></div>;
  return <>
    <p className="sr-only">{product.name} is a {brand.name} Product. Its reviewed {relationship} relationship is with {company.name}. Region: {product.region}.</p>
    <div className="c2-entity-trail">
      <Link href={("/products/" + product.slug) as Route}><ProductArtwork product={product} sizes="(max-width: 819px) 110px, 200px" /><small>Product</small><strong>{product.name}</strong></Link>
      <span className="c2-connector" aria-hidden="true"><ArrowRight size={17} /></span>
      <Link className="c2-trail-identity" href={("/brands/" + brand.slug) as Route}><span className="c2-type-symbol">{product.brand.slice(0, 1)}</span><small>Brand</small><strong>{product.brand}</strong></Link>
      <span className="c2-connector" aria-hidden="true"><ArrowRight size={17} /></span>
      <Link className="c2-trail-identity c2-trail-company" href={("/companies/" + company.slug) as Route}><span className="c2-type-symbol">{company.ticker || company.name.slice(0, 2)}</span><small>Company</small><strong>{company.name}</strong></Link>
    </div>
    {discloseEvidence ? <details className="scan-evidence"><summary>Source and review context</summary>{evidence}<p>Region: {product.region}. The catalog documents product families, not every local SKU or licensed variant.</p></details> : evidence}
  </>;
}
