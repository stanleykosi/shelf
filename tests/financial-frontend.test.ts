// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Order, Holding } from "@/domain/types";

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), push: vi.fn() }));
vi.mock("@/lib/api-client", () => ({ apiRequest: api.get, postJson: api.post, freshPostJson: api.post, freshApiRequest: api.get }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: api.push, replace: vi.fn() }), useSearchParams: () => new URLSearchParams() }));
vi.mock("@/providers/magic-browser", () => ({ signMagicSolanaTransaction: vi.fn() }));
import { OrderStatusScreen, OrderReviewScreen, PortfolioScreen, SellScreen } from "@/components/screens/financial";

let root: Root;
let host: HTMLDivElement;
const order: Order = { id: "fixture-order", userId: "fixture-user", clientIntentId: "fixture-intent", type: "buy", status: "draft", version: 1, createdAt: "2026-09-24T00:00:00Z", legs: [{ id: "leg", position: 0, companyId: "company-pepsico", instrumentId: "instrument-pepx", side: "buy", inventoryScope: "tracked", requestedInputRaw: "10000000", status: "draft" }] };
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, React });
  api.get.mockReset(); api.post.mockReset(); api.push.mockReset();
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });
async function render(component: React.ReactElement) { await act(async () => root.render(component)); }

describe("financial frontend state integrity", () => {
  it("does not label draft orders partly completed", async () => {
    api.get.mockResolvedValue(order);
    await render(React.createElement(OrderStatusScreen, { orderId: order.id }));
    expect(host.querySelector("h1")?.textContent).toBe("Order requires review");
    expect(host.textContent).not.toContain("Partly completed");
  });
  it("does not offer a retry for unknown outcomes", async () => {
    api.get.mockResolvedValue({ ...order, status: "outcome_unknown", legs: [{ ...order.legs[0], status: "outcome_unknown" }] });
    await render(React.createElement(OrderStatusScreen, { orderId: order.id }));
    expect(host.textContent).toContain("Do not submit another order");
    expect(host.textContent).not.toContain("Retry remaining purchase");
  });
  it("shows an error, not a fabricated empty portfolio, when loading fails", async () => {
    api.get.mockRejectedValue(new Error("READ_UNAVAILABLE"));
    await render(React.createElement(PortfolioScreen));
    expect(host.textContent).toContain("Portfolio unavailable");
    expect(host.textContent).not.toContain("0 USDC");
  });
  it("shows recovery rather than an endless order skeleton", async () => {
    api.get.mockRejectedValue(new Error("ORDER_NOT_FOUND"));
    await render(React.createElement(OrderReviewScreen, { orderId: "missing" }));
    expect(host.textContent).toContain("Order unavailable");
    expect(host.textContent).toContain("Try again");
  });
  it("disables approval for an expired quote and requires a fresh review", async () => {
    api.get.mockResolvedValue(order);
    api.post.mockResolvedValue({ id: "expired-quote", version: 1, inputRaw: "10000000", estimatedOutputRaw: "12345678", minimumOutputRaw: "12000000", feeRaw: "50000", feeBps: 50, slippageBps: 50, priceImpactBps: 10, expiresAt: "2020-01-01T00:00:00Z", reviewDigest: "fixture-digest", routeLabel: "Fixture route", estimatedLamports: "5000", source: "jupiter", executionAvailable: true });
    await render(React.createElement(OrderReviewScreen, { orderId: order.id }));
    await act(async () => (host.querySelector('[data-cta="C67"]') as HTMLButtonElement).click());
    expect(host.textContent).toContain("This quote has expired");
    expect(host.querySelector('[data-cta="C63"]')).toBeNull();
    expect(host.textContent).toContain("0.12345678 PEPx");
  });
  it("keeps exact sell-all semantics and does not create an order while loading", async () => {
    const holding: Holding = { instrumentId: "instrument-pepx", companyId: "company-pepsico", symbol: "PEPx", rawAmount: "123456789", reservedRaw: "100000000", externalRaw: "0", decimals: 8, multiplier: "1", totalCostUsdcRaw: "10000000" };
    api.get.mockResolvedValue(holding);
    api.post.mockResolvedValue(order);
    await render(React.createElement(SellScreen, { instrumentId: holding.instrumentId }));
    expect(host.textContent).toContain("Available: 0.23456789 units");
    await act(async () => (host.querySelector('[data-cta="C80"]') as HTMLButtonElement).click());
    expect(api.post).toHaveBeenCalledWith("orders", expect.objectContaining({ sellAll: true, instrumentId: holding.instrumentId }));
    expect(api.post.mock.calls[0][1]).not.toHaveProperty("amountRaw");
  });
});
