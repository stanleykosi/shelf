import type { RecognitionMatch } from "../../src/domain/types";

// Simulated recognition responses using existing reviewed catalog identities, never live AI claims.
export const scanMatches: RecognitionMatch[] = [
  { candidateId: "fixture-doritos", displayLabel: "Doritos", productId: "product-doritos-snack", companyId: "company-pepsico", state: "matched", confidenceBand: "high", sourceIds: ["src-pepsico"], requiresConfirmation: true },
  { candidateId: "fixture-apple", displayLabel: "Apple", productId: "product-apple-iphone", companyId: "company-apple", state: "matched", confidenceBand: "low", sourceIds: [], requiresConfirmation: true },
  { candidateId: "fixture-unlisted", displayLabel: "Unlisted product", productId: null, companyId: null, state: "unlisted", confidenceBand: "low", sourceIds: [], requiresConfirmation: true },
];

// A synthetic canvas image exercises local preparation, not recognition accuracy.
export const scanUpload = { name: "synthetic-input.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAJElEQVR4AdzKMQ0AAAwCwQb/eiqkRioBHMDOJ78d9o9uTKgDCAAA//8/K2qmAAAABklEQVQDAM2GG8GSqAM7AAAAAElFTkSuQmCC", "base64") };
