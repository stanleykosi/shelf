import { expect, test } from "@playwright/test";
import axe from "axe-core";
import { scanMatches, scanUpload } from "../fixtures/scan";

const base = process.env.PLAYWRIGHT_BASE_URL;
test.skip(!base || !["localhost", "127.0.0.1"].includes(new URL(base).hostname), "Local synthetic fixtures only");

// UI fixture only: never a claim about current issuer availability or market status.
const listing = { provider: "xstocks", asset: {
  name: "PepsiCo", symbol: "PEPx", underlyingSymbol: "PEP", companyId: "issuer:xstocks:PEPx",
  mint: "synthetic-ui-fixture", description: "Issuer-defined exposure to PepsiCo, a global food and beverage company.",
  exchange: "NASDAQ", marketOpen: false, marketPeriod: "Closed", tradingHalted: false,
  observedAt: "2026-09-25T12:00:00Z",
} };

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/**", (route) => route.fulfill({ status: 401, json: { error: { code: "AUTH_REQUIRED" } } }));
  await page.route("**/api/v1/issuer/reviewed", (route) => route.fulfill({ json: { data: { byCompany: { "company-pepsico": [listing] }, unavailable: [], stale: [] } } }));
  await page.route("**/api/v1/issuer/asset/xstocks/PEPx", (route) => route.fulfill({ json: { data: { listing } } }));
});

test("connected research layouts stay readable and accessible across viewport sizes", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Explicit viewport matrix");
  test.setTimeout(180_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const routes = [
    ["product", "/products/doritos-snack"], ["brand", "/brands/doritos"],
    ["company", "/companies/pepsico"], ["issuer", "/assets/xstocks/PEPx"],
    ["library", "/learn"], ["article", "/learn/brands-and-companies"],
  ];
  for (const width of [360, 390, 430, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    for (const [name, path] of routes) {
      await page.goto(path);
      await expect(page.locator(".journey-page h1")).toBeVisible();
      await expect(page.locator(".journey-state")).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name} at ${width}`).toBe(true);
      if (width === 390 || width === 1440) {
        await page.addScriptTag({ content: axe.source });
        const audit = await page.evaluate(async () => (window as Window & { axe: typeof import("axe-core") }).axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa"] }));
        expect.soft(audit.violations, `${name} accessibility at ${width}`).toEqual([]);
        if (process.env.JOURNEY_CAPTURE) await page.screenshot({ path: `artifacts/discovery-journey/${name}-${width}.png`, fullPage: true });
      }
    }
  }
});

test("issuer failures recover and source identity stays separate from purchase approval", async ({ page }) => {
  let calls = 0;
  await page.route("**/api/v1/issuer/asset/xstocks/PEPx", (route) => {
    calls++;
    return calls === 1 ? route.fulfill({ status: 503, json: { error: { code: "PROVIDER_UNAVAILABLE" } } }) : route.fulfill({ json: { data: { listing } } });
  });
  await page.goto("/assets/xstocks/PEPx");
  await expect(page.getByRole("heading", { name: "Issuer information unavailable" })).toBeVisible();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("heading", { name: "PepsiCo", exact: true })).toBeVisible();
  await page.getByText("Token identity", { exact: true }).click();
  await expect(page.locator("code")).toHaveText("synthetic-ui-fixture");
  await page.getByRole("button", { name: "Save to watchlist" }).click();
  await expect(page.locator("[data-sonner-toast]")).toContainText("Sign in");
  await page.addScriptTag({ content: axe.source });
  const audit = await page.evaluate(async () => (window as Window & { axe: typeof import("axe-core") }).axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa"] }));
  expect(audit.violations).toEqual([]);
  await page.getByRole("link", { name: "Review a purchase" }).click();
  await expect(page).toHaveURL(/\/sign-in\?/);
  await expect(page.getByRole("heading", { name: "Continue your research." })).toBeVisible();
});

test("private issuer facts and unavailable instruments retain their distinct states", async ({ page }) => {
  await page.route("**/api/v1/issuer/asset/prestocks/EXAMPLE", (route) => route.fulfill({ json: { data: { listing: {
    provider: "prestocks", asset: { ...listing.asset, name: "Example private company", symbol: "EXAMPLE", issuerUrl: "https://prestocks.com/", markPriceUsd: "10", tokenPriceUsd: "11", markValuationUsd: "1000000", impliedValuationUsd: "1100000", supplyUi: "100000", premiumLabel: "10% premium" },
  } } } }));
  await page.goto("/assets/prestocks/EXAMPLE");
  await expect(page.getByRole("heading", { name: "Private market", exact: true })).toBeVisible();
  await expect(page.getByText("10% premium", { exact: true })).toBeVisible();
  await expect(page.getByText(/Liquidity and exit are not guaranteed/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Issuer information", exact: true })).toHaveAttribute("href", "https://prestocks.com/");
  await page.route("**/api/v1/issuer/asset/prestocks/EXAMPLE", (route) => route.fulfill({ json: { data: { listing: null } } }));
  await page.reload();
  await expect(page.getByRole("heading", { name: "Asset unavailable", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Review a purchase" })).toHaveCount(0);
});

test("result review and correction retain accessible keyboard control", async ({ page }, testInfo) => {
  await page.route("**/api/v1/discovery/image", (route) => route.fulfill({ json: { data: scanMatches } }));
  await page.goto("/scan?method=upload");
  await page.getByLabel("Choose image file").setInputFiles(scanUpload);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Identify products", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Scan results", exact: true })).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Candidates reviewed" })).toHaveAttribute("value", "0");
  await page.getByRole("button", { name: "Confirm Product", exact: true }).click();
  await expect(page.getByRole("progressbar", { name: "Candidates reviewed" })).toHaveAttribute("value", "1");
  await page.addScriptTag({ content: axe.source });
  const audit = await page.evaluate(async () => (window as Window & { axe: typeof import("axe-core") }).axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa"] }));
  expect(audit.violations).toEqual([]);
  if (process.env.JOURNEY_CAPTURE) {
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await expect.poll(() => page.locator(".scan-candidate-identity img").evaluate((element) => {
      const image = element as HTMLImageElement;
      return image.complete && image.naturalWidth > 0;
    })).toBe(true);
    await page.screenshot({ path: `artifacts/discovery-journey/results-${testInfo.project.name}.png`, fullPage: true, scale: "css" });
  }
  await page.getByRole("button", { name: "Change match", exact: true }).click();
  await expect(page.getByRole("button", { name: "Close replacement search" })).toBeFocused();
  if (process.env.JOURNEY_CAPTURE) {
    await expect.poll(() => page.getByRole("dialog").locator("img").first().evaluate((element) => {
      const image = element as HTMLImageElement;
      return image.complete && image.naturalWidth > 0;
    })).toBe(true);
    await page.screenshot({ path: `artifacts/discovery-journey/correction-${testInfo.project.name}.png`, scale: "css" });
  }
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Change match", exact: true })).toBeFocused();
});
