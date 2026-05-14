# AST Schema

VMD source is not the long-term contract. The layered AST is.

The draft JSON Schema lives at:

```text
schemas/vmd-ast.schema.json
```

## Why The Schema Exists

The schema gives implementers a shared shape for:

- validators
- alternate renderers
- editor integrations
- AI generation checks
- conformance fixtures
- future conversion tools

The schema is intentionally permissive in v0. It defines the document and node
shape without freezing every future block type.

## Current Top-Level Shape

```json
{
  "type": "document",
  "doc": {
    "title": "Family Platform Strategy",
    "attrs": {
      "format": "deck",
      "theme": "clean",
      "audience": "investor",
      "fidelity": "semantic"
    }
  },
  "children": []
}
```

## Node Shape

Every block node can carry:

- `type`: semantic, visual, layout, style, raw, or component type, such as
  `frame`, `claim`, `visual.compare`, or `layout.grid`
- `tag`: source tag before variant expansion
- `variant`: optional variant after the dot
- `attrs`: quoted inline attributes
- `lines`: text payload
- `children`: nested nodes
- `line`: one-based source line for diagnostics

Headings are represented as:

```json
{
  "type": "heading",
  "level": 1,
  "text": "Main title",
  "line": 6
}
```

## Validation Boundary

The schema checks shape. The runtime validator checks semantic and visual
authoring quality.

Examples:

- schema: `doc.title` should be a string
- validator: a `frame` should include a role
- validator: `visual.loop` should include at least two steps

This split keeps the schema stable while allowing the authoring rules to evolve.
