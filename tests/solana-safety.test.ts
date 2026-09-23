import { Keypair, PublicKey, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  acceptWalletSignature,
  storeExecutionPreparation,
  transactionForWalletSignature,
} from "@/domain/execution";
import { createOrder, quoteLegFromJupiter, state, userForMagicIdentity } from "@/domain/store";
import { env } from "@/lib/env";
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
import {
  SOLANA_ASSOCIATED_TOKEN_PROGRAM_ID,
  SOLANA_COMPUTE_BUDGET_PROGRAM_ID,
  SOLANA_SYSTEM_PROGRAM_ID,
  SOLANA_TOKEN_2022_PROGRAM_ID,
  SOLANA_TOKEN_PROGRAM_ID,
} from "@/providers/solana-constants";

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
  expected.tokenProgramsByMint = {
    [expected.inputMint]: SOLANA_TOKEN_PROGRAM_ID,
    [expected.outputMint]: SOLANA_TOKEN_PROGRAM_ID,
  };
  const ata = PublicKey.findProgramAddressSync(
    [new PublicKey(expected.taker).toBuffer(), new PublicKey(SOLANA_TOKEN_PROGRAM_ID).toBuffer(), new PublicKey(expected.inputMint).toBuffer()],
    new PublicKey(SOLANA_ASSOCIATED_TOKEN_PROGRAM_ID),
  )[0].toBase58();
  const payload: JupiterBuildPayload = {
    inputMint: expected.inputMint,
    outputMint: expected.outputMint,
    inAmount: expected.rawAmount,
    outAmount: "2100000",
    otherAmountThreshold: "2089500",
    blockhashWithMetadata: {
      blockhash: Array.from(Keypair.generate().publicKey.toBytes()),
      lastValidBlockHeight: 123456,
    },
    setupInstructions: [{
      programId: SOLANA_ASSOCIATED_TOKEN_PROGRAM_ID,
      accounts: [
        { pubkey: expected.payer, isSigner: true, isWritable: true },
        { pubkey: ata, isSigner: false, isWritable: true },
        { pubkey: expected.taker, isSigner: false, isWritable: false },
        { pubkey: expected.inputMint, isSigner: false, isWritable: false },
        { pubkey: SOLANA_SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SOLANA_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      data: "AQ==",
    }],
    swapInstruction: {
      programId: JUPITER_PROGRAM,
      accounts: [
        { pubkey: expected.taker, isSigner: true, isWritable: true },
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

    const unknownTokenProgram = buildFixture();
    delete unknownTokenProgram.expected.tokenProgramsByMint;
    expect(() => validateAndAssembleJupiterBuild(unknownTokenProgram.payload, unknownTokenProgram.expected))
      .toThrow("JUPITER_BUILD_INVALID");

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

    const sponsorTransfer = buildFixture();
    sponsorTransfer.payload.setupInstructions = [{
      programId: SOLANA_SYSTEM_PROGRAM_ID,
      accounts: [
        { pubkey: sponsorTransfer.expected.payer, isSigner: true, isWritable: true },
        { pubkey: publicKey(), isSigner: false, isWritable: true },
      ],
      data: "AgAAAAEAAAAAAAAA",
    }];
    expect(() => validateAndAssembleJupiterBuild(sponsorTransfer.payload, sponsorTransfer.expected))
      .toThrow("SPONSOR_SYSTEM_TRANSFER_FORBIDDEN");

    const excessivePriorityFee = buildFixture();
    const computePrice = Buffer.alloc(9);
    computePrice[0] = 3;
    computePrice.writeBigUInt64LE(10_000_000n, 1);
    excessivePriorityFee.payload.computeBudgetInstructions = [{
      programId: SOLANA_COMPUTE_BUDGET_PROGRAM_ID,
      accounts: [],
      data: computePrice.toString("base64"),
    }];
    expect(() =>
      validateAndAssembleJupiterBuild(excessivePriorityFee.payload, excessivePriorityFee.expected),
    ).toThrow("SPONSOR_TRANSACTION_LIMIT_EXCEEDED");

    const extraSigner = buildFixture();
    extraSigner.payload.swapInstruction!.accounts.push({
      pubkey: publicKey(),
      isSigner: true,
      isWritable: true,
    });
    expect(() => validateAndAssembleJupiterBuild(extraSigner.payload, extraSigner.expected))
      .toThrow("JUPITER_SIGNERS_CHANGED");

    const changedFeeAccount = buildFixture();
    changedFeeAccount.payload.swapInstruction!.accounts[1].pubkey = publicKey();
    expect(() => validateAndAssembleJupiterBuild(changedFeeAccount.payload, changedFeeAccount.expected))
      .toThrow("JUPITER_FEE_ACCOUNT_MISSING");

    const wrongAtaOwner = buildFixture();
    wrongAtaOwner.payload.setupInstructions![0].accounts[2].pubkey = publicKey();
    wrongAtaOwner.payload.setupInstructions![0].accounts[4].pubkey = wrongAtaOwner.expected.taker;
    expect(() => validateAndAssembleJupiterBuild(wrongAtaOwner.payload, wrongAtaOwner.expected))
      .toThrow("SPONSOR_POLICY_INVALID");

    const wrongAtaAddress = buildFixture();
    wrongAtaAddress.payload.setupInstructions![0].accounts[1].pubkey = publicKey();
    expect(() => validateAndAssembleJupiterBuild(wrongAtaAddress.payload, wrongAtaAddress.expected))
      .toThrow("SPONSOR_POLICY_INVALID");

    const wrongTokenProgram = buildFixture();
    wrongTokenProgram.payload.setupInstructions![0].accounts[5].pubkey = SOLANA_TOKEN_2022_PROGRAM_ID;
    wrongTokenProgram.payload.setupInstructions![0].accounts[1].pubkey = PublicKey.findProgramAddressSync(
      [
        new PublicKey(wrongTokenProgram.expected.taker).toBuffer(),
        new PublicKey(SOLANA_TOKEN_2022_PROGRAM_ID).toBuffer(),
        new PublicKey(wrongTokenProgram.expected.inputMint).toBuffer(),
      ],
      new PublicKey(SOLANA_ASSOCIATED_TOKEN_PROGRAM_ID),
    )[0].toBase58();
    expect(() => validateAndAssembleJupiterBuild(wrongTokenProgram.payload, wrongTokenProgram.expected))
      .toThrow("SPONSOR_POLICY_INVALID");

    for (const [programId, discriminator] of [
      [SOLANA_TOKEN_PROGRAM_ID, 3],
      [SOLANA_TOKEN_2022_PROGRAM_ID, 4],
    ] as const) {
      const extraTokenInstruction = buildFixture();
      extraTokenInstruction.payload.otherInstructions = [{
        programId,
        accounts: [
          { pubkey: publicKey(), isSigner: false, isWritable: true },
          { pubkey: publicKey(), isSigner: false, isWritable: true },
          { pubkey: extraTokenInstruction.expected.taker, isSigner: true, isWritable: false },
        ],
        data: Buffer.from([discriminator, 255, 255, 255, 255, 255, 255, 255, 127]).toString("base64"),
      }];
      expect(() => validateAndAssembleJupiterBuild(extraTokenInstruction.payload, extraTokenInstruction.expected))
        .toThrow("JUPITER_TOKEN_INSTRUCTION_FORBIDDEN");
    }
  });

  it("keeps the reviewed message unchanged while adding wallet and sponsor signatures", () => {
    const wallet = Keypair.generate();
    const sponsor = Keypair.generate();
    const originalEnvironment = { ...env };
    Object.assign(env, {
      ENABLE_REAL_TRADING: true,
      DATA_ENCRYPTION_KEY: Buffer.alloc(32, 9).toString("base64"),
      SPONSOR_PUBLIC_KEY: sponsor.publicKey.toBase58(),
      SPONSOR_SECRET_KEY: JSON.stringify([...sponsor.secretKey]),
    });

    try {
      const user = userForMagicIdentity({
        issuer: `did:magic:${wallet.publicKey.toBase58()}`,
        walletAddress: wallet.publicKey.toBase58(),
      });
      user.invited = true;
      user.eligible = true;
      user.cashRaw = "10000000";
      state.preparations.clear();
      state.sponsorReservations = [];
      const order = createOrder(user, {
        type: "buy",
        companyId: "company-pepsico",
        amountUsdcRaw: "5000000",
      });
      const leg = order.legs[0];
      const quote = quoteLegFromJupiter(user, order.id, leg.id, {
        outputRaw: "1000000",
        minOutputRaw: "990000",
        priceImpactBps: 5,
        routeDigest: "route",
        routeLabels: ["test"],
        transactionMessageHash: "replaced-below",
        feeBps: 50,
      });
      const message = new TransactionMessage({
        payerKey: sponsor.publicKey,
        recentBlockhash: publicKey(),
        instructions: [
          new TransactionInstruction({
            programId: new PublicKey(SOLANA_ASSOCIATED_TOKEN_PROGRAM_ID),
            keys: [
              { pubkey: sponsor.publicKey, isSigner: true, isWritable: true },
              { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
            ],
            data: Buffer.from([1]),
          }),
        ],
      }).compileToV0Message();
      const transaction = new VersionedTransaction(message);
      const hash = createHash("sha256").update(message.serialize()).digest("hex");
      quote.transactionMessageHash = hash;
      const preparation = storeExecutionPreparation(user, order.id, leg.id, {
        transactionBase64: Buffer.from(transaction.serialize()).toString("base64"),
        messageHash: hash,
        expectedSigners: [sponsor.publicKey.toBase58(), wallet.publicKey.toBase58()],
        lastValidBlockHeight: 123456,
      })!;

      const forWallet = transactionForWalletSignature(user, order.id, leg.id, quote.reviewDigest);
      const walletSigned = VersionedTransaction.deserialize(
        Buffer.from(forWallet.transactionBase64, "base64"),
      );
      walletSigned.sign([wallet]);
      state.pauses.submissions = true;
      expect(() => acceptWalletSignature(
        user,
        preparation.id,
        Buffer.from(walletSigned.serialize()).toString("base64"),
      )).toThrow("SUBMISSIONS_PAUSED");
      expect(state.sponsorReservations).toHaveLength(0);
      state.pauses.submissions = false;
      const accepted = acceptWalletSignature(
        user,
        preparation.id,
        Buffer.from(walletSigned.serialize()).toString("base64"),
      );

      expect(accepted).toMatchObject({ preparationId: preparation.id, status: "signed" });
      expect(accepted.signature).toBeTruthy();
      expect(state.sponsorReservations).toContainEqual(expect.objectContaining({
        preparationId: preparation.id,
        reservedLamports: "5000000",
        status: "reserved",
      }));
    } finally {
      Object.assign(env, originalEnvironment);
    }
  });
});
