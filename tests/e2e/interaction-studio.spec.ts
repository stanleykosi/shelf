import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createSessionToken } from "../../src/lib/session";
import axe from "axe-core";

const base = process.env.PLAYWRIGHT_BASE_URL;
test.skip(process.env.FRONTEND_QA_FIXTURES !== "true" || !base || !["localhost", "127.0.0.1"].includes(new URL(base).hostname), "Requires isolated local QA fixtures");
const issuer = "did:qa:frontend-owner";
const token = createSessionToken({ sessionId: "frontend-qa-session", userId: `user-${createHash("sha256").update(issuer).digest("hex").slice(0,24)}`, issuer, sessionVersion: 0 }, "frontend-qa-local-only-not-a-secret");

test.beforeEach(async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "shelf_session", value: token, url: baseURL! }]);
  await page.route("**/api/v1/issuer/reviewed", (route) => route.fulfill({ json: { data: { byCompany: {}, stale: [], unavailable: ["xStocks", "PreStocks"] } } }));
});

test("linked wallet copies its full address and confirms with a temporary check", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { value: { writeText: async (value: string) => { document.documentElement.dataset.clipboard = value; } } });
  });
  await page.goto("/account");
  const copy = page.getByRole("button", { name: "Copy linked Solana wallet address" });
  await expect(copy).toBeEnabled();
  const address = await page.locator(".settings-wallet-identity code").textContent();
  await copy.click();
  const copied = page.getByRole("button", { name: "Linked wallet address copied" });
  await expect(copied).toHaveAttribute("data-copied", "true");
  await expect(page.locator("html")).toHaveAttribute("data-clipboard", address!);
  await page.screenshot({ scale: "css", path: `artifacts/interaction-studio/account-copy-${testInfo.project.name}.png`, fullPage: true });
  await expect(copy).toBeVisible({ timeout: 5000 });
});

test("conversation keeps turns, respects consent, copies answers and clears without storing chat", async ({ page }, testInfo) => {
  const submissions: Array<{ question: string; includeShelf: boolean }> = [];
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { value: { writeText: async (value: string) => { document.documentElement.dataset.clipboard = value; } } });
  });
  await page.route("**/api/v1/consents", (route) => route.fulfill({ json: { data: {} } }));
  await page.route("**/api/v1/ai/answer", (route) => {
    submissions.push(route.request().postDataJSON());
    return route.fulfill({ json: { data: { answer: submissions.length === 1 ? "A brand is the identity you recognize. A company can own several brands.\n\nA familiar product is a starting point for research, not a reason to invest." : "Stock tokens have rights defined by their issuer. Review those terms before deciding.", sourceIds: ["article:brands-and-companies"], uncertainty: ["Ownership can differ by region."] } } });
  });
  await page.goto("/assistant?company=pepsico");
  await page.getByRole("button", { name: "How are brands and companies connected?" }).click();
  const send = page.getByRole("button", { name: "Send question", exact: true });
  await expect(send).toBeDisabled();
  expect(submissions).toHaveLength(0);
  await page.getByRole("checkbox", { name: "I agree to this processing of my question." }).check();
  await send.click();
  const chat = page.getByRole("log", { name: "Research conversation" });
  await expect(chat.getByText("A brand is the identity you recognize.", { exact: false })).toBeVisible();
  await page.getByLabel("Your research question").fill("What rights does a stock token give me?");
  await page.getByLabel("Your research question").press("Enter");
  await expect(chat.locator(".chat-user-message")).toHaveCount(2);
  await expect(chat.getByText("Stock tokens have rights defined by their issuer.", { exact: false })).toBeVisible();
  expect(submissions.map((request) => request.includeShelf)).toEqual([false, false]);
  expect(submissions[1].question).toBe("About PepsiCo: What rights does a stock token give me?");
  expect(submissions[1]).not.toHaveProperty("messages");
  await expect(page).not.toHaveURL(/question=/);
  expect(await page.evaluate(() => Object.values(sessionStorage).join(" "))).not.toContain("Stock tokens have rights");
  await page.getByRole("button", { name: "Copy response", exact: true }).last().click();
  await expect(page.getByRole("button", { name: "Response copied" })).toHaveAttribute("data-copied", "true");
  await expect(page.locator("html")).toHaveAttribute("data-clipboard", /Stock tokens have rights/);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ scale: "css", path: `artifacts/interaction-studio/assistant-conversation-${testInfo.project.name}.png`, fullPage: true });
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(chat).toHaveCount(0);
  await expect(page.getByLabel("Your research question")).toHaveValue("");
});

test("a stopped question can be retried without creating another user turn", async ({ page }) => {
  await page.route("**/api/v1/consents", (route) => route.fulfill({ json: { data: {} } }));
  let requests = 0;
  await page.route("**/api/v1/ai/answer", async (route) => {
    requests++;
    if (requests === 1) await new Promise((resolve) => setTimeout(resolve, 2000));
    await route.fulfill({ json: { data: { answer: "USDC is a token on supported networks.", sourceIds: [], uncertainty: [] } } }).catch(() => {});
  });
  await page.goto("/assistant");
  await page.getByLabel("Your research question").fill("What is USDC?");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Send question", exact: true }).click();
  await expect.poll(() => requests).toBe(1);
  await page.getByRole("button", { name: "Stop response" }).click();
  await expect(page.getByText("Response stopped. You can pick this question up again.")).toBeVisible();
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByText("USDC is a token on supported networks.")).toBeVisible();
  await expect(page.locator(".chat-user-message")).toHaveCount(1);
  await expect(page.getByText("No source references were returned.", { exact: false })).toBeVisible();
});

test("collection and holdings filters keep original records available", async ({ page }) => {
  await page.goto("/saved");
  await expect(page.locator(".saved-product-card")).toHaveCount(2);
  await page.getByLabel("Search saved research").fill("doritos");
  await expect(page.locator(".saved-product-card")).toHaveCount(1);
  await expect(page.locator(".saved-product-card")).toContainText("Doritos");
  await page.getByLabel("Search saved research").fill("unmatched");
  await page.getByRole("button", { name: "Clear search" }).click();
  await expect(page.locator(".saved-product-card")).toHaveCount(2);
  await page.goto("/portfolio");
  await expect(page.locator(".portfolio-holding-row")).toHaveCount(1);
  await page.getByLabel("Search holdings").fill("unmatched");
  await expect(page.locator(".portfolio-holding-row")).toHaveCount(0);
  await page.getByRole("button", { name: "Clear search" }).click();
  await expect(page.locator(".portfolio-holding-row")).toHaveCount(1);
});

test("refined workspaces fit mobile and desktop with accessible contrast", async ({ page }, testInfo) => {
  test.setTimeout(180000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const paths = [["saved", "/saved"], ["assistant", "/assistant"], ["account", "/account"], ["wallet", "/account/wallet"], ["portfolio", "/portfolio"], ["holding", "/portfolio/instrument-pepx"], ["activity", "/portfolio/activity"], ["sign-in", "/sign-in"]];
  const issues: unknown[] = [];
  for (const [name, path] of paths) {
    await page.goto(path);
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.locator("main .loading-feedback")).toHaveCount(0);
    if (name === "wallet") await expect(page.getByRole("button", { name: "Copy wallet address" })).toBeEnabled();
    if (name === "account") await expect(page.getByRole("button", { name: "Copy linked Solana wallet address" })).toBeEnabled();
    const widths = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: innerWidth }));
    expect(widths.document, path).toBeLessThanOrEqual(widths.viewport + 1);
    await page.addScriptTag({ content: axe.source });
    const violations = await page.evaluate(async () => (await (window as Window & { axe: typeof import("axe-core") }).axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa"] })).violations.map((item) => ({ id: item.id, nodes: item.nodes.map((node) => node.target) })));
    if (violations.length) issues.push({ path, violations });
    await page.screenshot({ scale: "css", path: `artifacts/interaction-studio/${name}-${testInfo.project.name}.png`, fullPage: true });
  }
  expect(issues).toEqual([]);
});
