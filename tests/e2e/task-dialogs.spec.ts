import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createSessionToken } from "../../src/lib/session";
import axe from "axe-core";

const fixtureBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
const enabled = process.env.FRONTEND_QA_FIXTURES === "true" && Boolean(
  fixtureBaseUrl && ["localhost", "127.0.0.1"].includes(new URL(fixtureBaseUrl).hostname)
);
test.skip(!enabled, "Requires the isolated authenticated frontend fixture server");

const issuer = "did:qa:frontend-owner";
const token = createSessionToken({
  sessionId: "frontend-qa-session",
  userId: `user-${createHash("sha256").update(issuer).digest("hex").slice(0, 24)}`,
  issuer,
  sessionVersion: 0,
}, "frontend-qa-local-only-not-a-secret");

test.beforeEach(async ({ context, baseURL, page }) => {
  await context.addCookies([{ name: "shelf_session", value: token, url: baseURL! }]);
  await page.route("**/api/v1/issuer/reviewed", (route) => route.fulfill({
    json: { data: { byCompany: {}, stale: [], unavailable: ["xStocks", "PreStocks"] } },
  }));
});

test("Send preserves the wallet, traps focus and restores its opener after Escape", async ({ page }, testInfo) => {
  await page.goto("/account/wallet");
  const opener = page.locator('a[href="/account/wallet/send"]').first();
  await expect(opener).toBeVisible();
  const walletHeading = await page.locator("main h1").textContent();
  await opener.click();
  const dialog = page.getByRole("dialog", { name: "Send assets" });
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(/\/account\/wallet\/send$/);
  await expect(page.locator("main h1")).toHaveText(walletHeading!);
  await expect(dialog.getByRole("heading", { name: "Send assets" })).toBeFocused();
  await expect(dialog.locator('[data-cta="C83"]')).toHaveCount(0);
  await dialog.getByLabel("Destination Solana address").fill("11111111111111111111111111111111");
  await dialog.locator('[data-cta="C82"]').click();
  await expect(dialog.locator('[data-cta="C83"]')).toBeVisible();
  await expect(dialog.locator('[data-cta="C82"]')).toHaveCount(0);
  await dialog.locator('[data-cta="C84"]').click();
  await expect(dialog.getByLabel("Destination Solana address")).toBeFocused();
  await expect(dialog.locator('[data-cta="C83"]')).toHaveCount(0);
  await dialog.getByLabel("Destination Solana address").fill("");

  const controls = dialog.locator('button:enabled, input:enabled, select:enabled, a[href]');
  await controls.last().focus();
  await page.keyboard.press("Tab");
  expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await controls.first().focus();
  await page.keyboard.press("Shift+Tab");
  expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);

  const bounds = (await dialog.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height + 1);
  await page.screenshot({ scale: "css", path: `artifacts/interaction-studio/send-dialog-${testInfo.project.name}.png` });

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(/\/account\/wallet$/);
  await expect(opener).toBeFocused();
  await expect(page.locator("body")).not.toHaveCSS("pointer-events", "none");
});

test("Sell opens over the holding and follows browser back and forward", async ({ page }, testInfo) => {
  await page.goto("/portfolio/instrument-pepx");
  await page.locator('a[href="/portfolio/instrument-pepx/sell"]').click();
  const dialog = page.getByRole("dialog", { name: "Sell to USDC" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Displayed token quantity")).toBeVisible();
  await expect(dialog.locator('[data-cta="C80"]')).toBeEnabled();
  await page.screenshot({ scale: "css", path: `artifacts/interaction-studio/sell-dialog-${testInfo.project.name}.png` });
  await page.goBack();
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(/\/portfolio\/instrument-pepx$/);
  await page.goForward();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Close sell dialog" }).click();
  await expect(page).toHaveURL(/\/portfolio\/instrument-pepx$/);
  await expect(dialog).toHaveCount(0);
});

test("Share keeps selection approval explicit and clears on onward navigation", async ({ page }, testInfo) => {
  await page.goto("/saved");
  await page.locator('a[href="/saved/share"]').first().click();
  const dialog = page.getByRole("dialog", { name: "Share your research" });
  await expect(dialog).toBeVisible();
  const create = dialog.locator('[data-cta="C90"]');
  await expect(create).toBeDisabled();
  await dialog.getByRole("checkbox", { name: "Select Doritos" }).check();
  await expect(create).toBeDisabled();
  await dialog.getByRole("checkbox", { name: /I have reviewed this selection/ }).check();
  await expect(create).toBeEnabled();
  await page.screenshot({ scale: "css", path: `artifacts/interaction-studio/share-dialog-${testInfo.project.name}.png` });
  await dialog.locator('a[href="/products/doritos-snack"]').click();
  await expect(page).toHaveURL(/\/products\/doritos-snack$/);
  await expect(dialog).toHaveCount(0);
  await expect(page.locator("main h1")).toContainText("Doritos");
});

test("Direct task URLs keep the full-page fallback and member guards", async ({ page, context }) => {
  for (const path of ["/account/wallet/send", "/portfolio/instrument-pepx/sell", "/saved/share"]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.locator("main h1")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  await context.clearCookies();
  const response = await page.request.get("/account/wallet/send", { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(response.headers().location).toContain("/sign-in?returnTo=");
});

test("A cleared session cannot open private task content from a stale source page", async ({ page, context }) => {
  // Prevent a prefetch made while signed in from satisfying the next navigation.
  await page.route((url) => url.pathname === "/saved/share", async (route) => {
    if (route.request().headers()["next-router-prefetch"]) await route.abort();
    else await route.continue();
  });
  await page.goto("/saved");
  await expect(page.locator('a[href="/saved/share"]').first()).toBeVisible();
  await context.clearCookies();
  await page.locator('a[href="/saved/share"]').first().click();
  await expect(page).toHaveURL(/\/sign-in\?returnTo=/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("Task dialogs retain accessible names, contrast and reduced-motion feedback", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const [source, destination] of [
    ["/account/wallet", "/account/wallet/send"],
    ["/portfolio/instrument-pepx", "/portfolio/instrument-pepx/sell"],
    ["/saved", "/saved/share"],
  ]) {
    await page.goto(source);
    await page.locator(`a[href="${destination}"]`).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator(".loading-feedback")).toHaveCount(0);
    await dialog.evaluate(async (element) => {
      await Promise.all(element.getAnimations({ subtree: true }).filter((animation) => animation.effect?.getTiming().iterations !== Infinity).map((animation) => animation.finished.catch(() => {})));
    });
    expect(await dialog.evaluate((element) => getComputedStyle(element).transform)).toBe("none");
    await page.addScriptTag({ content: axe.source });
    const violations = await page.evaluate(async () => {
      const engine = (window as Window & { axe: typeof import("axe-core") }).axe;
      return (await engine.run(".task-dialog", { runOnly: ["wcag2a", "wcag2aa", "wcag21aa"] })).violations.map((violation) => ({ id: violation.id, nodes: violation.nodes.map((node) => node.target) }));
    });
    expect(violations, destination).toEqual([]);
  }
});
