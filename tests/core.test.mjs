import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const {
  parseVmd,
  renderVmd,
  renderFullHtml,
  validateVmdAst,
  validateVmdSource,
  SEMANTIC_BLOCK_TYPES,
  VISUAL_BLOCK_TYPES,
  LAYOUT_BLOCK_TYPES,
  STYLE_BLOCK_TYPES,
  RAW_BLOCK_TYPES,
  COMPONENT_BLOCK_TYPES,
  DIRECTIVE_BLOCK_TYPES
} = require("../core/vmd-core.cjs");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const source = await readFile(path.join(root, "samples", "source-layer-brief.vmd"), "utf8");
const ast = parseVmd(source);
const diagnostics = validateVmdAst(ast);

assert.equal(ast.type, "document");
assert.equal(ast.doc.title, "Source Layer Brief");
assert.equal(ast.children.filter((node) => node.type === "frame").length, 4);
assert.equal(diagnostics.filter((diagnostic) => diagnostic.level === "error").length, 0);
assert.ok(SEMANTIC_BLOCK_TYPES.includes("claim"));
assert.ok(VISUAL_BLOCK_TYPES.includes("visual.compare"));
assert.ok(VISUAL_BLOCK_TYPES.includes("visual.matrix"));
assert.ok(LAYOUT_BLOCK_TYPES.includes("layout.grid"));
assert.ok(STYLE_BLOCK_TYPES.includes("style.tokens"));
assert.ok(RAW_BLOCK_TYPES.includes("raw.html"));
assert.ok(COMPONENT_BLOCK_TYPES.includes("component.metric"));
assert.ok(DIRECTIVE_BLOCK_TYPES.includes("lock"));
assert.ok(DIRECTIVE_BLOCK_TYPES.includes("edit_state"));
assert.ok(SEMANTIC_BLOCK_TYPES.includes("intent"));

const readHtml = renderVmd(ast, "read");
assert.match(readHtml, /A Source Layer For Visual Documents/);
assert.match(readHtml, /block-claim/);

const deckHtml = renderVmd(ast, "deck");
assert.match(deckHtml, /class="slide"/);

const mapHtml = renderVmd(ast, "map");
assert.match(mapHtml, /class="map-node"/);

const fullHtml = renderFullHtml(ast);
assert.match(fullHtml, /<!doctype html>/);
assert.match(fullHtml, /Source Layer Brief/);

const layered = parseVmd(`@doc "Layered" {
  fidelity: preserve
  html-lang: ko
  body-class: source-body
  body-id: source-root
  body-style: margin: 0;
  body-data-theme: imported
}

::frame[role="preserve"]
  ::raw.css
  body { margin: 0; }
  .box { color: #123456; }
  ::

  ::raw.html
  <main class="box">
    <h1>Preserved HTML</h1>
  </main>
  ::
::`);
assert.doesNotMatch(renderVmd(layered, "read"), /class="frame"/);
assert.match(renderVmd(layered, "read"), /<main class="box">/);
assert.doesNotMatch(renderFullHtml(layered, "read", { cssHref: null }), /extension\/styles\.css/);
assert.match(renderFullHtml(layered, "read", { cssHref: null }), /<html lang="ko">/);
assert.match(renderFullHtml(layered, "read", { cssHref: null }), /<body class="source-body" id="source-root" style="margin: 0" data-theme="imported">/);

const unsafeRaw = parseVmd(`@doc "Unsafe Raw" {
  fidelity: preserve
}

::raw.html
<main>
  <a href="javascript:alert(1)" onclick="alert(2)">Unsafe link</a>
  <script>alert(3)</script>
</main>
::`);
const unsafeHtml = renderVmd(unsafeRaw, "read");
assert.match(unsafeHtml, /data-vmd-disabled-script/);
assert.doesNotMatch(unsafeHtml, /<script\b/i);
assert.doesNotMatch(unsafeHtml, /onclick=/i);
assert.doesNotMatch(unsafeHtml, /javascript:alert/i);
assert.ok(
  validateVmdAst(unsafeRaw).some((diagnostic) => diagnostic.code === "raw-executable-disabled"),
  "executable raw markup should produce a warning"
);

assert.ok(
  validateVmdSource(`@doc "Bad Fidelity" {
  fidelity: exact
}

::frame[role="x"]
Body
::`).some((diagnostic) => diagnostic.code === "unknown-fidelity-tier"),
  "unknown fidelity tiers should produce a warning"
);

const visual = parseVmd(`@doc "Visual" {
  fidelity: visual
}

::frame[role="visual"]
  ::layout.grid[columns="2" gap="medium"]
    ::component.metric[label="A" value="1"]
    ::
    ::component.card[title="B"]
    Body
    ::
  ::
  ::visual.matrix
  top-left: A
  top-right: B
  ::
::`);
assert.match(renderVmd(visual, "read"), /layout-grid/);
assert.match(renderVmd(visual, "read"), /component-metric/);
assert.match(renderVmd(visual, "read"), /matrix-block/);

const lossless = parseVmd(`@doc "Lossless" {
  fidelity: visual-lossless
  intent: dashboard
}

@lock {
  renderer: vmd-web@0.3.0
  dictionary: dashboard-system@1.0.0
  browser: chromium
  viewport: 1440x1200
}

@edit_state {
  source: clean
  replay: current
  dirty: none
}

::intent
audience: growth team
purpose: inspect revenue and accounts quickly
::

@tokens.editable {
  accent: #c96442 [editable]
  surface: #ffffff
}

@tokens.locked {
  title.line-height: 1.05 [locked]
}

::frame[role="dashboard-overview"]
  ::component.metric[label="Revenue" value="$842k"]
  ::
::

@residual_index {
  affected:
    - frame.dashboard-overview.title
  constraints:
    frame.dashboard-overview.title.max-lines: 2
  ai-note: Edit source slots only.
}

@replay {
  encoding: visual-replay@0.1
  contains: dom-delta css-cascade layout-boxes
}

@residual {
  mode: visual-lossless
  ai: ignore
}
`);
const losslessDiagnostics = validateVmdAst(lossless);
assert.equal(
  losslessDiagnostics.filter((diagnostic) => diagnostic.level === "error").length,
  0,
  "visual-lossless fixture should not produce errors"
);
assert.doesNotMatch(
  losslessDiagnostics.map((diagnostic) => diagnostic.code).join(" "),
  /missing-render-lock|missing-replay-layer|missing-residual-index|missing-edit-state|unknown-block/,
  "visual-lossless fixture should include lock, replay, residual index, edit state, and known intent"
);
assert.match(renderVmd(lossless, "read"), /directive-lock/);
assert.match(renderVmd(lossless, "read"), /directive-edit_state/);
assert.match(renderVmd(lossless, "read"), /directive-residual_index/);
assert.match(renderVmd(lossless, "read"), /--accent: #c96442/);
assert.match(renderVmd(lossless, "read"), /tokens\.editable/);
assert.match(renderVmd(lossless, "read"), /tokens\.locked/);
assert.match(renderVmd(lossless, "read"), /token-badge-editable/);
assert.match(renderVmd(lossless, "read"), /token-badge-locked/);
assert.match(renderVmd(lossless, "read"), /--title-line-height: 1\.05/);
assert.doesNotMatch(renderVmd(lossless, "read"), /--accent: #c96442 \[editable\]/);

assert.throws(
  () => parseVmd("::claim\nmissing close"),
  /Unclosed block/
);
assert.equal(validateVmdSource("::claim\nmissing close")[0].code, "parse-error");

const invalidDiagnostics = validateVmdSource(`@doc "Invalid" {
  format: deck
}

::frame[role="broken"]
  ::visual.compare
  left: A
  right: B
  ::
::`);
assert.ok(
  invalidDiagnostics.some((diagnostic) => diagnostic.code === "compare-missing-rows"),
  "invalid visual.compare should produce a validation error"
);

const sampleFiles = (await readdir(path.join(root, "samples")))
  .filter((file) => file.endsWith(".vmd"));

for (const file of sampleFiles) {
  const sample = await readFile(path.join(root, "samples", file), "utf8");
  const sampleAst = parseVmd(sample);
  const sampleErrors = validateVmdAst(sampleAst).filter((diagnostic) => diagnostic.level === "error");
  assert.ok(sampleAst.doc.title, `${file} should have a document title`);
  assert.equal(sampleErrors.length, 0, `${file} should not have validation errors`);
  assert.match(renderVmd(sampleAst, "read"), /doc-view/, `${file} should render read mode`);
  assert.match(renderVmd(sampleAst, "deck"), /deck-view/, `${file} should render deck mode`);
  assert.match(renderVmd(sampleAst, "map"), /map-view/, `${file} should render map mode`);
}

console.log("core renderer test passed");
