import { expect, test } from "@playwright/test";

test.skip(!process.env.PLAYWRIGHT_BASE_URL, "Runs only against an explicitly selected deployment");

test("production offers Magic sign-in while public research stays available to guests", async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  const isLocal = process.env.PLAYWRIGHT_BASE_URL?.startsWith("http://127.0.0.1");
  if (!isLocal) {
    const readiness = await request.get("/readyz");
    await expect(readiness).toBeOK();
    expect(await readiness.json()).toMatchObject({
      identityProvider: "magic",
      runtimeStore: "postgres",
      quoteProvider: "jupiter",
      realTrading: false,
    });

    const anonymousAccount = await request.get("/api/v1/me");
    expect(anonymousAccount.status()).toBe(401);

    await page.goto("/account");
    await expect(page).toHaveURL(/\/sign-in\?returnTo=%2Faccount$/);

    const challenge = await request.post("/api/v1/auth/challenges", {
      data: { purpose: "login", returnPath: "/onboarding" },
    });
    expect(challenge.status()).toBe(201);
    expect(await challenge.json()).toMatchObject({
      data: { oauthRedirectUri: "https://shelf-one-phi.vercel.app/auth/callback" },
    });
  }

  await page.goto("/sign-in");
  await expect(
    page.getByText("Use email or Google to access the same Magic-managed account"),
  ).toBeVisible();

  await page.goto("/markets");
  await expect(page).toHaveURL(/\/discover\?entity=company$/);
  await expect(page.getByRole("heading", { name: "Discover", exact: true })).toBeVisible();
  await expect(page.getByText("AUTH_REQUIRED")).toHaveCount(0);

  await page.goto("/companies/openai", { waitUntil: "domcontentloaded" });
  await expect(page.locator("details").filter({ hasText: "View token details" })).toContainText(
    "Source: PreStocks",
  );
  await expect(page.getByRole("link", { name: "Choose amount" })).toHaveAttribute(
    "href",
    "/invest/openai",
  );

  await page.goto("/shelf", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/saved$/, { timeout: 15_000 });
  await expect(page.getByRole("link", { name: "Sign in to keep this shelf" })).toBeVisible();
  await expect(page.getByText("AUTH_REQUIRED")).toHaveCount(0);
});

test("canonical research routes and route-aware navigation preserve the product model", async ({
  page,
}) => {
  await page.goto("/products/product-doritos-snack");
  await expect(page).toHaveURL(/\/products\/doritos-snack$/);
  await expect(page.getByRole("heading", { name: "Doritos snack" })).toBeVisible();

  await page.goto("/brands/doritos");
  await expect(page.getByRole("heading", { name: "Doritos", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "View company" })).toHaveAttribute(
    "href",
    "/companies/pepsico",
  );

  await page.goto("/companies/company-pepsico");
  await expect(page).toHaveURL(/\/companies\/pepsico$/);

  await page.goto("/scan");
  const mobileNavigation = page.locator('nav[aria-label="Mobile navigation"]');
  await expect(mobileNavigation.locator('a[href="/scan"]')).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByRole("link", { name: "Markets" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Saved", exact: true })).toHaveAttribute(
    "href",
    "/saved",
  );
});
