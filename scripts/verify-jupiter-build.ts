import { verifyJupiterBuildConfiguration } from "../src/providers/verification";

function requiredEnvironment(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name}_REQUIRED`);
  return value;
}

async function verify() {
  return verifyJupiterBuildConfiguration({
    jupiterApiKey: requiredEnvironment("JUPITER_API_KEY"),
    solanaRpcUrl: requiredEnvironment("SOLANA_RPC_URL"),
    solanaGenesisHash: requiredEnvironment("SOLANA_GENESIS_HASH"),
    sponsorPublicKey: requiredEnvironment("SPONSOR_PUBLIC_KEY"),
    feeUsdcTokenAccount: requiredEnvironment("FEE_USDC_TOKEN_ACCOUNT"),
    feeBps: Number(process.env.APP_FEE_BPS ?? "50"),
  });
}

verify()
  .then((result) => console.log(JSON.stringify(result, null, 2)))
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "JUPITER_BUILD_CHECK_FAILED");
    process.exitCode = 1;
  });
