import { productById } from "@/data/catalog";

/** Only reviewed Product identifiers may leave temporary browser storage. */
export function reviewedGuestProductIds(snapshot: string): string[] {
  try {
    const saved: unknown = JSON.parse(snapshot);
    if (!Array.isArray(saved)) return [];
    return [...new Set(saved.filter((id): id is string =>
      typeof id === "string" && Boolean(productById(id)),
    ))].slice(0, 100);
  } catch {
    return [];
  }
}
