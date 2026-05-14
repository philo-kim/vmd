import assert from "node:assert/strict";
import http from "node:http";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const extensionPath = path.join(root, "extension");
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const tempRoot = await mkdtemp(path.join(os.tmpdir(), "vmd-chrome-test-"));
const userDataDir = path.join(tempRoot, "profile");
const fixturePath = path.join(tempRoot, "fixture.vmd");
const preserveFixturePath = path.join(tempRoot, "preserve.vmd");
const fixtureSource = `@doc "Chrome Auto Render Test" {
  format: deck
  theme: clean
}

# Browser-native VMD

::frame[role="opening"]
  ::claim
  A .vmd file should render when opened in Chrome.
  ::
::
`;
const preserveSource = `@doc "Chrome Preserve Test" {
  format: preserved-html
  fidelity: preserve
  html-lang: ko
  body-class: source-body
  body-id: preserve-root
  body-style: background: rgb(12, 20, 31);
  body-data-theme: imported
}

::raw.css
body.source-body { margin: 0; }
.preserved-fixture {
  display: grid;
  min-height: 100vh;
  place-items: center;
  color: rgb(240, 253, 250);
}
::

::raw.html
<main class="preserved-fixture">
  <h1>Preserved Page</h1>
</main>
::
`;

await writeFile(fixturePath, fixtureSource, "utf8");
await writeFile(preserveFixturePath, preserveSource, "utf8");

const server = http.createServer((request, response) => {
  if (request.url === "/fixture.vmd") {
    response.writeHead(200, {
      "content-type": "text/plain; charset=utf-8"
    });
    response.end(fixtureSource);
    return;
  }

  if (request.url === "/preserve.vmd") {
    response.writeHead(200, {
      "content-type": "text/plain; charset=utf-8"
    });
    response.end(preserveSource);
    return;
  }

  response.writeHead(404);
  response.end("not found");
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();

let context;
try {
  const launchOptions = {
    headless: process.env.HEADLESS === "1",
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      "--disable-extensions-file-access-check",
      "--allow-file-access-from-files"
    ]
  };

  if (process.env.USE_SYSTEM_CHROME === "1") {
    launchOptions.executablePath = chromePath;
  }

  context = await chromium.launchPersistentContext(userDataDir, launchOptions);

  let [worker] = context.serviceWorkers();
  if (!worker) {
    worker = await context.waitForEvent("serviceworker", { timeout: 10000 });
  }
  assert.ok(worker.url().startsWith("chrome-extension://"), "extension service worker should be loaded");
  const extensionId = new URL(worker.url()).host;

  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}/fixture.vmd`);
  await page.waitForSelector("body.vmd-auto-page", { timeout: 15000 });
  await page.waitForSelector(".block-claim", { timeout: 15000 });

  const title = await page.locator(".doc-title h1").first().textContent();
  assert.equal(title, "Chrome Auto Render Test");

  await page.locator('button[data-mode="deck"]').click();
  await page.waitForSelector(".slide .block-claim", { timeout: 5000 });

  const preservePage = await context.newPage();
  await preservePage.goto(`http://127.0.0.1:${port}/preserve.vmd`);
  await preservePage.waitForSelector(".preserved-fixture", { timeout: 15000 });
  assert.equal(await preservePage.locator("html").getAttribute("lang"), "ko");
  assert.equal(await preservePage.locator("body").getAttribute("class"), "source-body", "preserve mode should keep source body class only");
  assert.equal(await preservePage.locator("body").getAttribute("id"), "preserve-root");
  assert.equal(await preservePage.locator("body").getAttribute("data-theme"), "imported");
  assert.equal(await preservePage.locator(".auto-banner").count(), 0, "preserve mode should not inject the VMD toolbar");
  assert.equal(await preservePage.locator("head style").count(), 0, "preserve mode should not inject extension stylesheet into head");
  const preservedTextColor = await preservePage.locator(".preserved-fixture").evaluate((element) => getComputedStyle(element).color);
  assert.equal(preservedTextColor, "rgb(240, 253, 250)");

  const localPreservePage = await context.newPage();
  await localPreservePage.goto(pathToFileURL(preserveFixturePath).href);
  await localPreservePage.waitForSelector(".preserved-fixture", { timeout: 15000 });
  assert.equal(await localPreservePage.locator("html").getAttribute("lang"), "ko");
  assert.equal(await localPreservePage.locator("body").getAttribute("class"), "source-body", "local preserve files should keep source body class only");
  assert.equal(await localPreservePage.locator(".auto-banner").count(), 0, "local preserve files should not inject the VMD toolbar");
  assert.equal(await localPreservePage.locator("head style").count(), 0, "local preserve files should not inject extension stylesheet into head");

  const viewerPage = await context.newPage();
  await viewerPage.goto(`chrome-extension://${extensionId}/viewer.html`);
  await viewerPage.locator("#sample-button").click();
  await viewerPage.waitForSelector(".doc-title h1", { timeout: 5000 });
  await viewerPage.waitForSelector(".diagnostic", { timeout: 5000 });
  const diagnosticText = await viewerPage.locator(".diagnostic").first().textContent();
  assert.match(diagnosticText, /claim-without-evidence/);

  await viewerPage.locator("#layered-sample-button").click();
  await viewerPage.waitForSelector(".component-metric", { timeout: 5000 });
  await viewerPage.waitForSelector(".raw-embed-html", { timeout: 5000 });

  console.log("chrome extension test passed");
} finally {
  if (context) {
    await context.close();
  }
  await new Promise((resolve) => server.close(resolve));
  await rm(tempRoot, { recursive: true, force: true });
}
