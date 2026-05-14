import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const {
  parseVmd,
  renderVmd,
  validateVmdAst,
  SEMANTIC_BLOCK_TYPES,
  VISUAL_BLOCK_TYPES
} = require("../core/vmd-core.cjs");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const caseName = "family-platform";
const caseDir = path.join(root, "benchmarks", "cases");
const resultsDir = path.join(root, "benchmarks", "results");
const jsonPath = path.join(resultsDir, "format-benchmark.json");
const markdownPath = path.join(resultsDir, "format-benchmark.md");
const docPath = path.join(root, "docs", "format-benchmark.md");
const checkOnly = process.argv.includes("--check");

const sources = {
  vmd: await readFile(path.join(caseDir, `${caseName}.vmd`), "utf8"),
  markdown: await readFile(path.join(caseDir, `${caseName}.md`), "utf8"),
  html: await readFile(path.join(caseDir, `${caseName}.html`), "utf8")
};

const benchmark = buildBenchmark(sources);
const json = `${JSON.stringify(benchmark, null, 2)}\n`;
const markdown = renderBenchmarkMarkdown(benchmark);

if (checkOnly) {
  await assertCurrent(jsonPath, json);
  await assertCurrent(markdownPath, markdown);
  await assertCurrent(docPath, markdown);
  console.log("format benchmark outputs are current");
} else {
  await mkdir(resultsDir, { recursive: true });
  await writeFile(jsonPath, json, "utf8");
  await writeFile(markdownPath, markdown, "utf8");
  await writeFile(docPath, markdown, "utf8");
  console.log("Wrote benchmarks/results/format-benchmark.{json,md} and docs/format-benchmark.md");
}

function buildBenchmark(input) {
  const vmdAst = parseVmd(input.vmd);
  const vmdDiagnostics = validateVmdAst(vmdAst);
  const vmdVisible = visibleTextFromHtml(renderVmd(vmdAst, "read"));
  const markdownVisible = visibleTextFromMarkdown(input.markdown);
  const htmlVisible = visibleTextFromHtml(input.html);

  const results = [
    {
      format: "VMD",
      scenario: "Semantic visual source rendered by VMD renderer",
      ...sourceMetrics(input.vmd, vmdVisible),
      browserNativeToday: false,
      renderModesFromOneSource: 3,
      standardizedSemanticRoles: countVmdSemanticRoles(vmdAst),
      conventionSemanticHints: 0,
      visualPrimitives: countNodes(vmdAst, (node) => VISUAL_BLOCK_TYPES.includes(node.type)),
      fidelityTiers: "semantic, structured, visual, preserve",
      pixelPreservationPath: "raw compatibility blocks",
      contentValidation: {
        supported: true,
        errors: vmdDiagnostics.filter((diagnostic) => diagnostic.level === "error").length,
        warnings: vmdDiagnostics.filter((diagnostic) => diagnostic.level === "warning").length
      },
      downstreamPath: "VMD renderer, browser extension, VS Code extension, or static site builder"
    },
    {
      format: "Markdown",
      scenario: "Markdown-only source with human-readable role labels",
      ...sourceMetrics(input.markdown, markdownVisible),
      browserNativeToday: false,
      renderModesFromOneSource: 1,
      standardizedSemanticRoles: 0,
      conventionSemanticHints: countMarkdownRoleLabels(input.markdown),
      visualPrimitives: countMarkdownVisualLabels(input.markdown),
      fidelityTiers: "none",
      pixelPreservationPath: "not supported",
      contentValidation: {
        supported: false,
        errors: null,
        warnings: null
      },
      downstreamPath: "Markdown renderer or documentation platform"
    },
    {
      format: "HTML",
      scenario: "Browser-ready HTML implementing read, deck, and map views manually",
      ...sourceMetrics(input.html, htmlVisible),
      browserNativeToday: true,
      renderModesFromOneSource: countHtmlModes(input.html),
      standardizedSemanticRoles: 0,
      conventionSemanticHints: countHtmlRoleHints(input.html),
      visualPrimitives: countHtmlVisualWidgets(input.html),
      fidelityTiers: "native browser page",
      pixelPreservationPath: "native HTML/CSS rendering",
      contentValidation: {
        supported: false,
        errors: null,
        warnings: null
      },
      downstreamPath: "Browser opens directly"
    }
  ];

  return {
    benchmarkVersion: 1,
    case: {
      name: "Family Platform Brief",
      files: {
        vmd: "benchmarks/cases/family-platform.vmd",
        markdown: "benchmarks/cases/family-platform.md",
        html: "benchmarks/cases/family-platform.html"
      },
      note: "The HTML case intentionally implements read, deck, and map views directly so it can match VMD's multi-view output without a VMD renderer."
    },
    metrics: {
      sourceBytes: "UTF-8 bytes in the author-facing source file.",
      approxTokens: "Rough source token estimate using characters / 4.",
      authoringOverheadBytes: "Source bytes minus visible prose bytes after stripping markup, style, and script.",
      standardizedSemanticRoles: "Role markers understood by this repository's current format grammar, not ad hoc text labels.",
      conventionSemanticHints: "Human-readable or class-based hints that are not portable grammar semantics.",
      renderModesFromOneSource: "Distinct read/deck/map-style views available from the single source in this benchmark."
    },
    results,
    comparisons: compareResults(results)
  };
}

function sourceMetrics(source, visibleText) {
  const sourceBytes = Buffer.byteLength(source, "utf8");
  const visibleBytes = Buffer.byteLength(visibleText, "utf8");
  const sourceChars = source.length;
  const authoringOverheadBytes = Math.max(0, sourceBytes - visibleBytes);

  return {
    sourceBytes,
    sourceLines: source.split("\n").length,
    approxTokens: Math.ceil(sourceChars / 4),
    visibleWords: countWords(visibleText),
    authoringOverheadBytes,
    authoringOverheadPercent: round((authoringOverheadBytes / sourceBytes) * 100, 1),
    bytesPerRenderMode: round(sourceBytes / Math.max(1, countRenderedModesGuess(source)), 1)
  };
}

function compareResults(results) {
  const vmd = results.find((result) => result.format === "VMD");
  const markdown = results.find((result) => result.format === "Markdown");
  const html = results.find((result) => result.format === "HTML");

  return {
    vmdVsMarkdown: {
      sourceBytesDeltaPercent: percentDelta(vmd.sourceBytes, markdown.sourceBytes),
      renderModeGain: vmd.renderModesFromOneSource - markdown.renderModesFromOneSource,
      standardizedSemanticRoleGain: vmd.standardizedSemanticRoles - markdown.standardizedSemanticRoles,
      validatorGain: Number(vmd.contentValidation.supported) - Number(markdown.contentValidation.supported)
    },
    vmdVsHtml: {
      sourceBytesDeltaPercent: percentDelta(vmd.sourceBytes, html.sourceBytes),
      sourceBytesReductionPercent: round(((html.sourceBytes - vmd.sourceBytes) / html.sourceBytes) * 100, 1),
      renderModeGain: vmd.renderModesFromOneSource - html.renderModesFromOneSource,
      standardizedSemanticRoleGain: vmd.standardizedSemanticRoles - html.standardizedSemanticRoles,
      browserNativeTradeoff: "HTML opens natively today; VMD needs a renderer or extension until native support exists."
    }
  };
}

function countVmdSemanticRoles(ast) {
  return countNodes(ast, (node) => node.type === "frame" || SEMANTIC_BLOCK_TYPES.includes(node.type));
}

function countNodes(node, predicate) {
  let count = predicate(node) ? 1 : 0;
  for (const child of node.children || []) {
    count += countNodes(child, predicate);
  }
  return count;
}

function countMarkdownRoleLabels(source) {
  return (source.match(/\*\*(Claim|Evidence|Insight|Decision|Action|Loop|Compare|Timeline):\*\*/g) || []).length;
}

function countMarkdownVisualLabels(source) {
  return (source.match(/\*\*(Loop|Compare|Timeline):\*\*/g) || []).length;
}

function countHtmlModes(source) {
  const modes = new Set(Array.from(source.matchAll(/data-(?:mode|view)="([^"]+)"/g), (match) => match[1]));
  return modes.size || 1;
}

function countHtmlRoleHints(source) {
  return (source.match(/class="[^"]*(claim|evidence|insight|decision)[^"]*"/g) || []).length;
}

function countHtmlVisualWidgets(source) {
  return (source.match(/class="[^"]*(loop|compare|map|deck)[^"]*"/g) || []).length;
}

function countRenderedModesGuess(source) {
  if (source.includes("::frame")) {
    return 3;
  }
  if (source.includes("data-mode=") || source.includes("data-view=")) {
    return countHtmlModes(source);
  }
  return 1;
}

function visibleTextFromMarkdown(source) {
  return source
    .replace(/^---[\s\S]*?---\s*/m, "")
    .replace(/\|/g, " ")
    .replace(/^#+\s*/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/-{3,}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function visibleTextFromHtml(source) {
  return source
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function countWords(text) {
  return (text.match(/[A-Za-z0-9][A-Za-z0-9'-]*/g) || []).length;
}

function percentDelta(value, baseline) {
  return round(((value - baseline) / baseline) * 100, 1);
}

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function renderBenchmarkMarkdown(benchmark) {
  const rows = benchmark.results.map((result) => [
    result.format,
    String(result.sourceBytes),
    String(result.sourceLines),
    String(result.approxTokens),
    `${result.authoringOverheadBytes} (${result.authoringOverheadPercent}%)`,
    String(result.standardizedSemanticRoles),
    String(result.conventionSemanticHints),
    String(result.visualPrimitives),
    String(result.renderModesFromOneSource),
    result.pixelPreservationPath,
    result.browserNativeToday ? "yes" : "no",
    result.contentValidation.supported ? `yes (${result.contentValidation.errors} errors, ${result.contentValidation.warnings} warnings)` : "no"
  ]);

  return `# VMD Format Benchmark

This benchmark compares the same sample document written as VMD, Markdown, and
browser-ready HTML.

It is not a universal performance benchmark. It is a reproducible authoring and
portability benchmark for one representative visual sample document.

It measures source size, authoring overhead, semantic portability, available
render modes, and validation support. It does not measure browser engine speed
or final page load performance.

## Method

- VMD source: semantic source rendered by the repository's VMD renderer.
- Markdown source: Markdown-only document with human-readable role labels.
- HTML source: browser-ready HTML that manually implements read, deck, and map
  views with CSS and JavaScript.
- Case: ${benchmark.case.name}
- Fixtures: \`${benchmark.case.files.vmd}\`, \`${benchmark.case.files.markdown}\`,
  and \`${benchmark.case.files.html}\`.

${benchmark.case.note}

Run it again with:

\`\`\`bash
npm run benchmark:formats
\`\`\`

## Results

| Format | Source bytes | Lines | Approx tokens | Authoring overhead | Native semantic roles | Convention hints | Visual primitives | Render modes | Pixel preservation path | Browser-native today | Content validation |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |
${rows.map((row) => `| ${row.join(" | ")} |`).join("\n")}

## VMD Compared With Markdown

- VMD source bytes delta: ${benchmark.comparisons.vmdVsMarkdown.sourceBytesDeltaPercent}%.
- VMD render mode gain: ${benchmark.comparisons.vmdVsMarkdown.renderModeGain}.
- VMD native semantic role gain: ${benchmark.comparisons.vmdVsMarkdown.standardizedSemanticRoleGain}.
- VMD validator gain: ${benchmark.comparisons.vmdVsMarkdown.validatorGain}.

Markdown is shorter and widely understood as plain text, but its labels such as
\`Claim:\` or \`Evidence:\` are conventions. A renderer or AI tool has to infer
their meaning from prose. VMD makes those roles part of the source grammar, so
the same source can be checked and rendered as read, deck, and map views.

## VMD Compared With HTML

- VMD source is ${benchmark.comparisons.vmdVsHtml.sourceBytesReductionPercent}% smaller than this browser-ready HTML fixture.
- VMD render mode gain: ${benchmark.comparisons.vmdVsHtml.renderModeGain}.
- VMD native semantic role gain: ${benchmark.comparisons.vmdVsHtml.standardizedSemanticRoleGain}.

HTML is the strongest deployment target because browsers open it natively today.
The tradeoff is authoring burden: matching VMD's three output modes in raw HTML
requires duplicated content, CSS, JavaScript, and custom class conventions. VMD
keeps new documents smaller and layered, while the preserve tier gives existing
HTML/CSS pages a compatibility path when pixel fidelity matters.

## Pros, Cons, And Effects

| Format | Best use | Main advantage | Main cost |
| --- | --- | --- | --- |
| Markdown | Linear notes, READMEs, essays, simple docs | Lowest writing friction and strong plain-text readability | Semantic roles and visual structure remain conventions |
| HTML | Final browser-native pages and custom web apps | Opens directly in browsers with full layout and interaction control | High authoring overhead when content, style, and interaction are hand-written together |
| VMD | Layered visual reports, decks, maps, AI-authored visual documents, and preserved HTML/CSS imports | One source can carry meaning, validation, render modes, and explicit fidelity tier | Needs a renderer, extension, or converter until browsers support it natively |

The practical effect is not that VMD should replace Markdown or HTML everywhere.
It creates a middle source layer for documents that are too visual and structured
for Markdown, but too repetitive and low-level to author directly as HTML.

## Practical Interpretation

VMD is not a replacement for Markdown when the document is mostly linear prose.
Markdown remains better for simple notes, READMEs, and long-form writing.

VMD is useful when the document needs semantic roles, multiple visual modes,
validation, AI-generated visual structure, or an explicit preserve path for
existing browser pages.

HTML remains the final native browser substrate. VMD's current value is as a
higher-level source that can compile to HTML and become easier for AI-assisted
authors to produce reliably.
`;
}

async function assertCurrent(filePath, expected) {
  let actual = "";
  try {
    actual = await readFile(filePath, "utf8");
  } catch {
    throw new Error(`${path.relative(root, filePath)} is missing. Run npm run benchmark:formats.`);
  }

  if (actual !== expected) {
    throw new Error(`${path.relative(root, filePath)} is stale. Run npm run benchmark:formats.`);
  }
}
