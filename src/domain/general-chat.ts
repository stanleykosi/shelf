import { articles, companies, products, sources } from "@/data/catalog";

/** Bounded, reviewed facts for the general assistant. Live token facts stay on asset chat. */
export function generalChatFacts() {
  const learningFacts = articles.map((article) => ({
    id: `learn:${article.slug}`,
    title: article.title,
    claim: JSON.stringify({ body: article.body, reviewedAt: article.reviewedAt, url: `/learn/${article.slug}` }),
  }));

  const relationshipFacts = companies.flatMap((company) => {
    const related = products.filter((product) => product.companyId === company.id);
    if (!related.length) return [];
    const sourceIds = new Set(related.flatMap((product) => product.sourceIds));
    return [{
      id: `catalog:${company.slug}`,
      title: `${company.name} · reviewed product relationships`,
      claim: JSON.stringify({
        company: company.name,
        description: company.description,
        products: related.map((product) => ({
          name: product.name,
          brand: product.brand,
          relationship: product.relationship,
          region: product.region,
        })),
        sources: sources.filter((source) => sourceIds.has(source.id)).map((source) => ({
          title: source.title, url: source.url, verifiedAt: source.verifiedAt,
        })),
        note: "Reviewed relationship snapshot. Check an asset detail for current issuer terms or prices.",
      }),
    }];
  });

  return [...learningFacts, ...relationshipFacts];
}
