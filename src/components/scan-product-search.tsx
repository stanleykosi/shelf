"use client";

import { useState } from "react";
import { ArrowRight } from "@/components/studio-icons";
import { products } from "@/data/catalog";
import type { Product } from "@/domain/types";
import { ProductArtwork, SearchCommand } from "@/components/discovery-patterns";

export function ScanProductSearch({ onSelect }: { onSelect: (product: Product) => void }) {
  const [query, setQuery] = useState("");
  const matches = products.filter((product) => `${product.name} ${product.brand}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <div className="scan-product-search">
    <SearchCommand value={query} onChange={setQuery} onClear={() => setQuery("")} onSubmit={() => undefined} />
    <p className="scan-meta" role="status">{matches.length} reviewed Products · select one to check the match</p>
    <div className="scan-search-list">{matches.map((product) => <button type="button" key={product.id} onClick={() => onSelect(product)}>
      <ProductArtwork product={product} sizes="64px" />
      <span><strong>{product.name}</strong><small>{product.brand} · Product</small></span>
      <ArrowRight size={18} aria-hidden="true" />
    </button>)}</div>
    {!matches.length ? <p>No reviewed Product found. Try its brand name or another spelling.</p> : null}
  </div>;
}
