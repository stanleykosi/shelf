import { expect, test } from "@playwright/test";

test("one search checks live companies first, then resolves an unmatched product automatically", async ({ page }) => {
  const disney = {
    provider: "xstocks",
    asset: {
      companyId: "issuer:xstocks:DISx",
      name: "The Walt Disney",
      symbol: "DISx",
      logoUrl: "https://xstocks-metadata.backed.fi/logos/tokens/DISx.png",
      mint: "Xsg93jDV656ULQ5u9yT2x5DS9b4xGD8aDCtfESSW6Bb",
    },
  };
  const requests: Array<Record<string, unknown>> = [];
  await page.route("**/api/v1/issuer/reviewed", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data: { byCompany: {}, unavailable: [], stale: [] } }),
  }));
  await page.route("**/api/v1/discovery/query", (route) => {
    const body = route.request().postDataJSON();
    requests.push(body);
    const common = { listings: [], matches: [], unavailable: [], stale: [] };
    let result = { ...common, kind: "product" };
    if (body.query === "Disney") {
      result = { ...common, kind: "company", listings: [disney] };
    } else if (body.query === "Spiderman") {
      result = { ...common, kind: "product", matches: [{
        candidateId: "spiderman-disney",
        displayLabel: "Spider-Man",
        ownerName: "Disney",
        matchedIssuerName: "The Walt Disney",
        logoUrl: disney.asset.logoUrl,
        companyId: disney.asset.companyId,
        issuer: "xstocks",
        symbol: "DISx",
        mint: disney.asset.mint,
        state: "matched",
      }] };
    } else if (body.query === "Unknown product") {
      result = { ...common, kind: "product", matches: [{
        candidateId: "unknown",
        displayLabel: "Unknown product",
        ownerName: "Unknown Corp",
        companyId: null,
        state: "unlisted",
      }] };
    }
    return route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ data: result }),
    });
  });

  await page.goto("/");
  await page.getByLabel("Search a company or product").fill("Disney");
  await page.locator(".home-search-command").getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(/\/discover\?q=Disney$/);
  const search = page.getByPlaceholder("Search a company or product");
  await expect(page.getByRole("heading", { name: "The Walt Disney" })).toBeVisible();
  await expect(page.locator(".live-issuer-card .issuer-logo img"))
    .toHaveAttribute("src", /xstocks-metadata\.backed\.fi/);
  await expect(page.getByRole("link", { name: /View DISx issuer asset/ }))
    .toHaveAttribute("href", "/assets/xstocks/DISx");

  await search.fill("Spiderman");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByText("AI suggested owner: Disney")).toBeVisible();
  await expect(page.locator(".live-issuer-card .issuer-logo img"))
    .toHaveAttribute("src", /xstocks-metadata\.backed\.fi/);
  await expect(page.getByRole("link", { name: /View DISx issuer asset/ }))
    .toHaveAttribute("href", "/assets/xstocks/DISx");

  await search.fill("Unknown product");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("heading", { name: "No supported asset available" })).toBeVisible();
  await expect(page.getByRole("link", { name: /View .* issuer asset/ })).toHaveCount(0);
  expect(requests).toEqual([
    { query: "Disney" },
    { query: "Spiderman" },
    { query: "Unknown product" },
  ]);
  await expect(page.getByRole("checkbox")).toHaveCount(0);
});

test("a reviewed product keeps its source and links only to a live issuer mint", async ({ page }) => {
  await page.route("**/api/v1/shelf", (route) => route.fulfill({
    status: 401,
    contentType: "application/json",
    body: JSON.stringify({ error: { code: "AUTH_REQUIRED" } }),
  }));
  await page.route("**/api/v1/issuer/reviewed", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data: {
      byCompany: { "company-pepsico": [{
        provider: "xstocks",
        asset: {
          companyId: "issuer:xstocks:PEPx",
          name: "PepsiCo",
          symbol: "PEPx",
          mint: "Xsv99frTRUeornyvCfvhnDesQDWuvns1M852Pez91vF",
        },
      }] },
      unavailable: [],
      stale: [],
    } }),
  }));

  await page.goto("/products/doritos-snack");
  await expect(page.getByRole("heading", { name: "Reviewed relationship" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Current issuer assets" })).toBeVisible();
  await expect(page.getByRole("link", { name: "View current issuer asset" }))
    .toHaveAttribute("href", "/assets/xstocks/PEPx");
});

test("AI product fallback can link to PreStocks in the same search result", async ({ page }) => {
  await page.route("**/api/v1/issuer/reviewed", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data: { byCompany: {}, unavailable: [], stale: [] } }),
  }));
  await page.route("**/api/v1/discovery/query", (route) => {
    return route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ data: {
        kind: "product",
        listings: [],
        matches: [{
          candidateId: "chatgpt-openai",
          displayLabel: "ChatGPT",
          ownerName: "OpenAI Group PBC",
          matchedIssuerName: "OpenAI",
          logoUrl: "https://prestocks.com/logos/openai.png",
          companyId: "issuer:prestocks:OPENAI",
          issuer: "prestocks",
          symbol: "OPENAI",
          mint: "PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF",
          state: "matched",
        }],
        unavailable: [],
        stale: [],
      } }),
    });
  });

  await page.goto("/discover?q=ChatGPT");
  await expect(page.getByText("AI suggested owner: OpenAI Group PBC")).toBeVisible();
  await expect(page.locator(".live-issuer-card .issuer-logo img"))
    .toHaveAttribute("src", /prestocks\.com/);
  await expect(page.getByRole("link", { name: /View OPENAI issuer asset/ }))
    .toHaveAttribute("href", "/assets/prestocks/OPENAI");
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
        matchedIssuerName: "Apple",
        logoUrl: "https://xstocks-metadata.backed.fi/logos/tokens/AAPLx.png",
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
  await expect(page.locator(".scan-issuer-identity .issuer-logo img"))
    .toHaveAttribute("src", /xstocks-metadata\.backed\.fi/);
  expect(submittedImage).toBe(true);
});
