# Language Design

VMD borrows useful ideas from Markdown, HTML, and CSS, but its purpose is
different: complete visual restoration with a compact AI-editable source layer.

## What VMD Takes From Existing Languages

Markdown contributes:

- readable plain text
- simple headings
- low authoring friction

HTML contributes:

- structured document roles
- nested elements
- browser output as the final target

CSS contributes:

- reusable visual systems
- tokens and cascaded style responsibility
- separation of content from presentation

VMD adds:

- intent and editable slots
- renderer lock
- residual index
- edit state and dirty markers
- replay and residual layers for complete restoration

## Syntax Surfaces

VMD uses three surface forms.

### Document Contract

```vmd
@doc "Title" {
  spec: vmd@0.1
  fidelity: visual-lossless
  intent: dashboard
}
```

### Directive Blocks

```vmd
@lock {
  renderer: vmd-web@0.3.0
  browser: chromium
  viewport: 1440x1200
}
```

Directives are renderer or AI contract blocks.

Edit state is also a directive:

```vmd
@edit_state {
  source: clean
  replay: current
  dirty: none
}
```

### Content Blocks

```vmd
::frame[role="overview"]
  ::component.card[title="Revenue"]
  value: $842k
  ::
::
```

Content blocks are the AI-editable source structure.

## Why `@residual_index` Exists

Lossless replay data can be too large or too low-level for an LLM to read on
every edit. Hiding it completely is unsafe because the AI may break the replay
constraints.

`@residual_index` gives a compact summary:

```vmd
@residual_index {
  affected:
    - frame.overview.title
  constraints:
    frame.overview.title.max-lines: 2
  ai-note: Edit source slots only.
}
```

The model reads the index, not the residual payload.

## Compactness Strategy

VMD should not compress by inventing unreadable abbreviations as the primary
format. It should compress by moving repeated visual implementation detail into:

- shared renderer dictionaries
- recipes
- tokens
- edit-state dirty markers
- replay deltas
- residual streams

The AI-facing source stays readable. The renderer-facing replay can be encoded
more compactly later without changing the source semantics.

## Fidelity Tiers

The reference vocabulary still contains `semantic`, `structured`, `visual`,
`preserve`, and `interactive` for compatibility, but the strategic target is:

```vmd
fidelity: visual-lossless
```

That tier means the document has enough source, lock, replay, residual, or raw
data to restore the visual output.

## Design Constraint

If the language is compact but cannot restore the output, it fails.

If it restores the output but forces the AI to read and rewrite full HTML/CSS,
it also fails.

The design target is the smallest restorable representation that still exposes
clear intent, slots, tokens, and constraints to the AI.
