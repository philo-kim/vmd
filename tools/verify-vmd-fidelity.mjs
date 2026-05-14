#!/usr/bin/env node
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { chromium } from "playwright";

const require = createRequire(import.meta.url);
const { parseVmd, renderFullHtml } = require("../core/vmd-core.cjs");

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const DEFAULT_VIEWPORT = "1440x1600";
const HIDDEN_DIR_RE = /(^|[/\\])\.[^/\\]+/;

const args = parseArgs(process.argv.slice(2));

if (args.help || !args.sourceDir) {
  printHelp();
  process.exit(args.help ? 0 : 1);
}

const sourceDir = path.resolve(args.sourceDir);
const outputDir = path.resolve(args.outputDir || path.join(repoRoot, "dist", "visual-fidelity"));
const viewport = parseViewport(args.viewport || DEFAULT_VIEWPORT);
const includeHidden = Boolean(args.includeHidden);
const limit = args.limit ? Number.parseInt(args.limit, 10) : null;
const conversion = assertConversion(args.conversion || "semantic");

const htmlFiles = (await collectHtmlFiles(sourceDir, { includeHidden }))
  .filter((filePath) => !args.contains || path.relative(sourceDir, filePath).includes(args.contains))
  .slice(0, limit || undefined);

if (!htmlFiles.length) {
  throw new Error(`No HTML files found in ${sourceDir}`);
}

await mkdir(outputDir, { recursive: true });
await mkdir(path.join(outputDir, "converted"), { recursive: true });
await mkdir(path.join(outputDir, "screenshots", "original"), { recursive: true });
await mkdir(path.join(outputDir, "screenshots", "vmd"), { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport,
  reducedMotion: "reduce",
  deviceScaleFactor: 1
});

const page = await context.newPage();
const results = [];

for (const [index, htmlPath] of htmlFiles.entries()) {
  const relativePath = toPosix(path.relative(sourceDir, htmlPath));
  const safeName = makeSafeName(relativePath);
  const originalScreenshot = path.join(outputDir, "screenshots", "original", `${safeName}.png`);
  const vmdScreenshot = path.join(outputDir, "screenshots", "vmd", `${safeName}.png`);
  const convertedVmdPath = path.join(outputDir, "converted", `${safeName}.vmd`);
  const convertedHtmlPath = path.join(outputDir, "converted", `${safeName}.html`);
  const sourceHtml = await readFile(htmlPath, "utf8");

  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "load", timeout: 30_000 });
  await settlePage(page);
  const originalMetrics = await page.evaluate(extractPageSnapshot);
  const originalPng = await page.screenshot({ path: originalScreenshot, fullPage: false });

  const convertedVmd = buildConvertedVmd({
    conversion,
    htmlPath,
    htmlSource: sourceHtml,
    snapshot: originalMetrics,
    relativePath
  });
  const convertedHtml = renderFullHtml(parseVmd(convertedVmd), "read", {
    cssHref: conversion === "preserve"
      ? null
      : toPosix(path.relative(path.dirname(convertedHtmlPath), path.join(repoRoot, "extension", "styles.css")))
  });

  await writeFile(convertedVmdPath, convertedVmd, "utf8");
  await writeFile(convertedHtmlPath, convertedHtml, "utf8");

  await page.goto(pathToFileURL(convertedHtmlPath).href, { waitUntil: "load", timeout: 30_000 });
  await settlePage(page);
  const convertedMetrics = await page.evaluate(extractPageSnapshot);
  const vmdPng = await page.screenshot({ path: vmdScreenshot, fullPage: false });
  const diff = await comparePngBuffers(page, originalPng, vmdPng);

  results.push({
    index: index + 1,
    relativePath,
    original: originalMetrics.summary,
    converted: convertedMetrics.summary,
    diff,
    artifacts: {
      convertedVmd: toPosix(path.relative(outputDir, convertedVmdPath)),
      convertedHtml: toPosix(path.relative(outputDir, convertedHtmlPath)),
      originalScreenshot: toPosix(path.relative(outputDir, originalScreenshot)),
      vmdScreenshot: toPosix(path.relative(outputDir, vmdScreenshot))
    }
  });

  process.stdout.write(
    `[${index + 1}/${htmlFiles.length}] ${relativePath} changed=${formatPct(diff.changedPixelRatio)} meanDelta=${diff.meanAbsDiff.toFixed(2)}\n`
  );
}

await browser.close();

const summary = summarize(results, { sourceDir, outputDir, viewport, includeHidden, conversion });
await writeFile(path.join(outputDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
await writeFile(path.join(outputDir, "summary.md"), renderMarkdownReport(summary), "utf8");

process.stdout.write(`\nWrote ${path.relative(repoRoot, path.join(outputDir, "summary.md"))}\n`);
process.stdout.write(`Verdict: ${summary.verdict}\n`);

function parseArgs(argv) {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
      continue;
    }
    if (!arg.startsWith("--")) {
      continue;
    }

    const withoutPrefix = arg.slice(2);
    const [rawKey, inlineValue] = withoutPrefix.split("=");
    const key = rawKey.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    if (inlineValue !== undefined) {
      parsed[key] = inlineValue || true;
      continue;
    }

    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      parsed[key] = next;
      index += 1;
    } else {
      parsed[key] = true;
    }
  }

  return parsed;
}

function printHelp() {
  process.stdout.write(`Usage:
  node tools/verify-vmd-fidelity.mjs --source-dir <html-folder> [options]

Options:
  --output-dir <folder>    Output folder for generated VMD, HTML, screenshots, and reports.
  --viewport 1440x1600    Fixed screenshot viewport. Default: ${DEFAULT_VIEWPORT}.
  --conversion semantic   semantic or preserve. Default: semantic.
  --contains <text>       Only include HTML paths containing this text.
  --limit <n>             Check only the first n matching files.
  --include-hidden        Include hidden directories such as .od-skills.

The tool converts HTML pages into semantic or preserve-mode VMD, captures
original and VMD screenshots, then reports first-viewport pixel drift.
Generated artifacts should stay outside git or under ignored dist/.
`);
}

function assertConversion(value) {
  if (!["semantic", "preserve"].includes(value)) {
    throw new Error(`Invalid conversion "${value}". Use semantic or preserve.`);
  }
  return value;
}

function parseViewport(raw) {
  const match = String(raw).match(/^(\d+)x(\d+)$/);
  if (!match) {
    throw new Error(`Invalid viewport "${raw}". Use WIDTHxHEIGHT, for example 1440x1600.`);
  }
  return {
    width: Number.parseInt(match[1], 10),
    height: Number.parseInt(match[2], 10)
  };
}

async function collectHtmlFiles(dir, options) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const isHidden = HIDDEN_DIR_RE.test(path.relative(sourceDir, fullPath));

    if (entry.isDirectory()) {
      if (!options.includeHidden && isHidden) {
        continue;
      }
      if (entry.name === "node_modules" || entry.name === "dist") {
        continue;
      }
      files.push(...await collectHtmlFiles(fullPath, options));
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) {
      if (!options.includeHidden && isHidden) {
        continue;
      }
      files.push(fullPath);
    }
  }

  return files.sort((a, b) => a.localeCompare(b));
}

async function settlePage(page) {
  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
  });
  await page.waitForTimeout(100);
}

function extractPageSnapshot() {
  const isVisible = (element) => {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
  };

  const allElements = Array.from(document.querySelectorAll("*"));
  const visibleElements = allElements.filter(isVisible);
  const textElements = Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6,p,li,blockquote,figcaption,th,td,dt,dd"))
    .filter(isVisible)
    .map((element) => ({
      tag: element.tagName.toLowerCase(),
      text: element.textContent.replace(/\s+/g, " ").trim()
    }))
    .filter((node) => node.text)
    .slice(0, 300);

  const headings = Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6"))
    .filter(isVisible)
    .map((element) => ({
      level: Number.parseInt(element.tagName.slice(1), 10),
      text: element.textContent.replace(/\s+/g, " ").trim()
    }))
    .filter((node) => node.text);

  const styleText = Array.from(document.querySelectorAll("style"))
    .map((element) => element.textContent || "")
    .join("\n");
  const classNames = new Set();
  for (const element of allElements) {
    for (const className of element.classList || []) {
      classNames.add(className);
    }
  }

  const layoutClassRe = /(card|grid|phone|screen|mock|panel|shell|nav|tab|table|hero|story|token|persona|frame|device|chart|matrix|rail|toolbar)/i;
  const styleRuleCount = (styleText.match(/\{/g) || []).length;
  const gridOrFlexElements = visibleElements.filter((element) => {
    const display = window.getComputedStyle(element).display;
    return display.includes("grid") || display.includes("flex");
  }).length;

  return {
    title: document.title || headings[0]?.text || "Untitled HTML",
    nodes: textElements,
    headings,
    summary: {
      title: document.title || headings[0]?.text || "Untitled HTML",
      bodyTextChars: (document.body?.innerText || "").replace(/\s+/g, " ").trim().length,
      elementCount: allElements.length,
      visibleElementCount: visibleElements.length,
      textNodeCount: textElements.length,
      headingCount: headings.length,
      styleTags: document.querySelectorAll("style").length,
      linkedStylesheets: document.querySelectorAll('link[rel~="stylesheet"]').length,
      inlineStyleAttrs: allElements.filter((element) => element.hasAttribute("style")).length,
      styleRuleCount,
      scriptTags: document.querySelectorAll("script").length,
      tableCount: document.querySelectorAll("table").length,
      svgCount: document.querySelectorAll("svg").length,
      imageCount: document.querySelectorAll("img").length,
      canvasCount: document.querySelectorAll("canvas").length,
      formControlCount: document.querySelectorAll("button,input,select,textarea").length,
      gridOrFlexElements,
      layoutClassCount: Array.from(classNames).filter((className) => layoutClassRe.test(className)).length,
      uniqueClassCount: classNames.size,
      scrollHeight: document.documentElement.scrollHeight,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight
    }
  };
}

function buildConvertedVmd({ conversion, htmlPath, htmlSource, snapshot, relativePath }) {
  if (conversion === "preserve") {
    return buildPreserveVmd(htmlPath, htmlSource, snapshot, relativePath);
  }
  return buildSemanticVmd(snapshot, relativePath);
}

function buildSemanticVmd(snapshot, relativePath) {
  const title = sanitizeInline(snapshot.title || path.basename(relativePath, ".html"), 96);
  const frames = [];
  let current = { title, lines: [] };

  for (const node of snapshot.nodes) {
    const text = sanitizeBlockLine(node.text, 180);
    if (!text) {
      continue;
    }

    const headingLevel = node.tag.match(/^h([1-6])$/)?.[1];
    if (headingLevel && Number.parseInt(headingLevel, 10) <= 2) {
      if (current.lines.length) {
        frames.push(current);
      }
      current = { title: text, lines: [] };
      continue;
    }

    if (headingLevel) {
      current.lines.push(`${"#".repeat(Math.min(Number.parseInt(headingLevel, 10), 6))} ${text}`);
      continue;
    }

    current.lines.push(node.tag === "li" ? `- ${text}` : text);
    if (current.lines.length >= 24) {
      frames.push(current);
      current = { title: `${title} continued`, lines: [] };
    }
  }

  if (current.lines.length || !frames.length) {
    frames.push(current);
  }

  const sourceAttr = sanitizeInline(relativePath, 120);
  const lines = [
    `@doc "${title.replace(/"/g, "'")}" {`,
    "  format: visual-fidelity-check;",
    "  conversion: semantic-html-to-vmd;",
    `  source: "${sourceAttr.replace(/"/g, "'")}";`,
    "}",
    "",
    `# ${title}`,
    ""
  ];

  for (const frame of frames.slice(0, 18)) {
    lines.push('::frame[role="converted-html-section"]');
    lines.push(`  ## ${sanitizeBlockLine(frame.title || title, 120)}`);
    lines.push("");
    lines.push("  ::evidence");
    if (frame.lines.length) {
      for (const line of frame.lines.slice(0, 24)) {
        lines.push(`  ${line}`);
      }
    } else {
      lines.push("  No visible body text was extracted from the source HTML.");
    }
    lines.push("  ::");
    lines.push("::");
    lines.push("");
  }

  return `${lines.join("\n").trim()}\n`;
}

function buildPreserveVmd(htmlPath, htmlSource, snapshot, relativePath) {
  const title = sanitizeInline(snapshot.title || path.basename(relativePath, ".html"), 96);
  const sourceAttr = sanitizeInline(relativePath, 120);
  const { css, html } = extractPreservedHtmlParts(htmlSource, htmlPath);
  const lines = [
    `@doc "${title.replace(/"/g, "'")}" {`,
    "  format: preserved-html;",
    "  conversion: html-preserve;",
    "  fidelity: preserve;",
    `  source: "${sourceAttr.replace(/"/g, "'")}";`,
    "}",
    ""
  ];

  if (css.trim()) {
    lines.push("::raw.css");
    lines.push(css.trimEnd());
    lines.push("::");
    lines.push("");
  }

  lines.push("::raw.html");
  lines.push(html.trimEnd());
  lines.push("::");
  lines.push("");

  return `${lines.join("\n").trim()}\n`;
}

function extractPreservedHtmlParts(htmlSource, htmlPath) {
  const baseDir = path.dirname(htmlPath);
  const styles = [];
  const links = [];
  const styleRe = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let styleMatch = styleRe.exec(htmlSource);
  while (styleMatch) {
    styles.push(rewriteCssUrls(styleMatch[1], baseDir));
    styleMatch = styleRe.exec(htmlSource);
  }

  const linkRe = /<link\b[^>]*rel=["'][^"']*stylesheet[^"']*["'][^>]*>/gi;
  let linkMatch = linkRe.exec(htmlSource);
  while (linkMatch) {
    links.push(rewriteRelativeResourceUrls(linkMatch[0], baseDir));
    linkMatch = linkRe.exec(htmlSource);
  }

  const bodyMatch = htmlSource.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  const body = bodyMatch ? bodyMatch[1] : htmlSource
    .replace(/<!doctype[^>]*>/i, "")
    .replace(/<html\b[^>]*>/i, "")
    .replace(/<\/html>/i, "")
    .replace(/<head\b[^>]*>[\s\S]*?<\/head>/i, "");

  return {
    css: styles.join("\n\n"),
    html: [...links, rewriteRelativeResourceUrls(body, baseDir)].join("\n").trim()
  };
}

function rewriteRelativeResourceUrls(markup, baseDir) {
  return String(markup).replace(/\b(src|href)=["']([^"']+)["']/gi, (match, attr, value) => {
    if (isExternalOrSpecialUrl(value)) {
      return match;
    }
    return `${attr}="${pathToFileURL(path.resolve(baseDir, value)).href}"`;
  });
}

function rewriteCssUrls(css, baseDir) {
  return String(css).replace(/url\(([^)]+)\)/gi, (match, rawValue) => {
    const value = rawValue.trim().replace(/^["']|["']$/g, "");
    if (isExternalOrSpecialUrl(value)) {
      return match;
    }
    return `url("${pathToFileURL(path.resolve(baseDir, value)).href}")`;
  });
}

function isExternalOrSpecialUrl(value) {
  return /^(?:[a-z][a-z0-9+.-]*:|#|\/)/i.test(String(value));
}

function sanitizeInline(value, maxLength) {
  return String(value)
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function sanitizeBlockLine(value, maxLength) {
  const sanitized = sanitizeInline(value, maxLength)
    .replace(/^::/, ": :")
    .replace(/^@doc\b/, "doc");
  return sanitized || "";
}

async function comparePngBuffers(page, first, second) {
  return page.evaluate(async ({ firstBase64, secondBase64 }) => {
    const loadImage = (source) => new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Failed to load screenshot for comparison"));
      image.src = source;
    });

    const imageA = await loadImage(`data:image/png;base64,${firstBase64}`);
    const imageB = await loadImage(`data:image/png;base64,${secondBase64}`);
    const width = Math.min(imageA.naturalWidth, imageB.naturalWidth);
    const height = Math.min(imageA.naturalHeight, imageB.naturalHeight);
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    canvas.width = width;
    canvas.height = height;

    context.drawImage(imageA, 0, 0);
    const firstPixels = context.getImageData(0, 0, width, height).data;
    context.clearRect(0, 0, width, height);
    context.drawImage(imageB, 0, 0);
    const secondPixels = context.getImageData(0, 0, width, height).data;

    let totalDelta = 0;
    let squaredDelta = 0;
    let changed = 0;
    let severe = 0;
    let exact = 0;
    const totalPixels = width * height;

    for (let index = 0; index < firstPixels.length; index += 4) {
      const red = Math.abs(firstPixels[index] - secondPixels[index]);
      const green = Math.abs(firstPixels[index + 1] - secondPixels[index + 1]);
      const blue = Math.abs(firstPixels[index + 2] - secondPixels[index + 2]);
      const alpha = Math.abs(firstPixels[index + 3] - secondPixels[index + 3]);
      const delta = (red + green + blue + alpha) / 4;
      totalDelta += delta;
      squaredDelta += delta * delta;

      if (delta === 0) {
        exact += 1;
      }
      if (delta > 16) {
        changed += 1;
      }
      if (delta > 64) {
        severe += 1;
      }
    }

    const meanAbsDiff = totalDelta / totalPixels;
    return {
      width,
      height,
      meanAbsDiff,
      rmse: Math.sqrt(squaredDelta / totalPixels),
      changedPixelRatio: changed / totalPixels,
      severePixelRatio: severe / totalPixels,
      exactPixelRatio: exact / totalPixels,
      similarityScore: Math.max(0, 1 - meanAbsDiff / 255)
    };
  }, {
    firstBase64: first.toString("base64"),
    secondBase64: second.toString("base64")
  });
}

function summarize(results, options) {
  const pageCount = results.length;
  const averages = averageDiff(results);
  const equivalentPages = results.filter((result) => result.diff.changedPixelRatio <= 0.02 && result.diff.meanAbsDiff <= 3);
  const customCssPages = results.filter((result) => result.original.styleTags || result.original.inlineStyleAttrs || result.original.linkedStylesheets);
  const scriptedPages = results.filter((result) => result.original.scriptTags);
  const tablePages = results.filter((result) => result.original.tableCount);
  const visualStructureLoss = {
    originalStyleRules: sum(results, (result) => result.original.styleRuleCount),
    originalInlineStyles: sum(results, (result) => result.original.inlineStyleAttrs),
    originalScripts: sum(results, (result) => result.original.scriptTags),
    originalTables: sum(results, (result) => result.original.tableCount),
    originalSvg: sum(results, (result) => result.original.svgCount),
    originalImages: sum(results, (result) => result.original.imageCount),
    originalGridOrFlexElements: sum(results, (result) => result.original.gridOrFlexElements),
    convertedGridOrFlexElements: sum(results, (result) => result.converted.gridOrFlexElements)
  };

  const verdict = equivalentPages.length === pageCount
    ? "pixel-equivalent"
    : "not-equivalent-with-current-semantic-vmd";

  return {
    source: {
      label: path.basename(options.sourceDir),
      sourceDir: options.sourceDir,
      includeHidden: options.includeHidden
    },
    conversion: options.conversion,
    outputDir: options.outputDir,
    viewport: options.viewport,
    pageCount,
    equivalentPageCount: equivalentPages.length,
    customCssPageCount: customCssPages.length,
    scriptedPageCount: scriptedPages.length,
    tablePageCount: tablePages.length,
    averages,
    visualStructureLoss,
    verdict,
    threshold: {
      equivalentChangedPixelRatio: 0.02,
      equivalentMeanAbsDiff: 3
    },
    topMismatches: [...results]
      .sort((a, b) => b.diff.changedPixelRatio - a.diff.changedPixelRatio)
      .slice(0, 12),
    lowestMismatches: [...results]
      .sort((a, b) => a.diff.changedPixelRatio - b.diff.changedPixelRatio)
      .slice(0, 8),
    results
  };
}

function averageDiff(results) {
  return {
    meanAbsDiff: average(results, (result) => result.diff.meanAbsDiff),
    rmse: average(results, (result) => result.diff.rmse),
    changedPixelRatio: average(results, (result) => result.diff.changedPixelRatio),
    severePixelRatio: average(results, (result) => result.diff.severePixelRatio),
    exactPixelRatio: average(results, (result) => result.diff.exactPixelRatio),
    similarityScore: average(results, (result) => result.diff.similarityScore)
  };
}

function renderMarkdownReport(summary) {
  const lines = [
    "# VMD Visual Fidelity Verification",
    "",
    `This report checks whether existing HTML pages render the same after ${summary.conversion} conversion into the current VMD renderer.`,
    "Generated screenshots and converted files are local verification artifacts and should not be committed when the source documents are private.",
    "",
    "## Verdict",
    "",
    `- Source label: ${summary.source.label}`,
    `- Conversion: ${summary.conversion}`,
    `- Pages checked: ${summary.pageCount}`,
    `- Pixel-equivalent pages: ${summary.equivalentPageCount}`,
    `- Average changed pixels: ${formatPct(summary.averages.changedPixelRatio)}`,
    `- Average mean pixel delta: ${summary.averages.meanAbsDiff.toFixed(2)}`,
    `- Average severe pixels: ${formatPct(summary.averages.severePixelRatio)}`,
    `- Verdict: ${summary.verdict}`,
    "",
    "## Original Visual Surface",
    "",
    `- Pages with custom CSS or linked styles: ${summary.customCssPageCount}`,
    `- Pages with scripts: ${summary.scriptedPageCount}`,
    `- Pages with tables: ${summary.tablePageCount}`,
    `- Original style rules: ${summary.visualStructureLoss.originalStyleRules}`,
    `- Original inline style attributes: ${summary.visualStructureLoss.originalInlineStyles}`,
    `- Original grid/flex elements: ${summary.visualStructureLoss.originalGridOrFlexElements}`,
    `- Converted grid/flex elements: ${summary.visualStructureLoss.convertedGridOrFlexElements}`,
    "",
    "## Largest Mismatches",
    "",
    "| Page | Changed Pixels | Mean Delta | Style Rules | Inline Styles | Scripts | Tables |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...summary.topMismatches.map((result) => [
      `| ${escapeMarkdown(result.relativePath)}`,
      formatPct(result.diff.changedPixelRatio),
      result.diff.meanAbsDiff.toFixed(2),
      result.original.styleRuleCount,
      result.original.inlineStyleAttrs,
      result.original.scriptTags,
      `${result.original.tableCount} |`
    ].join(" | ")),
    "",
    "## Closest Pages",
    "",
    "| Page | Changed Pixels | Mean Delta | Exact Pixels |",
    "| --- | ---: | ---: | ---: |",
    ...summary.lowestMismatches.map((result) => [
      `| ${escapeMarkdown(result.relativePath)}`,
      formatPct(result.diff.changedPixelRatio),
      result.diff.meanAbsDiff.toFixed(2),
      `${formatPct(result.diff.exactPixelRatio)} |`
    ].join(" | ")),
    "",
    "## Interpretation",
    "",
    ...interpretationLines(summary)
  ];

  return `${lines.join("\n")}\n`;
}

function interpretationLines(summary) {
  if (summary.conversion === "preserve") {
    return [
      "Preserve conversion wraps existing browser-native source in raw VMD compatibility blocks.",
      "This is the right mode when the goal is visual equivalence with an existing HTML/CSS page.",
      "",
      "Remaining drift usually points to scripts, external assets, relative stylesheet URLs, or raw-block delimiter conflicts rather than semantic VMD rendering."
    ];
  }

  return [
    "Semantic conversion keeps document text and rough frame structure, but it drops bespoke CSS, layout classes, inline styles, scripts, and custom interaction state.",
    "This is the right mode when the goal is an AI-editable VMD-native document, not pixel preservation.",
    "",
    "For identical display, use preserve conversion or a future hybrid converter that maps known components and preserves the rest as raw compatibility blocks."
  ];
}

function sum(items, selector) {
  return items.reduce((total, item) => total + selector(item), 0);
}

function average(items, selector) {
  if (!items.length) {
    return 0;
  }
  return sum(items, selector) / items.length;
}

function formatPct(value) {
  return `${(value * 100).toFixed(2)}%`;
}

function escapeMarkdown(value) {
  return String(value).replace(/\|/g, "\\|");
}

function makeSafeName(value) {
  return toPosix(value)
    .replace(/[^a-zA-Z0-9._-]+/g, "__")
    .replace(/^_+|_+$/g, "")
    .slice(0, 180);
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}
