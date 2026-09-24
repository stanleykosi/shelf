import { productById, products } from "@/data/catalog";
import type { Product, RecognitionMatch } from "@/domain/types";

export type ScanCandidate = {
  id: string;
  label: string;
  productId: string | null;
  decision: "proposed" | "confirmed" | "excluded";
  alternatives: string[];
};
export type ScanSession = { candidates: ScanCandidate[]; expiresAt: number; method: string };
const listeners = new Set<() => void>();
let session: ScanSession | null = null;
let expiry: ReturnType<typeof setTimeout> | undefined;

function publish(next: ScanSession | null) {
  session = next;
  listeners.forEach((listener) => listener());
}

// Recognition labels never enter browser persistence. Reload intentionally expires results.
export function beginScanSession(matches: RecognitionMatch[], method: string) {
  clearTimeout(expiry);
  publish({
    candidates: matches.slice(0, method === "receipt" ? 30 : 12).map((match, index) => {
      const alternatives = products.filter((product) => product.brand.toLowerCase() === match.displayLabel.trim().toLowerCase());
      return {
      id: `candidate-${index}`,
      label: match.displayLabel.slice(0, 120),
      productId: alternatives.length > 1 ? null : match.productId && productById(match.productId) ? match.productId : null,
      decision: "proposed",
      alternatives: alternatives.length > 1 ? alternatives.map((product) => product.id) : [],
    }; }),
    expiresAt: Date.now() + 30 * 60 * 1000,
    method,
  });
  expiry = setTimeout(() => publish(null), 30 * 60 * 1000);
}

export function proposeProduct(product: Product): RecognitionMatch {
  return { candidateId: product.id, displayLabel: product.name, productId: product.id,
    companyId: product.companyId, sourceIds: product.sourceIds, state: "matched",
    confidenceBand: "high", requiresConfirmation: true };
}

export function changeScanCandidate(id: string, update: Partial<Pick<ScanCandidate, "productId" | "decision">>) {
  if (!session || session.expiresAt <= Date.now()) return;
  publish({ ...session, candidates: session.candidates.map((candidate) => {
    if (candidate.id !== id) return candidate;
    const productId = update.productId === undefined ? candidate.productId : update.productId;
    const product = productId ? productById(productId) : undefined;
    return { ...candidate, ...update, productId: product?.id ?? null,
      label: product?.name ?? candidate.label,
      decision: update.decision === "confirmed" && !product ? "proposed" : update.decision ?? candidate.decision };
  }) });
}

export const readScanSession = () => session;
export const serverScanSession = () => null;
export function subscribeScanSession(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function scanErrorMessage(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  if (code.includes("PRIVACY")) return "Private processing is unavailable. Your image cannot be processed with the required privacy controls. Search the reviewed catalog or try later.";
  if (code.includes("LIMIT") || code.includes("QUOTA") || code.includes("RATE")) return "Image identification is temporarily at its limit. Search manually, use a barcode, or try again later.";
  if (code === "INVALID_BARCODE") return "Check the barcode digits and check digit. Keep any leading zeros.";
  if (code.includes("URL")) return "This link is not supported. Use the reviewed Apple iPhone page, upload a screenshot, or search manually.";
  if (code.includes("CONSENT")) return "Accept the image-processing disclosure before identifying this image.";
  if (code.includes("IMAGE")) return "This image could not be read. Choose a JPEG, PNG or WebP under 8 MiB and 20 megapixels.";
  return "Identification is unavailable right now. Your input has not been saved. Try again or search the reviewed catalog.";
}
