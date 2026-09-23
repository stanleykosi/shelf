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
  await expect(page.getByText("Relationship explorer")).toBeVisible();
  await expect(page.getByText("Product", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Brand", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Company", { exact: true }).first()).toBeVisible();
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
  await page.route("**/api/v1/issuer/reviewed", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data: {
      byCompany: { "company-openai": [{
        provider: "prestocks",
        asset: { companyId: "issuer:prestocks:OPENAI", name: "OpenAI", symbol: "OPENAI",
          mint: "PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF" },
      }] },
      unavailable: [], stale: [],
    } }),
  }));
  await page.route("**/api/v1/discovery/query", (route) => route.fulfill({
    status: 201,
    contentType: "application/json",
    body: JSON.stringify({ data: {
      kind: "company",
      listings: [{ provider: "prestocks", asset: {
        companyId: "issuer:prestocks:OPENAI",
        name: "OpenAI",
        symbol: "OPENAI",
        mint: "PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF",
      } }],
      matches: [],
      unavailable: [],
      stale: [],
    } }),
  }));
  await page.goto("/discover");

  await expect(page.getByRole("heading", { name: "Discover", exact: true })).toBeVisible();
  await expect(page.getByText("Search current xStocks and PreStocks listings, or explore reviewed product references."))
    .toBeVisible();

  await page.getByRole("button", { name: "Companies", exact: true }).click();
  await expect(page).toHaveURL(/\/discover\?entity=company$/);
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: /^Filters/ }).click();
    await page.getByRole("dialog").getByLabel("Reviewed market").selectOption("private");
    await page.getByRole("dialog").getByRole("button", { name: /Show .* results/ }).click();
  } else {
    await page.getByLabel("Reviewed market").selectOption("private");
  }
  await expect(page).toHaveURL(/entity=company&market=private/);
  await expect(page.locator(".research-table td").getByText("Private", { exact: true }).first()).toBeVisible();

  await page.getByPlaceholder("Search a company or product").fill("OpenAI");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/q=OpenAI/);
  await expect(page.getByRole("link", { name: /View OPENAI issuer asset/ })).toBeVisible();

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
  const filterDialog = page.getByRole("dialog");
  await filterDialog.getByLabel("Category").selectOption("groceries");
  await expect(page).toHaveURL(/category=groceries/);
  await expect(page.getByLabel("1 active filters")).toBeVisible();
  await filterDialog.getByRole("button", { name: /Show .* results/ }).click();
  await expect(page.getByLabel("Category")).not.toBeVisible();
});

for (const route of ["/", "/discover"] as const) {
  test("mobile bottom navigation clears final content on " + route, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "Mobile-only clearance assertion");
    await page.goto(route);
    const finalContent = route === "/" ? page.locator(".learning-section") : page.locator(".entity-result-groups");
    await finalContent.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));

    const clearance = await page.evaluate((selector) => {
      const content = document.querySelector(selector);
      const navigation = document.querySelector(".mobile-navigation");
      if (!content || !navigation) return -1;
      return navigation.getBoundingClientRect().top - content.getBoundingClientRect().bottom;
    }, route === "/" ? ".learning-section" : ".entity-result-groups");
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
