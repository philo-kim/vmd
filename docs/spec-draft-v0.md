# VMD Draft Spec v0

This is an unstable public draft. It documents the current grammar and semantic
model used by the reference parser.

## File Extension

```text
.vmd
```

## Document Header

A VMD document may start with an `@doc` block.

```vmd
@doc "Family Platform Strategy" {
  format: deck
  theme: clean
  audience: investor
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

Semantic and visual blocks use double-colon fences.

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

## Attributes

Block attributes use bracket syntax.

```vmd
::frame[role="problem"]
...
::
```

The current parser supports quoted string attributes.

## Semantic Blocks

### `frame`

One unit of thought. A frame can become a section, slide, map node, or
interactive region.

```vmd
::frame[role="opening"]
...
::
```

### `claim`

Primary argument or assertion.

```vmd
::claim
The product should be understood as behavior infrastructure.
::
```

### `evidence`

Supporting proof, observation, or context.

```vmd
::evidence
Users do not only need records. They need confidence in what to do next.
::
```

### `insight`

Interpretation that changes how the reader sees the topic.

```vmd
::insight
The stronger market frame is not productivity. It is decision quality.
::
```

### `decision`

Chosen direction or conclusion.

```vmd
::decision
Position the product as a decision system.
::
```

### `action`

Next step.

```vmd
::action
Test this framing with three real user documents.
::
```

## Visual Blocks

Visual blocks declare a visual structure without hard-coding styling.

### `visual.compare`

Two-sided comparison.

```vmd
::visual.compare
left: Existing tools
right: VMD

- appearance first vs meaning first
- static output vs multi-mode rendering
::
```

### `visual.loop`

Repeated cycle.

```vmd
::visual.loop
Goal -> Action -> Feedback -> Improvement
::
```

### `visual.timeline`

Ordered sequence.

```vmd
::visual.timeline
- Define the grammar
- Stabilize the AST
- Build reference renderers
::
```

## AST Shape

Renderers should consume a semantic AST rather than raw source text.

Example:

```json
{
  "type": "document",
  "doc": {
    "title": "Family Platform Strategy",
    "attrs": {
      "format": "deck",
      "theme": "clean"
    }
  },
  "children": [
    {
      "type": "frame",
      "attrs": {
        "role": "opening"
      },
      "children": [
        {
          "type": "claim",
          "lines": [
            "Allowance management is not the end point."
          ]
        }
      ]
    }
  ]
}
```

## Renderer Rule

Renderers should treat semantic blocks as meaning, not fixed visual components.

For example, `claim` may become:

- a large statement in deck mode
- a highlighted paragraph in read mode
- a node label in map mode
- a callout in report mode

## Compatibility Goals

VMD should remain:

- readable in plain text
- easy to diff in Git
- parseable without a browser
- renderable to web-native output
- small enough for humans to write directly
