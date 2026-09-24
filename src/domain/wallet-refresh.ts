import { companies } from "@/data/catalog";
import type { HeliusChainProvider } from "@/providers/live";
import { SOLANA_MAINNET_USDC_MINT } from "@/providers/solana-constants";
import { reconcileOutstandingPreparations } from "./transaction-orchestration";
import { reconcileMintBalance, state, type UserState } from "./store";

const chainPendingStatuses = new Set(["signed", "submitted", "confirmed", "outcome_unknown"]);

export function hasPendingChainWork(userId: string) {
  return [...state.preparations.values()].some((preparation) =>
    preparation.userId === userId && chainPendingStatuses.has(preparation.status),
  );
}

export async function refreshVerifiedWalletBalances(chain: HeliusChainProvider, user: UserState) {
  if (!user.walletAddress) throw new Error("SOLANA_WALLET_UNAVAILABLE");
  const reconciliation = await reconcileOutstandingPreparations(chain, user.id);
  const persistedUser = state.users.get(user.id) ?? user;
  // A chain snapshot may already contain an unsettled fill. Never mix it with
  // Shelf's pre-fill projection or classify its output as external inventory.
  if (reconciliation.errors > 0 || reconciliation.remaining > 0 || hasPendingChainWork(user.id)) {
    return {
      cashRaw: persistedUser.cashRaw,
      reconciliationRequiredAssets: persistedUser.reconciliationRequiredAssets,
      externalInventory: persistedUser.holdings.filter((holding) => BigInt(holding.externalRaw) > 0n),
      pendingReconciliation: true,
    };
  }

  const balances = await chain.balances(user.walletAddress);
  user.cashRaw = balances[SOLANA_MAINNET_USDC_MINT] ?? "0";
  const instrumentsByMint = new Map<string, typeof companies>();
  for (const company of [...companies, ...state.issuerCompanies.values()]) {
    const instrument = company.instrument;
    if (!instrument) continue;
    const grouped = instrumentsByMint.get(instrument.mint) ?? [];
    if (!grouped.some((candidate) => candidate.instrument?.id === instrument.id)) {
      grouped.push(company);
    }
    instrumentsByMint.set(instrument.mint, grouped);
  }
  for (const [mint, grouped] of instrumentsByMint) {
    const instrumentIds = grouped.flatMap((company) => company.instrument ? [company.instrument.id] : []);
    const total = BigInt(balances[mint] ?? "0");
    reconcileMintBalance(user, instrumentIds, total.toString());
    if (instrumentIds.some((id) => user.reconciliationRequiredAssets.includes(id))) continue;
    const holding = user.holdings.find((candidate) => instrumentIds.includes(candidate.instrumentId));
    if (!holding && total > 0n) {
      const company = grouped.at(-1)!;
      const instrument = company.instrument!;
      user.holdings.push({
        instrumentId: instrument.id,
        companyId: company.id,
        symbol: instrument.symbol,
        rawAmount: "0",
        reservedRaw: "0",
        externalRaw: total.toString(),
        decimals: instrument.decimals,
        multiplier: "1",
        totalCostUsdcRaw: "0",
      });
    }
  }
  return {
    cashRaw: user.cashRaw,
    reconciliationRequiredAssets: user.reconciliationRequiredAssets,
    externalInventory: user.holdings.filter((holding) => BigInt(holding.externalRaw) > 0n),
    pendingReconciliation: false,
  };
}
