# VMD CLI

The VMD CLI is the reference command-line surface for the format.

It exists for three reasons:

- give AI-assisted workflows a small target that can be validated immediately
- make `.vmd` files useful before browser-native support exists
- keep the parser, AST, renderer, and public examples testable in CI

## Install From This Repository

```bash
npm install
```

Run locally:

```bash
node bin/vmd.mjs help
```

After package installation, the binary name is:

```bash
vmd
```

## Render HTML

```bash
node bin/vmd.mjs render samples/family-platform.vmd --out dist/family-platform.html
```

Render modes:

```bash
node bin/vmd.mjs render samples/family-platform.vmd --mode read
node bin/vmd.mjs render samples/family-platform.vmd --mode deck
node bin/vmd.mjs render samples/family-platform.vmd --mode map
```

The renderer writes static HTML and links the reference stylesheet by default.

## Print Or Write AST

```bash
node bin/vmd.mjs ast samples/family-platform.vmd
node bin/vmd.mjs ast samples/family-platform.vmd --out dist/family-platform.ast.json
```

The layered AST is the interoperability boundary. Renderers and validators
should depend on the AST, not on source-string scraping.

## Validate

```bash
node bin/vmd.mjs validate samples/family-platform.vmd
node bin/vmd.mjs validate samples/family-platform.vmd --strict
node bin/vmd.mjs validate samples/family-platform.vmd --json
```

The validator reports:

- parse errors
- unknown blocks
- frames without roles
- empty frames
- claims without evidence
- empty layout or raw blocks
- disabled `raw.js`
- invalid visual blocks, such as empty `visual.compare`, one-step loops, or
  sparse matrices

Validation exits with a non-zero code when an error is found. Warnings do not
fail the command unless `--strict` is used.

Use `--json` when another tool or AI agent should consume diagnostics
programmatically.

CLI options can be passed either as separate arguments or with equals syntax:

```bash
node bin/vmd.mjs render samples/family-platform.vmd --mode=deck --out=dist/family-platform.html
```

## Build Gallery And Playground

```bash
node bin/vmd.mjs gallery --out dist/site
```

or:

```bash
npm run build:site
```

This builds:

- `dist/site/index.html`: sample gallery
- `dist/site/playground.html`: browser playground with live rendering
- rendered pages for every `.vmd` file in `samples/`

The gallery is designed to be published through GitHub Pages.

## Visual Fidelity Verification

The visual fidelity checker is a project tool rather than a packaged CLI
subcommand:

```bash
npm run verify:visual-fidelity -- --source-dir /path/to/html/folder
npm run verify:visual-fidelity -- --source-dir /path/to/html/folder --conversion preserve
```

Use `--conversion semantic` to measure how much visual drift appears when HTML
is converted into VMD-native frames and blocks. Use `--conversion preserve` to
wrap existing HTML/CSS in raw compatibility blocks and check whether the page can
be preserved with pixel-level fidelity.
