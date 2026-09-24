import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";
import axe from "axe-core";
import { createSessionToken } from "../../src/lib/session";

const base = process.env.PLAYWRIGHT_BASE_URL;
const enabled = process.env.FRONTEND_QA_FIXTURES === "true" && Boolean(base && ["localhost", "127.0.0.1"].includes(new URL(base).hostname));
test.skip(!enabled, "Synthetic authenticated localhost QA only");
const issuer = "did:qa:frontend-owner";
const token = createSessionToken({ sessionId: "frontend-qa-session", userId: `user-${createHash("sha256").update(issuer).digest("hex").slice(0, 24)}`, issuer, sessionVersion: 0 }, "frontend-qa-local-only-not-a-secret");
const screens = [["company", "/companies/pepsico"], ["scan", "/scan"], ["assistant", "/assistant"], ["portfolio", "/portfolio"], ["account", "/account"]] as const;

test.beforeEach(async ({ context, page, baseURL }) => {
  await context.addCookies([{ name: "shelf_session", value: token, url: baseURL! }]);
  await page.route("**/api/v1/issuer/reviewed", (route) => route.fulfill({ json: { data: { byCompany: {}, stale: [], unavailable: ["xStocks", "PreStocks"] } } }));
  await page.emulateMedia({ reducedMotion: "reduce" });
});

for (const width of [390, 430, 768, 1280, 1440]) {
  test(`five gold-standard compositions at ${width}px`, async ({ page }, info) => {
    test.skip(info.project.name !== "chromium", "Explicit viewport matrix");
    test.setTimeout(240_000);
    await page.setViewportSize({ width, height: width < 820 ? 844 : 1000 });
    const failures: unknown[] = [];
    for (const [name, route] of screens) {
      await page.goto(route);
      await expect(page.locator("main h1")).toBeVisible();
      if (name === "portfolio") await expect(page.getByRole("heading", { name: "PEPx", exact: true })).toBeVisible();
      if (name === "account") await expect(page.getByText(/^Magic identity ·/)).toBeVisible();
      if (name === "assistant") await expect(page.getByText("Checking account access…")).toHaveCount(0);
      await page.locator("main img").evaluateAll((images) => images.forEach((image) => { (image as HTMLImageElement).loading = "eager"; }));
      await page.waitForFunction(() => Array.from(document.querySelectorAll<HTMLImageElement>("main img")).every((image) => image.complete), null, { timeout: 40_000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${name} overflow`).toBe(true);
      if (name === "company") {
        const separated = await page.locator(".company-exhibit").evaluateAll((exhibits) => exhibits.every((exhibit) => {
          const media = exhibit.querySelector(".research-product-image")!.getBoundingClientRect();
          const caption = exhibit.querySelector(".company-exhibit-caption")!.getBoundingClientRect();
          return media.height > 0 && media.bottom <= caption.top;
        }));
        expect(separated, "Product exhibits must not overlap their captions").toBe(true);
      }
      await page.addScriptTag({ content: axe.source });
      const result = await page.evaluate(async () => (window as Window & { axe: typeof import("axe-core") }).axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa"] }));
      for (const violation of result.violations) failures.push({ name, width, id: violation.id, nodes: violation.nodes.map((node) => node.target) });
      if (width === 390 || width === 1440) {
        await page.screenshot({ path: `artifacts/platform-art-direction/${name}-${width}.png`, fullPage: true });
        await page.screenshot({ path: `artifacts/platform-art-direction/${name}-${width}-viewport.png` });
      }
      if (width < 820) {
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        const last = page.locator("main a:visible, main button:visible").last();
        await last.scrollIntoViewIfNeeded();
        const action = await last.boundingBox();
        const nav = await page.locator(".mobile-navigation").boundingBox();
        if (action && nav) expect(action.y + action.height, `${name} bottom clearance`).toBeLessThanOrEqual(nav.y + 1);
      }
    }
    await info.attach("accessibility", { body: JSON.stringify(failures, null, 2), contentType: "application/json" });
    expect(failures).toEqual([]);
  });
}

test("account categories preserve controls and deliberate deletion", async ({ page }) => {
  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "Profile", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Export my data" })).toBeHidden();
  await page.getByRole("button", { name: "Privacy", exact: true }).click();
  await expect(page.getByRole("button", { name: "Export my data" })).toBeVisible();
  await page.getByText("Delete Shelf account", { exact: true }).click();
  const deletion = page.getByRole("button", { name: "Authenticate and delete Shelf account" });
  await expect(deletion).toBeDisabled();
  await page.getByLabel("I understand that public blockchain activity and required records remain.").check();
  await expect(deletion).toBeDisabled();
  await page.getByLabel("I understand that my wallet is independent and will not be deleted.").check();
  await expect(deletion).toBeEnabled();
  await page.getByRole("button", { name: "Security", exact: true }).click();
  await expect(page.getByRole("button", { name: "Check wallet signing" })).toBeVisible();
  await page.getByRole("button", { name: "Sessions", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign out all sessions" })).toBeVisible();
  await page.addScriptTag({ content: axe.source });
  for (const category of ["Profile", "Privacy", "Security", "Sessions"]) {
    await page.getByRole("button", { name: category, exact: true }).click();
    const result = await page.evaluate(async () => (window as Window & { axe: typeof import("axe-core") }).axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa"] }));
    expect(result.violations, `${category} accessibility`).toEqual([]);
  }
  // No signing, account mutation or external provider call is executed.
});

test("assistant prompt and consent retain user control", async ({ page }) => {
  await page.goto("/assistant?company=pepsico");
  await page.getByRole("button", { name: "How are brands and companies connected?" }).click();
  await expect(page.getByLabel("Your research question")).toBeFocused();
  await expect(page.getByRole("button", { name: "Send question" })).toBeDisabled();
  await page.getByRole("checkbox").check();
  await expect(page.getByRole("button", { name: "Send question" })).toBeEnabled();
  await page.getByRole("button", { name: "Remove context" }).click();
  await expect(page.locator(".assistant-source-context")).toHaveCount(0);
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(page.getByLabel("Your research question")).toHaveValue("");
});
