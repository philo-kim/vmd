# Extension Architecture

The extension should be designed as a browser polyfill for a future native VMD
runtime.

It should not be treated as the product boundary. The product boundary is the
format and its layered AST.

## Extension Family

At maturity, VMD may need several extension surfaces.

### 1. VMD Renderer

Purpose:

- render local `.vmd` files opened in the browser
- render uploaded or dropped `.vmd` files
- support read, deck, map, and future modes
- render `fidelity: preserve` files without adding a toolbar wrapper

This is the current reference extension.

### 2. VMD Inspector

Purpose:

- show the parsed layered AST
- identify invalid blocks
- warn when claims lack evidence
- flag raw compatibility and disabled script blocks
- inspect frame roles and render decisions

The first slice now exists as shared validator diagnostics in the CLI, Chrome
viewer, VS Code extension, and playground. A richer DevTools-like inspector can
build on the same AST and diagnostic model.

### 3. VMD Authoring Helper

Purpose:

- provide live preview
- suggest semantic blocks
- convert Markdown into VMD
- help AI agents generate valid VMD

The first authoring helper exists in the VS Code extension through snippets,
diagnostics, syntax highlighting, folding, and preview.

### 4. VMD Publisher

Purpose:

- export static HTML
- export PDF or deck formats
- package assets
- publish to GitHub Pages or a static host

The first publisher surface exists as the CLI gallery builder and GitHub Pages
workflow. PDF, PPT, and richer asset packaging remain future adapters.

## Runtime Layers

The extension runtime should eventually be split into reusable packages:

```text
vmd-source
  -> parser
  -> layered AST
  -> validator
  -> renderer adapters
  -> browser extension / CLI / PWA / native integrations
```

The current prototype keeps code small and local, but the direction should be a
shared core parser and renderer package.

## Auto-Render Strategy

For local files and web-served VMD URLs, the extension uses a content script:

1. Chrome opens a `.vmd` file or URL as text.
2. The extension checks that the URL ends with `.vmd`.
3. It reads the browser's text view.
4. It parses VMD into an AST.
5. It replaces the page with rendered HTML.

If the AST declares `fidelity: preserve`, the renderer skips the VMD toolbar and
emits the preserved raw output directly. It also avoids injecting the extension
stylesheet or adding VMD classes to `body`, because even reset rules and body
selectors can alter a preserved HTML/CSS page. It applies preserved `html` and
`body` attributes from the document header before replacing the body content, so
CSS that depends on `body` class, id, style, language, direction, data, or ARIA
attributes can still match. For semantic documents, it keeps the toolbar so
users can switch read, deck, and map views.

The script intentionally does nothing on non-`.vmd` URLs.

For `file://` URLs, Chrome still requires the user to grant file URL access in
the extension details page. Web-served `.vmd` files do not require that local
file permission, but the extension still needs normal host access for matched
`.vmd` URLs.

## VS Code Resource Strategy

VS Code webviews cannot load arbitrary local files directly. The VMD preview
therefore rewrites local `src`, `href`, `poster`, and CSS `url(...)` references
into webview-safe resource URIs when the source document is opened from the
local filesystem. This matters for layered and preserve-oriented documents that
reference nearby images, fonts, or stylesheets.

## Design Rules

- The extension must not define the format.
- The parser must remain reusable outside Chrome.
- The AST must be the stable contract between source and rendering.
- Renderers should map semantic roles to accessible HTML and preserve raw
  compatibility blocks only when the fidelity tier calls for it.
- Browser integration should be progressive: extension first, PWA file handler
  second, native browser support only after adoption.
