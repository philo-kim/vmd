import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { parseVmd, renderFullHtml } = require("../core/vmd-core.cjs");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const input = process.argv[2] || path.join(root, "samples", "family-platform.vmd");
const output = process.argv[3] || path.join(root, "dist", "family-platform.html");

const source = await readFile(input, "utf8");
const ast = parseVmd(source);
const html = renderFullHtml(ast, "read");

await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, html, "utf8");

console.log(`Rendered ${path.relative(root, input)} -> ${path.relative(root, output)}`);
