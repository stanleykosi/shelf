import { mkdir } from "node:fs/promises";
import { chromium, expect, type Page } from "@playwright/test";
import { scanMatches } from "../tests/fixtures/scan";

// Local visual fixtures only: no recognition request leaves the browser.
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3200";
if (!["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname)) throw new Error("Local capture only");
const output = "artifacts/scan-concept-2";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const problems: string[] = [];

async function capture(page: Page, name: string) {
  await page.evaluate(async () => {
    await Promise.all(Array.from(document.images).map((image) => { image.loading = "eager"; return image.decode().catch(() => undefined); }));
  });
  await page.screenshot({ path: `${output}/${name}.png` });
  await page.screenshot({ path: `${output}/${name}-full.png`, fullPage: true });
  console.log(name);
}

try {
  // Capture the existing reviewed artwork as a screenshot input; never fabricate packaging.
  const source = await browser.newPage({ baseURL });
  await source.goto("/scan?method=search");
  await source.getByLabel("Search a company or product").fill("Doritos");
  const artwork = source.getByAltText("Doritos product identity").first();
  await expect(artwork).toBeVisible();
  await artwork.evaluate((image: HTMLImageElement) => image.decode());
  const image = { name: "reviewed-doritos-screenshot.png", mimeType: "image/png", buffer: await artwork.screenshot() };
  await source.close();

  for (const width of [1440, 390, 430, 768, 1280]) {
    const page = await browser.newPage({ baseURL, viewport: { width, height: width < 500 ? 844 : 1000 }, reducedMotion: "reduce" });
    page.on("pageerror", (error) => problems.push(error.message));
    await page.route("**/api/v1/discovery/image", (route) => route.fulfill({ json: { data: scanMatches } }));
    await page.goto("/scan");
    await capture(page, `scan-${width}-default`);
    await page.goto("/scan?method=upload");
    await page.getByLabel("Choose image file").setInputFiles(image);
    await expect(page.getByRole("heading", { name: "Check your image" })).toBeVisible();
    await capture(page, `scan-${width}-preview`);
    if (width === 390) {
      await page.locator(".scan-consent").scrollIntoViewIfNeeded();
      await capture(page, "scan-390-consent-required");
    }
    await page.getByRole("checkbox").check();
    await page.evaluate(() => window.scrollTo(0, 0));
    await capture(page, `scan-${width}-preview-consent-accepted`);
    if (width === 390) {
      await page.locator(".scan-identify").scrollIntoViewIfNeeded();
      await capture(page, "scan-390-consent-accepted-actions");
    }
    await page.getByRole("button", { name: "Identify products", exact: true }).click();
    await expect(page).toHaveURL(/\/scan\/results$/, { timeout: 20_000 });
    await capture(page, `results-${width}-possible`);
    await page.getByRole("button", { name: "Confirm Product", exact: true }).click();
    await page.evaluate(() => window.scrollTo(0, 0));
    await capture(page, `results-${width}-confirmed`);
    if (width === 390) {
      await page.locator(".scan-resolved-relationship").scrollIntoViewIfNeeded();
      await capture(page, "results-390-confirmed-relationship");
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await capture(page, "results-390-actions-clearance");
    }
    await page.getByRole("button", { name: "Next candidate" }).click();
    await page.evaluate(() => window.scrollTo(0, 0));
    await capture(page, `results-${width}-ambiguous-multiple`);
    if (width === 390) {
      await page.getByRole("button", { name: "Change match", exact: true }).click();
      await page.getByRole("dialog").getByLabel("Search a company or product").fill("iPhone");
      await capture(page, "results-390-correction");
    }
    if (width === 1440 || width === 390) {
      await page.reload();
      await capture(page, `results-${width}-session-expired`);
      await page.route("**/api/v1/discovery/barcode", (route) => route.fulfill({ json: { data: [] } }));
      await page.goto("/scan?method=barcode");
      await page.getByLabel("Barcode digits").fill("00000000");
      await page.getByRole("checkbox").check();
      await page.getByRole("button", { name: "Find product", exact: true }).click();
      await expect(page.getByRole("heading", { name: "No reviewed match found" })).toBeVisible();
      await capture(page, `results-${width}-no-match`);
    }
    await page.close();
  }
} finally { await browser.close(); }
if (problems.length) throw new Error(problems.join("\n"));
console.log("Scan captures complete, no browser page errors. Recognition responses are simulated catalog fixtures.");
