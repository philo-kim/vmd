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

The semantic AST is the interoperability boundary. Renderers and validators
should depend on the AST, not on source-string scraping.

## Validate

```bash
node bin/vmd.mjs validate samples/family-platform.vmd
```

The validator reports:

- parse errors
- unknown blocks
- frames without roles
- frames without semantic blocks
- claims without evidence
- invalid visual blocks, such as empty `visual.compare` or one-step loops

Validation exits with a non-zero code when an error is found. Warnings do not
fail the command.

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
