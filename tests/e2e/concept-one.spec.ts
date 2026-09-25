import { expect, test } from "@playwright/test";

const selectedBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
const isLocal = selectedBaseUrl
  ? ["localhost", "127.0.0.1"].includes(new URL(selectedBaseUrl).hostname)
  : false;

test.skip(!isLocal, "Concept #1 browser verification runs against the local implementation");

const spotlightListings = [
  { provider: "xstocks", sector: "Technology", asset: {
    companyId: "issuer:xstocks:AAPLx", name: "Apple", symbol: "AAPLx",
    logoUrl: "https://xstocks-metadata.backed.fi/logos/tokens/AAPLx.png",
  } },
  { provider: "xstocks", sector: "Food & drink", asset: {
    companyId: "issuer:xstocks:PEPx", name: "PepsiCo", symbol: "PEPx",
    logoUrl: "https://xstocks-metadata.backed.fi/logos/tokens/PEPx.png",
  } },
  { provider: "prestocks", sector: "Technology", asset: {
    companyId: "issuer:prestocks:OPENAI", name: "OpenAI", symbol: "OPENAI",
    logoUrl: "https://prestocks.com/logos/openai.png",
  } },
  { provider: "prestocks", sector: "Industrials", asset: {
    companyId: "issuer:prestocks:SPACEX", name: "SpaceX", symbol: "SPACEX",
    logoUrl: "https://prestocks.com/logos/spacex.png",
  } },
];

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/issuer/directory", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data: {
      listings: spotlightListings,
      unavailable: [],
      stale: [],
    } }),
  }));
});

test("Home teaches the entity path and starts discovery without a financial CTA", async ({
  page,
}) => {
  await page.goto("/?concept=1");

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

test("Discover shows live company logos, sector filters, search, and issuer details", async ({
  page,
}, testInfo) => {
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
  await page.route("https://prestocks.com/logos/spacex.png", (route) => route.abort());
  await page.route("**/api/v1/issuer/asset/xstocks/PEPx", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data: { listing: { provider: "xstocks", asset: {
      ...spotlightListings[1].asset,
      description: "PepsiCo issuer asset",
      mint: "Xsv99frTRUeornyvCfvhnDesQDWuvns1M852Pez91vF",
      exchange: "Nasdaq",
      marketOpen: true,
      marketPeriod: "market",
      nextChangeAt: "",
      tradingHalted: false,
      observedAt: "2026-09-24T00:00:00.000Z",
    } }, lifecycle: null } }),
  }));
  await page.goto("/discover");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("A world of companies.");
  await expect(page.getByRole("heading", { name: "Companies to explore" })).toBeVisible();
  await expect(page.getByText("Reviewed product references")).toHaveCount(0);
  await expect(page.locator(".issuer-spotlight-table tbody tr")).toHaveCount(4);
  await expect(page.getByRole("link", { name: "View PepsiCo details" }).locator("img"))
    .toHaveAttribute("src", /xstocks-metadata\.backed\.fi/);
  await expect(page.getByRole("link", { name: "View OpenAI details" }).locator("img"))
    .toHaveAttribute("src", /prestocks\.com/);
  await expect(page.getByRole("link", { name: "View SpaceX details" }).locator(".issuer-logo"))
    .toHaveText("S");

  await page.locator(".issuer-sector-tabs").getByRole("button", { name: "Food & drink" }).click();
  await expect(page.locator(".issuer-spotlight-table tbody tr")).toHaveCount(1);
  await expect(page.getByRole("link", { name: "View PepsiCo details" })).toBeVisible();
  await page.getByRole("button", { name: "All sectors" }).click();
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: /^Filters/ }).click();
    await page.getByRole("dialog").getByRole("combobox", { name: "Market", exact: true }).selectOption("private");
    await page.getByRole("dialog").getByRole("button", { name: /Show .* companies/ }).click();
  } else {
    await page.getByRole("combobox", { name: "Market", exact: true }).selectOption("private");
  }
  await expect(page.locator(".issuer-spotlight-table tbody tr")).toHaveCount(2);
  await expect(page.getByRole("link", { name: "View SpaceX details" })).toBeVisible();

  await page.getByRole("searchbox", { name: "Search a company or product" }).fill("OpenAI");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/q=OpenAI/);
  await expect(page.getByRole("link", { name: /View OPENAI issuer asset/ })).toBeVisible();
  await expect(page.locator(".issuer-spotlight-table")).toHaveCount(0);
  await page.getByRole("button", { name: "Explore featured companies" }).click();
  await expect(page.locator(".issuer-spotlight-table tbody tr")).toHaveCount(2);
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "PreStocks exposure" }).click();
  } else {
    await page.getByRole("combobox", { name: "Market", exact: true }).selectOption("");
  }

  const hasDocumentOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasDocumentOverflow).toBe(false);

  await page.getByRole("link", { name: "View PepsiCo details" }).click();
  await expect(page).toHaveURL(/\/assets\/xstocks\/PEPx$/);
  await expect(page.getByRole("heading", { name: "PepsiCo" })).toBeVisible();
});

test("the full issuer directory paginates ten listings and preserves market groups", async ({ page }, testInfo) => {
  let directoryRequests = 0;
  const publicListings = Array.from({ length: 23 }, (_, index) => {
    const number = String(index + 1).padStart(2, "0");
    return {
      provider: "xstocks",
      sector: "Other",
      asset: { companyId: `issuer:xstocks:C${number}x`, name: `Company ${number}`, symbol: `C${number}x` },
    };
  });
  await page.route("**/api/v1/issuer/directory", (route) => {
    directoryRequests += 1;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: {
        listings: [...publicListings, spotlightListings[2], spotlightListings[3]],
        unavailable: [],
        stale: [],
      } }),
    });
  });
  await page.goto("/discover");

  await expect(page.locator('link[rel="preload"][as="fetch"][href="/api/v1/issuer/directory"]')).toHaveCount(1);
  await expect(page.locator(".issuer-spotlight-table tbody tr")).toHaveCount(10);
  await expect(page.getByRole("button", { name: "Refresh mix" })).toHaveCount(0);
  await page.getByRole("button", { name: "All listings" }).click();
  await expect(page.getByText("Showing 1–10 of 25")).toBeVisible();
  await page.getByRole("navigation", { name: "Directory pages" }).getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("Showing 11–20 of 25")).toBeVisible();
  await page.getByLabel("Choose directory page").selectOption("3");
  await expect(page.locator(".issuer-spotlight-table tbody tr")).toHaveCount(5);
  await expect(page).toHaveURL(/view=all.*page=3/);

  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: /^Filters/ }).click();
    await page.getByRole("dialog").getByRole("combobox", { name: "Market", exact: true }).selectOption("private");
    await page.getByRole("dialog").getByRole("button", { name: /Show .* companies/ }).click();
  } else {
    await page.getByRole("combobox", { name: "Market", exact: true }).selectOption("private");
  }
  await expect(page.locator(".issuer-spotlight-table tbody tr")).toHaveCount(2);
  await expect(page.getByRole("link", { name: "View OpenAI details" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Directory pages" })).toHaveCount(0);
  expect(directoryRequests).toBe(1);
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

test("mobile Discover exposes sectors and market filters without hiding company images", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile-only filter assertion");
  await page.goto("/discover");

  await expect(page.locator(".issuer-sector-tabs").getByRole("button", { name: "Technology" })).toBeVisible();
  await expect(page.locator(".issuer-sector-tabs").getByRole("button", { name: "Food & drink" })).toBeVisible();
  await expect(page.getByRole("link", { name: "View OpenAI details" }).locator("img")).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Market", exact: true })).not.toBeVisible();

  await page.getByRole("button", { name: /^Filters/ }).click();
  const filterDialog = page.getByRole("dialog");
  await filterDialog.getByRole("combobox", { name: "Market", exact: true }).selectOption("private");
  await expect(page).toHaveURL(/market=private/);
  await expect(page.getByLabel("1 active filters")).toBeVisible();
  await filterDialog.getByRole("button", { name: /Show .* companies/ }).click();
  await expect(page.getByRole("combobox", { name: "Market", exact: true })).not.toBeVisible();
  await expect(page.locator(".issuer-spotlight-table tbody tr")).toHaveCount(2);
});

for (const route of ["/", "/discover"] as const) {
  test("mobile bottom navigation clears final content on " + route, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "Mobile-only clearance assertion");
    await page.goto(route === "/" ? "/?concept=1" : route);
    const finalContent = route === "/" ? page.locator(".learning-section") : page.locator(".issuer-spotlight-table");
    await finalContent.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));

    const clearance = await page.evaluate((selector) => {
      const content = document.querySelector(selector);
      const navigation = document.querySelector(".mobile-navigation");
      if (!content || !navigation) return -1;
      return navigation.getBoundingClientRect().top - content.getBoundingClientRect().bottom;
    }, route === "/" ? ".learning-section" : ".issuer-spotlight-table");
    expect(clearance).toBeGreaterThanOrEqual(0);
  });
}

test("Home and Discover fit the requested viewport matrix", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "One exact viewport matrix is sufficient");

  for (const width of [390, 430, 1280, 1440]) {
    await page.setViewportSize({ width, height: width < 820 ? 932 : 900 });
    for (const route of ["/", "/discover"] as const) {
      await page.goto(route === "/" ? "/?concept=1" : route);
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
