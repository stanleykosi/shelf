import type { Company, Product, Source } from "@/domain/types";
import { preStocksCompanies } from "@/data/prestocks";

export const sources: Source[] = [
  {
    id: "src-pepsico",
    title: "PepsiCo Brands",
    publisher: "PepsiCo",
    url: "https://www.pepsico.com/brands",
    verifiedAt: "2026-09-20",
  },
  {
    id: "src-pg",
    title: "P&G Brands",
    publisher: "Procter & Gamble",
    url: "https://us.pg.com/brands/",
    verifiedAt: "2026-09-20",
  },
  {
    id: "src-apple",
    title: "iPhone",
    publisher: "Apple",
    url: "https://www.apple.com/iphone/",
    verifiedAt: "2026-09-20",
  },
  {
    id: "src-nike",
    title: "NIKE company portfolio",
    publisher: "NIKE, Inc.",
    url: "https://about.nike.com/en/company",
    verifiedAt: "2026-09-20",
  },
  {
    id: "src-xstocks",
    title: "xStocks legal overview",
    publisher: "xStocks",
    url: "https://docs.xstocks.fi/docs/product-legal-overview",
    verifiedAt: "2026-09-20",
  },
  {
    id: "src-prestocks-api",
    title: "PreStocks product API",
    publisher: "PreStocks",
    url: "https://prestocks.com/api/prestocks",
    verifiedAt: "2026-09-20",
  },
  {
    id: "src-prestocks-disclosures",
    title: "PreStocks products and disclosures",
    publisher: "PreStocks",
    url: "https://prestocks.com/products",
    verifiedAt: "2026-09-20",
  },
];

export const companies: Company[] = [
  {
    id: "company-pepsico",
    slug: "pepsico",
    name: "PepsiCo",
    ticker: "PEP",
    exchange: "Nasdaq",
    description: "A global food and beverage company behind several familiar brands.",
    instrument: {
      id: "instrument-pepx",
      symbol: "PEPx",
      issuer: "Backed Finance",
      provider: "xstocks",
      assetClass: "public_equity_token",
      referenceUrl: "https://api.xstocks.fi/api/v2/public/assets/PEPx",
      mint: "Xsv99frTRUeornyvCfvhnDesQDWuvns1M852Pez91vF",
      tokenProgram: "token-2022",
      decimals: 8,
      capabilities: { buy: true, sell: true, transfer: true },
    },
  },
  {
    id: "company-pg",
    slug: "procter-gamble",
    name: "Procter & Gamble",
    ticker: "PG",
    exchange: "NYSE",
    description: "A consumer-goods company with beauty, grooming and household brands.",
    instrument: {
      id: "instrument-pgx",
      symbol: "PGx",
      issuer: "Backed Finance",
      provider: "xstocks",
      assetClass: "public_equity_token",
      referenceUrl: "https://api.xstocks.fi/api/v2/public/assets/PGx",
      mint: "XsYdjDjNUygZ7yGKfQaB6TxLh2gC6RRjzLtLAGJrhzV",
      tokenProgram: "token-2022",
      decimals: 8,
      capabilities: { buy: true, sell: true, transfer: true },
    },
  },
  {
    id: "company-apple",
    slug: "apple",
    name: "Apple",
    ticker: "AAPL",
    exchange: "Nasdaq",
    description: "A technology company that designs devices, software and services.",
    instrument: {
      id: "instrument-aaplx",
      symbol: "AAPLx",
      issuer: "Backed Finance",
      provider: "xstocks",
      assetClass: "public_equity_token",
      referenceUrl: "https://api.xstocks.fi/api/v2/public/assets/AAPLx",
      mint: "XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp",
      tokenProgram: "token-2022",
      decimals: 8,
      capabilities: { buy: true, sell: true, transfer: true },
    },
  },
  {
    id: "company-nike",
    slug: "nike",
    name: "NIKE, Inc.",
    ticker: "NKE",
    exchange: "NYSE",
    description:
      "A footwear and apparel company whose portfolio includes Nike, Jordan and Converse.",
    instrument: null,
  },
  ...preStocksCompanies,
];

const families: Array<[string, string, string, Product["category"], string, string]> = [
  ["pepsi-drink", "Pepsi beverage", "Pepsi", "groceries", "company-pepsico", "src-pepsico"],
  ["doritos-snack", "Doritos snack", "Doritos", "groceries", "company-pepsico", "src-pepsico"],
  ["lays-snack", "Lay's snack", "Lay's", "groceries", "company-pepsico", "src-pepsico"],
  ["quaker-oats", "Quaker oats", "Quaker", "groceries", "company-pepsico", "src-pepsico"],
  ["cheetos-snack", "Cheetos snack", "Cheetos", "groceries", "company-pepsico", "src-pepsico"],
  ["olay-skincare", "Olay skincare", "Olay", "beauty", "company-pg", "src-pg"],
  ["pantene-haircare", "Pantene haircare", "Pantene", "beauty", "company-pg", "src-pg"],
  ["head-shoulders", "Head & Shoulders", "Head & Shoulders", "beauty", "company-pg", "src-pg"],
  ["gillette-grooming", "Gillette grooming", "Gillette", "beauty", "company-pg", "src-pg"],
  ["tide-laundry", "Tide laundry", "Tide", "household", "company-pg", "src-pg"],
  ["ariel-laundry", "Ariel laundry", "Ariel", "household", "company-pg", "src-pg"],
  ["fairy-dishcare", "Fairy dish care", "Fairy", "household", "company-pg", "src-pg"],
  ["oralb-care", "Oral-B oral care", "Oral-B", "household", "company-pg", "src-pg"],
  ["apple-iphone", "iPhone", "Apple", "electronics", "company-apple", "src-apple"],
  ["apple-ipad", "iPad", "Apple", "electronics", "company-apple", "src-apple"],
  ["apple-airpods", "AirPods", "Apple", "electronics", "company-apple", "src-apple"],
  ["apple-mac", "Mac", "Apple", "electronics", "company-apple", "src-apple"],
  ["nike-apparel", "Nike apparel", "Nike", "clothing", "company-nike", "src-nike"],
  ["jordan-apparel", "Jordan apparel", "Jordan", "clothing", "company-nike", "src-nike"],
  ["converse-footwear", "Converse footwear", "Converse", "clothing", "company-nike", "src-nike"],
];

export const products: Product[] = families.map(
  ([slug, name, brand, category, companyId, sourceId]) => ({
    id: `product-${slug}`,
    slug,
    name,
    brand,
    category,
    companyId,
    relationship: "global_parent",
    sourceIds: [sourceId],
    region: "Reviewed family-level relationship; exact SKU may vary by region",
  }),
);

export const articles = [
  {
    slug: "brands-and-companies",
    title: "A brand is not always a separate company",
    body: [
      "A product brand can belong to a larger parent company, operate through a subsidiary, or be licensed differently by region. Shelf shows the reviewed relationship and source instead of treating a familiar logo as proof of ownership.",
      "Several saved brands may lead to the same parent company. That overlap helps explain your shelf, but it does not by itself make an investment diversified or suitable.",
    ],
  },
  {
    slug: "stock-tokens",
    title: "What a tokenized stock represents—and does not",
    body: [
      "A stock token is an issuer-defined instrument designed to track an underlying public equity. Its legal terms, redemption rights, transfer rules, and liquidity come from the issuer and market—not from the ticker alone.",
      "Holding a token is not the same as holding an ordinary voting share. Review the issuer, exact mint, fees, eligibility rules, and available market route before approving a transaction.",
    ],
  },
  {
    slug: "usdc-and-solana",
    title: "How USDC deposits and Solana addresses work",
    body: [
      "Shelf uses canonical USDC on Solana. A deposit sends tokens to your verified Magic-managed Solana wallet; it is not a purchase and Shelf does not create a balance from a receipt or screenshot.",
      "Sending another token or using another network may be unrecoverable. Blockchain addresses and transfers are public even though Shelf account records remain private.",
    ],
  },
  {
    slug: "fees",
    title: "What you pay when buying or selling",
    body: [
      "A review screen shows the Shelf fee, estimated output, minimum output, slippage, and who pays network costs before you sign. Quotes can expire or change, so refreshed terms require a new review.",
      "Shelf charges its transaction fee only on a successful buy or sell. Deposits and transfers have no Shelf fee, although routing costs, spreads, and Solana network costs can still apply.",
    ],
  },
  {
    slug: "price-differences",
    title: "Why token and underlying stock prices can differ",
    body: [
      "An issuer reference price describes the underlying equity, while a token mark describes a secondary market and an executable quote applies only to a specific amount for a short time.",
      "Market hours, liquidity, fees, spreads, and token terms can make those values differ. Shelf labels their source and timestamp rather than combining them into one unexplained price.",
    ],
  },
  {
    slug: "splits-and-dividends",
    title: "How splits and reinvested dividends affect quantities",
    body: [
      "Some issuer events change a display multiplier, so the quantity shown can change while the wallet's raw token units stay the same. Historical records keep the multiplier that applied at the time.",
      "A multiplier change is not automatically a cash dividend or investment gain. Shelf shows the issuer's event explanation and does not invent a USDC payment.",
    ],
  },
  {
    slug: "pre-ipo-exposure",
    title: "What a pre-IPO exposure token represents—and does not",
    body: [
      "A PreStocks token provides issuer-defined exposure to a private company. It is not direct ownership of the private company's shares and does not grant ordinary shareholder voting or information rights.",
      "Issuer reference values, lifecycle notices, transfer restrictions, and secondary-market liquidity are separate facts. Shelf presents them separately and keeps purchasing unavailable unless every required gate passes.",
    ],
  },
].map((article) => ({ ...article, reviewedAt: "2026-09-20", version: 1 }));

export const corporateActions = [
  {
    id: "action-pepx-multiplier-fixture",
    instrumentId: "instrument-pepx",
    type: "multiplier_change",
    status: "upcoming",
    oldMultiplier: "1",
    newMultiplier: "2",
    effectiveAt: "2030-01-01T12:00:00.000Z",
    explanation:
      "The displayed quantity will double if this issuer multiplier becomes effective. Raw token units and acquisition cost do not change.",
    sourceId: "src-xstocks",
  },
] as const;

export const companyById = (id: string) => companies.find((company) => company.id === id);
export const productById = (id: string) => products.find((product) => product.id === id);
