import { expect, test } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL;
test.skip(
  !baseURL || !["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname),
  "Local fixtures only; never request paid lookup or mutate production research",
);

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/**", (route) => route.fulfill({
    status: 401,
    json: { error: { code: "AUTH_REQUIRED" } },
  }));
  await page.route("**/api/v1/issuer/reviewed", (route) => route.fulfill({
    json: { data: { byCompany: {}, unavailable: [], stale: [] } },
  }));
});

test("Product, Brand and Company retain separate routes and progressive evidence", async ({ page }) => {
  await page.goto("/products/doritos-snack");
  await expect(page.getByRole("heading", { name: "Doritos snack", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Relationship explorer" })).toHaveCount(0);
  const evidence = page.locator("details").filter({ has: page.locator("summary", { hasText: "Relationship evidence and regional context" }) });
  await expect(evidence.locator(".research-rows")).not.toBeVisible();
  await evidence.locator("summary").click();
  await expect(evidence.getByText("global parent", { exact: true })).toBeVisible();
  await expect(evidence.locator('a[href^="https://"]')).toBeVisible();
  await page.locator('.product-research-intro a[href="/brands/doritos"]').click();
  await expect(page).toHaveURL(/\/brands\/doritos$/);
  await expect(page.getByRole("heading", { name: "Doritos", exact: true })).toBeVisible();
  await expect(page.getByText(/A Brand is the identity you recognize/)).toBeVisible();
  await page.getByRole("link", { name: "View PepsiCo research" }).click();
  await expect(page).toHaveURL(/\/companies\/pepsico$/);
  await expect(page.getByRole("heading", { name: "Company, not Instrument" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Separate investment exposure" })).toBeVisible();
});

test("invalid guest storage never becomes a false save and research remains available", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("shelf:guest-items", "not valid JSON"));
  await page.goto("/products/doritos-snack");
  await expect(page.locator("main").getByRole("alert")).toContainText("Temporary saving is unavailable");
  await page.getByRole("button", { name: "Save product", exact: true }).click();
  await expect(page.locator("[data-sonner-toast]")).toContainText("could not be updated");
  await expect(page.getByRole("button", { name: "Remove product from Saved" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "View company research" })).toHaveAttribute("href", "/companies/pepsico");
  await page.evaluate(() => sessionStorage.removeItem("shelf:guest-items"));
  await page.getByRole("button", { name: "Save product", exact: true }).click();
  await expect(page.getByRole("button", { name: "Remove product from Saved" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem("shelf:guest-items") ?? "[]"))).toEqual(["product-doritos-snack"]);
});

test("Saved status service failure stays disabled until an explicit retry succeeds", async ({ page }) => {
  let checks = 0;
  let writes = 0;
  await page.route("**/api/v1/shelf", (route) => {
    checks++;
    return checks === 1
      ? route.fulfill({ status: 503, json: { error: { code: "SERVICE_UNAVAILABLE" } } })
      : route.fulfill({ json: { data: { items: [] } } });
  });
  await page.route("**/api/v1/shelf/items", (route) => {
    writes++;
    return route.fulfill({ status: 503, json: { error: { code: "SERVICE_UNAVAILABLE" } } });
  });
  await page.goto("/products/doritos-snack");
  await expect(page.getByRole("button", { name: "Save product", exact: true })).toBeDisabled();
  await expect(page.locator("main").getByRole("alert")).toContainText("Retry before changing your saved items");
  expect(writes).toBe(0);
  await page.getByRole("button", { name: "Retry saved status" }).click();
  await expect(page.getByRole("button", { name: "Save product", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Save product", exact: true }).click();
  await expect(page.locator("[data-sonner-toast]")).toContainText("could not be updated");
  await expect(page.getByRole("button", { name: "Remove product from Saved" })).toHaveCount(0);
  expect(writes).toBe(1);
});

test("unsupported Company exposure is explicit without invented investment actions", async ({ page }) => {
  await page.goto("/companies/nike");
  await expect(page.getByRole("heading", { name: "NIKE, Inc.", exact: true })).toBeVisible();
  await expect(page.getByText("No current supported instrument matches this Company.", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "View exposure details" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /buy|invest/i })).toHaveCount(0);
  await expect(page.locator('a[href^="/invest/"]')).toHaveCount(0);
  await expect(page.locator('#known-for a[href="/products/nike-apparel"]')).toBeVisible();
  await page.locator('#company-evidence summary').filter({ hasText: "Relationship evidence" }).click();
  await expect(page.locator('#company-evidence').getByText(/These are reviewed product-family relationships/)).toBeVisible();
});

test("390px Product imagery has its own space and does not overlap identity text", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/products/doritos-snack");
  await expect(page.getByRole("heading", { name: "Doritos snack", exact: true })).toBeVisible();
  const dimensions = await page.evaluate(() => {
    const identity = document.querySelector(".product-research-hero");
    const image = identity!.querySelector(".research-product-image")!.getBoundingClientRect();
    const heading = identity!.querySelector("h1")!.getBoundingClientRect();
    return {
      imageWidth: image.width,
      imageHeight: image.height,
      identitySeparated: image.right <= heading.left + 1 || image.bottom <= heading.top + 1,
      overflow: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
  expect(dimensions.imageWidth).toBeGreaterThan(0);
  expect(dimensions.imageHeight).toBeGreaterThan(0);
  expect(dimensions.identitySeparated).toBe(true);
  expect(dimensions.overflow).toBe(false);
});
