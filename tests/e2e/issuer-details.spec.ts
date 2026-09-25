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
  const chartRanges: string[] = [];
  await page.route("**/api/v1/issuer/asset/xstocks/METAx/market?range=*", (route) => {
    const range = new URL(route.request().url()).searchParams.get("range") ?? "";
    chartRanges.push(range);
    const oneWeek = range === "1W";
    return route.fulfill({ json: { data: {
      state: "available", historyState: "available", range, checkedAt: "2026-09-25T00:10:00.000Z",
      priceUsd: "614.25", change24hPct: 2.4, liquidityUsd: 150_000,
      venue: "raydium", poolAddress: "CKwJZwm7oj3nu4653N1EpDrqXbXAYXoPFiPeEnLouF8y",
      candles: [
        { time: 1790294400, open: 600, high: 610, low: 595, close: 605, volume: 5000 },
        { time: 1790308800, open: 605, high: 620, low: 602, close: 614, volume: 6000 },
        ...(oneWeek ? [{ time: 1790323200, open: 614, high: 640, low: 610, close: 633, volume: 7000 }] : []),
      ],
    } } });
  });
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
  await expect(page.getByRole("heading", { name: "Pool price" })).toBeVisible();
  await expect(page.getByText("$614.25", { exact: true })).toBeVisible();
  await expect(page.getByText("+2.40%", { exact: false })).toBeVisible();
  await expect(page.getByRole("img", { name: /Interactive USD candlestick chart/ })).toBeVisible();
  await expect(page.locator(".issuer-price-chart canvas").first()).toBeVisible();
  await page.evaluate(() => {
    (window as Window & { originalChartCanvas?: Element | null }).originalChartCanvas =
      document.querySelector(".issuer-price-chart canvas");
  });
  await page.getByRole("button", { name: "1W", exact: true }).click();
  await expect.poll(() => chartRanges).toContain("1W");
  await expect(page.getByRole("img", { name: /3 observed pool intervals/ })).toBeVisible();
  expect(await page.evaluate(() => (window as Window & { originalChartCanvas?: Element | null }).originalChartCanvas ===
    document.querySelector(".issuer-price-chart canvas"))).toBe(true);
  await expect(page.getByText("$640.00", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "What this token represents" })).toBeVisible();
  await expect(page.locator(".issuer-asset-subtitle strong")).toHaveText("METAx");
  await expect(page.getByText("Nasdaq Stock Market")).toBeVisible();
  await expect(page.getByText("13,801")).toBeVisible();
  await expect(page.getByText("13,746.598")).toBeVisible();
  await expect(page.getByText("1.0029×")).toBeVisible();
  await expect(page.getByText("Reserve snapshot:")).toBeVisible();
  await page.getByText("Security identifiers").click();
  await expect(page.getByText("CH1436219229")).toBeVisible();
  await expect(page.getByText("US30303M1027")).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy Solana mint" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy mint", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Review purchase" })).toBeVisible();

  await page.route("**/api/v1/issuer/asset/xstocks/METAx/disclosures", (route) => route.fulfill({
    status: 503,
    contentType: "application/json",
    headers: { "cache-control": "no-store" },
    body: JSON.stringify({ error: { code: "XSTOCKS_UNAVAILABLE" } }),
  }));
  await page.route("**/api/v1/issuer/asset/xstocks/METAx/market?range=*", (route) => route.fulfill({
    json: { data: { state: "available", historyState: "empty", range: "1D", checkedAt: "2026-09-25T00:10:00.000Z",
      priceUsd: "614.25", change24hPct: 2.4, liquidityUsd: 150_000,
      venue: "raydium", candles: [] } },
  }));
  await page.reload();
  await expect(page.getByText("The issuer’s reserve snapshot is unavailable right now.")).toBeVisible();
  await expect(page.getByText("No observed price history is available for this pool and range.")).toBeVisible();
  await expect(page.getByText("$614.25", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Review purchase" })).toBeVisible();
});

test("range errors keep the last chart visible and a retry replaces it", async ({ page }) => {
  let weekAttempts = 0;
  await page.route("**/api/v1/issuer/asset/xstocks/METAx", (route) => route.fulfill({
    json: { data: { listing: metaListing } },
  }));
  await page.route("**/api/v1/issuer/asset/xstocks/METAx/market?range=*", (route) => {
    const range = new URL(route.request().url()).searchParams.get("range");
    if (range === "1W") weekAttempts++;
    const failed = range === "1W" && weekAttempts === 1;
    return route.fulfill({ json: { data: {
      state: "available", historyState: failed ? "error" : "available", range,
      checkedAt: "2026-09-25T00:10:00.000Z", priceUsd: "614.25",
      change24hPct: 2.4, liquidityUsd: 150_000, venue: "raydium",
      candles: failed ? [] : [
        { time: 1790294400, open: 600, high: 610, low: 595, close: 605, volume: 5000 },
        { time: 1790308800, open: 605, high: 620, low: 602, close: 614, volume: 6000 },
        ...(range === "1W" ? [{ time: 1790323200, open: 614, high: 640, low: 610, close: 633, volume: 7000 }] : []),
      ],
    } } });
  });
  await page.goto("/assets/xstocks/METAx");
  await expect(page.getByRole("img", { name: /2 observed pool intervals/ })).toBeVisible();
  await page.getByRole("button", { name: "1W", exact: true }).click();
  await expect(page.getByText("Showing 1D history. 1W is temporarily unavailable.")).toBeVisible();
  await expect(page.getByRole("img", { name: /2 observed pool intervals/ })).toBeVisible();
  await page.getByRole("button", { name: "Retry 1W" }).click();
  await expect(page.getByRole("img", { name: /3 observed pool intervals/ })).toBeVisible();
  await expect(page.getByText("$640.00", { exact: true })).toBeVisible();
  await expect.poll(() => weekAttempts).toBe(2);
  await expect(page.getByText("temporarily unavailable")).toHaveCount(0);
});

test("purchase amount accepts decimal digits only", async ({ page }) => {
  await page.route("**/api/v1/issuer/asset/xstocks/METAx", (route) => route.fulfill({
    json: { data: { listing: metaListing } },
  }));
  await page.goto("/assets/xstocks/METAx");
  const amount = page.getByRole("textbox", { name: "Amount in USDC" });
  await amount.fill("1000.25");
  await expect(amount).toHaveValue("1,000.25");
  await amount.fill("12.34");
  await expect(amount).toHaveValue("12.34");
  await amount.fill("12abc");
  await expect(amount).toHaveValue("12.34");
  await amount.fill("12.3456789");
  await expect(amount).toHaveValue("12.34");
});

test("PreStocks details distinguish reference values from a purchase quote", async ({ page }) => {
  await page.route("**/api/v1/issuer/asset/prestocks/OPENAI", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data: { listing: openAiListing } }),
  }));

  await page.goto("/assets/prestocks/OPENAI");
  await expect(page.getByText("Historical chart unavailable")).toBeVisible();
  await expect(page.getByRole("img", { name: /Interactive USD candlestick chart/ })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "PreStocks reference values" })).toBeVisible();
  await expect(page.locator("#issuer-facts").getByText("$1,104.87")).toBeVisible();
  await expect(page.locator("#issuer-facts").getByText("$996.02")).toBeVisible();
  await expect(page.locator("#issuer-facts").getByText("10.93% premium")).toBeVisible();
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
