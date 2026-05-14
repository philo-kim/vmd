# Architecture

VMD is organized around one boundary:

```text
source -> layered AST -> renderer
```

The source syntax stays readable, but the AST now carries multiple layers:
semantic roles, visual patterns, layout primitives, style input, raw
compatibility blocks, and reusable components. The AST is the stable contract.
Renderers can then target browser pages, editor previews, static HTML, PDFs,
decks, or future native browser rendering.

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
- `LAYOUT_BLOCK_TYPES`
- `STYLE_BLOCK_TYPES`
- `RAW_BLOCK_TYPES`
- `COMPONENT_BLOCK_TYPES`
- `FIDELITY_TIERS`
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
Is this source useful as a layered visual document?
```

Current diagnostics cover missing document structure, unknown blocks, incomplete
frames, weak claim/evidence pairing, invalid visual blocks, empty layout/raw
blocks, sparse matrices, and disabled raw JavaScript.

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

## Fidelity Behavior

The renderer now distinguishes semantic rendering from preservation rendering.

For ordinary documents, `read` mode emits the VMD document shell, frames, blocks,
layouts, and components. For documents with:

```vmd
@doc "Imported Page" {
  fidelity: preserve
}
```

the read renderer avoids the normal VMD wrapper and emits preserved raw HTML/CSS
directly. It also maps document attributes such as `html-lang`, `html-dir`,
`body-class`, `body-id`, `body-style`, `body-data-*`, and `body-aria-*` back to
the rendered document. This is necessary because imported CSS can depend on
selectors such as `body.source`, `body > main`, or exact root geometry. Deck and
map modes remain semantic views and are not meant to be pixel-preserving.

## CLI And Static Site

`bin/vmd.mjs` is the reference CLI.

It supports:

- `render`: convert `.vmd` to static HTML
- `ast`: print or write the layered AST
- `validate`: run semantic diagnostics
- `gallery`: build the public sample gallery and playground

Validation supports strict mode for CI and JSON output for tools or AI agents.

`tools/site-builder.mjs` builds the static site used by GitHub Pages. This is
also the smallest public proof that VMD can be useful as a web-native document
format before any native browser support exists.

## Chrome Extension

The Chrome extension is a browser polyfill.

It handles two flows:

- automatic render for `.vmd` URLs
- manual viewer for upload, drag-and-drop, preview, and diagnostics

Automatic local file rendering requires Chrome's `Allow access to file URLs`
setting.

If a document declares `fidelity: preserve`, the automatic renderer skips the
mode toolbar, avoids injecting extension CSS, applies preserved `html` and
`body` attributes, and renders the preserved document directly. That makes a
preserved VMD file behave closer to an HTML file opened in the browser.

## VS Code Extension

The VS Code extension is the authoring companion.

It contributes:

- `.vmd` language support
- syntax highlighting
- block folding
- snippet completions for document, frame, semantic, visual, layout, style, raw,
  and component blocks
- diagnostics from the shared validator
- preview commands
- optional custom preview editor

The preview uses a VS Code webview and the same core renderer.

The VS Code preview allows inline style output from trusted VMD source so
`style.css` and `raw.css` can be inspected while authoring. The reference
renderer still disables `raw.js`.

## Build Philosophy

VMD should stay usable without a complex build chain.

The repository currently favors:

- plain JavaScript
- plain CSS
- simple file copies for extension runtimes
- direct integration tests for Chrome and VS Code

This is deliberate. The format should be easy for implementers to inspect and
port.
