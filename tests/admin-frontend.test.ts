// @vitest-environment jsdom
import { useReducedMotionInDomTests } from "./dom-motion";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const notifications = vi.hoisted(() => ({ notify: vi.fn() }));
vi.mock("@/components/notifications", () => ({ useNotification: () => notifications.notify }));
const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), fresh: vi.fn() }));
vi.mock("@/lib/api-client", () => ({ apiRequest: api.get, postAdminJson: api.post, freshApiRequest: api.fresh }));
import { ResearchAdminScreen } from "@/components/screens/research-admin";

let root: Root;
let host: HTMLDivElement;
beforeEach(() => {
  useReducedMotionInDomTests();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, React });
  notifications.notify.mockReset();
  api.get.mockReset(); api.post.mockReset(); api.fresh.mockReset();
  api.get.mockImplementation(async (path: string) => {
    if (path === "admin/health") return { environment: "test", providerStatus: "incomplete", network: "devnet", realTrading: false, pendingOrders: 0, openGates: [] };
    if (path === "admin/budgets") return { sponsorSpentLamports: "0", sponsorReservedLamports: "0", aiSpentMicrousd: 0 };
    return [];
  });
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); });
async function render() { await act(async () => root.render(React.createElement(ResearchAdminScreen, { area: "operations" }))); }
function button(label: string) { return [...host.querySelectorAll("button")].find((item) => (item.getAttribute("aria-label") ?? item.textContent) === label)!; }
async function change(selector: string, value: string) {
  const control = host.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement;
  const prototype = control.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  await act(async () => { Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(control, value); control.dispatchEvent(new Event("input", { bubbles: true })); });
}
async function acknowledge() { await act(async () => (host.querySelector('[type="checkbox"]') as HTMLInputElement).click()); }

describe("owner workspace safety", () => {
  it("requires both a reason and acknowledgement before material actions", async () => {
    await render();
    expect(button("Pause purchases").disabled).toBe(true);
    await change("textarea", " Investigate provider incident ");
    expect(button("Pause purchases").disabled).toBe(true);
    await acknowledge();
    expect(button("Pause purchases").disabled).toBe(false);
    api.post.mockResolvedValue({ buys: true });
    await act(async () => button("Pause purchases").click());
    expect(api.post).toHaveBeenCalledWith("admin/pauses", { scope: "buys", enabled: true, reason: "Investigate provider incident" });
    expect(button("Pause purchases").disabled).toBe(true);
    expect(notifications.notify).toHaveBeenCalledWith("Purchase pause enabled.");
  });
  it("invalidates acknowledgement when the reason changes and preserves backend failure", async () => {
    await render();
    await change("textarea", "First reason"); await acknowledge();
    await change("textarea", "Revised reason");
    expect(button("Request reconciliation").disabled).toBe(true);
    await acknowledge();
    api.post.mockRejectedValue(new Error("RECONCILIATION_UNAVAILABLE"));
    await act(async () => button("Request reconciliation").click());
    expect(host.querySelector('[role="alert"]')?.textContent).toContain("RECONCILIATION_UNAVAILABLE");
    expect(host.textContent).not.toContain("Reconciliation requested.");
  });
  it("gets a fresh-auth diagnostic and rejects unverified redaction", async () => {
    await render();
    await change("#admin-diagnostic-order", "fixture/order");
    api.fresh.mockResolvedValue({ orderId: "fixture/order", status: "unknown", containsSecrets: true, containsSignedBytes: false });
    await act(async () => button("Export redacted diagnostic").click());
    expect(api.fresh).toHaveBeenCalledWith("admin/diagnostics/fixture%2Forder", "admin_action");
    expect(host.querySelector('[role="alert"]')?.textContent).toContain("redaction could not be verified");
    expect(api.post).not.toHaveBeenCalled();
  });
  it("catches export failures without claiming a download", async () => {
    await render(); await change("#admin-diagnostic-order", "fixture-order");
    api.fresh.mockRejectedValue(new Error("FRESH_AUTH_REQUIRED"));
    await act(async () => button("Export redacted diagnostic").click());
    expect(host.querySelector('[role="alert"]')?.textContent).toContain("FRESH_AUTH_REQUIRED");
    expect(host.textContent).not.toContain("diagnostic downloaded");
  });
});
