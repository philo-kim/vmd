# VMD

VMD is a draft language and viewer for semantic visual documents.

The goal is not to mix Markdown, HTML, and CSS directly. The goal is to keep
Markdown-like writing, add semantic structure, and render the same source into
readable, deck-like, and map-like visual formats.

## Core Idea

```text
Write like Markdown.
Structure like HTML.
Render through a theme system like CSS.
```

VMD marks the role of an idea instead of the final visual decoration:

```vmd
::claim
This product is not an allowance tracker.
It is a family behavior-change system.
::
```

That semantic block can become a section in read mode, a slide in deck mode, or
a node in map mode.

## Repository Contents

- `docs/language-design.md`: language direction, principles, and MVP grammar
- `docs/chrome-extension-review.md`: feasibility review for the Chrome extension
- `samples/family-platform.vmd`: sample VMD source
- `extension/`: Manifest V3 Chrome extension prototype
- `tools/render-html.mjs`: local renderer that converts a VMD file to static HTML

## Chrome Extension Prototype

The extension supports:

- opening a VMD viewer tab from the extension popup
- uploading a `.vmd` file
- dragging and dropping a `.vmd` file
- rendering read, deck, and map modes from the same source
- loading the packaged sample document

To try it locally:

1. Open `chrome://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select the `extension/` directory
5. Click the VMD extension icon and open the viewer

## Local Static Render

Requires Node.js 18 or newer.

```bash
npm run render:sample
```

The output is written to:

```text
dist/family-platform.html
```

## MVP Grammar

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

Initial semantic blocks:

- `frame`
- `claim`
- `evidence`
- `insight`
- `decision`
- `action`

Initial visual blocks:

- `visual.compare`
- `visual.loop`
- `visual.timeline`

## Current Status

This is an early language and viewer prototype. The important boundary is the
semantic AST: VMD source should compile into a structured representation before
it becomes HTML, slides, PDF, or any other output format.
