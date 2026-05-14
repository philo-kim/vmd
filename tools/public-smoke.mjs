import { chromium } from "playwright";

const baseUrl = process.argv[2] || "https://philo-kim.github.io/vmd/";

let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForSelector(".sample-card", { timeout: 15000 });
  const title = await page.locator("h1").first().textContent();
  assertIncludes(title, "Semantic visual documents", "gallery title");

  await page.goto(new URL("family-platform.html", baseUrl).toString(), { waitUntil: "networkidle" });
  await page.waitForSelector(".block-claim", { timeout: 15000 });
  await page.locator('button[data-mode="deck"]').click();
  await page.waitForSelector(".deck-view .slide", { timeout: 15000 });
  await page.locator('button[data-mode="map"]').click();
  await page.waitForSelector(".map-view .map-node", { timeout: 15000 });

  await page.goto(new URL("benchmark.html", baseUrl).toString(), { waitUntil: "networkidle" });
  await page.waitForSelector("table", { timeout: 15000 });
  const benchmarkTitle = await page.locator("h1").first().textContent();
  assertIncludes(benchmarkTitle, "VMD vs Markdown", "benchmark title");

  await page.goto(new URL("playground.html", baseUrl).toString(), { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelector("#source")?.value.includes("@doc"));
  await page.locator('button[data-mode="deck"]').click();
  await page.waitForSelector(".deck-view", { timeout: 15000 });

  console.log(`public smoke test passed: ${baseUrl}`);
} finally {
  if (browser) {
    await browser.close();
  }
}

function assertIncludes(value, expected, label) {
  if (!String(value || "").includes(expected)) {
    throw new Error(`${label} should include "${expected}"`);
  }
}
