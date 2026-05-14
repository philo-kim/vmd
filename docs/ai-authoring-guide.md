# AI Authoring Guide

VMD is designed so an AI model edits the small source layer, not the full
browser implementation layer.

## Editing Rule

For `fidelity: visual-lossless`, AI should edit only:

- `::intent`
- `@tokens`
- `::frame`
- component, layout, visual, and semantic blocks

AI should read but not edit:

- `@residual_index`
- `@edit_state`
- `@dirty`

AI should not directly edit:

- `@lock`
- `@replay`
- `@residual`
- `@raw`

Those replay blocks are renderer-owned. If an edit changes the visual structure,
the converter or renderer must regenerate replay data and run restoration
verification.

## Required Mental Model

```text
Source slots are editable.
Replay data restores pixels.
Residual index tells the model which edits are safe.
Edit state tells the model whether replay is current or stale.
```

Do not treat VMD as shorter HTML. Treat it as a document contract with an
editable source layer and a lossless replay layer.

## Recommended Prompt Shape

When asking an AI to edit VMD, provide:

```text
You are editing VMD.
Only edit AI source layer fields: intent, tokens, frames, components, visible text.
Do not edit @lock, @replay, @residual, or @raw.
Read @residual_index and @edit_state. Respect every affected slot constraint.
If you change a constrained slot, mark it dirty or leave replay as stale.
Preserve complete visual restoration as a requirement.
Return the edited VMD source only.
```

## Common Edits

### Text Edit

Safe when the replacement respects length, line, and slot constraints.
If the edited slot appears in `@residual_index`, mark it dirty unless the
renderer is regenerating replay immediately.

### Metric Or Table Edit

Safe when the new item count stays inside `@residual_index` constraints.

### Token Edit

Safe when the user intends a style change. After editing tokens, rerun visual
verification because color, contrast, line breaking, and overflow may change.

### Layout Edit

Higher risk. If a frame recipe, component count, or table shape changes, replay
must be regenerated.

## Dirty State After Edits

When the model changes a source slot that can affect replay, it should not
pretend the existing `render-hash` still proves the document.

Use `@edit_state`:

```vmd
@edit_state {
  source: modified
  replay: partially-stale
  affected:
    - frame.dashboard-overview.title
  required:
    - rerender
    - remeasure
    - update-render-hash
}
```

Or use short dirty markers:

```vmd
@dirty {
  frame.dashboard-overview.title
  render-hash
}
```

The renderer must clear the dirty state only after regenerating replay/residual
data and passing visual restoration verification.

## LLM Evaluation

VMD should be evaluated by:

- whether the model understands the document purpose
- whether it identifies editable slots
- whether it respects residual constraints
- whether it avoids replay payload edits
- whether it marks stale replay after edits
- whether the post-edit renderer can regenerate a passing visual-lossless file

The metric is not only source size. The metric is:

```text
minimum token cost per correct, restorable visual edit
```
