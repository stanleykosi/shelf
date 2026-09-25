import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100";
if (!["127.0.0.1", "localhost"].includes(new URL(baseURL).hostname)) {
  throw new Error("Design capture is limited to the local application.");
}
const output = "artifacts/concept-2";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const problems = [];

async function prepareImages(page) {
  await page.evaluate(async () => {
    await Promise.all(Array.from(document.images).map((image) => {
      image.loading = "eager";
      return image.decode().catch(() => undefined);
    }));
  });
}

try {
  for (const width of [1440, 390, 1280, 430]) {
    const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 1000 } });
    page.on("pageerror", (error) => problems.push(error.message));
    for (const [name, path] of [["home", "/"], ["discover", "/discover"]]) {
      await page.goto(baseURL + path, { waitUntil: "networkidle" });
      await prepareImages(page);
      await page.waitForTimeout(1100);
      await page.screenshot({ path: output + "/" + name + "-" + width + "-viewport.png" });
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let top = 0; top < height; top += 600) {
        await page.evaluate((position) => window.scrollTo(0, position), top);
        await page.waitForTimeout(180);
      }
      await page.waitForTimeout(800);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(300);
      await page.screenshot({ path: output + "/" + name + "-" + width + "-full.png", fullPage: true });
      console.log(name + " " + width + "px captured");
    }
    if (width === 1440) {
      for (const [name, path] of [["search", "/discover?q=Apple"], ["filtered", "/discover?market=private"]]) {
        await page.goto(baseURL + path, { waitUntil: "networkidle" });
        await prepareImages(page);
        await page.screenshot({ path: output + "/discover-" + name + ".png", fullPage: true });
      }
    }
    await page.close();
  }
  const recording = await browser.newContext({ viewport: { width: 1440, height: 1000 }, recordVideo: { dir: output + "/motion", size: { width: 1440, height: 1000 } } });
  const page = await recording.newPage();
  await page.goto(baseURL + "/", { waitUntil: "networkidle" });
  await prepareImages(page);
  await page.waitForTimeout(1400);
  await page.getByRole("navigation", { name: "Example product" }).getByRole("button", { name: "Apple" }).click();
  await page.waitForTimeout(700);
  await page.getByRole("navigation", { name: "Example product" }).getByRole("button", { name: "Tide" }).click();
  await page.waitForTimeout(700);
  for (let step = 0; step < 22; step++) {
    await page.mouse.wheel(0, 155);
    await page.waitForTimeout(180);
  }
  await recording.close();
} finally {
  await browser.close();
}
if (problems.length) throw new Error(problems.join("\n"));
console.log("Captures complete; no browser page errors.");
