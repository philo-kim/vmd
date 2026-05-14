# VMD Language Design

## Definition

VMD is a layered visual document language.

It lets a person or AI agent write a readable source file while choosing how
much fidelity the renderer must preserve:

```text
semantic meaning -> layout structure -> style tokens -> raw compatibility
```

The old one-line promise still matters:

```text
Write like Markdown. Structure like HTML. Render through a theme system like CSS.
```

But it is not sufficient for real design documents. A mature VMD file also
needs a controlled way to preserve existing HTML/CSS when exact browser
rendering matters.

## Design Position

VMD should not be a direct replacement for HTML, CSS, or Markdown.

It borrows a narrow strength from each:

- Markdown: readable source text
- HTML: explicit structure and native browser output
- CSS: reusable visual rules separated from content
- modern component systems: repeatable visual primitives

The language should make this stronger promise:

```text
If the author marks the intent and required fidelity of a visual document, the
renderer can choose between semantic rendering and exact preservation.
```

## Core Layers

### 1. Source Layer

The source must remain readable before rendering.

Good:

```vmd
::claim
The real market is not allowance management.
It is behavior change inside the family.
::
```

Avoid:

```html
<block type="claim" display="hero" weight="high">
  <content>The real market is not allowance management.</content>
</block>
```

### 2. Semantic Layer

Semantic blocks describe the role of the content.

Initial semantic blocks:

- `frame`: one unit of thought
- `claim`: primary argument
- `evidence`: supporting proof or context
- `insight`: interpretation or discovery
- `decision`: selected direction
- `action`: next step
- `observation`, `counterpoint`, `principle`, `risk`, `question`

These are not CSS classes. They are meaning-bearing document nodes.

### 3. Visual Pattern Layer

Visual blocks describe reusable thinking patterns:

- `visual.compare`: two-sided comparison
- `visual.loop`: repeated cycle
- `visual.timeline`: ordered sequence
- `visual.matrix`: two-axis decision space

### 4. Layout Layer

Layout blocks describe screen structure without forcing authors to write raw
HTML:

- `layout.stack`
- `layout.grid`
- `layout.split`
- `layout.cluster`
- `layout.panel`
- `layout.device`
- `layout.tabs`

This layer is the missing bridge between semantic VMD and high-fidelity design
documents. It lets VMD express things like grids, split views, phone mockups,
tabbed panels, and grouped components.

### 5. Component Layer

Components are named visual primitives:

- `component.card`
- `component.metric`
- `component.persona`
- `component.phone`
- `component.token-table`
- `component.browser`

The component layer keeps common design-document objects portable without
turning every document into raw HTML.

### 6. Style Layer

The preferred style layer is structured tokens:

```vmd
::style.tokens
accent: #0e7490 - primary action color
space-md: 16px - default layout gap
::
```

Trusted CSS can be used when a document requires more control:

```vmd
::style.css
.hero {
  display: grid;
}
::
```

### 7. Compatibility Layer

Raw blocks preserve browser-native source:

- `raw.html`
- `raw.css`
- `raw.svg`
- `raw.js`

The reference renderer renders HTML, CSS, and SVG. It parses but does not execute
JavaScript. This keeps VMD useful for high-fidelity import without making
script execution the default trust model.

## Fidelity Tiers

VMD documents should declare their target fidelity.

```vmd
@doc "Imported Design" {
  fidelity: preserve
}
```

| Tier | Target |
| --- | --- |
| `semantic` | roles, validation, read/deck/map output |
| `structured` | semantic roles plus layout and component primitives |
| `visual` | structured VMD plus tokens, CSS, SVG, and visual primitives |
| `preserve` | imported HTML/CSS with minimal renderer interference |
| `interactive` | future tier for trusted interaction models |

This solves the core ambiguity: a `.vmd` file can be an editable semantic
document or a high-fidelity preserved document, but it must say which target it
is optimizing for.

## Frame As The Base Unit

VMD should keep `frame` as the base unit for semantic documents.

A frame is not a page, slide, section, or card. It is one unit of thought.

The same frame can render differently:

- Read mode: document section
- Deck mode: slide
- Map mode: node
- Web mode: interactive section

For `fidelity: preserve`, frames become optional containers. The renderer should
avoid adding wrappers that would break imported CSS selectors.

## MVP Syntax

```vmd
@doc "Family Platform" {
  format: deck
  theme: clean
  audience: investor
  fidelity: structured
}

# A Family Platform For Behavior Change

::frame[role="opening"]
  ::claim
  Allowance management is not the end point.
  It is the starting point for self-directed behavior.
  ::
::

::frame[role="proof"]
  ::layout.grid[columns="2" gap="medium"]
    ::component.card[title="Existing apps"]
    Money flow, records, and parent control.
    ::

    ::component.card[title="New category"]
    Behavior loops, missions, trust, and growth.
    ::
  ::
::
```

## Preserve Syntax

```vmd
@doc "Imported HTML Page" {
  format: preserved-html
  fidelity: preserve
}

::raw.css
body { margin: 0; }
.page { min-height: 100vh; }
::

::raw.html
<main class="page">
  <h1>Existing browser page</h1>
</main>
::
```

This is intentionally less semantic. It exists because visual formats need a
lossless escape hatch before they can become practical migration targets.

## Semantic AST

The AST is the real product boundary.

Expected shape:

```json
{
  "doc": {
    "title": "Family Platform",
    "attrs": {
      "format": "deck",
      "theme": "clean",
      "fidelity": "structured"
    }
  },
  "children": [
    {
      "type": "frame",
      "attrs": {
        "role": "proof"
      },
      "children": [
        {
          "type": "layout.grid",
          "attrs": {
            "columns": "2",
            "gap": "medium"
          },
          "children": [
            {
              "type": "component.card",
              "attrs": {
                "title": "Existing apps"
              },
              "lines": [
                "Money flow, records, and parent control."
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

This lets later renderers target HTML, PDF, deck, SVG, or interactive web
without reparsing the source.

## Quality Checks Enabled By Semantics

Once blocks have roles, automated review becomes possible:

- claim exists but evidence is missing
- contrast exists but decision is missing
- opening frame does not match the declared audience
- problem frame has no transition into solution
- document requests `preserve` but includes executable script
- imported HTML relies on features not supported by the target renderer

This is where VMD becomes more than a visual renderer. It can become a system
for checking both the structure of thinking and the fidelity risk of a visual
artifact.

## Near-Term Roadmap

1. Stabilize the layered AST vocabulary.
2. Improve layout and component coverage with real design documents.
3. Keep semantic rendering small and readable.
4. Make `preserve` conversion measurable through screenshot diffing.
5. Add importers that choose between semantic, structured, visual, and preserve
   modes.
6. Add safe, explicit interaction rules before executing any script.
