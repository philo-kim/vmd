import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSite } from "./site-builder.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

await buildSite({
  root,
  samplesDir: path.join(root, "samples"),
  outDir: path.join(root, "dist", "site")
});

console.log("Built VMD site -> dist/site");
