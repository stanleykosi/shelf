import { createHash } from "node:crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  companies as catalogCompanies,
  articles as catalogArticles,
  corporateActions as catalogCorporateActions,
  products as catalogProducts,
  sources as catalogSources,
} from "../src/data/catalog";
import {
  brands,
  companies,
  corporateActions as corporateActionRows,
  instruments,
  learningArticles,
  products,
  relationships,
  sources,
} from "../src/db/schema";

const databaseUrl = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Set MIGRATION_DATABASE_URL or DATABASE_URL before seeding.");
}

const client = postgres(databaseUrl, { max: 1 });
const database = drizzle(client);
const companyIds = new Map<string, string>();
const brandIds = new Map<string, string>();
const sourceIds = new Map<string, string>();

function stableUuid(scope: string): string {
  const digest = createHash("sha256").update(`shelf-seed:${scope}`).digest("hex");
  return `${digest.slice(0, 8)}-${digest.slice(8, 12)}-4${digest.slice(13, 16)}-a${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
}

for (const company of catalogCompanies) {
  const id = stableUuid(company.id);
  companyIds.set(company.id, id);
  await database
    .insert(companies)
    .values({
      id,
      slug: company.slug,
      legalName: company.name,
      shortName: company.name,
      listingTicker: company.ticker,
      exchange: company.exchange,
      description: company.description,
      status: "reviewed_seed",
      reviewedAt: new Date("2026-09-20T00:00:00Z"),
    })
    .onConflictDoNothing();

  if (company.instrument) {
    await database
      .insert(instruments)
      .values({
        id: stableUuid(company.instrument.id),
        companyId: id,
        issuerName: company.instrument.issuer,
        symbol: company.instrument.symbol,
        underlyingIdentifier: `${company.exchange}:${company.ticker}`,
        mint: company.instrument.mint,
        tokenProgram: company.instrument.tokenProgram,
        network: "mainnet-beta",
        decimals: company.instrument.decimals,
        extensionAllowlist: ["scaled-ui-amount"],
        eligibilityPolicyId: "bootstrap-deny-all-v1",
        buyEnabled: false,
        sellEnabled: false,
        transferEnabled: false,
        reviewState: "reference_only_gates_open",
        verifiedAt: new Date("2026-09-20T00:00:00Z"),
      })
      .onConflictDoUpdate({
        target: instruments.id,
        set: {
          mint: company.instrument.mint,
          tokenProgram: company.instrument.tokenProgram,
          decimals: company.instrument.decimals,
          verifiedAt: new Date("2026-09-21T00:00:00Z"),
        },
      });
  }
}

for (const source of catalogSources) {
  const id = stableUuid(source.id);
  sourceIds.set(source.id, id);
  await database
    .insert(sources)
    .values({
      id,
      canonicalUrl: source.url,
      publisher: source.publisher,
      title: source.title,
      type: "corporate",
      readAt: new Date(`${source.verifiedAt}T00:00:00Z`),
      shortClaimSummary: "Reviewed family-level relationship source.",
      status: "reviewed",
    })
    .onConflictDoNothing();
}

for (const product of catalogProducts) {
  let brandId = brandIds.get(product.brand);
  if (!brandId) {
    brandId = stableUuid(`brand:${product.brand}`);
    brandIds.set(product.brand, brandId);
    await database
      .insert(brands)
      .values({
        id: brandId,
        slug: product.brand.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-"),
        name: product.brand,
        normalizedName: product.brand.toLowerCase(),
        aliases: [],
        category: product.category,
      })
      .onConflictDoNothing();

    await database
      .insert(relationships)
      .values({
        id: stableUuid(`relationship:${product.brand}:${product.companyId}`),
        brandId,
        companyId: companyIds.get(product.companyId)!,
        type: product.relationship,
        regionScope: [product.region],
        validFrom: new Date("2026-09-20T00:00:00Z"),
        status: "verified",
        sourceIds: product.sourceIds.map((id) => sourceIds.get(id)!),
        verifiedAt: new Date("2026-09-20T00:00:00Z"),
      })
      .onConflictDoNothing();
  }

  await database
    .insert(products)
    .values({
      id: stableUuid(product.id),
      slug: product.slug,
      brandId,
      name: product.name,
      productFamily: product.name,
      category: product.category,
      regionScope: ["review-required"],
      status: "reviewed_seed",
    })
    .onConflictDoNothing();
}

for (const article of catalogArticles) {
  await database
    .insert(learningArticles)
    .values({
      id: stableUuid(`article:${article.slug}:${article.version}`),
      slug: article.slug,
      title: article.title,
      approvedBody: article.body.join("\n\n"),
      sourceIds: [],
      version: article.version,
      reviewedAt: new Date(`${article.reviewedAt}T00:00:00Z`),
      status: "approved_seed",
    })
    .onConflictDoNothing();
}

for (const action of catalogCorporateActions) {
  await database
    .insert(corporateActionRows)
    .values({
      id: stableUuid(action.id),
      instrumentId: stableUuid(action.instrumentId),
      externalId: action.id,
      type: action.type,
      effectiveAt: new Date(action.effectiveAt),
      status: action.status,
      oldMultiplier: action.oldMultiplier,
      newMultiplier: action.newMultiplier,
      sourceId: sourceIds.get(action.sourceId)!,
      descriptionVersion: "fixture-v1",
      lastCheckedAt: new Date("2026-09-20T00:00:00Z"),
    })
    .onConflictDoNothing();
}

await client.end();
console.log(
  `Seeded ${companyIds.size} companies, ${brandIds.size} brands, ${catalogProducts.length} product families, and ${catalogArticles.length} learning articles.`,
);
