import { expect, test } from "@playwright/test";
import { products } from "../../src/data/catalog";

const baseURL = process.env.PLAYWRIGHT_BASE_URL;
test.skip(!baseURL || !["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname), "Isolated local fixtures only");

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/**", (route) => route.fulfill({ status: 401, json: { error: { code: "AUTH_REQUIRED" } } }));
});

test("guest Saved starts empty and Product removal can be undone", async ({ page }) => {
  await page.goto("/saved");
  await expect(page.getByRole("heading", { name: "No saved Products" })).toBeVisible();
  await page.evaluate(() => sessionStorage.setItem("shelf:guest-items", JSON.stringify(["product-doritos-snack"])));
  await page.reload();
  await expect(page.getByRole("heading", { name: "Doritos snack" })).toBeVisible();
  await page.getByRole("button", { name: "Remove Doritos snack" }).click();
  await expect(page.getByRole("heading", { name: "No saved Products" })).toBeVisible();
  await page.getByRole("button", { name: "Undo removal" }).click();
  await expect(page.getByRole("heading", { name: "Doritos snack" })).toBeVisible();
  await page.getByRole("link", { name: "Companies (0)" }).click();
  await expect(page).toHaveURL(/view=companies/);
  await expect(page.getByRole("heading", { name: "No saved Companies" })).toBeVisible();
});

test("member guest imports wait for explicit merge", async ({ page }) => {
  let mutations = 0;
  await page.route("**/api/v1/shelf", (route) => route.fulfill({ json: { data: { name: "Research", version: 2, items: [] } } }));
  await page.route("**/api/v1/watchlist", (route) => route.fulfill({ json: { data: [] } }));
  await page.route("**/api/v1/watchlist/items", (route) => { mutations++; return route.fulfill({ json: { data: [] } }); });
  await page.addInitScript(() => sessionStorage.setItem("shelf:guest-issuer-assets", JSON.stringify(["issuer:xstocks:AAPLx"])));
  await page.goto("/saved");
  await expect(page.getByRole("button", { name: "Merge session saves" })).toBeVisible();
  expect(mutations).toBe(0);
  await page.getByRole("button", { name: "Merge session saves" }).click();
  await expect(page.getByText("Session saves merged into your account. Holdings are unchanged.")).toBeVisible();
  expect(mutations).toBe(1);
});

test("shared selection merges guest Products without overwriting existing research", async ({ page }) => {
  const doritos = products.find((product) => product.id === "product-doritos-snack")!;
  await page.route("**/api/v1/shares/test-snapshot", (route) => route.fulfill({ json: { data: { products: [doritos], companies: [] } } }));
  await page.addInitScript(() => sessionStorage.setItem("shelf:guest-items", JSON.stringify(["product-olay-skincare"])));
  await page.goto("/share/test-snapshot");
  await expect(page.getByRole("button", { name: "Save selected research" })).toBeDisabled();
  await page.getByRole("checkbox", { name: "Select Doritos snack" }).check();
  await page.getByRole("button", { name: "Save selected research" }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem("shelf:guest-items") ?? "[]"))).toEqual(["product-olay-skincare", "product-doritos-snack"]);
});

test("learning library filters reviewed articles and preserves their exact text", async ({ page }) => {
  await page.goto("/learn");
  await page.getByLabel("Find a topic").fill("brand");
  await page.getByRole("link", { name: "A brand is not always a separate company", exact: true }).click();
  await expect(page.getByRole("heading", { name: "A brand is not always a separate company" })).toBeVisible();
  await expect(page.getByText(/A product brand can belong to a larger parent company/)).toBeVisible();
});

test("Assistant sends no private context, requires consent and renders only allowlisted citations", async ({ page }) => {
  let calls = 0;
  await page.route("**/api/v1/me", (route) => route.fulfill({ json: { data: {} } }));
  await page.route("**/api/v1/consents", (route) => route.fulfill({ json: { data: {} } }));
  await page.route("**/api/v1/ai/answer", (route) => {
    calls++;
    expect(route.request().postDataJSON().includeShelf).toBe(false);
    expect(route.request().postDataJSON().aiProcessingConsentAccepted).toBe(true);
    return route.fulfill({ json: { data: { answer: "Brands and Companies are distinct.", sourceIds: ["article:brands-and-companies", "https://untrusted.invalid"], uncertainty: ["Check regional context."] } } });
  });
  await page.goto("/assistant?product=doritos-snack");
  await page.getByLabel("Your research question").fill("What is a Brand?");
  await expect(page.getByRole("button", { name: "Send question" })).toBeDisabled();
  expect(calls).toBe(0);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Send question" }).click();
  await expect(page.getByRole("heading", { name: "Research response" })).toBeVisible();
  await expect(page.locator('a[href="https://untrusted.invalid"]')).toHaveCount(0);
  await expect(page.getByText("Use this draft")).toHaveCount(0);
});
