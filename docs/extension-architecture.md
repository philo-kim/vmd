# Extension Architecture

The extension should be designed as a browser polyfill for a future native VMD
runtime.

It should not be treated as the product boundary. The product boundary is the
format and its semantic AST.

## Extension Family

At maturity, VMD may need several extension surfaces.

### 1. VMD Renderer

Purpose:

- render local `.vmd` files opened in the browser
- render uploaded or dropped `.vmd` files
- support read, deck, map, and future modes

This is the current reference extension.

### 2. VMD Inspector

Purpose:

- show the parsed semantic AST
- identify invalid blocks
- warn when claims lack evidence
- inspect frame roles and render decisions

The first slice now exists as shared validator diagnostics in the CLI, VS Code
extension, and playground. A richer DevTools-like inspector can build on the
same AST and diagnostic model.

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
  -> semantic AST
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

The script intentionally does nothing on non-`.vmd` URLs.

For `file://` URLs, Chrome still requires the user to grant file URL access in
the extension details page. Web-served `.vmd` files do not require that local
file permission, but the extension still needs normal host access for matched
`.vmd` URLs.

## Design Rules

- The extension must not define the format.
- The parser must remain reusable outside Chrome.
- The AST must be the stable contract between source and rendering.
- Renderers should map semantic roles to accessible HTML.
- Browser integration should be progressive: extension first, PWA file handler
  second, native browser support only after adoption.
