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

  await page.goto("/discover?source=issuer&entity=product");
  await page.getByLabel("Product or brand name").fill("iPhone");
  await page.getByLabel(/I agree to send this product name/).check();
  await page.getByRole("button", { name: "Find company behind product" }).click();
  await expect(page.getByRole("heading", { name: "Product search result" })).toBeVisible();
  await expect(page.getByText("AI suggested owner: Apple")).toBeVisible();

  await page.getByRole("link", { name: "View AAPLx on xStocks" }).click();
  await expect(page).toHaveURL(/\/assets\/xstocks\/AAPLx$/, { timeout: 20_000 });
  await expect(page.getByText(listing.asset.mint)).toBeVisible();
  expect(exactAssetRequests).toBeGreaterThanOrEqual(1);
  await expect(page.getByRole("link", { name: "Review a purchase" }))
    .toHaveAttribute("href", "/assets/xstocks/AAPLx/buy");
});

test("company search uses live issuer results and product misses stay distinct", async ({ page }) => {
  let aiRequests = 0;
  await page.route("**/api/v1/issuer/search?*", (route) => {
    const query = new URL(route.request().url()).searchParams.get("q");
    const listings = query === "Apple" ? [{
      provider: "xstocks",
      asset: {
        companyId: "issuer:xstocks:AAPLx",
        name: "Apple",
        symbol: "AAPLx",
        underlyingSymbol: "AAPL",
        description: "Apple xStock",
        mint: "XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp",
      },
    }] : [];
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { listings, total: listings.length, unavailable: [], stale: [] } }),
    });
  });
  await page.route("**/api/v1/discovery/search", (route) => {
    aiRequests += 1;
    const query = route.request().postDataJSON().query;
    return route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ data: query === "Spiderman" ? [{
        candidateId: "candidate-0-issuer:xstocks:DISx",
        displayLabel: "Spider-Man",
        productId: null,
        companyId: "issuer:xstocks:DISx",
        ownerName: "Disney",
        matchedIssuerName: "The Walt Disney",
        issuer: "xstocks",
        symbol: "DISx",
        mint: "Xsg93jDV656ULQ5u9yT2x5DS9b4xGD8aDCtfESSW6Bb",
        state: "matched",
        confidenceBand: "low",
        sourceIds: ["src-xstocks"],
        requiresConfirmation: true,
      }] : [{
        candidateId: "candidate-0",
        displayLabel: "Unknown product",
        productId: null,
        companyId: null,
        ownerName: "Unknown Corp",
        state: "unlisted",
        confidenceBand: "low",
        sourceIds: [],
        requiresConfirmation: true,
      }] }),
    });
  });

  await page.goto("/discover");
  await page.getByRole("link", { name: "Browse current issuer assets" }).click();
  await expect(page).toHaveURL(/\/discover\?source=issuer$/);
  await page.getByLabel("Company name or symbol").fill("Apple");
  await expect(page.getByRole("heading", { name: "Apple" })).toBeVisible();
  expect(aiRequests).toBe(0);

  await page.getByLabel("Company name or symbol").fill("Spiderman");
  await expect(page.getByRole("heading", { name: "Company not found" })).toBeVisible();
  await page.getByRole("button", { name: "Find the company behind this product with AI" }).click();
  await expect(page.getByLabel("Product or brand name")).toHaveValue("Spiderman");
  expect(aiRequests).toBe(0);
  await page.getByLabel(/I agree to send this product name/).check();
  await page.getByRole("button", { name: "Find company behind product" }).click();
  await expect(page.getByText("AI suggested owner: Disney")).toBeVisible();
  await expect(page.getByText(/Matched issuer listing: The Walt Disney/)).toBeVisible();
  await expect(page.getByRole("link", { name: "View DISx on xStocks" }))
    .toHaveAttribute("href", "/assets/xstocks/DISx");

  await page.getByLabel("Product or brand name").fill("Unknown product");
  await page.getByRole("button", { name: "Find company behind product" }).click();
  await expect(page.getByText(/No available issuer asset for this product/)).toBeVisible();
  await expect(page.getByRole("link", { name: /View .* on xStocks|View .* on PreStocks/ })).toHaveCount(0);
  expect(aiRequests).toBe(2);
});

test("product ownership can lead to the matching PreStocks asset", async ({ page }) => {
  const listing = {
    provider: "prestocks",
    asset: {
      companyId: "issuer:prestocks:OPENAI",
      name: "OpenAI",
      symbol: "OPENAI",
      description: "Private-company exposure",
      mint: "PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF",
      issuerUrl: "https://prestocks.com/",
      markPriceUsd: "1",
      tokenPriceUsd: "1",
      markValuationUsd: "1",
      impliedValuationUsd: "1",
      supplyUi: "1",
      premiumBps: 0,
      premiumLabel: "At mark",
      observedAt: "2026-09-23T12:00:00.000Z",
    },
  };
  await page.route("**/api/v1/discovery/search", (route) => route.fulfill({
    status: 201,
    contentType: "application/json",
    body: JSON.stringify({ data: [{
      candidateId: "candidate-0-issuer:prestocks:OPENAI",
      displayLabel: "ChatGPT",
      productId: null,
      companyId: listing.asset.companyId,
      ownerName: "OpenAI Group PBC",
      matchedIssuerName: "OpenAI",
      issuer: "prestocks",
      symbol: "OPENAI",
      mint: listing.asset.mint,
      state: "matched",
      confidenceBand: "low",
      sourceIds: ["src-prestocks-api"],
      requiresConfirmation: true,
    }] }),
  }));
  await page.route("**/api/v1/issuer/asset/prestocks/OPENAI", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data: { listing } }),
  }));

  await page.goto("/discover?source=issuer&entity=product");
  await page.getByLabel("Product or brand name").fill("ChatGPT");
  await page.getByLabel(/I agree to send this product name/).check();
  await page.getByRole("button", { name: "Find company behind product" }).click();
  await expect(page.getByText("AI suggested owner: OpenAI Group PBC")).toBeVisible();
  await expect(page.getByText(/Matched issuer listing: OpenAI/)).toBeVisible();
  await page.getByRole("link", { name: "View OPENAI on PreStocks" }).click();
  await expect(page).toHaveURL(/\/assets\/prestocks\/OPENAI$/, { timeout: 20_000 });
  await expect(page.getByText(listing.asset.mint)).toBeVisible();
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
  await expect(page).toHaveURL(/\/scan\/results$/, { timeout: 20_000 });
  await expect(page.getByText(/Likely owner: Apple/)).toBeVisible();
  await expect(page.getByText(/Public · xStocks · AAPLx · mint/)).toBeVisible();
  expect(submittedImage).toBe(true);
});
