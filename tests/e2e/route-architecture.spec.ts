import { expect, test } from "@playwright/test";

const selectedBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
const isLocal = selectedBaseUrl
  ? ["localhost", "127.0.0.1"].includes(new URL(selectedBaseUrl).hostname)
  : false;

test.skip(!isLocal, "The exact HTTP route contract is verified against the local production build");

test("legacy, entity, access, and not-found routes return exact HTTP responses", async ({
  request,
}) => {
  const permanentRedirects = [
    ["/shelf", "/saved"],
    ["/shelf/share", "/saved/share"],
    ["/wallet", "/account/wallet"],
    ["/wallet/deposit", "/account/wallet/deposit"],
    ["/wallet/send", "/account/wallet/send"],
    ["/history", "/portfolio/activity"],
    ["/history/owned-record", "/portfolio/activity/owned-record"],
    ["/settings", "/account"],
    ["/invest/buy?companyId=company-pepsico", "/invest/pepsico"],
    ["/invest/sell?assetId=instrument-pepx", "/portfolio/instrument-pepx/sell"],
    ["/admin/status", "/admin"],
    ["/admin/invites", "/admin/access"],
    ["/admin/orders", "/admin/operations"],
    ["/products/product-doritos-snack", "/products/doritos-snack"],
  ] as const;

  for (const [source, destination] of permanentRedirects) {
    const response = await request.get(source, { maxRedirects: 0 });
    expect(response.status(), source).toBe(308);
    expect(response.headers().location, source).toBe(destination);
  }

  for (const [source, destination] of [
    ["/welcome", "/onboarding"],
    ["/eligibility", "/onboarding/availability"],
  ] as const) {
    const response = await request.get(source, { maxRedirects: 0 });
    expect(response.status(), source).toBe(307);
    expect(response.headers().location, source).toBe(destination);
  }

  const protectedResponse = await request.get("/account", { maxRedirects: 0 });
  expect(protectedResponse.status()).toBe(307);
  expect(protectedResponse.headers().location).toBe("/sign-in?returnTo=%2Faccount");
  expect((await request.post("/api/internal/issuer-directory-refresh")).status()).toBe(404);

  for (const path of [
    "/products/not-a-reviewed-product",
    "/brands/not-a-reviewed-brand",
    "/companies/not-a-reviewed-company",
    "/not-a-route",
  ]) {
    expect((await request.get(path, { maxRedirects: 0 })).status(), path).toBe(404);
  }
});

test("retired research routes return 404", async ({ request }) => {
  for (const path of [
    "/companies/company-pepsico",
    "/companies/pepsico",
    "/invest/suggest",
    "/markets",
    "/markets/public",
    "/markets/private",
  ]) {
    expect((await request.get(path, { maxRedirects: 0 })).status(), path).toBe(404);
  }
});

test("a guest can still save a product from its detail page", async ({ page }) => {
  await page.route("**/api/v1/shelf", (route) => route.fulfill({
    status: 401,
    contentType: "application/json",
    body: JSON.stringify({ error: { code: "AUTH_REQUIRED" } }),
  }));
  await page.route("**/api/v1/me", (route) => route.fulfill({
    status: 401,
    contentType: "application/json",
    body: JSON.stringify({ error: { code: "AUTH_REQUIRED" } }),
  }));

  await page.goto("/products/apple-iphone");
  await expect(page).toHaveURL(/\/products\/apple-iphone$/, { timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Save product" })).toBeEnabled();
  const productName = await page.getByRole("heading", { level: 1 }).textContent();
  await page.getByRole("button", { name: "Save product" }).click();
  await expect(page.getByRole("button", { name: "Remove product from Saved" })).toBeVisible();
  await page.getByRole("link", { name: "View Saved" }).click();
  await expect(page.getByRole("heading", { name: productName ?? "" })).toBeVisible();
});

test("a member product save reaches the shelf items endpoint", async ({ page }) => {
  let savedIds: string[] = [];
  await page.route("**/api/v1/shelf", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data: { items: [] } }),
  }));
  await page.route("**/api/v1/shelf/items", async (route) => {
    savedIds = route.request().postDataJSON().productIds as string[];
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ data: { version: 2 } }),
    });
  });

  await page.goto("/products/doritos-snack");
  await page.getByRole("button", { name: "Save product" }).click();
  await expect(page.getByRole("button", { name: "Remove product from Saved" })).toBeVisible();
  expect(savedIds).toEqual(["product-doritos-snack"]);
});
