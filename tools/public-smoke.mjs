import { chromium } from "playwright";

const urls = process.argv[2] ? [process.argv[2]] : [
  "https://philo.kim/vmd/",
  "https://philo.kim/vmd/ko/"
];

let browser;
try {
  browser = await chromium.launch({ headless: true });
  for (const url of urls) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForSelector("h1", { timeout: 15000 });

    const title = await page.title();
    const h1 = await page.locator("h1").first().textContent();
    const bodyText = await page.locator("body").innerText();

    assertIncludes(title, "VMD", "page title");
    assertIncludes(h1, "VMD", "hero title");
    assertIncludes(bodyText, "visual-lossless", "visual-lossless framing");
    assertIncludes(bodyText, "stale", "edit-state stale handling");
    assertIncludes(bodyText, "locked", "locked render contract");

    if (bodyText.includes("lessons of formats") && bodyText.includes("spread")) {
      throw new Error(`public site still contains removed format adoption copy: ${url}`);
    }

    const overflow = await page.evaluate(() => ({
      width: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth
    }));
    if (overflow.scrollWidth > overflow.width + 1) {
      throw new Error(`public site has horizontal overflow at ${url}: ${JSON.stringify(overflow)}`);
    }

    await page.close();
    console.log(`public smoke test passed: ${url}`);
  }
} finally {
  if (browser) {
    await browser.close();
  }
}

function assertIncludes(value, expected, label) {
  if (!String(value || "").toLowerCase().includes(String(expected).toLowerCase())) {
    throw new Error(`${label} should include "${expected}"`);
  }
}
