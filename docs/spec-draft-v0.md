# VMD Draft Spec v0

This is an unstable public draft. It documents the reference grammar, layered
AST model, and the current block vocabulary.

## File Extension

```text
.vmd
```

## Design Goal

VMD is no longer only a semantic document notation. It is a layered visual
document container:

```text
source -> layered AST -> renderer -> browser-native output
```

The format has to support two valid authoring goals:

- write an AI-friendly semantic document that can render into multiple modes
- preserve an existing HTML/CSS visual document with minimal or no visible drift

Those goals require different fidelity tiers.

## Fidelity Tiers

The `@doc` block may declare `fidelity`.

```vmd
@doc "Imported Design" {
  format: preserved-html
  fidelity: preserve
  html-lang: en
  body-class: imported-page
}
```

Current tiers:

| Tier | Use | Expected Output |
| --- | --- | --- |
| `semantic` | prose, reports, decks, briefs | semantic roles and multi-mode rendering |
| `structured` | visual docs with known layouts | layout blocks and components render predictably |
| `visual` | design-heavy docs | tokens, CSS, SVG, tables, and components are preserved where needed |
| `preserve` | existing HTML/CSS import | reference renderer avoids VMD wrappers and emits raw preserved output |
| `interactive` | scripted documents | reserved; raw JavaScript is parsed but not executed today |

If `fidelity: preserve` is set, the reference read renderer emits preserved raw
content directly instead of wrapping it in the normal VMD document shell. The
reference HTML renderer also uses document attributes to restore root-level
state:

- `html-lang`
- `html-dir`
- `body-class`
- `body-id`
- `body-style`
- `body-dir`
- `body-lang`
- `body-data-*`
- `body-aria-*`

## Document Header

A VMD document may start with an `@doc` block.

```vmd
@doc "Family Platform Brief" {
  format: deck
  theme: clean
  audience: investor
  fidelity: semantic
}
```

The quoted string is the document title. Key-value pairs inside the block become
document attributes.

## Markdown-Compatible Headings

VMD supports Markdown-style headings.

```vmd
# Main title
## Section title
```

## Block Syntax

Blocks use double-colon fences.

```vmd
::claim
This is a claim.
::
```

Blocks can nest.

```vmd
::frame[role="opening"]
  ::claim
  This is the opening claim.
  ::
::
```

Block attributes use bracket syntax with quoted values.

```vmd
::layout.grid[columns="2" gap="medium"]
...
::
```

## Layered Block Model

### Semantic Layer

Semantic blocks describe the role of the content.

- `frame`: one unit of thought
- `claim`: primary argument or assertion
- `evidence`: supporting proof, observation, or context
- `insight`: interpretation that changes how the reader sees the topic
- `decision`: chosen direction or conclusion
- `action`: next step
- `observation`: neutral finding
- `counterpoint`: objection or alternate reading
- `principle`: durable rule
- `risk`: known risk
- `question`: open question

### Visual Pattern Layer

Visual blocks declare thinking patterns without requiring hand-written layout.

- `visual.compare`
- `visual.loop`
- `visual.timeline`
- `visual.matrix`

Example:

```vmd
::visual.matrix[x="low control -> high control" y="low fidelity -> high fidelity"]
top-left: structured VMD
top-right: preserved HTML/CSS
bottom-left: Markdown-style prose
bottom-right: hand-authored HTML
::
```

### Layout Layer

Layout blocks give the renderer enough structure to preserve visual intent
without falling all the way down to raw HTML.

- `layout.stack`
- `layout.grid`
- `layout.split`
- `layout.cluster`
- `layout.panel`
- `layout.device`
- `layout.tabs`

Example:

```vmd
::layout.grid[columns="3" gap="medium"]
  ::component.metric[label="Level 1" value="Semantic"]
  ::

  ::component.metric[label="Level 2" value="Structured"]
  ::
::
```

### Component Layer

Components represent common visual document objects that are too specific for
plain semantics but too common to require raw HTML.

- `component.card`
- `component.metric`
- `component.persona`
- `component.phone`
- `component.token-table`
- `component.browser`

Example:

```vmd
::component.card[title="Preservation Layer"]
Raw HTML/CSS is allowed when a document has to preserve an existing browser
rendering.
::
```

### Style Layer

Style blocks carry design tokens or trusted CSS.

- `style.tokens`
- `style.css`

Example:

```vmd
::style.tokens
accent: #0e7490 - primary action color
space-md: 16px - default layout gap
::
```

`style.tokens` remains structured and renderer-friendly. `style.css` is a
compatibility escape hatch.

### Compatibility Layer

Raw blocks preserve existing browser-native source.

- `raw.html`
- `raw.css`
- `raw.svg`
- `raw.js`

`raw.html`, `raw.css`, and `raw.svg` are rendered by the reference renderer.
`raw.js` is parsed and displayed as disabled source; it is not executed.

Example:

```vmd
@doc "Preserved Page" {
  fidelity: preserve
  html-lang: en
  body-class: imported-page
}

::raw.css
body.imported-page { margin: 0; }
.hero { display: grid; min-height: 100vh; }
::

::raw.html
<main class="hero">
  <h1>Preserved HTML</h1>
</main>
::
```

This compatibility layer is necessary for high-fidelity import, but it is not
the preferred authoring layer for new VMD-native documents.

## AST Shape

Renderers should consume a layered AST rather than raw source text.

Example:

```json
{
  "type": "document",
  "doc": {
    "title": "Visual Fidelity Layers",
    "attrs": {
      "format": "report",
      "fidelity": "visual"
    }
  },
  "children": [
    {
      "type": "frame",
      "attrs": {
        "role": "fidelity-tiers"
      },
      "children": [
        {
          "type": "layout.grid",
          "attrs": {
            "columns": "4",
            "gap": "medium"
          },
          "children": [
            {
              "type": "component.metric",
              "attrs": {
                "label": "Level 1",
                "value": "Semantic"
              }
            }
          ]
        }
      ]
    }
  ]
}
```

The draft machine-readable schema is:

```text
schemas/vmd-ast.schema.json
```

The schema describes the AST shape. It does not freeze the final vocabulary.

## Validation

The reference validator reports diagnostics after parsing.

Warning examples:

- missing `@doc` title
- document without frames
- frame without content
- claim without evidence in the same frame
- unknown block type
- empty layout or raw block
- `raw.js` parsed but disabled
- sparse `visual.matrix`

Error examples:

- parse failure
- `visual.compare` without comparison rows
- `visual.loop` with fewer than two steps

The CLI exits with a non-zero code only for errors unless `--strict` is used:

```bash
node bin/vmd.mjs validate samples/family-platform.vmd
```

## Renderer Rule

Renderers should treat semantic blocks as meaning, layout blocks as structure,
style blocks as presentation input, and raw blocks as compatibility source.

The strongest renderer is allowed to preserve pixels when `fidelity: preserve`
is requested. A semantic renderer is allowed to ignore raw fidelity features if
its output target cannot support them, but it should surface diagnostics.

## Compatibility Goals

VMD should remain:

- readable in plain text
- easy to diff in Git
- parseable without a browser
- renderable to web-native output
- small enough for humans and AI agents to write directly
- capable of preserving existing browser-native visual documents when needed
