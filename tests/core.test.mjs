import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { parseVmd, renderVmd, renderFullHtml } = require("../core/vmd-core.cjs");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const source = await readFile(path.join(root, "samples", "family-platform.vmd"), "utf8");
const ast = parseVmd(source);

assert.equal(ast.type, "document");
assert.equal(ast.doc.title, "Family Platform Strategy");
assert.equal(ast.children.filter((node) => node.type === "frame").length, 4);

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

const sampleFiles = (await readdir(path.join(root, "samples")))
  .filter((file) => file.endsWith(".vmd"));

for (const file of sampleFiles) {
  const sample = await readFile(path.join(root, "samples", file), "utf8");
  const sampleAst = parseVmd(sample);
  assert.ok(sampleAst.doc.title, `${file} should have a document title`);
  assert.match(renderVmd(sampleAst, "read"), /doc-view/, `${file} should render read mode`);
  assert.match(renderVmd(sampleAst, "deck"), /deck-view/, `${file} should render deck mode`);
  assert.match(renderVmd(sampleAst, "map"), /map-view/, `${file} should render map mode`);
}

console.log("core renderer test passed");
