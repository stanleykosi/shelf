import { createHash } from "node:crypto";
import { z } from "zod";
import type { ChainProvider, ExactInputQuoteRequest, QuoteProvider } from "./contracts";
import {
  jupiterInstructions,
  validateAndAssembleJupiterBuild,
  type JupiterBuildPayload,
} from "./solana-transaction-policy";
import {
  SOLANA_MAINNET_USDC_MINT,
  SOLANA_TOKEN_2022_PROGRAM_ID,
  SOLANA_TOKEN_PROGRAM_ID,
} from "./solana-constants";

type Fetch = typeof fetch;

type JupiterBuildOptions = {
  apiKey: string;
  endpoint?: string;
  fetch?: Fetch;
};

type JupiterTokenSearchResult = {
  id?: string;
  address?: string;
};

const jupiterTokenSearchSchema = z.array(
  z.object({ id: z.string().optional(), address: z.string().optional() }).passthrough(),
);

const jupiterInstructionSchema = z.object({
  programId: z.string(),
  accounts: z.array(
    z.object({ pubkey: z.string(), isSigner: z.boolean(), isWritable: z.boolean() }),
  ),
  data: z.string(),
});

const jupiterBuildSchema: z.ZodType<JupiterBuildPayload> = z
  .object({
    inputMint: z.string().optional(),
    outputMint: z.string().optional(),
    inAmount: z.string().optional(),
    outAmount: z.string().optional(),
    otherAmountThreshold: z.string().optional(),
    slippageBps: z.number().optional(),
    priceImpactPct: z.string().optional(),
    routePlan: z
      .array(z.object({ swapInfo: z.object({ label: z.string().optional() }).optional() }))
      .optional(),
    computeBudgetInstructions: z.array(jupiterInstructionSchema).optional(),
    setupInstructions: z.array(jupiterInstructionSchema).optional(),
    swapInstruction: jupiterInstructionSchema.optional(),
    cleanupInstruction: jupiterInstructionSchema.nullable().optional(),
    otherInstructions: z.array(jupiterInstructionSchema).optional(),
    tipInstruction: jupiterInstructionSchema.nullable().optional(),
    addressesByLookupTableAddress: z.record(z.string(), z.array(z.string())).nullable().optional(),
    blockhashWithMetadata: z
      .object({
        blockhash: z.array(z.number()).optional(),
        lastValidBlockHeight: z.number().optional(),
      })
      .optional(),
  })
  .passthrough();

export class JupiterBuildProvider implements QuoteProvider {
  private readonly send: Fetch;
  private readonly endpoint: string;

  constructor(private readonly options: JupiterBuildOptions) {
    if (!options.apiKey) throw new Error("JUPITER_API_KEY_REQUIRED");
    this.send = options.fetch ?? fetch;
    this.endpoint = options.endpoint ?? "https://api.jup.ag/swap/v2/build";
  }

  async verifyAccess() {
    let response: Response;
    try {
      response = await this.send("https://api.jup.ag/tokens/v2/search?query=USDC", {
        headers: { "x-api-key": this.options.apiKey },
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new Error("QUOTE_PROVIDER_UNAVAILABLE");
    }
    if (!response.ok) throw new Error("QUOTE_PROVIDER_UNAVAILABLE");
    const rawResult: unknown = await response.json();
    const parsedResult = jupiterTokenSearchSchema.safeParse(rawResult);
    if (!parsedResult.success) throw new Error("QUOTE_PROVIDER_INVALID");
    const result: JupiterTokenSearchResult[] = parsedResult.data;
    if (!result.some((token) => (token.id ?? token.address) === SOLANA_MAINNET_USDC_MINT)) {
      throw new Error("QUOTE_PROVIDER_INVALID");
    }
    return { authenticated: true, tokenSearchResults: result.length };
  }

  async buildExactInput(input: ExactInputQuoteRequest) {
    const inspection = await this.inspectBuildExactInput(input, true);
    if (!inspection.ok) throw new Error("QUOTE_PROVIDER_UNAVAILABLE");
    return inspection.quote;
  }

  async buildValidatedExactInput(input: ExactInputQuoteRequest) {
    const result = await this.requestBuild(input, true);
    const quote = this.quoteFrom(result);
    if (Number(result.priceImpactPct) * 10_000 > 100) {
      throw new Error("PRICE_IMPACT_EXCEEDED");
    }
    const assembled = validateAndAssembleJupiterBuild(result, input);
    return {
      ...quote,
      ...assembled,
      routeLabels: this.routeLabels(result),
    };
  }

  async inspectBuildExactInput(
    input: ExactInputQuoteRequest,
    collectPlatformFee: boolean,
  ) {
    const result = await this.requestBuild(input, collectPlatformFee);
    const instructionGroups = jupiterInstructions(result);
    const instructionAccounts = instructionGroups.flatMap((instruction) => instruction.accounts);
    return {
      ok: true as const,
      quote: this.quoteFrom(result),
      instructionCount: instructionGroups.length,
      programIds: [...new Set(instructionGroups.map((instruction) => instruction.programId))],
      signerPublicKeys: [
        ...new Set(
          instructionAccounts
            .filter((account) => account.isSigner)
            .map((account) => account.pubkey),
        ),
      ],
      routeLabels: this.routeLabels(result),
      platformFeeRequested: collectPlatformFee,
      feeAccountReferenced: collectPlatformFee
        ? instructionAccounts.some((account) => account.pubkey === input.feeAccount)
        : false,
      payerSignerReferenced: instructionAccounts.some(
        (account) => account.pubkey === input.payer && account.isSigner,
      ),
      takerSignerReferenced: instructionAccounts.some(
        (account) => account.pubkey === input.taker && account.isSigner,
      ),
    };
  }

  private async requestBuild(
    input: ExactInputQuoteRequest,
    collectPlatformFee: boolean,
  ): Promise<JupiterBuildPayload> {
    const query = new URLSearchParams({
      inputMint: input.inputMint,
      outputMint: input.outputMint,
      amount: input.rawAmount,
      swapMode: "ExactIn",
      taker: input.taker,
      payer: input.payer,
      slippageBps: "50",
    });
    if (collectPlatformFee) {
      query.set("feeAccount", input.feeAccount);
      query.set("platformFeeBps", String(input.feeBps));
    }
    const response = await this.send(`${this.endpoint}?${query}`, {
      headers: { "x-api-key": this.options.apiKey },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      await response.text();
      throw new Error("QUOTE_PROVIDER_UNAVAILABLE");
    }

    const rawResult: unknown = await response.json();
    const parsedResult = jupiterBuildSchema.safeParse(rawResult);
    if (!parsedResult.success) throw new Error("QUOTE_PROVIDER_INVALID");
    const result = parsedResult.data;
    if (
      !result.outAmount ||
      !result.otherAmountThreshold ||
      !/^\d+$/.test(result.outAmount) ||
      !result.priceImpactPct ||
      !Number.isFinite(Number(result.priceImpactPct)) ||
      Number(result.priceImpactPct) < 0 ||
      !result.swapInstruction ||
      !Array.isArray(result.swapInstruction.accounts)
    ) {
      throw new Error("QUOTE_PROVIDER_INVALID");
    }
    return result;
  }

  private quoteFrom(result: JupiterBuildPayload) {
    return {
      outputRaw: result.outAmount!,
      minOutputRaw: result.otherAmountThreshold!,
      priceImpactBps: Math.round(Number(result.priceImpactPct) * 10_000),
      routeDigest: createHash("sha256")
        .update(JSON.stringify(result.routePlan ?? []))
        .digest("hex"),
    };
  }

  private routeLabels(result: JupiterBuildPayload) {
    return [
      ...new Set(
        (result.routePlan ?? [])
          .map((step) => step.swapInfo?.label)
          .filter((label): label is string => Boolean(label)),
      ),
    ];
  }
}

type HeliusOptions = {
  rpcUrl: string;
  expectedNetwork: string;
  expectedGenesisHash: string;
  fetch?: Fetch;
  requestTimeoutMs?: number;
};

export class HeliusChainProvider implements ChainProvider {
  private readonly send: Fetch;

  constructor(private readonly options: HeliusOptions) {
    if (!options.rpcUrl.startsWith("https://")) throw new Error("HELIUS_RPC_URL_REQUIRED");
    this.send = options.fetch ?? fetch;
  }

  private async rpc<Result>(
    method: string,
    params: readonly unknown[],
    resultSchema: z.ZodType<Result>,
  ): Promise<Result> {
    const response = await this.send(this.options.rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(this.options.requestTimeoutMs ?? 10_000),
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    if (!response.ok) throw new Error("CHAIN_PROVIDER_UNAVAILABLE");
    const rawPayload: unknown = await response.json();
    const payload = z
      .object({
        result: resultSchema.optional(),
        error: z.object({ message: z.string().optional() }).optional(),
      })
      .safeParse(rawPayload);
    if (!payload.success || payload.data.error || payload.data.result === undefined) {
      throw new Error("CHAIN_PROVIDER_INVALID");
    }
    return payload.data.result;
  }

  async networkIdentity() {
    const genesisHash = await this.rpc("getGenesisHash", [], z.string());
    if (genesisHash !== this.options.expectedGenesisHash)
      throw new Error("CHAIN_IDENTITY_MISMATCH");
    return { network: this.options.expectedNetwork, genesisHash };
  }

  async balances(address: string) {
    const tokenAccountsSchema = z.object({
      value: z.array(
        z.object({
          account: z.object({
            data: z.object({
              parsed: z.object({
                info: z.object({
                  mint: z.string(),
                  tokenAmount: z.object({ amount: z.string() }),
                }),
              }),
            }),
          }),
        }),
      ),
    });
    const programs = [
      SOLANA_TOKEN_PROGRAM_ID,
      SOLANA_TOKEN_2022_PROGRAM_ID,
    ];
    const results = await Promise.all(
      programs.map((programId) =>
        this.rpc(
          "getTokenAccountsByOwner",
          [address, { programId }, { encoding: "jsonParsed", commitment: "finalized" }],
          tokenAccountsSchema,
        ),
      ),
    );

    return results
      .flatMap((result) => result.value)
      .reduce<Record<string, string>>((balances, { account }) => {
        const info = account.data.parsed.info;
        const previous = BigInt(balances[info.mint] ?? "0");
        balances[info.mint] = (previous + BigInt(info.tokenAmount.amount)).toString();
        return balances;
      }, {});
  }

  async inspectMints(mints: string[]) {
    const mintAccountsSchema = z.object({
      value: z.array(
        z
          .object({
            owner: z.string(),
            data: z.object({
              parsed: z
                .object({ info: z.object({ decimals: z.number().optional() }).optional() })
                .optional(),
            }),
          })
          .nullable(),
      ),
    });
    const result = await this.rpc(
      "getMultipleAccounts",
      [mints, { encoding: "jsonParsed", commitment: "finalized" }],
      mintAccountsSchema,
    );

    return result.value.map((account, index) => ({
      mint: mints[index],
      exists: account !== null,
      ownerProgram: account?.owner ?? null,
      decimals: account?.data.parsed?.info?.decimals ?? null,
    }));
  }

  async inspectTokenAccount(address: string) {
    const tokenAccountSchema = z.object({
      value: z
        .object({
          owner: z.string(),
          data: z.object({
            parsed: z
              .object({
                info: z
                  .object({
                    mint: z.string().optional(),
                    owner: z.string().optional(),
                    tokenAmount: z.object({ amount: z.string().optional() }).optional(),
                  })
                  .optional(),
              })
              .optional(),
          }),
        })
        .nullable(),
    });
    const result = await this.rpc(
      "getAccountInfo",
      [address, { encoding: "jsonParsed", commitment: "finalized" }],
      tokenAccountSchema,
    );
    const info = result.value?.data.parsed?.info;
    return {
      address,
      exists: result.value !== null,
      programId: result.value?.owner ?? null,
      mint: info?.mint ?? null,
      owner: info?.owner ?? null,
      rawBalance: info?.tokenAmount?.amount ?? null,
    };
  }

  async blockHeight(commitment: "confirmed" | "finalized" = "confirmed") {
    return this.rpc("getBlockHeight", [{ commitment }], z.number().int().nonnegative());
  }

  async broadcast(bytes: Uint8Array) {
    const transaction = Buffer.from(bytes).toString("base64");
    const signature = await this.rpc(
      "sendTransaction",
      [transaction, { encoding: "base64", skipPreflight: false, preflightCommitment: "confirmed" }],
      z.string(),
    );
    return { signature };
  }

  async simulate(bytes: Uint8Array) {
    const transaction = Buffer.from(bytes).toString("base64");
    const result = await this.rpc(
      "simulateTransaction",
      [
        transaction,
        {
          encoding: "base64",
          sigVerify: true,
          replaceRecentBlockhash: false,
          commitment: "confirmed",
        },
      ],
      z.object({ value: z.object({ err: z.json().nullable(), unitsConsumed: z.number().nullable().optional() }) }),
    );
    if (result.value.err !== null) throw new Error("TRANSACTION_SIMULATION_FAILED");
    return { unitsConsumed: result.value.unitsConsumed ?? null };
  }

  async signatureStatus(signature: string) {
    const signatureStatusesSchema = z.object({
      value: z.array(
        z
          .object({
            confirmationStatus: z.enum(["processed", "confirmed", "finalized"]).optional(),
            err: z.json().optional(),
          })
          .nullable(),
      ),
    });
    const result = await this.rpc(
      "getSignatureStatuses",
      [[signature], { searchTransactionHistory: true }],
      signatureStatusesSchema,
    );
    const status = result.value[0];
    if (!status) return "not_found" as const;
    if (status.err !== null && status.err !== undefined) {
      return status.confirmationStatus === "finalized"
        ? "failed" as const
        : "pending_failure" as const;
    }
    if (status.confirmationStatus === "finalized") return "finalized" as const;
    if (status.confirmationStatus === "confirmed") return "confirmed" as const;
    return "processed" as const;
  }

  async transactionFacts(
    signature: string,
    owner: string,
    sponsorAddress: string,
    commitment: "confirmed" | "finalized",
  ) {
    const tokenBalanceSchema = z.object({
      accountIndex: z.number().int().nonnegative(),
      mint: z.string(),
      owner: z.string().optional(),
      uiTokenAmount: z.object({ amount: z.string() }),
    });
    const transactionSchema = z
      .object({
        slot: z.number().int().nonnegative(),
        blockTime: z.number().int().nullable(),
        meta: z.object({
          err: z.json().nullable(),
          fee: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
          preBalances: z.array(z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)),
          postBalances: z.array(z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)),
          preTokenBalances: z.array(tokenBalanceSchema).nullable(),
          postTokenBalances: z.array(tokenBalanceSchema).nullable(),
        }),
        transaction: z.object({
          message: z.object({
            accountKeys: z.array(
              z.union([z.string(), z.object({ pubkey: z.string() }).passthrough()]),
            ),
          }),
        }),
      })
      .nullable();
    const result = await this.rpc(
      "getTransaction",
      [signature, { encoding: "jsonParsed", commitment, maxSupportedTransactionVersion: 0 }],
      transactionSchema,
    );
    if (!result) throw new Error("TRANSACTION_NOT_AVAILABLE");

    const balances = new Map<string, bigint>();
    const accountBalances = new Map<string, bigint>();
    const accountKeys = result.transaction.message.accountKeys.map((key) => {
      return typeof key === "string" ? key : key.pubkey;
    });
    const apply = (sign: bigint, rows: z.infer<typeof tokenBalanceSchema>[] | null) => {
      for (const row of rows ?? []) {
        const amount = sign * BigInt(row.uiTokenAmount.amount);
        if (row.owner === owner) {
          balances.set(row.mint, (balances.get(row.mint) ?? 0n) + amount);
        }
        const address = accountKeys[row.accountIndex];
        if (address) {
          const key = `${address}:${row.mint}`;
          accountBalances.set(key, (accountBalances.get(key) ?? 0n) + amount);
        }
      }
    };
    apply(-1n, result.meta.preTokenBalances);
    apply(1n, result.meta.postTokenBalances);
    const sponsorIndex = accountKeys.indexOf(sponsorAddress);
    if (
      sponsorIndex < 0 ||
      result.meta.preBalances[sponsorIndex] === undefined ||
      result.meta.postBalances[sponsorIndex] === undefined
    ) {
      throw new Error("FINALIZED_TRANSACTION_INVALID");
    }
    const sponsorDebit =
      BigInt(result.meta.preBalances[sponsorIndex]) - BigInt(result.meta.postBalances[sponsorIndex]);
    if (sponsorDebit < 0n) throw new Error("FINALIZED_TRANSACTION_INVALID");
    return {
      succeeded: result.meta.err === null,
      slot: result.slot,
      blockTime: result.blockTime,
      networkFeeLamports: result.meta.fee.toString(),
      sponsorDebitLamports: sponsorDebit.toString(),
      tokenDeltas: Object.fromEntries([...balances].map(([mint, amount]) => [mint, amount.toString()])),
      accountTokenDeltas: Object.fromEntries(
        [...accountBalances].map(([key, amount]) => [key, amount.toString()]),
      ),
    };
  }

  async finalizedTokenDeltas(signature: string, owner: string, sponsorAddress: string) {
    const facts = await this.transactionFacts(signature, owner, sponsorAddress, "finalized");
    if (!facts.succeeded) throw new Error("FINALIZED_TRANSACTION_INVALID");
    return facts;
  }
}
