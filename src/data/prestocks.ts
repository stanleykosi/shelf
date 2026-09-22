import type { Company } from "@/domain/types";

type PreStocksSeed = {
  company: Company;
};

function preStocksCompany(input: {
  slug: string;
  issuerSlug?: string;
  name: string;
  symbol: string;
  mint: string;
  aliases: string[];
  description: string;
  lifecycle?: NonNullable<Company["instrument"]>["lifecycle"];
}): PreStocksSeed {
  return {
    company: {
      id: `company-${input.slug}`,
      slug: input.slug,
      name: input.name,
      aliases: input.aliases,
      ticker: input.symbol,
      exchange: "Private market",
      description: input.description,
      instrument: {
        id: `instrument-prestocks-${input.slug}`,
        symbol: input.symbol,
        issuer: "PreStocks",
        provider: "prestocks",
        assetClass: "pre_ipo_exposure",
        referenceUrl: `https://www.prestocks.com/${input.issuerSlug ?? input.slug}`,
        mint: input.mint,
        tokenProgram: "token-2022",
        decimals: 9,
        capabilities: { buy: true, sell: true, transfer: true },
        lifecycle: input.lifecycle,
      },
    },
  };
}

// Mints and decimals were checked against the issuer API and finalized Solana mint accounts on
// 2026-09-20. Trading still requires a fresh chain check and an acceptable Jupiter route.
export const preStocksSeeds: PreStocksSeed[] = [
  preStocksCompany({
    slug: "anduril",
    name: "Anduril Industries",
    symbol: "ANDURIL",
    mint: "PresTj4Yc2bAR197Er7wz4UUKSfqt6FryBEdAriBoQB",
    aliases: ["Anduril"],
    description: "A private defense technology company developing autonomous systems.",
  }),
  preStocksCompany({
    slug: "anthropic",
    name: "Anthropic",
    symbol: "ANTHROPIC",
    mint: "Pren1FvFX6J3E4kXhJuCiAD5aDmGEb7qJRncwA8Lkhw",
    aliases: ["Claude"],
    description: "A private artificial intelligence company that develops Claude.",
  }),
  preStocksCompany({
    slug: "figure-ai",
    issuerSlug: "figureai",
    name: "Figure AI",
    symbol: "FIGUREAI",
    mint: "PreZad18qfPtbxNpMtMuAuX2zVpvkEU8DnJx56faCWd",
    aliases: ["Figure", "Figure robots"],
    description: "A private company developing general-purpose humanoid robots.",
  }),
  preStocksCompany({
    slug: "kalshi",
    name: "Kalshi",
    symbol: "KALSHI",
    mint: "PreLWGkkeqG1s4HEfFZSy9moCrJ7btsHuUtfcCeoRua",
    aliases: ["Kalshi prediction market"],
    description: "A private company operating a regulated event-contract market.",
  }),
  preStocksCompany({
    slug: "neuralink",
    name: "Neuralink",
    symbol: "NEURALINK",
    mint: "PrekqLJvJ3qVdXmBGDiexvwUTF4rLFDa6HWS4HJbw9S",
    aliases: ["Neuralink implant"],
    description: "A private company developing implantable brain-computer interfaces.",
  }),
  preStocksCompany({
    slug: "openai",
    name: "OpenAI",
    symbol: "OPENAI",
    mint: "PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF",
    aliases: ["ChatGPT", "GPT", "DALL-E", "Sora"],
    description: "A private artificial intelligence company behind ChatGPT and GPT models.",
  }),
  preStocksCompany({
    slug: "polymarket",
    name: "Polymarket",
    symbol: "POLYMARKET",
    mint: "Pre8AREmFPtoJFT8mQSXQLh56cwJmM7CFDRuoGBZiUP",
    aliases: ["Polymarket prediction market"],
    description: "A private company operating a blockchain-based prediction market.",
  }),
  preStocksCompany({
    slug: "spacex",
    name: "SpaceX",
    symbol: "SPACEX",
    mint: "PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh",
    aliases: ["Starlink", "Falcon", "Starship"],
    description: "A private aerospace company behind Starlink, Falcon, and Starship.",
    lifecycle: {
      state: "transition",
      title: "Public-market transition announced",
      description:
        "The issuer says this PreStocks instrument must be swapped before its deadline. Shelf will never convert or sell it without explicit approval.",
      deadline: "2027-03-12T23:59:00.000Z",
      successorSymbol: "SPCXx",
      sourceUrl: "https://prestocks.com/spacex",
    },
  }),
];

export const preStocksCompanies = preStocksSeeds.map((seed) => seed.company);
