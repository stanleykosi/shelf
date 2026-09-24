import { expect, test } from "@playwright/test";

const metaListing = {
  provider: "xstocks",
  asset: {
    companyId: "issuer:xstocks:METAx",
    name: "Meta Platforms",
    description: "Issuer description of Meta exposure.",
    symbol: "METAx",
    mint: "XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp",
    underlyingSymbol: "META",
    exchange: "Nasdaq",
    marketOpen: false,
    marketPeriod: "closed",
    nextChangeAt: "",
    tradingHalted: false,
    supportsAtomicSwaps: true,
    observedAt: "2026-09-24T12:00:00.000Z",
  },
};

const openAiListing = {
  provider: "prestocks",
  asset: {
    companyId: "issuer:prestocks:OPENAI",
    name: "OpenAI",
    description: "Private company exposure.",
    symbol: "OPENAI",
    mint: "PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF",
    issuerUrl: "https://prestocks.com/openai",
    markPriceUsd: "996.02",
    tokenPriceUsd: "1104.87",
    markValuationUsd: "1000000",
    impliedValuationUsd: "1100000",
    supplyUi: "1901.87",
    premiumBps: 1093,
    premiumLabel: "10.93% premium",
    observedAt: "2026-09-24T12:00:00.000Z",
  },
};

test("xStocks details open a multi-turn AI chat with no request before the first question", async ({ page }) => {
  const requests: Array<Record<string, unknown>> = [];
  await page.route("**/api/v1/issuer/asset/xstocks/METAx", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data: { listing: metaListing } }),
  }));
  await page.route("**/api/v1/ai/answer", (route) => {
    requests.push(route.request().postDataJSON());
    return route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ data: {
        answer: requests.length === 1
          ? "METAx is an issuer token linked to Meta exposure."
          : "The issuer lists Nasdaq as the underlying exchange.",
        sourceIds: ["issuer:xstocks:METAx"],
        uncertainty: [],
        issuer: metaListing,
      } }),
    });
  });

  await page.goto("/assets/xstocks/METAx");
  await page.getByRole("link", { name: "Chat with AI" }).click();
  await expect(page).toHaveURL(/\/assistant\?provider=xstocks&symbol=METAx$/);
  await expect(page.getByText("xStocks context loaded")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Chat about Meta Platforms" })).toBeVisible();
  expect(requests).toHaveLength(0);

  await page.getByLabel("Your question").fill("What does METAx represent?");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("METAx is an issuer token linked to Meta exposure.")).toBeVisible();
  expect(requests[0]).toEqual({
    question: "What does METAx represent?",
    issuer: { provider: "xstocks", symbol: "METAx" },
    history: [],
  });

  await page.getByLabel("Your question").fill("What about its exchange?");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("The issuer lists Nasdaq as the underlying exchange.")).toBeVisible();
  expect(requests[1].history).toEqual([
    { role: "user", content: "What does METAx represent?" },
    { role: "assistant", content: "METAx is an issuer token linked to Meta exposure." },
  ]);

  await page.getByRole("button", { name: "Clear chat" }).click();
  await expect(page.locator(".assistant-message")).toHaveCount(0);
  await page.reload();
  await expect(page.getByText("xStocks context loaded")).toBeVisible();
  await expect(page.locator(".assistant-message")).toHaveCount(0);
  expect(requests).toHaveLength(2);
});

test("PreStocks chat loads its own issuer and blocks questions when that feed is unavailable", async ({ page }) => {
  await page.route("**/api/v1/issuer/asset/prestocks/OPENAI", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data: { listing: openAiListing } }),
  }));
  const requests: Array<Record<string, unknown>> = [];
  await page.route("**/api/v1/ai/answer", (route) => {
    requests.push(route.request().postDataJSON());
    return route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ data: {
        answer: "The issuer provides reference valuations, not a guaranteed exit price.",
        sourceIds: ["issuer:prestocks:OPENAI"],
        uncertainty: [],
        issuer: openAiListing,
      } }),
    });
  });

  await page.goto("/assets/prestocks/OPENAI");
  await page.getByRole("link", { name: "Chat with AI" }).click();
  await expect(page.getByText("PreStocks context loaded")).toBeVisible();
  await page.getByLabel("Your question").fill("What does the valuation mean?");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText(/not a guaranteed exit price/)).toBeVisible();
  expect(requests[0].issuer).toEqual({ provider: "prestocks", symbol: "OPENAI" });

  await page.route("**/api/v1/issuer/asset/prestocks/MISSING", (route) => route.fulfill({
    status: 503,
    contentType: "application/json",
    body: JSON.stringify({ error: { code: "PRESTOCKS_UNAVAILABLE" } }),
  }));
  await page.goto("/assistant?provider=prestocks&symbol=MISSING");
  await expect(page.getByRole("heading", { name: "Issuer details unavailable" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send message" })).toBeDisabled();
  await expect(page.locator(".assistant-message")).toHaveCount(0);
  expect(requests).toHaveLength(1);
});

test("two simultaneous browser conversations keep their issuer and messages separate", async ({ browser }) => {
  const publicUser = await browser.newContext();
  const privateUser = await browser.newContext();
  try {
    const publicPage = await publicUser.newPage();
    const privatePage = await privateUser.newPage();
    const publicRequests: Array<Record<string, unknown>> = [];
    const privateRequests: Array<Record<string, unknown>> = [];

    await publicPage.route("**/api/v1/issuer/asset/xstocks/METAx", (route) => route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ data: { listing: metaListing } }),
    }));
    await privatePage.route("**/api/v1/issuer/asset/prestocks/OPENAI", (route) => route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ data: { listing: openAiListing } }),
    }));
    await publicPage.route("**/api/v1/ai/answer", (route) => {
      publicRequests.push(route.request().postDataJSON());
      return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({
        data: { answer: "Public issuer answer", sourceIds: ["issuer:xstocks:METAx"], uncertainty: [], issuer: metaListing },
      }) });
    });
    await privatePage.route("**/api/v1/ai/answer", (route) => {
      privateRequests.push(route.request().postDataJSON());
      return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({
        data: { answer: "Private issuer answer", sourceIds: ["issuer:prestocks:OPENAI"], uncertainty: [], issuer: openAiListing },
      }) });
    });

    await Promise.all([
      publicPage.goto("/assistant?provider=xstocks&symbol=METAx"),
      privatePage.goto("/assistant?provider=prestocks&symbol=OPENAI"),
    ]);
    await expect(publicPage.getByText("xStocks context loaded")).toBeVisible();
    await expect(privatePage.getByText("PreStocks context loaded")).toBeVisible();
    await expect(publicPage.getByLabel("Your question")).toBeEnabled();
    await expect(privatePage.getByLabel("Your question")).toBeEnabled();
    const publicQuotaCookie = (await publicUser.cookies()).find((cookie) => cookie.name === "shelf_guest_ai");
    const privateQuotaCookie = (await privateUser.cookies()).find((cookie) => cookie.name === "shelf_guest_ai");
    expect(publicQuotaCookie?.httpOnly).toBe(true);
    expect(privateQuotaCookie?.httpOnly).toBe(true);
    expect(publicQuotaCookie?.value).not.toBe(privateQuotaCookie?.value);
    await publicPage.getByLabel("Your question").fill("Public question");
    await privatePage.getByLabel("Your question").fill("Private question");
    await Promise.all([
      publicPage.getByRole("button", { name: "Send message" }).click(),
      privatePage.getByRole("button", { name: "Send message" }).click(),
    ]);

    await expect(publicPage.getByText("Public issuer answer")).toBeVisible();
    await expect(privatePage.getByText("Private issuer answer")).toBeVisible();
    await expect(publicPage.getByText("Private issuer answer")).toHaveCount(0);
    await expect(privatePage.getByText("Public issuer answer")).toHaveCount(0);
    expect(publicRequests[0].issuer).toEqual({ provider: "xstocks", symbol: "METAx" });
    expect(privateRequests[0].issuer).toEqual({ provider: "prestocks", symbol: "OPENAI" });
  } finally {
    await Promise.all([publicUser.close(), privateUser.close()]);
  }
});

test("a failed answer restores the question for an accessible retry", async ({ page }) => {
  await page.route("**/api/v1/issuer/asset/xstocks/METAx", (route) => route.fulfill({
    status: 200, contentType: "application/json",
    body: JSON.stringify({ data: { listing: metaListing } }),
  }));
  let attempts = 0;
  await page.route("**/api/v1/ai/answer", async (route) => {
    attempts += 1;
    if (attempts === 1) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({
        error: { code: "AI_PROVIDER_UNAVAILABLE" },
      }) });
      return;
    }
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({
      data: { answer: "Issuer-supported answer", sourceIds: ["issuer:xstocks:METAx"], uncertainty: [], issuer: metaListing },
    }) });
  });

  await page.goto("/assistant?provider=xstocks&symbol=METAx");
  await expect(page.getByText("xStocks context loaded")).toBeVisible();
  await page.getByLabel("Your question").fill("What does METAx represent?");
  await page.getByLabel("Your question").press("Enter");
  await expect(page.locator(".assistant-message.user")).toContainText("What does METAx represent?");
  await expect(page.getByText("Thinking through the current source…")).toBeVisible();
  await expect(page.getByLabel("Your question")).toHaveValue("What does METAx represent?");
  await expect(page.locator(".assistant-message.user")).toHaveCount(0);
  await expect(page.getByText("The AI provider is unavailable. Your question is ready to retry.")).toBeVisible();

  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("Issuer-supported answer")).toBeVisible();
  expect(attempts).toBe(2);
});
