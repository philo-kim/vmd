# Extension Architecture

VMD has two companion extensions:

- Chrome polyfill: opens `.vmd` files as rendered browser pages
- VS Code extension: previews and validates `.vmd` while authoring

Both use the shared runtime in `core/vmd-core.cjs`.

## Shared Runtime

`core/vmd-core.cjs` provides:

- parser
- AST renderer
- validator
- block vocabulary
- HTML escaping helpers

The runtime is copied into:

- `extension/vmd-core.js`
- `vscode-extension/vendor/vmd-core.cjs`

Run this after changing the core:

```bash
npm run sync:core
```

## Chrome Extension

Files:

- `extension/manifest.json`
- `extension/auto-render.js`
- `extension/viewer.html`
- `extension/viewer.js`
- `extension/styles.css`
- `extension/lossless-sample.vmd`

The content script detects `.vmd` URLs, reads the browser's text view, parses the
source, and renders it into the page.

The manual viewer shows:

- source editor
- rendered preview
- diagnostics
- AI source layer summary
- replay layer summary

## VS Code Extension

Files:

- `vscode-extension/extension.js`
- `vscode-extension/syntaxes/vmd.tmLanguage.json`
- `vscode-extension/media/vmd.css`
- `vscode-extension/vendor/vmd-core.cjs`

It supports:

- syntax highlighting
- diagnostics
- snippets for frames, blocks, and visual-lossless directive shells
- live preview
- custom editor preview

## Visual-Lossless Responsibilities

Extensions should not silently certify visual-lossless status. They should:

- display the declared fidelity tier
- warn when `visual-lossless` lacks `@lock`
- warn when it lacks replay data
- warn when it lacks `@residual_index`
- warn when it lacks `@edit_state` or dirty-state handling
- keep replay payloads visible as renderer data, not editable intent

The final replay codec and screenshot verification remain renderer/tooling
responsibilities.
