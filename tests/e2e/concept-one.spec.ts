import { expect, test } from "@playwright/test";

const selectedBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
const isLocal = selectedBaseUrl
  ? ["localhost", "127.0.0.1"].includes(new URL(selectedBaseUrl).hostname)
  : false;

test.skip(!isLocal, "Concept #1 browser verification runs against the local implementation");

test("Home teaches the entity path and starts discovery without a financial CTA", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "See the company behind what you know." }),
  ).toBeVisible();
  await expect(page.getByRole("search")).toBeVisible();
  await expect(page.getByText("01 · Product")).toBeVisible();
  await expect(page.getByText("02 · Brand")).toBeVisible();
  await expect(page.getByText("03 · Company")).toBeVisible();
  await expect(page.getByRole("link", { name: "Scan a product" })).toBeVisible();
  await expect(page.getByRole("link", { name: /buy|choose amount/i })).toHaveCount(0);

  const hasDocumentOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasDocumentOverflow).toBe(false);
});

test("Discover distinguishes entity modes and preserves contextual Company filters", async ({
  page,
}, testInfo) => {
  await page.goto("/discover");

  await expect(page.getByRole("heading", { name: "Discover", exact: true })).toBeVisible();
  await expect(page.getByText("Product, Brand, and Company are shown as separate entity types."))
    .toBeVisible();

  await page.getByRole("button", { name: "Companies", exact: true }).click();
  await expect(page).toHaveURL(/\/discover\?entity=company$/);
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: /^Filters/ }).click();
  }
  await page.getByLabel("Market context").selectOption("private");
  await expect(page).toHaveURL(/entity=company&market=private/);
  await expect(page.getByText("Private company").first()).toBeVisible();

  await page.getByPlaceholder("Search a Product, Brand, or Company").fill("OpenAI");
  await expect(page).toHaveURL(/q=OpenAI/);
  await expect(page.getByRole("link", { name: /OpenAI/ })).toBeVisible();

  const hasDocumentOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasDocumentOverflow).toBe(false);
});

test("mobile shell keeps the approved destinations and active state", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile-only shell assertion");
  await page.goto("/discover");

  const mobileNavigation = page.getByRole("navigation", { name: "Mobile navigation" });
  await expect(mobileNavigation.getByRole("link", { name: "Discover" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(mobileNavigation.getByRole("link", { name: "Scan" })).toHaveAttribute(
    "href",
    "/scan",
  );
  await expect(mobileNavigation.getByRole("link", { name: "Saved" })).toHaveAttribute(
    "href",
    "/saved",
  );
  await expect(mobileNavigation.getByRole("link", { name: "Portfolio" })).toHaveAttribute(
    "href",
    "/portfolio",
  );
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
});

test("mobile Discover keeps entity modes visible and discloses lower-priority filters", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile-only filter assertion");
  await page.goto("/discover");

  await expect(page.getByRole("button", { name: "Products", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Brands", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Companies", exact: true })).toBeVisible();
  await expect(page.getByLabel("Category")).not.toBeVisible();

  await page.getByRole("button", { name: /^Filters/ }).click();
  await page.getByLabel("Category").selectOption("groceries");
  await expect(page).toHaveURL(/category=groceries/);
  await expect(page.getByLabel("1 active filters")).toBeVisible();
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.getByLabel("Category")).not.toBeVisible();
});

for (const route of ["/", "/discover"] as const) {
  test("mobile bottom navigation clears final content on " + route, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "Mobile-only clearance assertion");
    await page.goto(route);
    const finalContent = route === "/" ? page.locator(".learn-strip") : page.locator(".catalog-note");
    await finalContent.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));

    const clearance = await page.evaluate((selector) => {
      const content = document.querySelector(selector);
      const navigation = document.querySelector(".bottom-nav");
      if (!content || !navigation) return -1;
      return navigation.getBoundingClientRect().top - content.getBoundingClientRect().bottom;
    }, route === "/" ? ".learn-strip" : ".catalog-note");
    expect(clearance).toBeGreaterThanOrEqual(0);
  });
}

test("Home and Discover fit the requested viewport matrix", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "One exact viewport matrix is sufficient");

  for (const width of [390, 430, 1280, 1440]) {
    await page.setViewportSize({ width, height: width < 820 ? 932 : 900 });
    for (const route of ["/", "/discover"] as const) {
      await page.goto(route);
      const hasDocumentOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(hasDocumentOverflow, route + " overflowed at " + width + "px").toBe(false);

      if (width < 820) {
        await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
        if (route === "/discover") {
          await expect(page.getByRole("button", { name: /^Filters/ })).toBeVisible();
        }
      }
    }
  }
});
