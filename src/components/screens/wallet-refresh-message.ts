export function walletRefreshMessage(pendingReconciliation: boolean): string {
  return pendingReconciliation
    ? "A transaction is still being reconciled. These are your last recorded balances, not a new wallet snapshot. Check again after it finalizes."
    : "Balances refreshed from finalized Solana accounts.";
}
