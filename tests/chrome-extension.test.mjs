import assert from "node:assert/strict";
import http from "node:http";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const extensionPath = path.join(root, "extension");
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const tempRoot = await mkdtemp(path.join(os.tmpdir(), "vmd-chrome-test-"));
const userDataDir = path.join(tempRoot, "profile");
const fixturePath = path.join(tempRoot, "fixture.vmd");
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

await writeFile(fixturePath, fixtureSource, "utf8");

const server = http.createServer((request, response) => {
  if (request.url === "/fixture.vmd") {
    response.writeHead(200, {
      "content-type": "text/plain; charset=utf-8"
    });
    response.end(fixtureSource);
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

  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}/fixture.vmd`);
  await page.waitForSelector("body.vmd-auto-page", { timeout: 15000 });
  await page.waitForSelector(".block-claim", { timeout: 15000 });

  const title = await page.locator(".doc-title h1").first().textContent();
  assert.equal(title, "Chrome Auto Render Test");

  await page.locator('button[data-mode="deck"]').click();
  await page.waitForSelector(".slide .block-claim", { timeout: 5000 });

  console.log("chrome extension auto-render test passed");
} finally {
  if (context) {
    await context.close();
  }
  await new Promise((resolve) => server.close(resolve));
  await rm(tempRoot, { recursive: true, force: true });
}
