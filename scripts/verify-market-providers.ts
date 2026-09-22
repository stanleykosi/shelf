import { verifyMarketProviders } from "../src/providers/verification";

async function runVerification() {
  const jupiterApiKey = process.env.JUPITER_API_KEY;
  const solanaRpcUrl = process.env.SOLANA_RPC_URL;
  const solanaGenesisHash = process.env.SOLANA_GENESIS_HASH;
  if (!jupiterApiKey) throw new Error("JUPITER_API_KEY_REQUIRED");
  if (!solanaRpcUrl) throw new Error("SOLANA_RPC_URL_REQUIRED");
  if (!solanaGenesisHash) throw new Error("SOLANA_GENESIS_HASH_REQUIRED");
  const result = await verifyMarketProviders({ jupiterApiKey, solanaRpcUrl, solanaGenesisHash });
  if (!result.xStocks.allValid) throw new Error("XSTOCKS_MINT_MISMATCH");
  return result;
}

runVerification()
  .then((result) => console.log(JSON.stringify(result, null, 2)))
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "PROVIDER_CHECK_FAILED");
    process.exitCode = 1;
  });
