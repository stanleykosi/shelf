import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Keypair, PublicKey } from "@solana/web3.js";
import {
  SOLANA_ASSOCIATED_TOKEN_PROGRAM_ID,
  SOLANA_MAINNET_USDC_MINT,
  SOLANA_TOKEN_PROGRAM_ID,
} from "../src/providers/solana-constants";

const USDC_MINT = new PublicKey(SOLANA_MAINNET_USDC_MINT);
const TOKEN_PROGRAM = new PublicKey(SOLANA_TOKEN_PROGRAM_ID);
const ASSOCIATED_TOKEN_PROGRAM = new PublicKey(SOLANA_ASSOCIATED_TOKEN_PROGRAM_ID);

async function createSponsorAddresses() {
  const secretsDirectory = resolve("secrets");
  const sponsorKeypairPath = resolve(secretsDirectory, "sponsor-keypair.json");
  const feeCollectorKeypairPath = resolve(secretsDirectory, "fee-collector-keypair.json");
  const addressesPath = resolve(secretsDirectory, "sponsor-addresses.json");
  await mkdir(secretsDirectory, { recursive: true, mode: 0o700 });

  const sponsor = Keypair.generate();
  const feeCollector = Keypair.generate();
  const sponsorPublicKey = sponsor.publicKey;
  const [feeUsdcTokenAccount] = PublicKey.findProgramAddressSync(
    [feeCollector.publicKey.toBuffer(), TOKEN_PROGRAM.toBuffer(), USDC_MINT.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM,
  );
  const addresses = {
    network: "mainnet-beta",
    sponsorPublicKey: sponsorPublicKey.toBase58(),
    feeCollectorPublicKey: feeCollector.publicKey.toBase58(),
    feeUsdcTokenAccount: feeUsdcTokenAccount.toBase58(),
    usdcMint: USDC_MINT.toBase58(),
    feeAccountCreatedOnChain: false,
  };

  await writeFile(sponsorKeypairPath, JSON.stringify(Array.from(sponsor.secretKey)), {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
  await writeFile(feeCollectorKeypairPath, JSON.stringify(Array.from(feeCollector.secretKey)), {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
  await writeFile(addressesPath, `${JSON.stringify(addresses, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
  console.log(JSON.stringify(addresses, null, 2));
}

createSponsorAddresses().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "SPONSOR_ADDRESS_CREATION_FAILED");
  process.exitCode = 1;
});
