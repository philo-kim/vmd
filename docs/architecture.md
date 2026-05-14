# Architecture

VMD is organized around one boundary:

```text
source -> semantic AST -> renderer
```

The source syntax is intentionally small. The AST is the stable contract.
Renderers can then target browser pages, editor previews, static HTML, PDFs, or
future native browser rendering.

## Repository Layers

```text
core/
  vmd-core.cjs

extension/
  Chrome extension polyfill and viewer

vscode-extension/
  VS Code authoring and preview extension

tools/
  render helpers and static gallery builder

bin/
  reference CLI

tests/
  Core and extension integration tests

docs/
  Format, ecosystem, and browser-integration documents
```

## Core Runtime

`core/vmd-core.cjs` contains the current parser and HTML renderer.

It exports:

- `parseVmd(source)`
- `renderVmd(ast, mode)`
- `renderFullHtml(ast, mode, options)`
- `validateVmdAst(ast)`
- `validateVmdSource(source)`
- `SEMANTIC_BLOCK_TYPES`
- `VISUAL_BLOCK_TYPES`
- `escapeHtml(value)`

The core is CommonJS plus a browser global wrapper so it can run in:

- Node CLI tools
- Chrome extension pages
- Chrome content scripts
- VS Code extension host

## Validation

The runtime validator is intentionally separate from parsing.

Parsing answers:

```text
Is this source structurally readable?
```

Validation answers:

```text
Is this source useful as a semantic visual document?
```

Current diagnostics cover missing document structure, unknown blocks, incomplete
frames, weak claim/evidence pairing, and invalid visual blocks.

The validator is used by:

- `node bin/vmd.mjs validate`
- VS Code diagnostics
- playground diagnostics
- core tests

## Runtime Copies

The Chrome and VS Code extensions keep local runtime copies:

```text
extension/vmd-core.js
vscode-extension/vendor/vmd-core.cjs
```

They are generated from:

```text
core/vmd-core.cjs
```

Sync them with:

```bash
npm run sync:core
```

This keeps the extensions loadable without a build step while preserving a
single source of truth for parser and renderer behavior.

## Rendering Modes

The current renderer supports:

- `read`: document-like reading mode
- `deck`: frame-by-frame slide mode
- `map`: frame map mode

These modes are intentionally early. The format should not assume that every
renderer has to look the same. The shared rule is that semantic blocks keep
their meaning across output modes.

## CLI And Static Site

`bin/vmd.mjs` is the reference CLI.

It supports:

- `render`: convert `.vmd` to static HTML
- `ast`: print or write the semantic AST
- `validate`: run semantic diagnostics
- `gallery`: build the public sample gallery and playground

`tools/site-builder.mjs` builds the static site used by GitHub Pages. This is
also the smallest public proof that VMD can be useful as a web-native document
format before any native browser support exists.

## Chrome Extension

The Chrome extension is a browser polyfill.

It handles two flows:

- automatic render for `.vmd` URLs
- manual viewer for upload and drag-and-drop

Automatic local file rendering requires Chrome's `Allow access to file URLs`
setting.

## VS Code Extension

The VS Code extension is the authoring companion.

It contributes:

- `.vmd` language support
- syntax highlighting
- block folding
- snippet completions for document, frame, semantic, and visual blocks
- diagnostics from the shared validator
- preview commands
- optional custom preview editor

The preview uses a VS Code webview and the same core renderer.

## Build Philosophy

VMD should stay usable without a complex build chain.

The repository currently favors:

- plain JavaScript
- plain CSS
- simple file copies for extension runtimes
- direct integration tests for Chrome and VS Code

This is deliberate. The format should be easy for implementers to inspect and
port.
