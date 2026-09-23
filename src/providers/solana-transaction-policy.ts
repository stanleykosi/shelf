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
  tokenProgramsByMint?: Record<string, string>;
};

const ALLOWED_PROGRAM_IDS = new Set([
  SOLANA_COMPUTE_BUDGET_PROGRAM_ID,
  SOLANA_ASSOCIATED_TOKEN_PROGRAM_ID,
  JUPITER_V6_PROGRAM_ID,
]);

export const SPONSOR_TRANSACTION_LIMIT_LAMPORTS = 5_000_000n;
const MAX_COMPUTE_UNITS = 1_400_000n;
const BASE_SIGNATURE_FEE_BUDGET_LAMPORTS = 20_000n;
const ASSOCIATED_ACCOUNT_RENT_BUDGET_LAMPORTS = 3_000_000n;

type ComputeBudget = {
  unitLimit: bigint;
  microLamportsPerUnit: bigint;
  sawUnitLimit: boolean;
  sawUnitPrice: boolean;
};

function emptyComputeBudget(): ComputeBudget {
  return {
    unitLimit: MAX_COMPUTE_UNITS,
    microLamportsPerUnit: 0n,
    sawUnitLimit: false,
    sawUnitPrice: false,
  };
}

function inspectComputeBudgetInstruction(data: Uint8Array, budget: ComputeBudget) {
  const bytes = Buffer.from(data);
  const discriminator = bytes[0];
  if (discriminator === 1 || discriminator === 4) {
    if (bytes.length !== 5) throw new Error("SPONSOR_POLICY_INVALID");
    return;
  }
  if (discriminator === 2) {
    if (bytes.length !== 5 || budget.sawUnitLimit) throw new Error("SPONSOR_POLICY_INVALID");
    budget.unitLimit = BigInt(bytes.readUInt32LE(1));
    budget.sawUnitLimit = true;
    if (budget.unitLimit === 0n || budget.unitLimit > MAX_COMPUTE_UNITS) {
      throw new Error("SPONSOR_POLICY_INVALID");
    }
    return;
  }
  if (discriminator === 3) {
    if (bytes.length !== 9 || budget.sawUnitPrice) throw new Error("SPONSOR_POLICY_INVALID");
    budget.microLamportsPerUnit = bytes.readBigUInt64LE(1);
    budget.sawUnitPrice = true;
    return;
  }
  // The deprecated request-units instruction carries an unbounded additional fee.
  throw new Error("SPONSOR_POLICY_INVALID");
}

function enforceSponsorEstimate(accountCreations: number, budget: ComputeBudget) {
  const priorityFee =
    (budget.unitLimit * budget.microLamportsPerUnit + 999_999n) / 1_000_000n;
  const estimatedMaximum =
    BASE_SIGNATURE_FEE_BUDGET_LAMPORTS +
    priorityFee +
    BigInt(accountCreations) * ASSOCIATED_ACCOUNT_RENT_BUDGET_LAMPORTS;
  if (estimatedMaximum > SPONSOR_TRANSACTION_LIMIT_LAMPORTS) {
    throw new Error("SPONSOR_TRANSACTION_LIMIT_EXCEEDED");
  }
}

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

function validateSponsoredAta(
  instruction: JupiterInstruction,
  data: Uint8Array,
  expected: JupiterBuildExpectation,
) {
  // Only idempotent creation of the taker's reviewed input/output ATA is sponsored.
  if (data.length !== 1 || data[0] !== 1 || instruction.accounts.length !== 6) {
    throw new Error("SPONSOR_POLICY_INVALID");
  }
  const [payer, ata, owner, mint, systemProgram, tokenProgram] = instruction.accounts;
  if (
    payer.pubkey !== expected.payer || !payer.isSigner || !payer.isWritable ||
    owner.pubkey !== expected.taker || owner.isSigner || owner.isWritable ||
    ![expected.inputMint, expected.outputMint].includes(mint.pubkey) ||
    mint.isSigner || mint.isWritable ||
    ata.isSigner || !ata.isWritable ||
    systemProgram.pubkey !== SOLANA_SYSTEM_PROGRAM_ID ||
    systemProgram.isSigner || systemProgram.isWritable ||
    ![SOLANA_TOKEN_PROGRAM_ID, SOLANA_TOKEN_2022_PROGRAM_ID].includes(tokenProgram.pubkey) ||
    expected.tokenProgramsByMint?.[mint.pubkey] !== tokenProgram.pubkey ||
    tokenProgram.isSigner || tokenProgram.isWritable
  ) {
    throw new Error("SPONSOR_POLICY_INVALID");
  }
  const derivedAta = PublicKey.findProgramAddressSync(
    [
      publicKey(expected.taker).toBuffer(),
      publicKey(tokenProgram.pubkey).toBuffer(),
      publicKey(mint.pubkey).toBuffer(),
    ],
    publicKey(SOLANA_ASSOCIATED_TOKEN_PROGRAM_ID),
  )[0].toBase58();
  if (ata.pubkey !== derivedAta) throw new Error("SPONSOR_POLICY_INVALID");
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
  let sponsoredAccountCreations = 0;
  const computeBudget = emptyComputeBudget();

  for (const instruction of instructions) {
    publicKey(instruction.programId);
    if (
      instruction.programId === SOLANA_TOKEN_PROGRAM_ID ||
      instruction.programId === SOLANA_TOKEN_2022_PROGRAM_ID
    ) {
      // Direct token transfers, approvals and authority changes have no reviewed
      // account manifest in this swap flow. Swaps must execute inside Jupiter.
      throw new Error("JUPITER_TOKEN_INSTRUCTION_FORBIDDEN");
    }
    if (instruction.programId === SOLANA_SYSTEM_PROGRAM_ID) {
      throw new Error("SPONSOR_SYSTEM_TRANSFER_FORBIDDEN");
    }
    if (!ALLOWED_PROGRAM_IDS.has(instruction.programId)) {
      throw new Error("JUPITER_PROGRAM_NOT_ALLOWED");
    }
    const data = instructionData(instruction.data);
    if (instruction.programId === SOLANA_ASSOCIATED_TOKEN_PROGRAM_ID) {
      sponsoredAccountCreations += 1;
      validateSponsoredAta(instruction, data, expected);
    }
    if (instruction.programId === SOLANA_COMPUTE_BUDGET_PROGRAM_ID) {
      inspectComputeBudgetInstruction(data, computeBudget);
    }
    for (const account of instruction.accounts) {
      publicKey(account.pubkey);
      if (account.isSigner) signerKeys.add(account.pubkey);
      if (account.pubkey === expected.feeAccount && account.isWritable) {
        feeAccountReferenced = true;
      }
      if (
        account.pubkey === expected.payer &&
        instruction.programId !== SOLANA_ASSOCIATED_TOKEN_PROGRAM_ID
      ) {
        throw new Error("SPONSOR_POLICY_INVALID");
      }
    }
  }

  if (sponsoredAccountCreations > 1) throw new Error("SPONSOR_POLICY_INVALID");
  enforceSponsorEstimate(sponsoredAccountCreations, computeBudget);

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

export function validateCompiledSponsorExposure(
  transaction: VersionedTransaction,
  sponsorAddress: string,
) {
  const keys = transaction.message.staticAccountKeys;
  if (keys[0]?.toBase58() !== sponsorAddress) throw new Error("SPONSOR_KEY_MISMATCH");
  const sponsorIndex = keys.findIndex((key) => key.toBase58() === sponsorAddress);
  if (sponsorIndex !== 0) throw new Error("SPONSOR_POLICY_INVALID");

  let sponsoredAccountCreations = 0;
  const computeBudget = emptyComputeBudget();
  for (const instruction of transaction.message.compiledInstructions) {
    const program = keys[instruction.programIdIndex]?.toBase58();
    if (!program) throw new Error("SPONSOR_POLICY_INVALID");
    if (program === SOLANA_TOKEN_PROGRAM_ID || program === SOLANA_TOKEN_2022_PROGRAM_ID) {
      throw new Error("JUPITER_TOKEN_INSTRUCTION_FORBIDDEN");
    }
    if (program === SOLANA_SYSTEM_PROGRAM_ID) throw new Error("SPONSOR_SYSTEM_TRANSFER_FORBIDDEN");
    if (program === SOLANA_ASSOCIATED_TOKEN_PROGRAM_ID) sponsoredAccountCreations += 1;
    if (program === SOLANA_COMPUTE_BUDGET_PROGRAM_ID) {
      inspectComputeBudgetInstruction(instruction.data, computeBudget);
    }
    if (
      instruction.accountKeyIndexes.includes(sponsorIndex) &&
      program !== SOLANA_ASSOCIATED_TOKEN_PROGRAM_ID
    ) {
      throw new Error("SPONSOR_POLICY_INVALID");
    }
  }
  if (sponsoredAccountCreations > 1) throw new Error("SPONSOR_POLICY_INVALID");
  enforceSponsorEstimate(sponsoredAccountCreations, computeBudget);
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
  const lastValidBlockHeight = payload.blockhashWithMetadata?.lastValidBlockHeight;
  if (
    !bytes ||
    bytes.length !== 32 ||
    bytes.some((value) => !Number.isInteger(value) || value < 0 || value > 255) ||
    !Number.isInteger(lastValidBlockHeight) ||
    lastValidBlockHeight! <= 0
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
  for (const mint of [expected.inputMint, expected.outputMint]) {
    if (![SOLANA_TOKEN_PROGRAM_ID, SOLANA_TOKEN_2022_PROGRAM_ID]
      .includes(expected.tokenProgramsByMint?.[mint] ?? "")) {
      throw new Error("JUPITER_BUILD_INVALID");
    }
  }
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
    lastValidBlockHeight: payload.blockhashWithMetadata!.lastValidBlockHeight!,
  };
}
