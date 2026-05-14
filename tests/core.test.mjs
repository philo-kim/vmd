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
  VISUAL_BLOCK_TYPES
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
