import { expect, test } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL;
test.skip(!baseURL || !["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname), "Local design study only");

const spotlightListings = [
  { provider: "xstocks", sector: "Technology", asset: { companyId: "issuer:xstocks:AAPLx", name: "Apple", symbol: "AAPLx" } },
  { provider: "prestocks", sector: "Technology", asset: { companyId: "issuer:prestocks:OPENAI", name: "OpenAI", symbol: "OPENAI" } },
];

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/issuer/spotlight", (route) => route.fulfill({
    json: { data: { featured: spotlightListings, listings: spotlightListings, unavailable: [], stale: [] } },
  }));
  await page.route("**/api/v1/discovery/query", (route) => route.fulfill({
    json: { data: { kind: "company", listings: [spotlightListings[0]], matches: [], unavailable: [], stale: [] } },
  }));
});

test("comparison keeps both concepts accessible and preserves search/filter context", async ({ page }) => {
  await page.goto("/?concept=2");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("The things you know.");
  await page.getByRole("navigation", { name: "Example product" }).getByRole("button", { name: "Apple" }).click();
  await expect(page.getByRole("heading", { name: "Behind Apple." })).toBeVisible();
  await expect(page.locator(".c2-entity-trail").getByRole("link", { name: /iPhone/ })).toHaveAttribute("href", "/products/apple-iphone");
  await page.getByLabel("Search products, brands, or companies").fill("Apple");
  await page.getByRole("button", { name: "Discover", exact: true }).click();
  await expect(page).toHaveURL(/concept=2.*q=Apple/);
  await expect(page.getByRole("heading", { name: "Apple", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /View AAPLx issuer asset/ })).toHaveAttribute("href", "/assets/xstocks/AAPLx");
  const comparison = page.getByRole("navigation", { name: "Design comparison" });
  await comparison.getByRole("link", { name: /01 Concept 1/ }).click();
  await expect(page).toHaveURL(/q=Apple/);
  await expect(page).toHaveURL(/concept=1/);
  await expect(comparison.getByRole("link", { name: /01 Concept 1/ })).toHaveAttribute("aria-current", "page");
  await comparison.getByRole("link", { name: /02 Concept 2/ }).click();
  await expect(page).toHaveURL(/concept=2/);
  await expect(page.getByRole("searchbox", { name: "Search a company or product" })).toHaveValue("Apple");
});

test("motion can be paused and reduced-motion preferences keep content visible", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?concept=2");
  await expect(page.getByRole("heading", { name: "The things you know.", exact: false })).toBeVisible();
  const animated = await page.locator(".c2-home").evaluate((root) => root.getAnimations({ subtree: true }).length);
  expect(animated).toBe(0);
  await page.getByRole("button", { name: "Pause motion" }).click();
  await expect(page.locator(".c2-home")).toHaveAttribute("data-motion", "paused");
  await page.getByRole("button", { name: "Enable motion" }).click();
  await expect(page.locator(".c2-home")).toHaveAttribute("data-motion", "enabled");
  await page.getByRole("button", { name: /Understand the next layer/ }).click();
  await expect(page.locator(".c2-story-object")).toContainText("PEPx");
  await expect(page.locator(".c2-story-object")).toContainText("Not an ordinary voting share");
});

test("mobile filters trap focus, dismiss with Escape, and preserve the chosen concept", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile", "Mobile filter sheet");
  await page.goto("/discover?concept=2&entity=company");
  const trigger = page.getByRole("button", { name: "Filters", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("button", { name: "Close filters" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  // Native dialogs allow browser chrome at the boundary, never a background page control.
  expect(await dialog.evaluate((element) => element.matches(":modal") && (document.activeElement === document.body || element.contains(document.activeElement)))).toBe(true);
  await page.keyboard.press("Tab");
  expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await dialog.getByRole("combobox", { name: "Market", exact: true }).selectOption("private");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("button", { name: /^Filters/ })).toBeFocused();
  await expect(page).toHaveURL(/concept=2.*market=private/);
  await page.reload();
  await expect(page.locator(".issuer-spotlight-table tbody tr")).toHaveCount(1);
  await expect(page.locator(".issuer-spotlight-table").getByText("Private exposure", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "View OpenAI details" })).toHaveAttribute("href", "/assets/prestocks/OPENAI");
});

test("both surfaces fit the viewport matrix and clear mobile navigation", async ({ page }, info) => {
  test.skip(info.project.name !== "chromium", "One viewport matrix");
  for (const width of [390, 430, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/?concept=2", "/discover?concept=2"]) {
      await page.goto(path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (width < 820) {
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        const clearance = await page.evaluate(() => {
          const content = document.querySelector(".application-main")!.getBoundingClientRect();
          const nav = document.querySelector(".mobile-navigation")!.getBoundingClientRect();
          return nav.top - content.bottom;
        });
        expect(clearance).toBeGreaterThanOrEqual(0);
      }
    }
  }
});
