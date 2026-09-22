import { expect, test } from "@playwright/test";

test.skip(!process.env.PLAYWRIGHT_BASE_URL, "Runs only against an explicitly selected deployment");

test("production offers Magic sign-in while public research stays available to guests", async ({
  page,
  request,
}) => {
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

  await page.goto("/settings");
  await expect(page).toHaveURL(/\/sign-in\?returnTo=%2Fsettings$/);
  await expect(page.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in");

  const challenge = await request.post("/api/v1/auth/challenges", {
    data: { purpose: "login", returnPath: "/welcome" },
  });
  expect(challenge.status()).toBe(201);
  expect(await challenge.json()).toMatchObject({
    data: { oauthRedirectUri: "https://shelf-one-phi.vercel.app/auth/callback" },
  });

  await page.goto("/sign-in");
  await expect(
    page.getByText("Use email or Google to access the same Magic-managed account"),
  ).toBeVisible();

  await page.goto("/markets");
  await expect(page.getByRole("heading", { name: "xStocks" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "PreStocks" })).toBeVisible();
  await expect(page.getByText("AUTH_REQUIRED")).toHaveCount(0);

  await page.goto("/shelf");
  await expect(page.getByRole("link", { name: "Sign in to keep this shelf" })).toBeVisible();
  await expect(page.getByText("AUTH_REQUIRED")).toHaveCount(0);
});
