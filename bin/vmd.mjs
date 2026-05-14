#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const {
  parseVmd,
  renderFullHtml,
  validateVmdAst
} = require("../core/vmd-core.cjs");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  const [command, ...args] = process.argv.slice(2);

  if (!command || ["-h", "--help", "help"].includes(command)) {
    printHelp();
    return;
  }

  if (command === "render") {
    await renderCommand(args);
    return;
  }

  if (command === "ast") {
    await astCommand(args);
    return;
  }

  if (command === "validate") {
    await validateCommand(args);
    return;
  }

  if (command === "gallery") {
    await galleryCommand(args);
    return;
  }

  throw new Error(`Unknown command "${command}". Run "vmd help".`);
}

async function renderCommand(args) {
  const options = parseArgs(args);
  const input = options._[0];
  if (!input) {
    throw new Error("render requires an input .vmd file.");
  }

  const mode = assertMode(options.mode || "read");
  const output = options.out || options.o || replaceExtension(input, ".html");
  const source = await readFile(input, "utf8");
  const ast = parseVmd(source);
  const html = renderFullHtml(ast, mode, {
    cssHref: options.css || "../extension/styles.css"
  });

  await writeText(output, html);
  console.log(`Rendered ${input} -> ${output}`);
}

async function astCommand(args) {
  const options = parseArgs(args);
  const input = options._[0];
  if (!input) {
    throw new Error("ast requires an input .vmd file.");
  }

  const output = options.out || options.o;
  const ast = parseVmd(await readFile(input, "utf8"));
  const json = `${JSON.stringify(ast, null, 2)}\n`;

  if (output) {
    await writeText(output, json);
    console.log(`Wrote AST ${input} -> ${output}`);
  } else {
    process.stdout.write(json);
  }
}

async function validateCommand(args) {
  const options = parseArgs(args);
  const inputs = options._;
  if (!inputs.length) {
    throw new Error("validate requires one or more .vmd files.");
  }

  let hasErrors = false;
  const results = [];

  for (const input of inputs) {
    try {
      const ast = parseVmd(await readFile(input, "utf8"));
      const diagnostics = validateVmdAst(ast);
      const errors = diagnostics.filter((diagnostic) => diagnostic.level === "error");
      const warnings = diagnostics.filter((diagnostic) => diagnostic.level === "warning");
      hasErrors = hasErrors || Boolean(errors.length) || Boolean(options.strict && warnings.length);
      results.push({
        input,
        diagnostics
      });

      if (!options.json && !diagnostics.length) {
        console.log(`${input}: ok`);
        continue;
      }

      for (const diagnostic of options.json ? [] : diagnostics) {
        const line = diagnostic.line ? `:${diagnostic.line}` : "";
        console.log(`${input}${line}: ${diagnostic.level} ${diagnostic.code} - ${diagnostic.message}`);
      }
    } catch (error) {
      hasErrors = true;
      const diagnostic = {
        level: "error",
        code: "parse-error",
        message: error.message
      };
      results.push({
        input,
        diagnostics: [diagnostic]
      });
      if (!options.json) {
        console.log(`${input}: error parse-error - ${error.message}`);
      }
    }
  }

  if (options.json) {
    process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
  }

  if (hasErrors) {
    process.exitCode = 1;
  }
}

async function galleryCommand(args) {
  const options = parseArgs(args);
  const samplesDir = path.resolve(options.samples || "samples");
  const outDir = path.resolve(options.out || options.o || path.join("dist", "site"));
  const { buildSite } = await import("../tools/site-builder.mjs");

  await buildSite({
    root,
    samplesDir,
    outDir
  });
  console.log(`Built VMD gallery -> ${path.relative(root, outDir)}`);
}

function assertMode(mode) {
  const supported = new Set(["read", "deck", "map"]);
  if (!supported.has(mode)) {
    throw new Error(`Unsupported render mode "${mode}". Use read, deck, or map.`);
  }
  return mode;
}

function parseArgs(args) {
  const options = {
    _: []
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("-")) {
      options._.push(arg);
      continue;
    }

    const [key, inlineValue] = arg.replace(/^-+/, "").split(/=(.*)/s);
    if (inlineValue !== undefined) {
      options[key] = inlineValue;
      continue;
    }

    const next = args[index + 1];
    if (!next || next.startsWith("-")) {
      options[key] = true;
      continue;
    }

    options[key] = next;
    index += 1;
  }

  return options;
}

async function writeText(filePath, content) {
  await mkdir(path.dirname(path.resolve(filePath)), { recursive: true });
  await writeFile(filePath, content, "utf8");
}

function replaceExtension(filePath, extension) {
  return path.join(path.dirname(filePath), `${path.basename(filePath, path.extname(filePath))}${extension}`);
}

function printHelp() {
  console.log(`VMD CLI

Usage:
  vmd render <file.vmd> [--out output.html] [--mode read|deck|map] [--css href]
  vmd ast <file.vmd> [--out output.json]
  vmd validate <file.vmd> [...] [--strict] [--json]
  vmd gallery [--samples samples] [--out dist/site]
`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
