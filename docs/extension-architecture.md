# Extension Architecture

The Chrome extension is a reference rendering surface for `.vmd` files. It does
not define the format; the shared parser, AST, validator, and renderer in
`core/vmd-core.cjs` define the current runtime behavior.

## Runtime Flow

For local files and web-served `.vmd` URLs, the extension uses a content script:

1. Chrome opens a `.vmd` file or URL as text.
2. The extension checks that the URL ends with `.vmd`.
3. It reads the browser's text view.
4. It parses VMD into an AST.
5. It replaces the page with rendered HTML.

The script intentionally does nothing on non-`.vmd` URLs.

## Preserve Mode

If the AST declares `fidelity: preserve`, the renderer skips the VMD toolbar and
emits the preserved raw output directly. It also avoids injecting the extension
stylesheet or adding VMD classes to `body`, because reset rules and body
selectors can alter a preserved HTML/CSS page.

The renderer applies supported `html` and `body` attributes from the document
header before replacing body content, so CSS that depends on root attributes can
still match.

## Manual Viewer

The extension viewer supports:

- uploading a `.vmd` file
- drag-and-drop loading
- read, deck, and map rendering
- validator diagnostics
- packaged sample documents

## Shared Core Copies

The extension uses a synced copy of the core runtime:

```text
core/vmd-core.cjs
extension/vmd-core.js
vscode-extension/vendor/vmd-core.cjs
```

Run this after changing `core/vmd-core.cjs`:

```bash
npm run sync:core
```

`npm run check` verifies that the runtime copies are synchronized.

## VS Code Resource Handling

VS Code webviews cannot load arbitrary local files directly. The VMD preview
rewrites local `src`, `href`, `poster`, and CSS `url(...)` references into
webview-safe resource URIs when the source document is opened from the local
filesystem.

## Design Rules

- The extension must not define the format.
- The parser must remain reusable outside Chrome.
- The AST is the contract between source and rendering.
- Semantic rendering should produce accessible HTML.
- Raw compatibility blocks should be preserved only when the fidelity tier calls
  for it.
