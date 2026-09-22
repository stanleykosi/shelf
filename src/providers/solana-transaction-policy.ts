import {
  AddressLookupTableAccount,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { createHash } from "node:crypto";
import {
  JUPITER_V6_PROGRAM_ID,
  SOLANA_ASSOCIATED_TOKEN_PROGRAM_ID,
  SOLANA_COMPUTE_BUDGET_PROGRAM_ID,
  SOLANA_SYSTEM_PROGRAM_ID,
  SOLANA_TOKEN_2022_PROGRAM_ID,
  SOLANA_TOKEN_PROGRAM_ID,
} from "./solana-constants";

type JupiterInstruction = {
  programId: string;
  accounts: Array<{ pubkey: string; isSigner: boolean; isWritable: boolean }>;
  data: string;
};

export type JupiterBuildPayload = {
  inputMint?: string;
  outputMint?: string;
  inAmount?: string;
  outAmount?: string;
  otherAmountThreshold?: string;
  slippageBps?: number;
  priceImpactPct?: string;
  routePlan?: Array<{ swapInfo?: { label?: string } }>;
  computeBudgetInstructions?: JupiterInstruction[];
  setupInstructions?: JupiterInstruction[];
  swapInstruction?: JupiterInstruction;
  cleanupInstruction?: JupiterInstruction | null;
  otherInstructions?: JupiterInstruction[];
  tipInstruction?: JupiterInstruction | null;
  addressesByLookupTableAddress?: Record<string, string[]> | null;
  blockhashWithMetadata?: {
    blockhash?: number[];
    lastValidBlockHeight?: number;
  };
};

export type JupiterBuildExpectation = {
  inputMint: string;
  outputMint: string;
  rawAmount: string;
  taker: string;
  payer: string;
  feeAccount: string;
};

const ALLOWED_PROGRAM_IDS = new Set([
  SOLANA_SYSTEM_PROGRAM_ID,
  SOLANA_COMPUTE_BUDGET_PROGRAM_ID,
  SOLANA_ASSOCIATED_TOKEN_PROGRAM_ID,
  JUPITER_V6_PROGRAM_ID,
  SOLANA_TOKEN_PROGRAM_ID,
  SOLANA_TOKEN_2022_PROGRAM_ID,
]);

function publicKey(value: string, errorCode = "JUPITER_BUILD_INVALID") {
  try {
    const key = new PublicKey(value);
    if (key.toBase58() !== value) throw new Error(errorCode);
    return key;
  } catch {
    throw new Error(errorCode);
  }
}

function instructionData(value: string) {
  const bytes = Buffer.from(value, "base64");
  const normalizedInput = value.replace(/=+$/, "");
  const normalizedOutput = bytes.toString("base64").replace(/=+$/, "");
  if (!bytes.length || normalizedInput !== normalizedOutput) {
    throw new Error("JUPITER_BUILD_INVALID");
  }
  return bytes;
}

export function jupiterInstructions(payload: JupiterBuildPayload) {
  if (!payload.swapInstruction) throw new Error("JUPITER_BUILD_INVALID");
  return [
    ...(payload.computeBudgetInstructions ?? []),
    ...(payload.setupInstructions ?? []),
    payload.swapInstruction,
    ...(payload.cleanupInstruction ? [payload.cleanupInstruction] : []),
    ...(payload.otherInstructions ?? []),
  ];
}

function validateBuild(payload: JupiterBuildPayload, expected: JupiterBuildExpectation) {
  if (
    payload.inputMint !== expected.inputMint ||
    payload.outputMint !== expected.outputMint ||
    payload.inAmount !== expected.rawAmount ||
    !payload.outAmount ||
    !/^\d+$/.test(payload.outAmount) ||
    !payload.otherAmountThreshold ||
    !/^\d+$/.test(payload.otherAmountThreshold)
  ) {
    throw new Error("JUPITER_TERMS_CHANGED");
  }
  if (payload.tipInstruction) throw new Error("JUPITER_TIP_FORBIDDEN");

  const instructions = jupiterInstructions(payload);
  const signerKeys = new Set<string>();
  let feeAccountReferenced = false;

  for (const instruction of instructions) {
    publicKey(instruction.programId);
    if (!ALLOWED_PROGRAM_IDS.has(instruction.programId)) {
      throw new Error("JUPITER_PROGRAM_NOT_ALLOWED");
    }
    instructionData(instruction.data);
    for (const account of instruction.accounts) {
      publicKey(account.pubkey);
      if (account.isSigner) signerKeys.add(account.pubkey);
      if (account.pubkey === expected.feeAccount && account.isWritable) {
        feeAccountReferenced = true;
      }
    }
  }

  const allowedSigners = new Set([expected.taker, expected.payer]);
  if (
    !signerKeys.has(expected.taker) ||
    !signerKeys.has(expected.payer) ||
    [...signerKeys].some((key) => !allowedSigners.has(key))
  ) {
    throw new Error("JUPITER_SIGNERS_CHANGED");
  }
  if (!feeAccountReferenced) throw new Error("JUPITER_FEE_ACCOUNT_MISSING");
  return instructions;
}

function addressLookupTables(payload: JupiterBuildPayload) {
  return Object.entries(payload.addressesByLookupTableAddress ?? {}).map(([address, addresses]) => {
    return new AddressLookupTableAccount({
      key: publicKey(address),
      state: {
        deactivationSlot: BigInt("18446744073709551615"),
        lastExtendedSlot: 0,
        lastExtendedSlotStartIndex: 0,
        authority: undefined,
        addresses: addresses.map((item) => publicKey(item)),
      },
    });
  });
}

function recentBlockhash(payload: JupiterBuildPayload) {
  const bytes = payload.blockhashWithMetadata?.blockhash;
  if (
    !bytes ||
    bytes.length !== 32 ||
    bytes.some((value) => !Number.isInteger(value) || value < 0 || value > 255)
  ) {
    throw new Error("JUPITER_BLOCKHASH_INVALID");
  }
  return new PublicKey(Uint8Array.from(bytes)).toBase58();
}

export function validateAndAssembleJupiterBuild(
  payload: JupiterBuildPayload,
  expected: JupiterBuildExpectation,
) {
  publicKey(expected.inputMint);
  publicKey(expected.outputMint);
  publicKey(expected.taker);
  publicKey(expected.payer);
  publicKey(expected.feeAccount);
  const instructions = validateBuild(payload, expected).map((instruction) => {
    return new TransactionInstruction({
      programId: publicKey(instruction.programId),
      keys: instruction.accounts.map((account) => ({
        pubkey: publicKey(account.pubkey),
        isSigner: account.isSigner,
        isWritable: account.isWritable,
      })),
      data: instructionData(instruction.data),
    });
  });

  const message = new TransactionMessage({
    payerKey: publicKey(expected.payer),
    recentBlockhash: recentBlockhash(payload),
    instructions,
  }).compileToV0Message(addressLookupTables(payload));
  const requiredSigners = message.staticAccountKeys
    .slice(0, message.header.numRequiredSignatures)
    .map((key) => key.toBase58());
  const expectedSigners = new Set([expected.payer, expected.taker]);
  if (
    requiredSigners.length !== expectedSigners.size ||
    requiredSigners.some((key) => !expectedSigners.has(key))
  ) {
    throw new Error("JUPITER_SIGNERS_CHANGED");
  }

  const transaction = new VersionedTransaction(message);
  const messageBytes = transaction.message.serialize();
  return {
    transactionBase64: Buffer.from(transaction.serialize()).toString("base64"),
    messageHash: createHash("sha256").update(messageBytes).digest("hex"),
    requiredSigners,
    instructionCount: instructions.length,
  };
}
