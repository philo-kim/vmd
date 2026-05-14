import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(root, "core", "vmd-core.cjs");
const targetPaths = [
  path.join(root, "extension", "vmd-core.js"),
  path.join(root, "vscode-extension", "vendor", "vmd-core.cjs")
];

const source = await readFile(sourcePath, "utf8");
const stale = [];

for (const targetPath of targetPaths) {
  const target = await readFile(targetPath, "utf8");
  if (target !== source) {
    stale.push(path.relative(root, targetPath));
  }
}

if (stale.length) {
  console.error("VMD core runtime copies are stale:");
  for (const file of stale) {
    console.error(`- ${file}`);
  }
  console.error("Run `npm run sync:core` and commit the generated files.");
  process.exit(1);
}

console.log("VMD core runtime copies are synced.");
