"use client";

import { OAuthExtension } from "@magic-ext/oauth2";
import { SolanaExtension } from "@magic-ext/solana";
import { Magic } from "magic-sdk";
import { Buffer } from "buffer";
import { Connection, VersionedTransaction } from "@solana/web3.js";
import type { WalletSigningProof } from "@/domain/identity";
import { createWalletSigningTransaction, isSolanaPublicKey } from "@/lib/solana-signing";

const publishableKey = process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY;
const solanaRpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;

function createMagic(key: string, rpcUrl: string) {
  return new Magic(key, {
    extensions: [new OAuthExtension(), new SolanaExtension({ rpcUrl })] as const,
  });
}

type BrowserMagic = ReturnType<typeof createMagic>;
let instance: BrowserMagic | undefined;

function requireSolanaRpcUrl(): string {
  if (!solanaRpcUrl) throw new Error("MAGIC_BROWSER_CONFIGURATION_REQUIRED");
  return solanaRpcUrl;
}

function magicBrowser() {
  if (!publishableKey) throw new Error("MAGIC_BROWSER_CONFIGURATION_REQUIRED");
  instance ??= createMagic(publishableKey, requireSolanaRpcUrl());
  return instance;
}

export async function signInWithMagicEmail(email: string, challengeId: string) {
  const authentication = await magicBrowser().auth.loginWithEmailOTP({ email, showUI: true });
  if (!authentication) throw new Error("MAGIC_LOGIN_CANCELLED");
  return magicBrowser().user.generateIdToken({ attachment: challengeId, lifespan: 300 });
}

export async function startMagicGoogleLogin(redirectUri: string) {
  const redirect = new URL(redirectUri);
  if (redirect.origin !== window.location.origin || redirect.pathname !== "/auth/callback") {
    throw new Error("MAGIC_REDIRECT_MISMATCH");
  }
  await magicBrowser().oauth2.loginWithRedirect({
    provider: "google",
    redirectURI: redirect.href,
  });
}

export async function finishMagicGoogleLogin(challengeId: string) {
  const result = await magicBrowser().oauth2.getRedirectResult();
  if (!result.magic.idToken) throw new Error("MAGIC_LOGIN_CANCELLED");
  return magicBrowser().user.generateIdToken({ attachment: challengeId, lifespan: 300 });
}

export async function reauthenticateWithMagicEmail(email: string, challengeId: string) {
  const magic = magicBrowser();
  if (await magic.user.isLoggedIn()) await magic.user.logout();
  const authentication = await magic.auth.loginWithEmailOTP({ email, showUI: true });
  if (!authentication) throw new Error("MAGIC_REAUTHENTICATION_CANCELLED");
  return magic.user.generateIdToken({ attachment: challengeId, lifespan: 300 });
}

export async function reauthenticateWithMagicGoogle(challengeId: string, email?: string) {
  const magic = magicBrowser();
  if (await magic.user.isLoggedIn()) await magic.user.logout();
  const authentication = await magic.oauth2.loginWithPopup({
    provider: "google",
    loginHint: email,
    showMfaModal: true,
  });
  if (!authentication.magic.idToken) throw new Error("MAGIC_REAUTHENTICATION_CANCELLED");
  return magic.user.generateIdToken({ attachment: challengeId, lifespan: 300 });
}

export async function magicSolanaWalletAddress() {
  const metadata = await magicBrowser().user.getInfo();
  const address = metadata.wallets?.solana?.publicAddress;
  if (!isSolanaPublicKey(address)) throw new Error("SOLANA_WALLET_UNAVAILABLE");
  return address;
}

function bytesToBase64(bytes: Uint8Array) {
  return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""));
}

export async function signMagicSolanaProof(challenge: WalletSigningProof) {
  const connection = new Connection(requireSolanaRpcUrl(), "confirmed");
  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  const transaction = createWalletSigningTransaction(
    challenge.walletAddress,
    blockhash,
    challenge.message,
  );
  const result = await magicBrowser().solana.signTransaction(transaction, {
    // The transaction is unsigned when it is handed to Magic. The server verifies
    // the returned signature strictly before accepting the wallet binding.
    requireAllSignatures: false,
    verifySignatures: true,
  });

  return bytesToBase64(result.rawTransaction);
}

export async function signMagicSolanaTransaction(transactionBase64: string) {
  const transaction = VersionedTransaction.deserialize(Buffer.from(transactionBase64, "base64"));
  const result = await magicBrowser().solana.signTransaction(transaction, {
    requireAllSignatures: false,
    verifySignatures: false,
  });
  return bytesToBase64(result.rawTransaction);
}

export async function signOutMagicBrowser() {
  if (!publishableKey) return;
  const magic = magicBrowser();
  if (await magic.user.isLoggedIn()) await magic.user.logout();
}
