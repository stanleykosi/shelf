import { expect, test } from "@playwright/test";

const metaListing = {
  provider: "xstocks",
  asset: {
    companyId: "issuer:xstocks:METAx",
    name: "Meta",
    description: "Meta xStock",
    symbol: "METAx",
    mint: "Xsa62P5mvPszXL1krVUnU5ar38bBSVcWAB6fmPCo5Zu",
    underlyingSymbol: "META",
    exchange: "Nasdaq Stock Market",
    marketOpen: true,
    marketPeriod: "overnight",
    nextChangeAt: "2026-09-25T08:00:00.000Z",
    tradingHalted: false,
    supportsAtomicSwaps: true,
    observedAt: "2026-09-25T00:00:00.000Z",
  },
};

const openAiListing = {
  provider: "prestocks",
  asset: {
    companyId: "issuer:prestocks:OPENAI",
    name: "OpenAI",
    description: "OpenAI builds AI products.\n\nOPENAI is a PreStocks issued token.",
    symbol: "OPENAI",
    mint: "PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF",
    issuerUrl: "https://www.prestocks.com/openai",
    markPriceUsd: "996.02",
    tokenPriceUsd: "1104.87",
    markValuationUsd: "1000000000000",
    impliedValuationUsd: "1100000000000",
    supplyUi: "1901.87",
    premiumBps: 1093,
    premiumLabel: "10.93% premium",
    observedAt: "2026-09-25T00:00:00.000Z",
  },
};

test("xStocks details explain the underlying, token identity and timestamped disclosures", async ({ page }) => {
  await page.route("**/api/v1/issuer/asset/xstocks/METAx", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data: {
      listing: metaListing,
      metadata: {
        tokenIsin: "CH1436219229",
        underlyingIsin: "US30303M1027",
        underlyingCurrency: "USD",
        listingCountry: "US",
        issuerTradingAvailable: true,
      },
    } }),
  }));
  await page.route("**/api/v1/issuer/asset/xstocks/METAx/disclosures", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    headers: { "cache-control": "no-store" },
    body: JSON.stringify({ data: {
      checkedAt: "2026-09-25T00:10:00.000Z",
      multiplier: { current: "1.0028515433272898" },
      reserves: {
        timestamp: "2026-09-25T00:07:21.623Z",
        sharesHeld: "13801",
        circulatingSupply: "13746.598039119913278",
      },
    } }),
  }));

  await page.goto("/assets/xstocks/METAx");
  await expect(page.getByRole("heading", { name: "What this token represents" })).toBeVisible();
  await expect(page.getByText("METAx", { exact: true })).toBeVisible();
  await expect(page.getByText("Nasdaq Stock Market")).toBeVisible();
  await expect(page.getByText("13,801")).toBeVisible();
  await expect(page.getByText("13,746.598")).toBeVisible();
  await expect(page.getByText("1.0029×")).toBeVisible();
  await expect(page.getByText("Reserve snapshot:")).toBeVisible();
  await page.getByText("Security identifiers").click();
  await expect(page.getByText("CH1436219229")).toBeVisible();
  await expect(page.getByText("US30303M1027")).toBeVisible();
  await expect(page.getByRole("link", { name: "Review a purchase" })).toBeVisible();

  await page.route("**/api/v1/issuer/asset/xstocks/METAx/disclosures", (route) => route.fulfill({
    status: 503,
    contentType: "application/json",
    headers: { "cache-control": "no-store" },
    body: JSON.stringify({ error: { code: "XSTOCKS_UNAVAILABLE" } }),
  }));
  await page.reload();
  await expect(page.getByText("The issuer’s reserve snapshot is unavailable right now.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Review a purchase" })).toBeVisible();
});

test("PreStocks details distinguish reference values from a purchase quote", async ({ page }) => {
  await page.route("**/api/v1/issuer/asset/prestocks/OPENAI", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data: { listing: openAiListing } }),
  }));

  await page.goto("/assets/prestocks/OPENAI");
  await expect(page.getByRole("heading", { name: "PreStocks reference values" })).toBeVisible();
  await expect(page.getByText("$1,104.87")).toBeVisible();
  await expect(page.getByText("$996.02")).toBeVisible();
  await expect(page.getByText("10.93% premium")).toBeVisible();
  await expect(page.getByText("$1.1T")).toBeVisible();
  await expect(page.getByText("$1T")).toBeVisible();
  await expect(page.getByText("1,901.87 tokens")).toBeVisible();
  await expect(page.getByText(/not a live Jupiter execution price/)).toBeVisible();
  await expect(page.getByText(/Liquidity and exit are not guaranteed/)).toBeVisible();
  await expect(page.getByRole("link", { name: "View PreStocks information" })).toHaveAttribute(
    "href", "https://www.prestocks.com/openai",
  );
  await expect(page.getByRole("heading", { name: "Backing and corporate actions" })).toHaveCount(0);
});
