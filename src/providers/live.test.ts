import { describe, expect, it } from "vitest";
import { HeliusChainProvider, JupiterBuildProvider } from "./live";

describe("live provider transports", () => {
  it("verifies Jupiter access with a bounded read-only token search", async () => {
    let requestedUrl = "";
    const send: typeof fetch = async (input) => {
      requestedUrl = String(input);
      return new Response(
        JSON.stringify([{ address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" }]),
        { status: 200 },
      );
    };
    const provider = new JupiterBuildProvider({ apiKey: "test-key", fetch: send });

    await expect(provider.verifyAccess()).resolves.toEqual({
      authenticated: true,
      tokenSearchResults: 1,
    });
    expect(requestedUrl).toBe(
      "https://api.jup.ag/tokens/v2/search?query=USDC",
    );
  });

  it("sends exact-input Jupiter build parameters without changing the fee", async () => {
    let requestedUrl = "";
    const send: typeof fetch = async (input) => {
      requestedUrl = String(input);
      return new Response(
        JSON.stringify({
          outAmount: "3980000",
          otherAmountThreshold: "3960100",
          priceImpactPct: "0.002",
          routePlan: [{ venue: "test" }],
          swapInstruction: {
            programId: "swap-program",
            accounts: [
              { pubkey: "user-wallet", isSigner: true, isWritable: true },
              { pubkey: "sponsor-wallet", isSigner: true, isWritable: true },
              { pubkey: "fee-account", isSigner: false, isWritable: true },
            ],
            data: "AA==",
          },
        }),
        { status: 200 },
      );
    };
    const provider = new JupiterBuildProvider({ apiKey: "test-key", fetch: send });

    const quote = await provider.buildExactInput({
      inputMint: "usdc-mint",
      outputMint: "stock-mint",
      rawAmount: "10000000",
      taker: "user-wallet",
      payer: "sponsor-wallet",
      feeAccount: "fee-account",
      feeBps: 50,
    });

    const url = new URL(requestedUrl);
    expect(url.searchParams.get("amount")).toBe("10000000");
    expect(url.searchParams.get("platformFeeBps")).toBe("50");
    expect(url.searchParams.get("feeBps")).toBeNull();
    expect(url.searchParams.get("payer")).toBe("sponsor-wallet");
    expect(quote).toMatchObject({ outputRaw: "3980000", priceImpactBps: 20 });

    const inspection = await provider.inspectBuildExactInput(
      {
        inputMint: "usdc-mint",
        outputMint: "stock-mint",
        rawAmount: "10000000",
        taker: "user-wallet",
        payer: "sponsor-wallet",
        feeAccount: "fee-account",
        feeBps: 50,
      },
      true,
    );
    expect(inspection).toMatchObject({
      ok: true,
      platformFeeRequested: true,
      feeAccountReferenced: true,
      payerSignerReferenced: true,
      takerSignerReferenced: true,
    });
  });

  it("rejects a Jupiter build that omits measurable price impact", async () => {
    const send: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          outAmount: "3980000",
          otherAmountThreshold: "3960100",
          routePlan: [],
          swapInstruction: { programId: "swap-program", accounts: [], data: "AA==" },
        }),
        { status: 200 },
      );
    const provider = new JupiterBuildProvider({ apiKey: "test-key", fetch: send });

    await expect(
      provider.buildExactInput({
        inputMint: "usdc-mint",
        outputMint: "stock-mint",
        rawAmount: "10000000",
        taker: "user-wallet",
        payer: "sponsor-wallet",
        feeAccount: "fee-account",
        feeBps: 50,
      }),
    ).rejects.toThrow("QUOTE_PROVIDER_INVALID");
  });

  it("refuses an RPC whose genesis hash is not configured", async () => {
    const send: typeof fetch = async () =>
      new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: "wrong-genesis" }), {
        status: 200,
      });
    const provider = new HeliusChainProvider({
      rpcUrl: "https://rpc.example.invalid",
      expectedNetwork: "mainnet-beta",
      expectedGenesisHash: "expected-genesis",
      fetch: send,
    });

    await expect(provider.networkIdentity()).rejects.toThrow("CHAIN_IDENTITY_MISMATCH");
  });

  it("rejects a schema-invalid RPC result before domain code uses it", async () => {
    const send: typeof fetch = async () =>
      new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: 42 }), { status: 200 });
    const provider = new HeliusChainProvider({
      rpcUrl: "https://rpc.example.invalid",
      expectedNetwork: "mainnet-beta",
      expectedGenesisHash: "expected-genesis",
      fetch: send,
    });

    await expect(provider.networkIdentity()).rejects.toThrow("CHAIN_PROVIDER_INVALID");
  });

  it("inspects reviewed mint accounts without requesting balances or submission", async () => {
    const send: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          result: {
            value: [
              {
                owner: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
                data: { parsed: { info: { decimals: 8 } } },
              },
            ],
          },
        }),
        { status: 200 },
      );
    const provider = new HeliusChainProvider({
      rpcUrl: "https://rpc.example.invalid",
      expectedNetwork: "mainnet-beta",
      expectedGenesisHash: "expected-genesis",
      fetch: send,
    });

    await expect(provider.inspectMints(["reviewed-mint"])).resolves.toEqual([
      {
        mint: "reviewed-mint",
        exists: true,
        ownerProgram: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
        decimals: 8,
      },
    ]);
  });

  it("inspects a token account without changing chain state", async () => {
    const send: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          result: {
            value: {
              owner: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
              data: {
                parsed: {
                  info: {
                    mint: "usdc-mint",
                    owner: "fee-collector",
                    tokenAmount: { amount: "0" },
                  },
                },
              },
            },
          },
        }),
        { status: 200 },
      );
    const provider = new HeliusChainProvider({
      rpcUrl: "https://rpc.example.invalid",
      expectedNetwork: "mainnet-beta",
      expectedGenesisHash: "expected-genesis",
      fetch: send,
    });

    await expect(provider.inspectTokenAccount("fee-account")).resolves.toEqual({
      address: "fee-account",
      exists: true,
      programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
      mint: "usdc-mint",
      owner: "fee-collector",
      rawBalance: "0",
    });
  });
});
