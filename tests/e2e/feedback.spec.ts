import { expect, test } from "@playwright/test";
import axe from "axe-core";

const base = process.env.PLAYWRIGHT_BASE_URL;
test.skip(!base || !["localhost", "127.0.0.1"].includes(new URL(base).hostname), "Local UI fixtures only");

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/**", (route) => route.fulfill({ status: 401, json: { error: { code: "AUTH_REQUIRED" } } }));
});

test("save feedback is transient, pending actions cannot repeat, and toast dismissal is accessible", async ({ page }, testInfo) => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  let writes = 0;
  await page.route("**/api/v1/shelf", (route) => route.fulfill({ json: { data: { items: [] } } }));
  await page.route("**/api/v1/shelf/items", async (route) => {
    writes++;
    await pending;
    await route.fulfill({ json: { data: {} } });
  });
  await page.goto("/products/doritos-snack");
  await expect(page.getByRole("heading", { name: "Relationship explorer" })).toHaveCount(0);
  await expect(page.getByText("Relationship evidence and regional context", { exact: true })).toBeVisible();
  const save = page.getByRole("button", { name: "Save product", exact: true });
  await expect(save).toBeEnabled();
  await page.screenshot({ path: `artifacts/feedback/product-${testInfo.project.name}.png`, fullPage: true, scale: "css" });
  const width = (await save.boundingBox())!.width;
  await save.click();
  const busy = page.getByRole("button", { name: "Updating Saved…", exact: true });
  await expect(busy).toBeDisabled();
  await expect(busy).toHaveAttribute("aria-busy", "true");
  await expect(busy.locator(".shelf-spinner")).toBeVisible();
  expect((await busy.boundingBox())!.width).toBeCloseTo(width, 0);
  expect(writes).toBe(1);
  await page.screenshot({ path: `artifacts/feedback/pending-${testInfo.project.name}.png`, scale: "css" });
  release();
  const toast = page.locator("[data-sonner-toast]");
  await expect(toast).toContainText("Product saved for research");
  await expect(page.locator("main .result")).toHaveCount(0);
  await page.mouse.move(0, 0);
  await expect(toast).toHaveCount(0, { timeout: 9000 });
  await page.route("**/api/v1/shelf/items/**", (route) => route.fulfill({ status: 503, json: { error: { code: "SERVICE_UNAVAILABLE" } } }));
  await page.getByRole("button", { name: "Remove product from Saved" }).click();
  await expect(toast).toContainText("could not be updated");
  await expect(page.getByRole("button", { name: "Remove product from Saved" })).toBeEnabled();
  await page.addScriptTag({ content: axe.source });
  const audit = await page.evaluate(async () => (window as Window & { axe: typeof import("axe-core") }).axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa"] }));
  expect(audit.violations).toEqual([]);
  if (testInfo.project.name === "mobile") {
    const bounds = await toast.boundingBox();
    const navigation = await page.getByRole("navigation", { name: "Mobile navigation" }).boundingBox();
    expect(bounds!.y + bounds!.height).toBeLessThan(navigation!.y);
  } else {
    await page.setViewportSize({ width: 768, height: 950 });
    const bounds = await toast.boundingBox();
    const navigation = await page.getByRole("navigation", { name: "Mobile navigation" }).boundingBox();
    expect(bounds!.y + bounds!.height).toBeLessThan(navigation!.y);
    await page.setViewportSize({ width: 1280, height: 900 });
  }
  await page.screenshot({ path: `artifacts/feedback/toast-${testInfo.project.name}.png`, scale: "css" });
  const close = toast.getByRole("button", { name: "Close toast" });
  await close.focus();
  await page.keyboard.press("Enter");
  await expect(toast).toHaveCount(0);
});

test("loading communicates progress and respects reduced motion", async ({ page }, testInfo) => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/v1/issuer/asset/xstocks/PEPx", async (route) => {
    await pending;
    await route.fulfill({ json: { data: { listing: null } } });
  });
  await page.goto("/assets/xstocks/PEPx");
  const progress = page.getByRole("status").filter({ hasText: "Checking the current issuer feed" });
  await expect(progress).toBeVisible();
  await expect(progress.locator(".shelf-spinner")).toHaveCSS("animation-name", "none");
  await page.screenshot({ path: `artifacts/feedback/loading-${testInfo.project.name}.png`, scale: "css" });
  release();
  await expect(page.getByRole("heading", { name: "Asset unavailable", exact: true })).toBeVisible();
  await expect(progress).toHaveCount(0);
});
