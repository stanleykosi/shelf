import { expect, test } from "@playwright/test";

const selectedBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
const isLocal = selectedBaseUrl
  ? ["localhost", "127.0.0.1"].includes(new URL(selectedBaseUrl).hostname)
  : false;

test.skip(!isLocal, "The exact HTTP route contract is verified against the local production build");

test("legacy, entity, access, and not-found routes return exact HTTP responses", async ({
  request,
}) => {
  const permanentRedirects = [
    ["/markets?q=apple", "/discover?entity=company&q=apple"],
    ["/markets/public", "/discover?entity=company&market=public"],
    ["/markets/private", "/discover?entity=company&market=private"],
    ["/shelf", "/saved"],
    ["/shelf/share", "/saved/share"],
    ["/wallet", "/account/wallet"],
    ["/wallet/deposit", "/account/wallet/deposit"],
    ["/wallet/send", "/account/wallet/send"],
    ["/history", "/portfolio/activity"],
    ["/history/owned-record", "/portfolio/activity/owned-record"],
    ["/settings", "/account"],
    ["/invest/suggest", "/invest/basket?source=ai"],
    ["/invest/buy?companyId=company-pepsico", "/invest/pepsico"],
    ["/invest/sell?assetId=instrument-pepx", "/portfolio/instrument-pepx/sell"],
    ["/admin/status", "/admin"],
    ["/admin/invites", "/admin/access"],
    ["/admin/orders", "/admin/operations"],
    ["/products/product-doritos-snack", "/products/doritos-snack"],
    ["/companies/company-pepsico", "/companies/pepsico"],
  ] as const;

  for (const [source, destination] of permanentRedirects) {
    const response = await request.get(source, { maxRedirects: 0 });
    expect(response.status(), source).toBe(308);
    expect(response.headers().location, source).toBe(destination);
  }

  for (const [source, destination] of [
    ["/welcome", "/onboarding"],
    ["/eligibility", "/onboarding/availability"],
  ] as const) {
    const response = await request.get(source, { maxRedirects: 0 });
    expect(response.status(), source).toBe(307);
    expect(response.headers().location, source).toBe(destination);
  }

  const protectedResponse = await request.get("/account", { maxRedirects: 0 });
  expect(protectedResponse.status()).toBe(307);
  expect(protectedResponse.headers().location).toBe("/sign-in?returnTo=%2Faccount");

  for (const path of [
    "/products/not-a-reviewed-product",
    "/brands/not-a-reviewed-brand",
    "/companies/not-a-reviewed-company",
    "/not-a-route",
  ]) {
    expect((await request.get(path, { maxRedirects: 0 })).status(), path).toBe(404);
  }
});
