# VMD

VMD is an open draft for a semantic visual document format.

The web has languages for structure, style, and behavior. VMD explores a missing
layer: a portable way to describe the role of an idea so the same source can
become a document, deck, map, report, or interactive page.

This repository is public because VMD should grow as a shared format, not a
closed app feature.

## Ambition

The ideal end state is simple:

```text
Open a .vmd file in a browser.
The browser renders it as a visual document.
```

VMD is designed for a world where people and AI agents create visual documents
together. Instead of forcing every AI-assisted creator to generate complete
HTML, CSS, and JavaScript for every page, VMD gives them a smaller and more
portable target: semantic visual structure.

## Core Idea

```text
Write like Markdown.
Structure like HTML.
Render through a theme system like CSS.
```

VMD marks the role of an idea instead of its final decoration:

```vmd
::claim
This product is not an allowance tracker.
It is a family behavior-change system.
::
```

That semantic block can become a section in read mode, a slide in deck mode, or
a node in map mode.

## Why VMD

Markdown made writing portable. HTML made documents linkable and structured.
CSS made presentation reusable. JavaScript made the web programmable.

VMD is a proposal for the next missing primitive:

```text
semantic intent for visual documents
```

Most authoring tools store appearance. VMD stores meaning first. A renderer can
then decide how that meaning should appear in each medium.

## Why This Matters For AI-Assisted Creation

AI can generate HTML, CSS, and JavaScript, but polished visual documents require
many low-level layout decisions. VMD gives AI-assisted creators and vibe coders
a higher-level target:

```text
describe the document's semantic structure,
then let the renderer handle the visual page.
```

An author can ask for a `.vmd` document. The browser, extension, app, or renderer
can turn that semantic source into a web-native visual page.

## Browser Vision

The long-term goal is for `.vmd` files to open in a browser the way `.html`
files do. Until browsers support VMD natively, this repository provides a
Chrome-based browser polyfill.

Current behavior:

- local `.vmd` files opened in Chrome can render automatically through the
  extension content script
- the extension popup also includes a manual viewer with upload and drag-and-drop
- the same source can render as read, deck, and map views

## Repository Contents

- `docs/quickstart.md`: fastest path from source to rendered output
- `docs/manifesto.md`: why this format should exist
- `docs/vision.md`: the maximum-state product and ecosystem vision
- `docs/adoption-playbook.md`: adoption path for AI-assisted creators
- `docs/ecosystem-research-and-adoption-plan.md`: lessons from Markdown and adjacent formats
- `docs/architecture.md`: source, AST, renderer, and extension architecture
- `docs/cli.md`: command-line rendering, AST, validation, and gallery workflow
- `docs/ast-schema.md`: draft JSON Schema for the semantic AST
- `docs/public-site-and-actions.md`: GitHub Pages and reusable render action
- `docs/language-design.md`: language direction and design principles
- `docs/spec-draft-v0.md`: first public grammar and AST draft
- `docs/project-readiness.md`: current readiness and known limitations
- `docs/project-audit.md`: end-to-end implementation and release audit
- `docs/ai-authoring-guide.md`: how to use VMD as an AI generation target
- `docs/browser-integration.md`: path from extension polyfill to browser-native support
- `docs/extension-architecture.md`: extension family design
- `docs/testing.md`: local and integration test workflow
- `docs/release.md`: release and packaging workflow
- `samples/family-platform.vmd`: sample VMD source
- `extension/`: reference Chrome polyfill and viewer
- `vscode-extension/`: VS Code authoring and preview extension
- `core/`: shared parser and renderer runtime
- `tools/render-html.mjs`: local renderer that converts a VMD file to static HTML
- `bin/vmd.mjs`: CLI for rendering, AST output, validation, and gallery builds
- `schemas/vmd-ast.schema.json`: draft AST JSON Schema

## Format Preview

```vmd
@doc "Document title" {
  format: deck
  theme: clean
}

# Main title

::frame[role="opening"]
  ::claim
  Core claim text.
  ::

  ::evidence
  Supporting evidence.
  ::
::
```

## Reference Browser Polyfill

The Chrome extension is a reference implementation, not the definition of the
format.

Automatic local file rendering:

1. Open `chrome://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select the `extension/` directory
5. Open the extension details page
6. Enable `Allow access to file URLs`
7. Open or drag a local `.vmd` file into Chrome

Manual viewer:

- opening a VMD viewer tab from the extension popup
- uploading a `.vmd` file
- dragging and dropping a `.vmd` file
- rendering read, deck, and map modes from the same source
- showing validator diagnostics for the loaded source
- loading the packaged sample document

Package the Chrome extension:

```bash
npm run package:chrome
```

The zip is written to:

```text
dist/vmd-chrome-extension.zip
```

## VS Code Extension

The VS Code extension is the authoring-side companion for VMD.

It supports:

- `.vmd` language detection
- syntax highlighting
- block folding
- semantic block snippets
- validator diagnostics
- `VMD: Open Preview`
- `VMD: Open Preview to Side`
- `Open With... VMD Preview`
- live preview updates from the active document

Package the extension:

```bash
npm run package:vscode
```

The VSIX is written to:

```text
dist/vmd-vscode.vsix
```

## Extension Tests

Run the shared checks:

```bash
npm run check
```

Run the Chrome extension integration test:

```bash
npm run test:chrome
```

Run the VS Code extension integration test:

```bash
npm run test:vscode
```

## Local Static Render

Requires Node.js 18 or newer.

```bash
npm run render:sample
```

The output is written to:

```text
dist/family-platform.html
```

## CLI

The reference CLI can render HTML, print the semantic AST, validate source, and
build the public gallery.

```bash
node bin/vmd.mjs validate samples/family-platform.vmd
node bin/vmd.mjs validate samples/family-platform.vmd --strict
node bin/vmd.mjs validate samples/family-platform.vmd --json
node bin/vmd.mjs ast samples/family-platform.vmd
node bin/vmd.mjs render samples/family-platform.vmd --out dist/family-platform.html --mode deck
node bin/vmd.mjs gallery --out dist/site
```

See `docs/cli.md`.

## Public Gallery

Build the static gallery and playground:

```bash
npm run build:site
```

The output is written to:

```text
dist/site/
```

The repository also includes a GitHub Pages workflow and a reusable local GitHub
Action for rendering `.vmd` files.

## Screenshots

![VMD gallery](docs/assets/vmd-gallery.png)

![VMD playground](docs/assets/vmd-playground.png)

## Draft Vocabulary

Semantic blocks:

- `frame`: one unit of thought
- `claim`: primary argument
- `evidence`: supporting proof or context
- `insight`: interpretation or discovery
- `decision`: selected direction
- `action`: next step

Visual blocks:

- `visual.compare`
- `visual.loop`
- `visual.timeline`

See `docs/spec-draft-v0.md` for the current draft.

## Samples

- `samples/family-platform.vmd`: strategy/deck example
- `samples/ai-native-brief.vmd`: AI-native visual document argument
- `samples/lesson-outline.vmd`: education/lesson example

## Current Status

VMD is pre-standard and experimental. The current goal is to stabilize:

1. the source grammar
2. the semantic AST
3. a small vocabulary of semantic and visual blocks
4. interoperable reference renderers

The important boundary is the semantic AST. VMD source should compile into a
structured representation before it becomes HTML, slides, PDF, or any other
output format.

## Contributing

The format should stay small, readable, and renderer-independent.

Good contributions include:

- sample `.vmd` documents
- proposed semantic block definitions
- parser and AST improvements
- renderer experiments
- theme systems
- accessibility and portability feedback
