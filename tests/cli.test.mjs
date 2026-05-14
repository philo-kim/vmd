import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, "bin", "vmd.mjs");
const sample = path.join(root, "samples", "family-platform.vmd");
const tempRoot = await mkdtemp(path.join(os.tmpdir(), "vmd-cli-test-"));

try {
  const renderOut = path.join(tempRoot, "rendered.html");
  await execFileAsync("node", [cli, "render", sample, "--out", renderOut, "--mode=deck"], {
    cwd: root
  });
  const html = await readFile(renderOut, "utf8");
  assert.match(html, /deck-view/);
  assert.match(html, /Family Platform Brief/);

  const astOut = path.join(tempRoot, "ast.json");
  await execFileAsync("node", [cli, "ast", sample, "--out", astOut], {
    cwd: root
  });
  const ast = JSON.parse(await readFile(astOut, "utf8"));
  assert.equal(ast.doc.title, "Family Platform Brief");

  const validateResult = await execFileAsync("node", [
    cli,
    "validate",
    path.join(root, "samples", "ai-native-brief.vmd"),
    path.join(root, "samples", "family-platform.vmd"),
    path.join(root, "samples", "lesson-outline.vmd")
  ], {
    cwd: root
  });
  assert.match(validateResult.stdout, /family-platform\.vmd/);

  const jsonValidation = await execFileAsync("node", [cli, "validate", sample, "--json"], {
    cwd: root
  });
  const validationResults = JSON.parse(jsonValidation.stdout);
  assert.equal(validationResults[0].input, sample);
  assert.ok(Array.isArray(validationResults[0].diagnostics));

  try {
    await execFileAsync("node", [cli, "validate", sample, "--strict"], {
      cwd: root
    });
    assert.fail("strict validation should fail on warnings");
  } catch (error) {
    assert.match(error.stdout, /claim-without-evidence/);
  }

  const siteOut = path.join(tempRoot, "site");
  await execFileAsync("node", [cli, "gallery", "--out", siteOut], {
    cwd: root
  });
  const galleryHtml = await readFile(path.join(siteOut, "index.html"), "utf8");
  const playgroundHtml = await readFile(path.join(siteOut, "playground.html"), "utf8");
  assert.match(galleryHtml, /Visual Semantic Markdown/);
  assert.match(galleryHtml, /format-card/);
  assert.match(playgroundHtml, /VMD Playground/);

  const invalid = path.join(tempRoot, "invalid.vmd");
  await writeFile(invalid, `@doc "Invalid" {
  format: deck
}

::frame[role="broken"]
  ::visual.loop
  Only one step
  ::
::`, "utf8");

  try {
    await execFileAsync("node", [cli, "validate", invalid], {
      cwd: root
    });
    assert.fail("invalid VMD should fail validation");
  } catch (error) {
    assert.match(error.stdout, /loop-too-short/);
  }
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}

console.log("cli test passed");
