import { companies } from "@/data/catalog";
import { Keypair } from "@solana/web3.js";
import { HeliusChainProvider, JupiterBuildProvider } from "./live";
import {
  SOLANA_MAINNET_GENESIS_HASH,
  SOLANA_MAINNET_USDC_MINT,
  SOLANA_TOKEN_2022_PROGRAM_ID,
  SOLANA_TOKEN_PROGRAM_ID,
} from "./solana-constants";

type MarketProviderConfig = {
  jupiterApiKey: string;
  solanaRpcUrl: string;
  solanaGenesisHash: string;
};

export async function verifyMarketProviders(config: MarketProviderConfig) {
  if (new URL(config.solanaRpcUrl).protocol !== "https:") {
    throw new Error("SOLANA_RPC_URL_INVALID");
  }
  if (config.solanaGenesisHash !== SOLANA_MAINNET_GENESIS_HASH) {
    throw new Error("EXPECTED_MAINNET_GENESIS_HASH");
  }

  const jupiter = new JupiterBuildProvider({ apiKey: config.jupiterApiKey });
  const helius = new HeliusChainProvider({
    rpcUrl: config.solanaRpcUrl,
    expectedNetwork: "mainnet-beta",
    expectedGenesisHash: config.solanaGenesisHash,
  });
  const xStocks = companies.flatMap((company) => {
    if (company.instrument?.provider !== "xstocks") return [];
    return [
      {
        company: company.name,
        symbol: company.instrument.symbol,
        mint: company.instrument.mint,
        decimals: company.instrument.decimals,
      },
    ];
  });

  const [jupiterAccess, network, mintAccounts] = await Promise.all([
    jupiter.verifyAccess(),
    helius.networkIdentity(),
    helius.inspectMints(xStocks.map((instrument) => instrument.mint)),
  ]);
  const reviewedMints = xStocks.map((instrument, index) => {
    const account = mintAccounts[index];
    const valid =
      account?.exists === true &&
      account.ownerProgram === SOLANA_TOKEN_2022_PROGRAM_ID &&
      account.decimals === instrument.decimals;
    return { ...instrument, ...account, valid };
  });
  return {
    checkedAt: new Date().toISOString(),
    safety: "read-only; no transaction was built, signed, simulated, submitted, or broadcast",
    jupiter: jupiterAccess,
    solana: network,
    xStocks: {
      allValid: reviewedMints.every((mint) => mint.valid),
      mints: reviewedMints,
    },
  };
}

type JupiterBuildVerificationConfig = MarketProviderConfig & {
  sponsorPublicKey: string;
  feeUsdcTokenAccount: string;
  feeBps: number;
};

const waitForJupiterRateLimit = () => new Promise((resolve) => setTimeout(resolve, 1_100));

export async function verifyJupiterBuildConfiguration(config: JupiterBuildVerificationConfig) {
  const jupiter = new JupiterBuildProvider({ apiKey: config.jupiterApiKey });
  const helius = new HeliusChainProvider({
    rpcUrl: config.solanaRpcUrl,
    expectedNetwork: "mainnet-beta",
    expectedGenesisHash: config.solanaGenesisHash,
  });
  const taker = Keypair.generate().publicKey.toBase58();
  const xStocks = companies.flatMap((company) => {
    if (company.instrument?.provider !== "xstocks") return [];
    return [{ symbol: company.instrument.symbol, mint: company.instrument.mint }];
  });
  const input = {
    inputMint: SOLANA_MAINNET_USDC_MINT,
    outputMint: xStocks[0].mint,
    rawAmount: "5000000",
    taker,
    payer: config.sponsorPublicKey,
    feeAccount: config.feeUsdcTokenAccount,
    feeBps: config.feeBps,
  };

  const feeAccount = await helius.inspectTokenAccount(config.feeUsdcTokenAccount);
  const routeRequests = xStocks.flatMap((instrument) => [
    {
      symbol: instrument.symbol,
      side: "buy" as const,
      inputMint: SOLANA_MAINNET_USDC_MINT,
      outputMint: instrument.mint,
      rawAmount: "5000000",
    },
    {
      symbol: instrument.symbol,
      side: "sell" as const,
      inputMint: instrument.mint,
      outputMint: SOLANA_MAINNET_USDC_MINT,
      rawAmount: "10000000",
    },
  ]);
  const routes = [];
  for (const [index, route] of routeRequests.entries()) {
    if (index > 0) await waitForJupiterRateLimit();
    const stockMint = route.inputMint === SOLANA_MAINNET_USDC_MINT
      ? route.outputMint
      : route.inputMint;
    const build = await jupiter.buildValidatedExactInput({
      ...input,
      inputMint: route.inputMint,
      outputMint: route.outputMint,
      rawAmount: route.rawAmount,
      tokenProgramsByMint: {
        [SOLANA_MAINNET_USDC_MINT]: SOLANA_TOKEN_PROGRAM_ID,
        [stockMint]: SOLANA_TOKEN_2022_PROGRAM_ID,
      },
    });
    routes.push({
      symbol: route.symbol,
      side: route.side,
      verification: {
        outputRaw: build.outputRaw,
        minOutputRaw: build.minOutputRaw,
        priceImpactBps: build.priceImpactBps,
        routeDigest: build.routeDigest,
        routeLabels: build.routeLabels,
        instructionCount: build.instructionCount,
        requiredSigners: build.requiredSigners,
        messageHash: build.messageHash,
      },
    });
  }

  return {
    checkedAt: new Date().toISOString(),
    safety: "read-only build inspection; nothing was signed, simulated, submitted, or broadcast",
    feeAccount,
    feeBearingRoutes: routes,
  };
}
