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
  COMPONENT_BLOCK_TYPES
} = require("../core/vmd-core.cjs");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const source = await readFile(path.join(root, "samples", "family-platform.vmd"), "utf8");
const ast = parseVmd(source);
const diagnostics = validateVmdAst(ast);

assert.equal(ast.type, "document");
assert.equal(ast.doc.title, "Family Platform Strategy");
assert.equal(ast.children.filter((node) => node.type === "frame").length, 4);
assert.equal(diagnostics.filter((diagnostic) => diagnostic.level === "error").length, 0);
assert.ok(SEMANTIC_BLOCK_TYPES.includes("claim"));
assert.ok(VISUAL_BLOCK_TYPES.includes("visual.compare"));
assert.ok(VISUAL_BLOCK_TYPES.includes("visual.matrix"));
assert.ok(LAYOUT_BLOCK_TYPES.includes("layout.grid"));
assert.ok(STYLE_BLOCK_TYPES.includes("style.tokens"));
assert.ok(RAW_BLOCK_TYPES.includes("raw.html"));
assert.ok(COMPONENT_BLOCK_TYPES.includes("component.metric"));

const readHtml = renderVmd(ast, "read");
assert.match(readHtml, /A Family Platform For Behavior Change/);
assert.match(readHtml, /block-claim/);

const deckHtml = renderVmd(ast, "deck");
assert.match(deckHtml, /class="slide"/);

const mapHtml = renderVmd(ast, "map");
assert.match(mapHtml, /class="map-node"/);

const fullHtml = renderFullHtml(ast);
assert.match(fullHtml, /<!doctype html>/);
assert.match(fullHtml, /Family Platform Strategy/);

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
