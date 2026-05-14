import { chromium } from "playwright";

const baseUrl = process.argv[2] || "https://philo.kim/vmd/";

let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForSelector("h1", { timeout: 15000 });

  const title = await page.title();
  const h1 = await page.locator("h1").first().textContent();
  const bodyText = await page.locator("body").innerText();

  assertIncludes(title, "VMD", "page title");
  assertIncludes(h1, "VMD", "hero title");
  assertIncludes(
    bodyText,
    "The web needs a visual source format that AI can reason about.",
    "source-layer framing"
  );

  if (bodyText.includes("lessons of formats") && bodyText.includes("spread")) {
    throw new Error("public site still contains removed format adoption copy");
  }

  const overflow = await page.evaluate(() => ({
    width: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
  if (overflow.scrollWidth > overflow.width + 1) {
    throw new Error(`public site has horizontal overflow: ${JSON.stringify(overflow)}`);
  }

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
