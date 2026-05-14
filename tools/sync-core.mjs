import { mkdir, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "core", "vmd-core.cjs");
const targets = [
  path.join(root, "extension", "vmd-core.js"),
  path.join(root, "vscode-extension", "vendor", "vmd-core.cjs")
];

for (const target of targets) {
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(source, target);
}

console.log("Synced VMD core to Chrome and VS Code extension runtimes.");
