import { PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { Buffer } from "buffer";

const SOLANA_MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

export function isSolanaPublicKey(value: string | null | undefined) {
  if (!value) return false;
  try {
    return new PublicKey(value).toBase58() === value;
  } catch {
    return false;
  }
}

export function walletSigningMessage(challengeId: string, expiresAt: string) {
  return [
    "Shelf wallet signing check",
    `Challenge: ${challengeId}`,
    `Expires: ${expiresAt}`,
    "Purpose: prove control of the linked wallet without broadcasting",
  ].join("\n");
}

export function createWalletSigningTransaction(
  walletAddress: string,
  recentBlockhash: string,
  message: string,
) {
  if (!isSolanaPublicKey(walletAddress)) throw new Error("SOLANA_WALLET_INVALID");
  if (!isSolanaPublicKey(recentBlockhash)) throw new Error("SOLANA_BLOCKHASH_INVALID");
  return new Transaction({
    feePayer: new PublicKey(walletAddress),
    recentBlockhash,
  }).add(
    new TransactionInstruction({
      keys: [],
      programId: SOLANA_MEMO_PROGRAM_ID,
      data: Buffer.from(message, "utf8"),
    }),
  );
}

export function verifyWalletSigningTransaction(
  signedTransactionBase64: string,
  expectedWalletAddress: string,
  expectedMessage: string,
) {
  try {
    const transaction = Transaction.from(Buffer.from(signedTransactionBase64, "base64"));
    const expectedWallet = new PublicKey(expectedWalletAddress);
    const walletSignature = transaction.signatures.find(({ publicKey }) =>
      publicKey.equals(expectedWallet),
    );
    const instruction = transaction.instructions[0];
    const isExpectedTransaction =
      transaction.feePayer?.equals(expectedWallet) &&
      Boolean(transaction.recentBlockhash) &&
      transaction.instructions.length === 1 &&
      instruction?.programId.equals(SOLANA_MEMO_PROGRAM_ID) &&
      instruction.keys.length === 0 &&
      instruction.data.toString("utf8") === expectedMessage &&
      Boolean(walletSignature?.signature) &&
      transaction.verifySignatures(true);

    if (!isExpectedTransaction) throw new Error("SIGNATURE_INVALID");
    return transaction;
  } catch {
    throw new Error("SIGNATURE_INVALID");
  }
}
