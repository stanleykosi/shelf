import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { runWithRuntimeState } from "@/db/runtime-store";
import { reconcileOutstandingPreparations } from "@/domain/transaction-orchestration";
import { env } from "@/lib/env";
import { HeliusChainProvider } from "@/providers/live";

function authorized(request: NextRequest) {
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!env.WORKER_SHARED_SECRET || !supplied) return false;
  const expectedHash = createHash("sha256").update(env.WORKER_SHARED_SECRET).digest();
  const suppliedHash = createHash("sha256").update(supplied).digest();
  return timingSafeEqual(expectedHash, suppliedHash);
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (!env.SOLANA_RPC_URL || !env.SOLANA_GENESIS_HASH) {
    return NextResponse.json({ error: "CHAIN_PROVIDER_UNAVAILABLE" }, { status: 503 });
  }

  const chain = new HeliusChainProvider({
    rpcUrl: env.SOLANA_RPC_URL,
    expectedNetwork: env.SOLANA_NETWORK,
    expectedGenesisHash: env.SOLANA_GENESIS_HASH,
    requestTimeoutMs: 3_000,
  });
  // One persisted outcome per request keeps the database transaction inside
  // the worker's deadline. The worker can issue another bounded request.
  const result = await runWithRuntimeState(true, () => reconcileOutstandingPreparations(chain, undefined, 1));
  return NextResponse.json({ data: { ...result, execution: env.ENABLE_REAL_TRADING ? "enabled" : "disabled" } });
}
