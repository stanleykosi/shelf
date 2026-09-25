import { expect, test } from "@playwright/test";

// Public auth checks do not invoke Magic or mutate account state.
test.describe("Concept 2 account entry", () => {
  test("sign-in is a keyboard-ready form with deliberate wallet context", async ({ page }) => {
    await page.goto("/sign-in?returnTo=%2Faccount%2Fwallet");
    await expect(page.getByRole("heading", { name: "Continue your research." })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue with email" })).toBeDisabled();
    await page.getByLabel("Email address").fill("researcher@example.test");
    await expect(page.getByRole("button", { name: "Continue with email" })).toBeEnabled();
    await expect(page.getByText("Signing in does not place an order", { exact: false })).toBeVisible();
    await expect(page.getByRole("link", { name: "Continue as guest" })).toHaveAttribute("href", "/");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });

  test("callback without a challenge offers recovery without tokens", async ({ page }) => {
    await page.goto("/auth/callback");
    await expect(page.getByRole("main").getByRole("alert")).toHaveText("LOGIN_CHALLENGE_MISSING");
    await expect(page.getByRole("link", { name: "Try again" })).toHaveAttribute("href", "/sign-in");
  });
});
