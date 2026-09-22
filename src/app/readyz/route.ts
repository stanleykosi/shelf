import { env } from "@/lib/env";
import { checkRuntimeStore } from "@/db/runtime-store";

export async function GET() {
  try {
    const requiredConfiguration = [
      env.DATABASE_URL,
      env.MAGIC_SECRET_KEY,
      env.MAGIC_GOOGLE_REDIRECT_URI,
      env.SESSION_TOKEN_HMAC_KEY,
      env.OPENROUTER_API_KEY,
      env.SOLANA_RPC_URL,
      env.SOLANA_GENESIS_HASH,
      env.JUPITER_API_KEY,
      env.SPONSOR_PUBLIC_KEY,
      env.FEE_USDC_TOKEN_ACCOUNT,
    ];
    if (requiredConfiguration.some((value) => !value)) throw new Error("CONFIGURATION_INCOMPLETE");
    await checkRuntimeStore();
    return Response.json({
      status: "ready",
      environment: env.APP_ENV,
      identityProvider: "magic",
      aiProvider: "openrouter",
      aiModel: env.OPENROUTER_TEXT_MODEL,
      quoteProvider: "jupiter",
      chainDataProvider: "helius",
      runtimeStore: "postgres",
      realTrading: env.ENABLE_REAL_TRADING,
      tradePreview: "jupiter",
      tradeExecution: env.ENABLE_REAL_TRADING ? "enabled" : "disabled",
    });
  } catch {
    return Response.json({ status: "not_ready", runtimeStore: "postgres" }, { status: 503 });
  }
}
