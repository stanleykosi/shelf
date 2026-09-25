import type { IssuerListing } from "@/domain/issuer-assets";
import type { Company } from "@/domain/types";

export type ChatTurn = { role: "user" | "assistant"; content: string };
export type IssuerChatReference = {
  provider: "xstocks" | "prestocks";
  symbol: string;
};

const MAX_HISTORY_TURNS = 6;
const MAX_HISTORY_MESSAGE_LENGTH = 1_000;
const MAX_ISSUER_CONTEXT_LENGTH = 24_000;

export function readChatHistory(value: unknown): ChatTurn[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_HISTORY_TURNS) {
    throw new Error("INVALID_INPUT");
  }
  return value.map((turn: unknown) => {
    if (!turn || typeof turn !== "object") throw new Error("INVALID_INPUT");
    const { role, content } = turn as Record<string, unknown>;
    if (
      (role !== "user" && role !== "assistant") ||
      typeof content !== "string" ||
      !content.trim() ||
      content.length > MAX_HISTORY_MESSAGE_LENGTH
    ) {
      throw new Error("INVALID_INPUT");
    }
    return { role, content };
  });
}

export function issuerChatFact(
  listing: IssuerListing,
  sourceData: unknown,
  lifecycle?: NonNullable<Company["instrument"]>["lifecycle"],
) {
  const sourceJson = JSON.stringify(sourceData);
  if (!sourceJson || sourceJson.length > MAX_ISSUER_CONTEXT_LENGTH) {
    throw new Error("AI_CONTEXT_TOO_LARGE");
  }
  const { provider, asset } = listing;
  return {
    id: asset.companyId,
    title: `${asset.name} · ${provider === "xstocks" ? "xStocks" : "PreStocks"} issuer feed`,
    claim: JSON.stringify({
      provider,
      observedAt: asset.observedAt,
      sourceUrl: provider === "xstocks"
        ? `https://api.xstocks.fi/api/v2/public/assets/${encodeURIComponent(asset.symbol)}`
        : "https://prestocks.com/api/prestocks",
      normalizedAsset: asset,
      fullIssuerResponse: sourceData,
      shelfLifecycleNotice: lifecycle ?? null,
    }),
  };
}
