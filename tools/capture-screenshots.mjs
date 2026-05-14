import http from "node:http";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { buildSite } from "./site-builder.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "dist", "site");
const assetDir = path.join(root, "docs", "assets");

await buildSite({
  root,
  samplesDir: path.join(root, "samples"),
  outDir
});
await mkdir(assetDir, { recursive: true });

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || "/", "http://127.0.0.1");
  const relativePath = url.pathname === "/"
    ? "index.html"
    : decodeURIComponent(url.pathname).replace(/^\/+/, "");
  const filePath = path.join(outDir, relativePath);
  try {
    const file = await readFile(filePath);
    response.writeHead(200, {
      "content-type": contentType(filePath)
    });
    response.end(file);
  } catch {
    response.writeHead(404);
    response.end("not found");
  }
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();
const baseUrl = `http://127.0.0.1:${port}`;

let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: {
      width: 1440,
      height: 1000
    }
  });

  await page.goto(`${baseUrl}/index.html`);
  await page.screenshot({
    path: path.join(assetDir, "vmd-gallery.png"),
    fullPage: true
  });

  await page.goto(`${baseUrl}/playground.html`);
  await page.waitForFunction(() => document.querySelector("#source")?.value.includes("@doc"));
  await page.screenshot({
    path: path.join(assetDir, "vmd-playground.png"),
    fullPage: true
  });
} finally {
  if (browser) {
    await browser.close();
  }
  await new Promise((resolve) => server.close(resolve));
}

console.log("Captured docs/assets/vmd-gallery.png and docs/assets/vmd-playground.png");

function contentType(filePath) {
  if (filePath.endsWith(".html")) {
    return "text/html; charset=utf-8";
  }
  if (filePath.endsWith(".css")) {
    return "text/css; charset=utf-8";
  }
  if (filePath.endsWith(".js")) {
    return "text/javascript; charset=utf-8";
  }
  if (filePath.endsWith(".vmd")) {
    return "text/plain; charset=utf-8";
  }
  return "application/octet-stream";
}
