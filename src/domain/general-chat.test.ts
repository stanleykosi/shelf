import { describe, expect, it } from "vitest";
import { generalChatFacts } from "@/domain/general-chat";

describe("general assistant grounding", () => {
  it("includes reviewed learning and relationships without stale token mints or prices", () => {
    const facts = generalChatFacts();
    expect(facts.some((fact) => fact.id === "learn:stock-tokens")).toBe(true);
    const pepsico = facts.find((fact) => fact.id === "catalog:pepsico");
    expect(pepsico?.claim).toContain("Doritos snack");
    expect(pepsico?.claim).toContain("verifiedAt");
    expect(pepsico?.claim).not.toContain("mint");
    expect(pepsico?.claim).not.toContain("priceUsd");
  });
});
