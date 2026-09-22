export type LoginChallenge = {
  challengeId: string;
  expiresAt: string;
  returnPath: string;
  oauthRedirectUri?: string;
};

export type AccountSummary = {
  email?: string;
  walletAddress?: string;
  ownerBindingId?: string;
  identityProvider: "magic";
};

export type WalletSummary = {
  address?: string;
  network: string;
  cashRaw: string;
  reservedRaw: string;
};

export type WalletSigningProof = {
  walletAddress: string;
  message: string;
};

export type WalletSigningChallenge = WalletSigningProof & {
  challengeId: string;
  expiresAt: string;
  network: string;
  broadcast: false;
};

export type WalletSigningVerification = {
  verified: true;
  walletAddress: string;
  network: string;
  broadcast: false;
};
