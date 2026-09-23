import { Magic, WalletType } from "@magic-sdk/admin";
import type { MagicUserMetadata } from "@magic-sdk/admin";
import type { IdentityProvider } from "./contracts";
import { isSolanaPublicKey } from "@/lib/solana-signing";

type MagicIdentityOptions = {
  secretKey: string;
  appId?: string;
  network: string;
};

export function verifiedSolanaAddress(
  metadata: Pick<MagicUserMetadata, "publicAddress" | "wallets">,
  expectedAddress: string,
) {
  const nestedAddresses = (metadata.wallets ?? [])
    .filter((wallet) => wallet.walletType?.toUpperCase() === WalletType.SOLANA)
    .map((wallet) => wallet.publicAddress);
  const validAddresses = [metadata.publicAddress, ...nestedAddresses].filter(isSolanaPublicKey);

  if (validAddresses.length === 0) throw new Error("SOLANA_WALLET_INVALID");
  if (!validAddresses.includes(expectedAddress)) throw new Error("WALLET_BINDING_MISMATCH");
  return expectedAddress;
}

export class MagicIdentityProvider implements IdentityProvider {
  private readonly magic: Promise<Magic>;

  constructor(private readonly options: MagicIdentityOptions) {
    if (!options.secretKey) throw new Error("MAGIC_CONFIGURATION_REQUIRED");
    const configuration = options.appId ? { clientId: options.appId } : undefined;
    this.magic = Magic.init(options.secretKey, configuration);
  }

  async verifyToken(token: string, challengeId: string) {
    if (!challengeId) throw new Error("AUTH_CHALLENGE_REQUIRED");
    const magic = await this.magic;
    magic.token.validate(token, challengeId);
    const [, claim] = magic.token.decode(token);
    if (claim.aud !== magic.clientId) throw new Error("AUTH_AUDIENCE_MISMATCH");

    const metadata = await magic.users.getMetadataByIssuer(claim.iss);
    if (metadata.issuer !== claim.iss) throw new Error("AUTH_ISSUER_MISMATCH");
    return {
      issuer: claim.iss,
      email: metadata.email ?? undefined,
      issuedAt: new Date(claim.iat * 1000).toISOString(),
      expiresAt: new Date(claim.ext * 1000).toISOString(),
    };
  }

  async getSolanaWallet(issuer: string, expectedAddress: string) {
    const magic = await this.magic;
    const metadata = await magic.users.getMetadataByIssuerAndWallet(issuer, WalletType.SOLANA);
    const address = verifiedSolanaAddress(metadata, expectedAddress);
    return { address, network: this.options.network };
  }

  async freshAuthEvidence(token: string) {
    const magic = await this.magic;
    magic.token.validate(token);
    const [, claim] = magic.token.decode(token);
    return { verifiedAt: new Date(claim.iat * 1000).toISOString() };
  }

  async revokeSessions(issuer: string) {
    const magic = await this.magic;
    await magic.users.logoutByIssuer(issuer);
  }
}
