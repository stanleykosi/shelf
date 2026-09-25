import { expect, test } from "@playwright/test";
import axe from "axe-core";
import { scanUpload } from "../fixtures/scan";

const base = process.env.PLAYWRIGHT_BASE_URL;
test.skip(!base || !["localhost", "127.0.0.1"].includes(new URL(base).hostname), "Local synthetic fixtures only; never paid inference");

// These are UI fixtures, not a snapshot or claim about current issuer availability.
const listings = [
  { name: "Apple", symbol: "AAPLx", sector: "Technology", provider: "xstocks" },
  { name: "NVIDIA", symbol: "NVDAx", sector: "Technology", provider: "xstocks" },
  { name: "PepsiCo", symbol: "PEPx", sector: "Food & drink", provider: "xstocks" },
  { name: "OpenAI", symbol: "OPENAI", sector: "Technology", provider: "prestocks" },
  { name: "Amazon", symbol: "AMZNx", sector: "Retail", provider: "xstocks" },
  { name: "The Walt Disney Company", symbol: "DISx", sector: "Media", provider: "xstocks" },
].map(({ name, symbol, sector, provider }) => ({
  sector, provider,
  asset: {
    name, symbol, companyId: `issuer:${provider}:${symbol}`, mint: "synthetic-ui-fixture",
    logoUrl: provider === "prestocks" ? "https://prestocks.com/logos/openai.png" : `https://xstocks-metadata.backed.fi/logos/tokens/${symbol}.png`,
  },
}));

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/issuer/directory", (route) => route.fulfill({ json: { data: { featured: listings, listings, stale: [], unavailable: [] } } }));
  await page.route("**/api/v1/me", (route) => route.fulfill({ status: 401, json: { error: { code: "AUTH_REQUIRED" } } }));
  await page.route("**/api/v1/discovery/query", (route) => route.fulfill({ json: { data: { kind: "company", listings: [listings[0]], matches: [], stale: [], unavailable: [] } } }));
});

test("themes filter actual listings and move keyboard focus to the directory", async ({ page }) => {
  await page.goto("/discover");
  await expect(page.locator(".issuer-spotlight-table tbody tr")).toHaveCount(6);
  await page.getByRole("button", { name: /Part of your every day/ }).click();
  await expect(page.locator("#spotlight-heading")).toBeFocused();
  await expect(page.locator(".issuer-spotlight-table tbody tr")).toHaveCount(1);
  await expect(page.getByRole("link", { name: "View PepsiCo details" })).toBeVisible();
  await expect(page).toHaveURL(/sector=Food/);
  await page.reload();
  await expect(page.locator(".issuer-spotlight-table tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: /Before the public market/ }).click();
  await expect(page.getByRole("link", { name: "View OpenAI details" })).toHaveAttribute("href", "/assets/prestocks/OPENAI");
  await expect(page.locator(".issuer-spotlight-table tbody tr")).toHaveCount(1);
  await expect(page).toHaveURL(/market=private/);
});

test("suggestions prepare a query, submission is deliberate, and clearing restores discovery", async ({ page }) => {
  let requests = 0;
  page.on("request", (request) => { if (request.url().includes("/discovery/query")) requests++; });
  await page.goto("/discover");
  await page.getByRole("button", { name: "Apple", exact: true }).click();
  const input = page.getByRole("searchbox", { name: "Search a company or product" });
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("Apple");
  expect(requests).toBe(0);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Apple", exact: true })).toBeVisible();
  expect(requests).toBe(1);
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(page.getByRole("region", { name: "Explore company themes" })).toBeVisible();
  await expect(input).toHaveValue("");
  await page.keyboard.press("Control+k");
  await expect(input).toBeFocused();
});

test("feed failure has a useful retry and does not manufacture listings", async ({ page }) => {
  let attempts = 0;
  await page.route("**/api/v1/issuer/directory", (route) => {
    attempts++;
    return attempts === 1
      ? route.fulfill({ status: 503, json: { error: { code: "PROVIDER_UNAVAILABLE" } } })
      : route.fulfill({ json: { data: { featured: listings, listings, stale: ["PreStocks"], unavailable: [] } } });
  });
  await page.goto("/discover");
  await expect(page.getByRole("heading", { name: "Company listings unavailable" })).toBeVisible();
  await expect(page.locator(".issuer-spotlight-table")).toHaveCount(0);
  await page.getByRole("button", { name: "Retry listings" }).click();
  await expect(page.locator(".issuer-spotlight-table tbody tr")).toHaveCount(6);
  await expect(page.getByText(/PreStocks feed is stale/)).toBeVisible();
});

test("scan progress follows local preview and upload never sends without permission", async ({ page }) => {
  let calls = 0;
  await page.route("**/api/v1/discovery/image", (route) => { calls++; return route.abort(); });
  await page.goto("/scan");
  await expect(page.locator(".scan-journey [aria-current=step]")).toContainText("Choose input");
  await page.getByLabel("Choose image file").setInputFiles(scanUpload);
  await expect(page.getByRole("heading", { name: "Check your image" })).toBeVisible();
  await expect(page.locator(".scan-journey [aria-current=step]")).toContainText("Review & consent");
  await expect(page.getByRole("button", { name: "Identify products", exact: true })).toBeDisabled();
  expect(calls).toBe(0);
  await page.getByRole("checkbox").check();
  await expect(page.getByRole("button", { name: "Identify products", exact: true })).toBeEnabled();
  await page.getByLabel("Choose image file").setInputFiles(scanUpload);
  await expect(page.getByRole("checkbox")).not.toBeChecked();
  expect(calls).toBe(0);
});

test("preview consent and alternate inputs remain accessible", async ({ page }) => {
  for (const method of ["upload", "barcode", "link", "search"]) {
    await page.goto(`/scan?method=${method}`);
    if (method === "upload") {
      await page.getByLabel("Choose image file").setInputFiles(scanUpload);
      await expect(page.getByRole("heading", { name: "Check your image" })).toBeVisible();
    }
    await expect(page.locator(".scan-studio-entry")).toBeVisible();
    await page.locator("main").evaluate(async (element) => {
      const entrances = element.getAnimations({ subtree: true }).filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity);
      await Promise.all(entrances.map((animation) => animation.finished.catch(() => undefined)));
    });
    await page.addScriptTag({ content: axe.source });
    const audit = await page.evaluate(async () => (window as Window & { axe: typeof import("axe-core") }).axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa"] }));
    expect(audit.violations.map((violation) => ({ id: violation.id, nodes: violation.nodes.map((node) => node.failureSummary) })), `${method} accessibility`).toEqual([]);
  }
});

test("responsive composition, automated accessibility, reduced motion and navigation clearance", async ({ page }, info) => {
  test.skip(info.project.name !== "chromium", "One explicit desktop/mobile viewport matrix");
  test.setTimeout(240_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const issues: unknown[] = [];
  for (const width of [360, 390, 430, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: width < 820 ? 844 : 1000 });
    for (const path of ["discover", "scan"]) {
      await page.goto(`/${path}`);
      await page.evaluate(async () => { await document.fonts.ready; });
      await expect(page.locator("main h1")).toBeVisible();
      await expect(page.locator("main h1")).toHaveCSS("font-family", /raleway/i);
      if (path === "discover") await expect(page.locator(".issuer-spotlight-table tbody tr")).toHaveCount(6);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path} at ${width}px`).toBe(true);
      await page.addScriptTag({ content: axe.source });
      const audit = await page.evaluate(async () => (window as Window & { axe: typeof import("axe-core") }).axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa"] }));
      issues.push(...audit.violations.map((violation) => ({ path, width, id: violation.id, nodes: violation.nodes.map((node) => ({ target: node.target, summary: node.failureSummary })) })));
      const moving = await page.locator("main").evaluate((element) => element.getAnimations({ subtree: true }).some((animation) => (animation.effect as KeyframeEffect).getKeyframes().some((frame) => frame.transform && frame.transform !== "none")));
      expect(moving, "Reduced motion must not move content").toBe(false);
      if (path === "discover") {
        await page.locator(".discovery-theme").first().hover();
        await expect(page.locator(".discovery-theme-art").first()).toHaveCSS("transform", "none");
        await page.mouse.move(0, 0);
      }
      if (process.env.STUDIO_CAPTURE === "true" && [390, 1440].includes(width)) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.locator("main img").evaluateAll(async (images) => Promise.all(images.map((image) => (image as HTMLImageElement).decode().catch(() => undefined))));
        await page.screenshot({ path: `artifacts/discover-scan/${path}-${width}.png`, fullPage: true });
        await page.screenshot({ path: `artifacts/discover-scan/${path}-${width}-viewport.png` });
      }
      if (width < 820) {
        const last = page.locator("main a:visible, main button:visible").last();
        await last.scrollIntoViewIfNeeded();
        const action = await last.boundingBox();
        const navigation = await page.locator(".mobile-navigation").boundingBox();
        expect(action!.y + action!.height).toBeLessThanOrEqual(navigation!.y + 1);
      }
    }
  }
  await info.attach("accessibility", { body: JSON.stringify(issues, null, 2), contentType: "application/json" });
  expect(issues).toEqual([]);
});
