# AST Schema

VMD source is the authoring syntax. The AST is the shared contract between the
AI-readable source layer and the renderer-readable replay layer.

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
- conversion tools

The schema is intentionally permissive in v0. It defines the document and node
shape without freezing every additional block type.

## Current Top-Level Shape

```json
{
  "type": "document",
  "doc": {
    "title": "Pulse Analytics Overview",
    "attrs": {
      "spec": "vmd@0.1",
      "fidelity": "visual-lossless",
      "intent": "analytics-dashboard"
    }
  },
  "children": []
}
```

## Node Shape

Every block node can carry:

- `type`: directive, semantic, visual, layout, style, raw, or component type,
  such as `lock`, `edit_state`, `frame`, `intent`, `visual.compare`, or
  `layout.grid`
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
- validator: `visual-lossless` should include lock, replay, residual index, and
  edit-state handling

This split keeps the schema stable while allowing the authoring rules to evolve.
