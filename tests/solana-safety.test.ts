import { Keypair } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import {
  createWalletSigningTransaction,
  isSolanaPublicKey,
  verifyWalletSigningTransaction,
  walletSigningMessage,
} from "@/lib/solana-signing";
import {
  validateAndAssembleJupiterBuild,
  type JupiterBuildExpectation,
  type JupiterBuildPayload,
} from "@/providers/solana-transaction-policy";

const JUPITER_PROGRAM = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";
const publicKey = () => Keypair.generate().publicKey.toBase58();

function buildFixture() {
  const expected: JupiterBuildExpectation = {
    inputMint: publicKey(),
    outputMint: publicKey(),
    rawAmount: "5000000",
    taker: publicKey(),
    payer: publicKey(),
    feeAccount: publicKey(),
  };
  const payload: JupiterBuildPayload = {
    inputMint: expected.inputMint,
    outputMint: expected.outputMint,
    inAmount: expected.rawAmount,
    outAmount: "2100000",
    otherAmountThreshold: "2089500",
    blockhashWithMetadata: { blockhash: Array.from(Keypair.generate().publicKey.toBytes()) },
    swapInstruction: {
      programId: JUPITER_PROGRAM,
      accounts: [
        { pubkey: expected.taker, isSigner: true, isWritable: true },
        { pubkey: expected.payer, isSigner: true, isWritable: true },
        { pubkey: expected.feeAccount, isSigner: false, isWritable: true },
      ],
      data: "AA==",
    },
  };
  return { expected, payload };
}

describe("Solana signing and transaction policy", () => {
  it("accepts only the linked wallet's signature over the exact challenge", () => {
    const wallet = Keypair.generate();
    const otherWallet = Keypair.generate();
    const message = walletSigningMessage("challenge-1", "2030-01-01T00:00:00.000Z");
    const transaction = createWalletSigningTransaction(wallet.publicKey.toBase58(), publicKey(), message);
    transaction.sign(wallet);
    const signed = transaction.serialize().toString("base64");

    expect(isSolanaPublicKey(wallet.publicKey.toBase58())).toBe(true);
    expect(isSolanaPublicKey("0x1234567890abcdef")).toBe(false);
    expect(() => verifyWalletSigningTransaction(signed, wallet.publicKey.toBase58(), message)).not.toThrow();
    expect(() => verifyWalletSigningTransaction(signed, otherWallet.publicKey.toBase58(), message))
      .toThrow("SIGNATURE_INVALID");
    expect(() => verifyWalletSigningTransaction(signed, wallet.publicKey.toBase58(), `${message}\nchanged`))
      .toThrow("SIGNATURE_INVALID");
  });

  it("assembles reviewed Jupiter terms and rejects every material substitution", () => {
    const valid = buildFixture();
    const result = validateAndAssembleJupiterBuild(valid.payload, valid.expected);
    expect(result.transactionBase64.length).toBeGreaterThan(100);
    expect(new Set(result.requiredSigners)).toEqual(new Set([valid.expected.payer, valid.expected.taker]));

    const changedTerms = buildFixture();
    changedTerms.payload.inAmount = "5000001";
    expect(() => validateAndAssembleJupiterBuild(changedTerms.payload, changedTerms.expected))
      .toThrow("JUPITER_TERMS_CHANGED");

    const tipped = buildFixture();
    tipped.payload.tipInstruction = tipped.payload.swapInstruction;
    expect(() => validateAndAssembleJupiterBuild(tipped.payload, tipped.expected))
      .toThrow("JUPITER_TIP_FORBIDDEN");

    const changedProgram = buildFixture();
    changedProgram.payload.swapInstruction!.programId = publicKey();
    expect(() => validateAndAssembleJupiterBuild(changedProgram.payload, changedProgram.expected))
      .toThrow("JUPITER_PROGRAM_NOT_ALLOWED");

    const extraSigner = buildFixture();
    extraSigner.payload.swapInstruction!.accounts.push({
      pubkey: publicKey(),
      isSigner: true,
      isWritable: true,
    });
    expect(() => validateAndAssembleJupiterBuild(extraSigner.payload, extraSigner.expected))
      .toThrow("JUPITER_SIGNERS_CHANGED");

    const changedFeeAccount = buildFixture();
    changedFeeAccount.payload.swapInstruction!.accounts[2].pubkey = publicKey();
    expect(() => validateAndAssembleJupiterBuild(changedFeeAccount.payload, changedFeeAccount.expected))
      .toThrow("JUPITER_FEE_ACCOUNT_MISSING");
  });
});
