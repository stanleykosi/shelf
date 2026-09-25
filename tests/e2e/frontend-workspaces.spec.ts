import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createSessionToken } from "../../src/lib/session";
import axe from "axe-core";

// Requires scripts/seed-frontend-qa.ts and its explicit isolated database contract.
const fixtureBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
const enabled = process.env.FRONTEND_QA_FIXTURES === "true" && Boolean(fixtureBaseUrl && ["localhost", "127.0.0.1"].includes(new URL(fixtureBaseUrl).hostname));
test.skip(
  !enabled,
  "Requires the isolated authenticated frontend fixture server"
);
test.setTimeout(240_000);
const issuer = "did:qa:frontend-owner";
const token = createSessionToken(
  {
    sessionId: "frontend-qa-session",
    userId: `user-${createHash("sha256")
      .update(issuer)
      .digest("hex")
      .slice(0, 24)}`,
    issuer,
    sessionVersion: 0,
  },
  "frontend-qa-local-only-not-a-secret"
);
const routes = [
  ["product", "/products/doritos-snack"],
  ["brand", "/brands/doritos"],
  ["company", "/companies/pepsico"],
  ["saved", "/saved"],
  ["sharing", "/saved/share"],
  ["learn", "/learn"],
  ["assistant", "/assistant"],
  ["account", "/account"],
  ["wallet", "/account/wallet"],
  ["deposit", "/account/wallet/deposit"],
  ["onboarding", "/onboarding"],
  ["availability", "/onboarding/availability"],
  ["investment", "/invest/pepsico"],
  ["basket", "/invest/basket"],
  ["order-review", "/orders/qa-order/review"],
  ["order-status", "/orders/qa-order"],
  ["portfolio", "/portfolio"],
  ["holding", "/portfolio/instrument-pepx"],
  ["sell", "/portfolio/instrument-pepx/sell"],
  ["send", "/account/wallet/send"],
  ["activity", "/portfolio/activity"],
  ["record", "/portfolio/activity/qa-record"],
  ["admin", "/admin"],
  ["admin-catalog", "/admin/catalog"],
  ["admin-access", "/admin/access"],
  ["admin-operations", "/admin/operations"],
  ["admin-audit", "/admin/audit"],
] as const;

for (const width of [390, 430, 768, 1280, 1440]) {
  test(`Studio workspaces at ${width}px`, async ({
    page,
    context,
    baseURL,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "Explicit desktop/mobile sizes are covered in this matrix"
    );
    await context.addCookies([
      { name: "shelf_session", value: token, url: baseURL! },
    ]);
    await page.setViewportSize({ width, height: width < 820 ? 844 : 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.route("**/api/v1/issuer/reviewed", (route) =>
      route.fulfill({
        json: {
          data: {
            byCompany: {},
            stale: [],
            unavailable: ["xStocks", "PreStocks"],
          },
        },
      })
    );
    await page.route("**/api/v1/issuer/search**", (route) =>
      route.fulfill({
        json: {
          data: {
            listings: [],
            total: 0,
            unavailable: ["xStocks", "PreStocks"],
            stale: [],
          },
        },
      })
    );
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const [name, path] of routes) {
      await page.goto(path);
      await expect(page.locator(".research-workspace")).toBeVisible();
      await expect(page.locator("main h1, main h2").first()).toBeVisible();
      await expect(page.locator("main")).not.toContainText(
        "Checking account access…"
      );
      await page.locator("main").evaluate(async (element) => {
        await Promise.all(element.getAnimations({ subtree: true }).filter((animation) => animation.effect?.getTiming().iterations !== Infinity).map((animation) => animation.finished.catch(() => {})));
      });
      await expect(page.locator('main [role="status"]').filter({ hasText: /^(Loading|Checking)/ })).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth + 1
        ),
        `${path} has horizontal overflow at ${width}`
      ).toBe(true);
      if (name === "saved") {
        const covers = page.locator(".saved-product-card .research-product-image");
        await expect(covers).toHaveCount(2);
        for (const cover of await covers.all()) expect((await cover.boundingBox())!.height).toBeGreaterThanOrEqual(140);
      }
      const unlabeled = await page
        .locator("main button:visible")
        .evaluateAll(
          (buttons) =>
            buttons.filter(
              (button) =>
                !button.textContent?.trim() &&
                !button.getAttribute("aria-label")
            ).length
        );
      expect(unlabeled, `${path} has unlabeled buttons`).toBe(0);
      if (width === 390 || width === 1440) {
        // Capture loaded imagery or its real failure fallback, not an intermediate blank frame.
        await page.locator("main img").evaluateAll((images) => images.forEach((image) => { (image as HTMLImageElement).loading = "eager"; }));
        await page.waitForFunction(() => Array.from(document.querySelectorAll<HTMLImageElement>("main img")).every((image) => image.complete), null, { timeout: 30_000 });
        await page.screenshot({
          path: `artifacts/interaction-studio/routes/${name}-${width}.png`,
          fullPage: true,
        });
        if (width === 390 && ["product", "company", "saved", "portfolio", "send", "order-review", "admin-operations"].includes(name)) {
          await page.screenshot({ path: `artifacts/interaction-studio/routes/${name}-390-viewport.png` });
        }
      }
      if (width < 820) {
        await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
        const nav = await page.locator(".mobile-navigation").boundingBox();
        const lastAction = page
          .locator("main button:visible, main a:visible")
          .last();
        if (await lastAction.count()) {
          await lastAction.scrollIntoViewIfNeeded();
          await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
          const box = await lastAction.boundingBox();
          if (box && nav && box.y > 0)
            expect(
              box.y + box.height,
              `${path}: last action covered by navigation`
            ).toBeLessThanOrEqual(nav.y + 1);
        }
        if (width === 390 && ["product", "company", "saved", "portfolio", "send", "order-review", "admin-operations"].includes(name)) {
          await page.screenshot({ path: `artifacts/interaction-studio/routes/${name}-390-bottom.png` });
        }
      }
    }
    expect(errors).toEqual([]);
  });
}

test("owner areas remain distinct and mutation guards cannot be skipped", async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([
    { name: "shelf_session", value: token, url: baseURL! },
  ]);
  await page.goto("/invest/pepsico");
  await expect(page.getByRole("heading", { level: 1, name: "Review an investment in PepsiCo" })).toBeVisible();
  await page.goto("/admin/access");
  await expect(
    page.getByRole("heading", { level: 1, name: "Access" })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create invitation" })
  ).toBeDisabled();
  await page.getByLabel("Invitation email").fill("fixture@example.invalid");
  await page
    .getByLabel("Reason for this action")
    .fill("Local UI guard verification only");
  await expect(
    page.getByRole("button", { name: "Create invitation" })
  ).toBeDisabled();
  await page.getByRole("checkbox").check();
  await expect(
    page.getByRole("button", { name: "Create invitation" })
  ).toBeEnabled();
  // Do not execute any administrative action in screenshot verification.
  await page
    .getByRole("navigation", { name: "Administration", exact: true })
    .getByRole("link", { name: "Audit" })
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Audit" })
  ).toBeVisible();
  await expect(page.getByText("frontend_qa_fixture")).toBeVisible();
});

test("remaining workspaces pass automated WCAG checks", async ({ page, context, baseURL }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Explicit desktop and mobile coverage below");
  await context.addCookies([{ name: "shelf_session", value: token, url: baseURL! }]);
  await page.route("**/api/v1/issuer/reviewed", (route) => route.fulfill({ json: { data: { byCompany: {}, stale: [], unavailable: ["xStocks", "PreStocks"] } } }));
  await page.emulateMedia({ reducedMotion: "reduce" });
  const findings: unknown[] = [];
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [, path] of routes) {
      await page.goto(path);
      await expect(page.locator("main h1")).toBeVisible();
      await expect(page.locator("main .loading-feedback")).toHaveCount(0);
      await page.addScriptTag({ content: axe.source });
      const result = await page.evaluate(async () => {
        const engine = (window as Window & { axe: typeof import("axe-core") }).axe;
        return engine.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa"] });
      });
      for (const violation of result.violations) findings.push({ path, width, id: violation.id, impact: violation.impact, nodes: violation.nodes.map((node) => node.target) });
    }
  }
  await testInfo.attach("accessibility-findings", { body: JSON.stringify(findings, null, 2), contentType: "application/json" });
  expect(findings).toEqual([]);
});

test("public entries and honest empty states have review screenshots", async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Two explicit widths below");
  await context.clearCookies();
  await page.route("**/api/v1/shelf", (route) => route.fulfill({ status: 401, json: { error: { code: "AUTH_REQUIRED" } } }));
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    for (const [name, path] of [["sign-in", "/sign-in"], ["saved-empty", "/saved"], ["learn-article", "/learn/brands-and-companies"], ["share-expired", "/share/unknown-qa-snapshot"]]) {
      await page.goto(path);
      await expect(page.locator("main h1")).toBeVisible();
      if (name === "saved-empty") await expect(page.getByRole("heading", { name: "No saved Products" })).toBeVisible();
      if (name === "share-expired") await expect(page.locator("main").getByRole("alert")).toContainText("unavailable");
      await page.screenshot({ path: `artifacts/interaction-studio/routes/${name}-${width}.png`, fullPage: true });
    }
  }
});
