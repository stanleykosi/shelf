import { expect, test } from "@playwright/test";

test("header search opens product and company details with the keyboard shortcut", async ({ page }, testInfo) => {
  await page.route("**/api/v1/issuer/search**", async (route) => {
    const query = new URL(route.request().url()).searchParams.get("q")?.toLowerCase();
    await route.fulfill({
      json: {
        data: {
          listings: query === "apple" ? [{
            provider: "xstocks",
            asset: { name: "Apple", symbol: "AAPLx" },
          }] : [],
          total: query === "apple" ? 1 : 0,
          unavailable: [],
          stale: [],
        },
      },
    });
  });

  await page.goto("/");
  await expect(page.locator('a[href="/discover"][aria-current="page"]')).toHaveCount(0);
  const input = page.getByRole("combobox", { name: "Search products and companies" });
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Search Shelf" }).click();
  }
  await input.fill("Doritos");
  await expect(page.getByRole("option", { name: /Doritos snack/ })).toBeVisible();
  const productImage = page.getByRole("option", { name: /Doritos snack/ }).locator("img");
  await expect(productImage).toHaveAttribute("src", /doritos-snack\.jpg/);
  await expect.poll(() => productImage.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await page.getByRole("option", { name: /Doritos snack/ }).click();
  await expect(page).toHaveURL(/\/products\/doritos-snack$/, { timeout: 15_000 });

  await page.keyboard.press("ControlOrMeta+k");
  await expect(input).toBeFocused();
  await input.fill("Apple");
  await expect(page.getByRole("option", { name: /Apple AAPLx/ })).toBeVisible();
  await input.press("ArrowDown");
  await input.press("Enter");
  await expect(page).toHaveURL(/\/assets\/xstocks\/AAPLx$/, { timeout: 15_000 });

  await expect(page.locator(".navigation-progress, .environment-status")).toHaveCount(0);
});
