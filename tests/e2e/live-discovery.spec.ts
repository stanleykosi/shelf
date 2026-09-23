import { expect, test } from "@playwright/test";

test("product search links an AI owner suggestion to an issuer mint and purchase path", async ({
  page,
}) => {
  const listing = {
    provider: "xstocks",
    asset: {
      companyId: "issuer:xstocks:AAPLx",
      name: "Apple",
      description: "Apple xStock",
      symbol: "AAPLx",
      underlyingSymbol: "AAPL",
      mint: "XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp",
      exchange: "Nasdaq",
      marketOpen: true,
      marketPeriod: "market",
      nextChangeAt: "",
      tradingHalted: false,
      supportsAtomicSwaps: true,
      observedAt: "2026-09-23T12:00:00.000Z",
    },
  };
  await page.route("**/api/v1/issuer/search?*", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      data: { listings: [listing], total: 1, unavailable: [], stale: [] },
    }),
  }));
  let exactAssetRequests = 0;
  await page.route("**/api/v1/issuer/asset/xstocks/AAPLx", (route) => {
    exactAssetRequests += 1;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { listing } }),
    });
  });
  await page.route("**/api/v1/discovery/search", (route) => route.fulfill({
    status: 201,
    contentType: "application/json",
    body: JSON.stringify({
      data: [{
        candidateId: "candidate-0-issuer:xstocks:AAPLx",
        displayLabel: "iPhone",
        productId: null,
        companyId: "issuer:xstocks:AAPLx",
        ownerName: "Apple",
        issuer: "xstocks",
        symbol: "AAPLx",
        mint: listing.asset.mint,
        state: "matched",
        confidenceBand: "low",
        sourceIds: ["src-xstocks"],
        requiresConfirmation: true,
      }],
    }),
  }));

  await page.goto("/discover");
  await page.getByLabel("Product, brand or company").fill("iPhone");
  await page.getByLabel(/I agree to send this search/).check();
  await page.getByRole("button", { name: "Find company behind product" }).click();
  await expect(page.getByRole("heading", { name: "AI owner suggestions" })).toBeVisible();
  await expect(page.getByText("Likely owner: Apple")).toBeVisible();

  await page.getByRole("link", { name: "View AAPLx on xStocks" }).click();
  await expect(page).toHaveURL(/\/assets\/xstocks\/AAPLx$/);
  await expect(page.getByText(listing.asset.mint)).toBeVisible();
  expect(exactAssetRequests).toBe(1);
  await expect(page.getByRole("link", { name: "Review a purchase" }))
    .toHaveAttribute("href", "/assets/xstocks/AAPLx/buy");
});

test("category links and filters retain all five reviewed product categories", async ({ page }) => {
  await page.route("**/api/v1/issuer/search?*", (route) => route.fulfill({
    status: 200, contentType: "application/json",
    body: JSON.stringify({ data: { listings: [], total: 0, unavailable: [], stale: [] } }),
  }));
  await page.goto("/");
  for (const category of ["Groceries", "Beauty", "Electronics", "Clothing", "Household"]) {
    await expect(page.getByRole("link", { name: category, exact: true })).toBeVisible();
  }
  await page.getByRole("link", { name: "Groceries", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Product category" })).toHaveValue("groceries");
  await expect(page.getByRole("heading", { name: "Pepsi beverage" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "iPhone" })).toHaveCount(0);
  await page.getByRole("combobox", { name: "Product category" }).selectOption("electronics");
  await expect(page.getByRole("heading", { name: "iPhone" })).toBeVisible();
  await expect(page).toHaveURL(/category=electronics/);
});

test("image upload requires consent and shows the AI owner beside the issuer token", async ({ page }) => {
  let submittedImage = false;
  await page.route("**/api/v1/discovery/image", (route) => {
    const request = route.request().postDataJSON();
    submittedImage = request.mode === "photo" &&
      request.acknowledgeAiProcessing === true &&
      request.imageDataUrl.startsWith("data:image/jpeg;base64,");
    return route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ data: [{
        candidateId: "image-apple",
        displayLabel: "iPhone",
        productId: null,
        companyId: "issuer:xstocks:AAPLx",
        ownerName: "Apple",
        issuer: "xstocks",
        symbol: "AAPLx",
        mint: "XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp",
        state: "matched",
        confidenceBand: "low",
        sourceIds: ["src-xstocks"],
        requiresConfirmation: true,
      }] }),
    });
  });

  await page.goto("/scan");
  await page.getByRole("tab", { name: "Upload" }).click();
  const image = await page.screenshot();
  await page.getByLabel("Choose an image").setInputFiles({
    name: "product.png",
    mimeType: "image/png",
    buffer: image,
  });
  const submit = page.getByRole("button", { name: "Use this image" });
  await expect(submit).toBeDisabled();
  await page.getByLabel(/I agree to send this image/).check();
  await submit.click();
  await page.getByRole("link", { name: /candidates are ready/ }).click();
  await expect(page.getByText(/Likely owner: Apple/)).toBeVisible();
  await expect(page.getByText(/Public · xStocks · AAPLx · mint/)).toBeVisible();
  expect(submittedImage).toBe(true);
});
