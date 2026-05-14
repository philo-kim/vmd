#!/usr/bin/env node
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const OPEN_DESIGN_CASES = [
  "open-design-landing/example.html",
  "open-design-landing-deck/example.html",
  "html-ppt-pitch-deck/example.html",
  "finance-report/example.html",
  "dashboard/example.html",
  "mobile-app/example.html"
];

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const preset = args.preset || "open-design";
const sourceDir = await resolveSourceDir(args, preset);
const sourceRoot = path.dirname(sourceDir);
const sourceLabel = args.sourceLabel || (preset === "open-design" ? "nexu-io/open-design" : path.basename(sourceDir));
const sourceUrl = args.sourceUrl || (preset === "open-design" ? "https://github.com/nexu-io/open-design" : "");
const sourceRef = args.sourceRef || readGitRef(sourceRoot);
const cases = args.case?.length ? args.case : (preset === "open-design" ? OPEN_DESIGN_CASES : []);

if (!cases.length) {
  throw new Error("No benchmark cases were provided. Use --case <relative-html-path>.");
}

const outJson = path.resolve(args.outJson || path.join(repoRoot, "benchmarks", "results", "ai-artifact-benchmark.json"));
const outMd = path.resolve(args.outMd || path.join(repoRoot, "benchmarks", "results", "ai-artifact-benchmark.md"));
const docMd = args.docMd ? path.resolve(args.docMd) : null;

const results = [];
for (const relativePath of cases) {
  const htmlPath = path.join(sourceDir, relativePath);
  const html = await readFile(htmlPath, "utf8");
  const semanticVmd = buildSemanticDraft(html, relativePath);
  const preserveVmd = buildPreserveDraft(html, relativePath);
  const snapshot = analyzeHtml(html);

  results.push({
    path: relativePath,
    title: snapshot.title,
    htmlBytes: byteLength(html),
    approxHtmlTokens: approxTokens(html),
    preserveVmdBytes: byteLength(preserveVmd),
    approxPreserveTokens: approxTokens(preserveVmd),
    semanticVmdBytes: byteLength(semanticVmd),
    approxSemanticTokens: approxTokens(semanticVmd),
    semanticReductionPercent: percentReduction(byteLength(html), byteLength(semanticVmd)),
    preserveSourceDeltaPercent: percentDelta(byteLength(preserveVmd), byteLength(html)),
    visibleTextBytes: byteLength(snapshot.visibleText),
    headingCount: snapshot.headingCount,
    styleRuleCount: snapshot.styleRuleCount,
    inlineStyleCount: snapshot.inlineStyleCount,
    classAttrCount: snapshot.classAttrCount,
    scriptTagCount: snapshot.scriptTagCount,
    tableCount: snapshot.tableCount,
    imageCount: snapshot.imageCount,
    svgCount: snapshot.svgCount
  });
}

const summary = summarize(results, {
  preset,
  sourceLabel,
  sourceUrl,
  sourceRef,
  sourceDirLabel: preset === "open-design" ? "design-templates/" : path.basename(sourceDir),
  cases
});

const json = `${JSON.stringify(summary, null, 2)}\n`;
const markdown = renderMarkdown(summary);

await mkdir(path.dirname(outJson), { recursive: true });
await mkdir(path.dirname(outMd), { recursive: true });
await writeFile(outJson, json, "utf8");
await writeFile(outMd, markdown, "utf8");
if (docMd) {
  await mkdir(path.dirname(docMd), { recursive: true });
  await writeFile(docMd, markdown, "utf8");
}

process.stdout.write(`Wrote ${path.relative(repoRoot, outJson)}\n`);
process.stdout.write(`Wrote ${path.relative(repoRoot, outMd)}\n`);
if (docMd) {
  process.stdout.write(`Wrote ${path.relative(repoRoot, docMd)}\n`);
}

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

    const rawKey = arg.slice(2);
    const [keyPart, inlineValue] = rawKey.split("=");
    const key = keyPart.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    const value = inlineValue ?? argv[index + 1];
    if (inlineValue === undefined && value && !String(value).startsWith("--")) {
      index += 1;
    }

    if (key === "case") {
      parsed.case = [...(parsed.case || []), value];
    } else {
      parsed[key] = value || true;
    }
  }
  return parsed;
}

function printHelp() {
  process.stdout.write(`Usage:
  node tools/benchmark-ai-artifacts.mjs [options]

Options:
  --preset open-design     Use the built-in Open Design case list. Default.
  --source-dir <folder>    Folder containing HTML artifacts. For Open Design,
                           this should be the design-templates folder.
  --case <path>            Relative HTML path. Can be repeated.
  --source-label <label>   Human-readable source label.
  --source-url <url>       Public source URL.
  --source-ref <ref>       Source commit or version.
  --out-json <file>        JSON output path.
  --out-md <file>          Markdown output path.
  --doc-md <file>          Optional docs copy.

The benchmark measures AI-generated HTML artifacts as source material for VMD:
HTML size, legacy preserve-wrapper overhead, source-layer compression, and
visual surface complexity. It does not claim the current converter is already
visual-lossless; it makes the need for source slots plus replay/residual data
measurable.
`);
}

async function resolveSourceDir(parsed, selectedPreset) {
  if (parsed.sourceDir) {
    return path.resolve(parsed.sourceDir);
  }
  if (selectedPreset !== "open-design") {
    throw new Error("Missing --source-dir.");
  }

  const candidates = [
    process.env.OPEN_DESIGN_DIR ? path.join(process.env.OPEN_DESIGN_DIR, "design-templates") : "",
    path.join(repoRoot, "..", "open-design", "design-templates"),
    path.join(repoRoot, "..", "..", "open-design", "design-templates")
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return path.resolve(candidate);
    } catch {
      // Keep trying common local checkout positions.
    }
  }

  throw new Error("Could not find Open Design. Set OPEN_DESIGN_DIR or pass --source-dir.");
}

function readGitRef(root) {
  try {
    return execFileSync("git", ["rev-parse", "--short=12", "HEAD"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    return "";
  }
}

function analyzeHtml(html) {
  const title = stripTags(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "Untitled AI artifact");
  const styleText = Array.from(html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi))
    .map((match) => match[1])
    .join("\n");
  const visibleText = stripTags(html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, " "));

  return {
    title,
    visibleText,
    headingCount: (html.match(/<h[1-6]\b/gi) || []).length,
    styleRuleCount: (styleText.match(/\{/g) || []).length,
    inlineStyleCount: (html.match(/\sstyle\s*=/gi) || []).length,
    classAttrCount: (html.match(/\sclass\s*=/gi) || []).length,
    scriptTagCount: (html.match(/<script\b/gi) || []).length,
    tableCount: (html.match(/<table\b/gi) || []).length,
    imageCount: (html.match(/<img\b/gi) || []).length,
    svgCount: (html.match(/<svg\b/gi) || []).length
  };
}

function buildSemanticDraft(html, relativePath) {
  const title = stripTags(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || path.basename(relativePath, ".html"));
  const headings = Array.from(html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi))
    .map((match) => ({
      level: Number.parseInt(match[1], 10),
      text: stripTags(match[2])
    }))
    .filter((heading) => heading.text)
    .slice(0, 18);
  const paragraphs = Array.from(html.matchAll(/<(?:p|li|blockquote)\b[^>]*>([\s\S]*?)<\/(?:p|li|blockquote)>/gi))
    .map((match) => stripTags(match[1]))
    .filter(Boolean)
    .slice(0, 24);

  const lines = [
    `@doc "${escapeDoc(title)}" {`,
    "  format: ai-visual-document;",
    "  fidelity: semantic;",
    `  source: "${escapeDoc(relativePath)}";`,
    "}",
    "",
    `# ${title}`,
    ""
  ];

  const frameTitles = headings.length ? headings : [{ level: 2, text: title }];
  for (const [index, heading] of frameTitles.entries()) {
    lines.push(`::frame[role="artifact-section-${index + 1}"]`);
    lines.push(`${"#".repeat(Math.min(Math.max(heading.level, 2), 4))} ${heading.text}`);
    const paragraph = paragraphs[index] || paragraphs[index % Math.max(1, paragraphs.length)] || "";
    if (paragraph) {
      lines.push("");
      lines.push("  ::claim");
      lines.push(`  ${paragraph}`);
      lines.push("  ::");
    }
    lines.push("::");
    lines.push("");
  }

  return `${lines.join("\n").trim()}\n`;
}

function buildPreserveDraft(html, relativePath) {
  const title = stripTags(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || path.basename(relativePath, ".html"));
  const css = Array.from(html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi))
    .map((match) => match[1].trim())
    .filter(Boolean)
    .join("\n\n");
  const body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1]?.trim() || html.trim();

  return [
    `@doc "${escapeDoc(title)}" {`,
    "  format: preserved-ai-html;",
    "  conversion: html-preserve;",
    "  fidelity: preserve;",
    `  source: "${escapeDoc(relativePath)}";`,
    "}",
    "",
    "::raw.css",
    css,
    "::",
    "",
    "::raw.html",
    body,
    "::",
    ""
  ].join("\n");
}

function summarize(results, metadata) {
  return {
    benchmarkVersion: 1,
    purpose: "Measure AI-generated visual HTML artifacts as source material for an AI-native visual document format.",
    source: metadata,
    totals: {
      cases: results.length,
      htmlBytes: sum(results, (result) => result.htmlBytes),
      preserveVmdBytes: sum(results, (result) => result.preserveVmdBytes),
      semanticVmdBytes: sum(results, (result) => result.semanticVmdBytes),
      approxHtmlTokens: sum(results, (result) => result.approxHtmlTokens),
      approxPreserveTokens: sum(results, (result) => result.approxPreserveTokens),
      approxSemanticTokens: sum(results, (result) => result.approxSemanticTokens),
      averageSemanticReductionPercent: round(average(results, (result) => result.semanticReductionPercent), 1),
      averagePreserveSourceDeltaPercent: round(average(results, (result) => result.preserveSourceDeltaPercent), 1),
      styleRules: sum(results, (result) => result.styleRuleCount),
      inlineStyles: sum(results, (result) => result.inlineStyleCount),
      classAttrs: sum(results, (result) => result.classAttrCount)
    },
    results
  };
}

function renderMarkdown(summary) {
  const sourceRef = summary.source.sourceRef
    ? ` at \`${summary.source.sourceRef}\``
    : "";
  const lines = [
    "# AI Artifact Benchmark",
    "",
    "This benchmark uses real AI/agent-generated HTML artifacts as the stress case for VMD.",
    "The point is not that VMD should merely wrap HTML. The benchmark measures how much smaller the AI-facing source layer can be, while visual-lossless restoration still requires replay/residual verification.",
    "",
    "## Source",
    "",
    `- Source: ${summary.source.sourceUrl ? `[${summary.source.sourceLabel}](${summary.source.sourceUrl})` : summary.source.sourceLabel}${sourceRef}`,
    `- Source folder: \`${summary.source.sourceDirLabel}\``,
    `- Cases: ${summary.totals.cases}`,
    "",
    "## Aggregate Result",
    "",
    `- HTML source: ${formatBytes(summary.totals.htmlBytes)} (${summary.totals.approxHtmlTokens} approx tokens)`,
    `- Preserve VMD source: ${formatBytes(summary.totals.preserveVmdBytes)} (${summary.totals.approxPreserveTokens} approx tokens)`,
    `- Source-layer VMD draft: ${formatBytes(summary.totals.semanticVmdBytes)} (${summary.totals.approxSemanticTokens} approx tokens)`,
    `- Average source-layer reduction: ${summary.totals.averageSemanticReductionPercent}%`,
    `- Average preserve source delta: ${summary.totals.averagePreserveSourceDeltaPercent}%`,
    `- Visual surface: ${summary.totals.styleRules} CSS rules, ${summary.totals.inlineStyles} inline styles, ${summary.totals.classAttrs} class attributes`,
    "",
    "## Case Results",
    "",
    "| Artifact | HTML | Legacy Preserve VMD | Source-Layer VMD | Source Reduction | CSS Rules | Inline Styles | Classes |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...summary.results.map((result) => [
      `| ${escapeMarkdown(result.path)}`,
      formatBytes(result.htmlBytes),
      formatBytes(result.preserveVmdBytes),
      formatBytes(result.semanticVmdBytes),
      `${result.semanticReductionPercent}%`,
      result.styleRuleCount,
      result.inlineStyleCount,
      `${result.classAttrCount} |`
    ].join(" | ")),
    "",
    "## Interpretation",
    "",
    "- AI-generated HTML is already a useful visual artifact, but it is a large browser implementation surface rather than a compact authoring source.",
    "- Legacy preserve VMD is a compatibility baseline, not the final product goal.",
    "- Source-layer VMD is much smaller and easier for AI to edit, but it intentionally loses bespoke layout and style detail unless paired with replay/residual data.",
    "- Visual-lossless VMD must combine editable slots, renderer recipes, residual index constraints, dirty-state handling, and replay/residual/raw restoration data."
  ];
  return `${lines.join("\n")}\n`;
}

function stripTags(value) {
  return String(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeDoc(value) {
  return String(value).replace(/"/g, "'").replace(/\s+/g, " ").trim().slice(0, 160);
}

function escapeMarkdown(value) {
  return String(value).replace(/\|/g, "\\|");
}

function byteLength(value) {
  return Buffer.byteLength(value, "utf8");
}

function approxTokens(value) {
  return Math.ceil(String(value).length / 4);
}

function percentReduction(original, reduced) {
  return round(((original - reduced) / original) * 100, 1);
}

function percentDelta(current, base) {
  return round(((current - base) / base) * 100, 1);
}

function sum(items, selector) {
  return items.reduce((total, item) => total + selector(item), 0);
}

function average(items, selector) {
  return items.length ? sum(items, selector) / items.length : 0;
}

function round(value, places = 1) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function formatBytes(value) {
  if (value < 1024) {
    return `${value} B`;
  }
  return `${round(value / 1024, 1)} KB`;
}
