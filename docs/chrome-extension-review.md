# Chrome Extension Feasibility Review

## Short Answer

Yes. A Chrome extension can let a user upload a `.vmd` file and view it as a
rendered web page.

The most reliable first implementation is:

1. Manifest V3 extension
2. extension popup opens a dedicated viewer tab
3. viewer tab accepts a `.vmd` file through file input or drag and drop
4. JavaScript parses VMD into a semantic AST
5. renderer turns the AST into HTML views

This repository includes that MVP in `extension/`.

## What Works Well

### File Upload

Chrome extensions can use normal browser File APIs inside an extension page.
That means a VMD viewer page can read a user-selected `.vmd` file without
special filesystem permissions.

### Drag And Drop

The same viewer page can accept a dragged `.vmd` file and render it immediately.

### Local-Only Rendering

The prototype does not need a server. Parsing and rendering can run entirely in
the browser.

### Multiple Views

Because VMD compiles into a semantic AST first, the extension can show:

- read mode
- deck mode
- map mode

from the same source.

## Important Browser Constraints

### Direct File Association Is Not The MVP Path

Opening a `.vmd` file directly from the operating system into Chrome and having
the extension automatically intercept it is not the most reliable first target.
Chrome extension file URL handling has permission and UX constraints.

The stable MVP should use an explicit viewer page with file upload or drag and
drop.

### Content Scripts On `file://` URLs Are Possible But Frictional

Chrome can allow extensions to access local file URLs if the user enables the
extension's `Allow access to file URLs` option. That is not a good default user
experience for the first version.

### Chrome Apps File APIs Are Not The Path

Older Chrome Apps exposed richer filesystem APIs, but Chrome Apps are not the
right platform for a new product. Use a normal Manifest V3 extension or a PWA.

## Recommended Product Shape

### Version 1

- Extension icon opens the VMD viewer.
- User uploads or drops a `.vmd` file.
- Viewer renders read/deck/map modes.
- Optional static HTML export can be added later.

### Version 2

- Recent files stored in extension storage.
- Theme selection.
- AST inspector for debugging.
- Export to standalone HTML.
- Semantic quality checks.

### Version 3

- Optional web app/PWA for teams.
- Cloud sync or GitHub-backed documents.
- PDF/deck export.
- Better authoring editor with live preview.

## Technical Verdict

The Chrome extension is feasible and a good first product surface.

The main architectural point is to keep the parser and renderer independent of
Chrome APIs. The extension should be just one host. The same parser should also
work in CLI, web app, and future desktop contexts.
