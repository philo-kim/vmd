# VMD

VMD is an open draft for a semantic visual document format.

The web has languages for structure, style, and behavior. VMD explores a missing
layer: a portable way to describe the role of an idea so the same source can
become a document, deck, map, report, or interactive page.

This repository is public because VMD should grow as a shared format, not a
closed app feature.

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

## Repository Contents

- `docs/manifesto.md`: why this format should exist
- `docs/language-design.md`: language direction and design principles
- `docs/spec-draft-v0.md`: first public grammar and AST draft
- `samples/family-platform.vmd`: sample VMD source
- `extension/`: reference Chrome viewer
- `tools/render-html.mjs`: local renderer that converts a VMD file to static HTML

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

## Reference Viewer

The Chrome viewer is a reference implementation, not the definition of the
format.

It supports:

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
