import { expect, test, type Page } from "@playwright/test";
import { scanMatches, scanUpload } from "../fixtures/scan";

const baseURL = process.env.PLAYWRIGHT_BASE_URL;
test.skip(!baseURL || !["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname), "Local fixture tests only; never call paid recognition");

async function upload(page: Page) {
  await page.goto("/scan?method=upload");
  await page.getByLabel("Choose image file").setInputFiles(scanUpload);
  await expect(page.getByRole("heading", { name: "Check your image" })).toBeVisible();
}

async function results(page: Page, matches = scanMatches) {
  await page.route("**/api/v1/discovery/image", (route) => route.fulfill({ json: { data: matches } }));
  await upload(page);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Identify products", exact: true }).click();
  await expect(page).toHaveURL(/\/scan\/results$/);
}

test("preview requires current per-image consent, routes results, and persists no evidence", async ({ page }) => {
  let calls = 0;
  await page.route("**/api/v1/discovery/image", async (route) => {
    calls++;
    const body = route.request().postDataJSON();
    expect(body.aiProcessingConsentVersion).toBe("ai-processing-v1");
    expect(body.aiProcessingConsentAccepted).toBe(true);
    expect(body.acknowledgeAiProcessing).toBe(true);
    expect(body.mode).toBe("photo");
    await route.fulfill({ json: { data: scanMatches } });
  });
  await upload(page);
  expect(calls).toBe(0);
  await expect(page.getByRole("button", { name: "Identify products", exact: true })).toBeDisabled();
  await page.getByRole("checkbox").check();
  await page.getByLabel("Choose image file").setInputFiles(scanUpload);
  await expect(page.getByRole("checkbox")).not.toBeChecked();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Identify products", exact: true }).click();
  await expect(page).toHaveURL(/\/scan\/results$/);
  expect(calls).toBe(1);
  await expect(page.getByRole("link", { name: "View research" })).toHaveCount(0);
  expect(await page.evaluate(() => sessionStorage.getItem("shelf:scan-results"))).toBeNull();
  expect(await page.evaluate(() => JSON.stringify({ ...sessionStorage, ...localStorage }))).not.toContain("data:image");
});

test("confirm, ambiguity, correction, exclusion and save preserve separate facts", async ({ page }) => {
  await results(page);
  await page.getByRole("button", { name: "Confirm Product", exact: true }).click();
  await expect(page.getByRole("link", { name: "View research" })).toHaveAttribute("href", "/companies/pepsico");
  await page.getByRole("button", { name: "Next candidate" }).click();
  await expect(page.getByText("More than one Product fits")).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirm Product", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Change match", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("button", { name: "Close replacement search" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  expect(await page.evaluate(() => Boolean(document.querySelector("dialog")?.contains(document.activeElement)))).toBe(true);
  await dialog.getByLabel("Search products, brands, or companies").fill("Tide");
  await dialog.locator(".scan-search-list button").click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Change match", exact: true })).toBeFocused();
  await expect(page.getByRole("link", { name: "View research" })).toHaveCount(0);
  await page.getByRole("button", { name: "Confirm Product", exact: true }).click();
  await page.getByRole("button", { name: "Next candidate" }).click();
  await expect(page.getByText("Not in the reviewed catalog")).toBeVisible();
  await page.getByRole("button", { name: "Exclude", exact: true }).click();
  await expect(page.getByText("Your research is ready")).toBeVisible();
  await page.getByRole("button", { name: "Save confirmed Products" }).click();
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem("shelf:guest-items") ?? "[]"))).toEqual(["product-doritos-snack", "product-tide-laundry"]);
  await page.reload();
  await expect(page.getByRole("heading", { name: "These scan results are no longer available." })).toBeVisible();
});

test("camera permission is explicit and denied camera keeps alternatives available", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", { value: async () => { throw new DOMException("Denied", "NotAllowedError"); } });
  });
  await page.goto("/scan");
  await expect(page.getByRole("button", { name: "Open camera", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Open camera", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Camera access is blocked" })).toBeVisible();
  await expect(page.locator(".concept-two-shell")).toBeVisible();
  await page.goto("/scan?method=search");
  await page.getByLabel("Search products, brands, or companies").fill("iPhone");
  await page.locator(".scan-search-list button").click();
  await page.getByRole("button", { name: "Confirm Product", exact: true }).click();
  await expect(page.getByRole("link", { name: "View research" })).toHaveAttribute("href", "/companies/apple");
});

test("deterministic link and barcode do not request image consent", async ({ page }) => {
  await page.route("**/api/v1/discovery/image", () => { throw new Error("No image request permitted"); });
  await page.route("**/api/v1/discovery/link", async (route) => {
    expect(route.request().postDataJSON()).toEqual({ url: "https://www.apple.com/iphone/" });
    await route.fulfill({ json: { data: [{ ...scanMatches[0], displayLabel: "iPhone", productId: "product-apple-iphone" }] } });
  });
  await page.goto("/scan?method=link");
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  await page.getByLabel("Product URL").fill("https://www.apple.com/iphone/");
  await page.getByRole("button", { name: "Find product", exact: true }).click();
  await expect(page).toHaveURL(/\/scan\/results$/);
  await page.route("**/api/v1/discovery/barcode", async (route) => {
    expect(route.request().postDataJSON()).toEqual({ gtin: "00000000" });
    await route.fulfill({ json: { data: [] } });
  });
  await page.goto("/scan?method=barcode");
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  await page.getByLabel("Barcode digits").fill("00000000");
  await page.getByRole("button", { name: "Find product", exact: true }).click();
  await expect(page.getByRole("heading", { name: "No reviewed match found" })).toBeVisible();
});

test("privacy, quota, provider, invalid file and offline states stay recoverable", async ({ page, context }) => {
  for (const [code, text] of [["AI_PRIVACY_UNAVAILABLE", "Private processing is unavailable"], ["AI_USER_LIMIT_REACHED", "temporarily at its limit"], ["AI_PROVIDER_UNAVAILABLE", "Identification is unavailable"]]) {
    await page.route("**/api/v1/discovery/image", (route) => route.fulfill({ status: 503, json: { error: { code } } }));
    await upload(page);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Identify products", exact: true }).click();
    await expect(page.locator(".scan-alert[role=alert]")).toContainText(text);
    await expect(page.getByRole("heading", { name: "Check your image" })).toBeVisible();
    await expect(page.locator(".scan-camera-status")).toContainText("cleared when you leave this scan");
    await expect(page.getByText("not yet sent", { exact: false })).toHaveCount(0);
    await page.unroute("**/api/v1/discovery/image");
  }
  await page.getByLabel("Choose image file").setInputFiles({ name: "bad.pdf", mimeType: "application/pdf", buffer: Buffer.from("invalid") });
  await expect(page.locator(".scan-alert[role=alert]")).toContainText("JPEG, PNG or WebP");
  await context.setOffline(true);
  await expect(page.getByText("You’re offline.", { exact: false })).toBeVisible();
  await context.setOffline(false);
});

test("cancellation cannot publish late results and receipt/screenshot keep their modes", async ({ page }) => {
  for (const mode of ["receipt", "screenshot"]) {
    await page.route("**/api/v1/discovery/image", async (route) => {
      expect(route.request().postDataJSON().mode).toBe(mode);
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.fulfill({ json: { data: scanMatches } }).catch(() => {});
    });
    await page.goto(`/scan?method=${mode}`);
    await page.getByLabel("Choose image file").setInputFiles(scanUpload);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Identify products", exact: true }).click();
    await page.getByRole("button", { name: "Cancel identification" }).click();
    await expect(page.getByText("Identification cancelled.", { exact: false })).toBeVisible();
    await page.waitForTimeout(600);
    await expect(page).toHaveURL(new RegExp(`method=${mode}`));
    await page.unroute("**/api/v1/discovery/image");
  }
});

test("responsive matrix, reduced motion, correction focus and bottom-nav clearance", async ({ page }) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [390, 430, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await results(page, [scanMatches[0]]);
    await page.getByRole("button", { name: "Confirm Product", exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("button", { name: "Change match", exact: true }).click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Change match", exact: true })).toBeFocused();
    if (width < 820) {
      await expect(page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: "Scan" })).toHaveAttribute("aria-current", "page");
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      expect(await page.evaluate(() => document.querySelector(".mobile-navigation")!.getBoundingClientRect().top - document.querySelector(".scan-results-completion")!.getBoundingClientRect().bottom)).toBeGreaterThan(0);
    }
    await page.goto("/scan");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test("camera capture, switch, retake and method changes release media tracks", async ({ page }) => {
  await page.addInitScript(() => {
    const streams: MediaStream[] = [];
    Object.defineProperty(window, "testCameraStreams", { value: streams });
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", { value: async () => {
      const canvas = document.createElement("canvas");
      canvas.width = 640; canvas.height = 480;
      const drawing = canvas.getContext("2d")!;
      drawing.fillStyle = "#b6efd2"; drawing.fillRect(0, 0, 640, 480);
      const stream = canvas.captureStream(15);
      streams.push(stream);
      return stream;
    } });
    Object.defineProperty(navigator.mediaDevices, "enumerateDevices", { value: async () => [{ kind: "videoinput" }, { kind: "videoinput" }] });
  });
  await page.goto("/scan");
  await page.getByRole("button", { name: "Open camera", exact: true }).click();
  await expect(page.getByLabel("Camera preview")).toBeVisible();
  await page.getByRole("button", { name: "Switch camera", exact: true }).click();
  await expect.poll(() => page.locator("video").evaluate((video: HTMLVideoElement) => video.videoWidth)).toBe(640);
  await page.getByRole("button", { name: "Capture photo", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Check your image" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Identify products", exact: true })).toBeDisabled();
  const allStopped = () => page.evaluate(() => (window as Window & { testCameraStreams?: MediaStream[] }).testCameraStreams!.every((stream) => stream.getTracks().every((track) => track.readyState === "ended")));
  expect(await allStopped()).toBe(true);
  await page.getByRole("button", { name: "Retake", exact: true }).click();
  await expect(page.getByLabel("Camera preview")).toBeVisible();
  await page.locator(".scan-mobile-shortcuts:visible button, .scan-methods > .scan-method-list:visible button").filter({ hasText: /Upload/ }).click();
  await expect(page).toHaveURL(/method=upload/);
  await expect.poll(allStopped).toBe(true);
});

test("unlisted and all-excluded results never infer a Company", async ({ page }) => {
  await results(page, [scanMatches[2]]);
  await expect(page.getByRole("button", { name: "Confirm Product", exact: true })).toHaveCount(0);
  await expect(page.locator(".c2-entity-trail")).toHaveCount(0);
  await page.getByRole("button", { name: "Exclude", exact: true }).click();
  await expect(page.getByRole("heading", { name: "All results excluded" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save confirmed Products" })).toBeDisabled();
  await page.getByRole("button", { name: "Restore candidate" }).click();
  await expect(page.getByRole("heading", { name: "All results excluded" })).toHaveCount(0);
});

test("pending permission can be cancelled and missing cameras stay recoverable", async ({ page }) => {
  await page.addInitScript(() => {
    let requested = false;
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", { value: () => {
      if (requested) return Promise.reject(new DOMException("Missing", "NotFoundError"));
      requested = true;
      return new Promise<MediaStream>(() => {});
    } });
  });
  await page.goto("/scan");
  await page.getByRole("button", { name: "Open camera", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Waiting for camera permission" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel camera request" }).click();
  await page.getByRole("button", { name: "Open camera", exact: true }).click();
  await expect(page.getByRole("heading", { name: "No camera available" })).toBeVisible();
});

test("preview never upscales, preserves aspect ratio, and keeps consent essentials visible", async ({ page }) => {
  await page.goto("/scan?method=upload");
  for (const [width, height] of [[80, 40], [40, 80], [1800, 900], [900, 1800]]) {
    const data = await page.evaluate(({ width, height }) => {
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      return canvas.toDataURL("image/png").split(",")[1];
    }, { width, height });
    await page.getByLabel("Choose image file").setInputFiles({ name: "geometry-fixture.png", mimeType: "image/png", buffer: Buffer.from(data, "base64") });
    const preview = page.locator(".scan-media > img");
    await expect(preview).toBeVisible();
    await preview.evaluate((image: HTMLImageElement) => image.decode());
    const dimensions = await preview.evaluate((image: HTMLImageElement) => {
      const bounds = image.getBoundingClientRect();
      return { width: bounds.width, height: bounds.height, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight };
    });
    expect(dimensions.width).toBeLessThanOrEqual(dimensions.naturalWidth);
    expect(dimensions.height).toBeLessThanOrEqual(dimensions.naturalHeight);
    expect(dimensions.width / dimensions.height).toBeCloseTo(width / height, 1);
    expect(dimensions.height).toBeLessThanOrEqual(248);
  }
  await expect(page.getByText("01 / Identify")).toHaveCount(0);
  await expect(page.locator("#scan-processing-summary")).toContainText("OpenRouter");
  await expect(page.locator("#scan-retention-summary")).toBeVisible();
  await expect(page.locator("#scan-retention-summary")).toContainText("operational metadata");
  const details = page.getByText("Processing details", { exact: true });
  await details.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".scan-processing-details")).toHaveAttribute("open", "");
  await expect(page.getByRole("button", { name: "Identify products", exact: true })).toBeDisabled();
  await page.getByRole("checkbox").check();
  await expect(page.getByRole("button", { name: "Identify products", exact: true })).toBeEnabled();
  await expect(page.getByText("Consent accepted for this image. Ready to identify.")).toBeVisible();
});
