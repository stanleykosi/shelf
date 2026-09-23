import { Keypair } from "@solana/web3.js";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "@/lib/env";
import { createOrder, state, userForMagicIdentity } from "@/domain/store";

vi.mock("@/db/runtime-store", () => ({
  runWithRuntimeState: async (_mutating: boolean, work: () => Promise<unknown>) => work(),
}));

vi.mock("@/providers/live", () => ({
  HeliusChainProvider: class {
    async signatureStatus() { return "confirmed" as const; }
  },
}));

import { POST } from "./route";

describe("scheduled reconciliation route", () => {
  let originalEnvironment: typeof env;

  beforeEach(() => {
    originalEnvironment = { ...env };
    Object.assign(env, {
      ENABLE_REAL_TRADING: false,
      WORKER_SHARED_SECRET: "test-worker-secret",
      SOLANA_RPC_URL: "https://rpc.example.test",
      SOLANA_GENESIS_HASH: "test-genesis",
      SPONSOR_PUBLIC_KEY: Keypair.generate().publicKey.toBase58(),
      FEE_USDC_TOKEN_ACCOUNT: Keypair.generate().publicKey.toBase58(),
    });
    state.users.clear();
    state.orders.clear();
    state.intents.clear();
    state.intentHashes.clear();
    state.preparations.clear();
  });

  afterEach(() => Object.assign(env, originalEnvironment));

  it("inspects signed work while trading is disabled", async () => {
    const user = userForMagicIdentity({
      issuer: "did:magic:scheduled-paused-reconciliation",
      walletAddress: Keypair.generate().publicKey.toBase58(),
    });
    user.invited = true;
    user.eligible = true;
    const order = createOrder(user, {
      type: "buy", companyId: "company-pepsico", amountUsdcRaw: "5000000",
    });
    const leg = order.legs[0];
    leg.status = "signed";
    order.status = "in_progress";
    state.preparations.set("scheduled-signed", {
      id: "scheduled-signed",
      userId: user.id,
      orderId: order.id,
      legId: leg.id,
      reviewDigest: "review",
      messageHash: "message",
      encryptedUnsignedTransaction: "encrypted",
      expectedSigners: [],
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      lastValidBlockHeight: 100,
      status: "signed",
      signature: "signed-transaction",
    });

    const request = new NextRequest("https://shelf.example.test/api/internal/reconcile", {
      method: "POST",
      headers: { Authorization: "Bearer test-worker-secret" },
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      data: { checked: 1, remaining: 1, execution: "disabled" },
    });
    expect(state.preparations.get("scheduled-signed")?.status).toBe("confirmed");
  });
});
