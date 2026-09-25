import { expect, test } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL;
test.skip(!baseURL || !["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname), "Local UI verification only");

const spotlightListings = [
  { provider: "xstocks", sector: "Technology", asset: { companyId: "issuer:xstocks:AAPLx", name: "Apple", symbol: "AAPLx" } },
  { provider: "prestocks", sector: "Technology", asset: { companyId: "issuer:prestocks:OPENAI", name: "OpenAI", symbol: "OPENAI" } },
];

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/home/highlights", (route) => route.fulfill({
    json: { data: { items: [{ name: "Apple", symbol: "AAPLx", priceUsd: "214.50", change1hPct: 1.25, liquidityUsd: 100_000, venue: "raydium" }], checkedAt: "2026-09-25T12:00:00.000Z", incomplete: false } },
  }));
  await page.route("**/api/v1/issuer/directory", (route) => route.fulfill({
    json: { data: { featured: spotlightListings, listings: spotlightListings, unavailable: [], stale: [] } },
  }));
  await page.route("**/api/v1/discovery/query", (route) => route.fulfill({
    json: { data: { kind: "company", listings: [spotlightListings[0]], matches: [], unavailable: [], stale: [] } },
  }));
});

test("the canonical landing page leads into search without a design switcher", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("The things you know.");
  await expect(page.getByLabel("Preview of the Discover page")).toContainText("Meet the companies.");
  await expect(page.locator(".c2-market-card")).toHaveAttribute("href", "/assets/xstocks/AAPLx");
  await expect(page.locator(".c2-market-card")).toContainText("$214.50");
  await expect(page.locator(".c2-market-card")).toContainText("+1.25%");
  await expect(page.locator(".c2-familiar .c2-section-heading")).not.toContainText("01 /");
  await page.getByLabel("Search products, brands, or companies").focus();
  expect(await page.locator("#c2-search").evaluate((input) => getComputedStyle(input).outlineStyle)).toBe("none");
  await page.getByLabel("Search products, brands, or companies").fill("Apple");
  await page.getByRole("button", { name: "Discover", exact: true }).click();
  await expect(page).toHaveURL(/\/discover\?q=Apple/);
  await expect(page.getByRole("heading", { name: "Apple", exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("link", { name: /View AAPLx issuer asset/ })).toHaveAttribute("href", "/assets/xstocks/AAPLx");
  await expect(page.getByRole("navigation", { name: "Design comparison" })).toHaveCount(0);
});

test("retired concept links cannot restore the old design", async ({ page }) => {
  await page.goto("/?concept=1");
  await expect(page.locator(".c2-home")).toBeVisible();
  await expect(page.locator(".research-home")).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Design comparison" })).toHaveCount(0);

  await page.goto("/discover?concept=1");
  await expect(page.locator(".discovery-studio")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Design comparison" })).toHaveCount(0);
});

test("motion can be paused and reduced-motion preferences keep content visible", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "The things you know.", exact: false })).toBeVisible();
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe("auto");
  const animated = await page.locator(".c2-home").evaluate((root) => root.getAnimations({ subtree: true }).length);
  expect(animated).toBe(0);
  await page.getByRole("button", { name: "Pause motion" }).click();
  await expect(page.locator(".c2-home")).toHaveAttribute("data-motion", "paused");
  await page.getByRole("button", { name: "Enable motion" }).click();
  await expect(page.locator(".c2-home")).toHaveAttribute("data-motion", "enabled");
  await page.getByRole("button", { name: /Understand the instrument/ }).click();
  await expect(page.locator(".c2-company-coin").last()).toHaveAttribute("data-company", "NVDA");
  expect(await page.locator(".c2-company-coin").last().evaluate((coin) => getComputedStyle(coin).transform)).toBe("matrix(1, 0, 0, 1, 0, 0)");
  await expect(page.locator(".c2-coin-caption")).toContainText("NVIDIA");
});

test("the research journey advances while visible and the landing page scrolls smoothly", async ({ page }, info) => {
  test.skip(info.project.name !== "chromium", "One motion lifecycle check");
  await page.goto("/");
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe("smooth");
  await page.locator(".c2-story").scrollIntoViewIfNeeded();
  await expect(page.locator(".c2-story-visual a")).toHaveCount(0);
  await expect(page.locator(".c2-silver-rail")).toBeVisible();
  await expect.poll(() => page.locator(".c2-company-coin img").last().evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  await expect(page.locator(".c2-chapters button").first()).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".c2-chapter-progress")).toBeVisible();
  await expect(page.locator(".c2-chapters button").nth(1)).toHaveAttribute("aria-pressed", "true", { timeout: 9_000 });
  await expect(page.locator(".c2-company-coin").last()).toHaveAttribute("data-company", "MSFT");
  await expect(page.locator(".c2-coin-caption")).toContainText("Microsoft");
});

test("the outgoing and incoming company coins roll at the same time", async ({ page }, info) => {
  test.skip(info.project.name !== "chromium", "One rolling transition check");
  await page.goto("/");
  await page.locator(".c2-story").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: /Check the evidence/ }).click();
  await expect(page.locator(".c2-company-coin")).toHaveCount(2);
  await expect(page.locator(".c2-company-coin").first()).toHaveAttribute("data-company", "AAPL");
  await expect(page.locator(".c2-company-coin").last()).toHaveAttribute("data-company", "MSFT");
  await expect(page.locator(".c2-company-coin")).toHaveCount(1, { timeout: 3_000 });
});

test("mobile filters trap focus, dismiss with Escape, and preserve the selected market", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile", "Mobile filter sheet");
  await page.goto("/discover");
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
  await expect(page).toHaveURL(/market=private/);
  await page.reload();
  await expect(page.locator(".issuer-spotlight-table tbody tr")).toHaveCount(1);
  await expect(page.locator(".issuer-spotlight-table").getByText("Private exposure", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "View OpenAI details" })).toHaveAttribute("href", "/assets/prestocks/OPENAI");
});

test("both surfaces fit the viewport matrix and clear mobile navigation", async ({ page }, info) => {
  test.skip(info.project.name !== "chromium", "One viewport matrix");
  for (const width of [390, 430, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/discover"]) {
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
