# VMD Draft Spec v0

This is an unstable public draft for VMD, an intent-readable
visual-lossless document format.

## Extension

```text
.vmd
```

## Definition

VMD stores two reading paths in one file:

```text
AI Source Layer
  intent, slots, components, tokens, constraints

Render Replay Layer
  lock, recipes, replay stream, residual, raw fallback
```

The source layer exists so AI systems can understand and edit the document with
less context than full HTML/CSS. The replay layer exists so the renderer can
restore the original visual output.

## Validity Rule

`fidelity: visual-lossless` is a strict claim.

A visual-lossless VMD file is valid only when the declared renderer can restore
the target visual output under the declared lock. If source slots and recipes
are not enough, the file must include enough `@replay`, `@residual`, or `@raw`
data to pass restoration verification.

The format optimizes this order:

1. Complete visual restoration
2. LLM-safe understanding and editing
3. Compression of the AI-facing source layer

Visual-lossless is source-state specific. It guarantees restoration for the
source hash and render lock in the file. After an AI modifies source slots,
existing replay and residual data may be stale until the renderer recalculates
the affected areas and updates the lock.

## Document Contract

```vmd
@doc "Document title" {
  spec: vmd@0.1
  fidelity: visual-lossless
  intent: analytics-dashboard
  surfaces: browser-page deck pdf
}
```

`@doc` attributes are document-level contract fields. The current reference
parser stores unknown keys so future renderers can use them.

Recommended keys:

| Key | Meaning |
| --- | --- |
| `spec` | VMD grammar version |
| `fidelity` | restoration tier |
| `intent` | coarse document purpose |
| `surfaces` | expected outputs |
| `html-lang`, `html-dir` | root HTML restoration attributes |
| `body-class`, `body-id`, `body-style` | body restoration attributes |
| `body-data-*`, `body-aria-*` | safe root state restoration attributes |

## Fidelity Tiers

| Tier | Meaning |
| --- | --- |
| `semantic` | meaning-first VMD that may render differently across themes |
| `structured` | semantic source with layout and component primitives |
| `visual` | visual source with tokens, CSS, SVG, and richer components |
| `visual-lossless` | source plus replay data that must restore the target visual output |
| `preserve` | legacy raw HTML/CSS preservation path |
| `interactive` | reserved; raw JavaScript is parsed but not executed today |

`preserve` remains for compatibility with the current reference renderer. The
target standard is `visual-lossless`, where raw fallback is only one possible
part of the replay layer.

## Render Lock

`@lock` declares the environment that makes restoration testable.

```vmd
@lock {
  renderer: vmd-web@0.3.0
  renderer-hash: sha256:...
  dictionary: dashboard-system@1.0.0
  dictionary-hash: sha256:...
  browser: chromium
  viewport: 1440x1200
  dpr: 1
  font-pack: inter@4.0.0
  asset-map-hash: sha256:...
  source-hash: sha256:...
  render-hash: sha256:...
}
```

The lock is not decoration. It is the contract used to decide whether visual
restoration succeeded.

## Intent Layer

`::intent` tells AI systems why the document exists and what may be edited.

```vmd
::intent
audience: growth team
purpose: scan revenue, accounts, and recent events quickly
editable: title, metrics, tables, events, date range
::
```

## Edit State

`@edit_state` records whether the editable source layer and renderer replay
layer are synchronized.

```vmd
@edit_state {
  source: clean
  replay: current
  dirty: none
  on-source-edit: mark affected slots stale, rerender, remeasure, update-render-hash
}
```

After an AI edit, the source may be valid while the old replay is stale:

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

For short patches, `@dirty` can list invalidated slots or hashes:

```vmd
@dirty {
  frame.dashboard-overview.title
  render-hash
}
```

A modified document should not claim refreshed visual-lossless status until the
renderer updates replay/residual/hash data and the restoration check passes
again.

## Token Layer

`@tokens` stores renderer-readable design tokens. The default block is allowed,
but visual-lossless documents should separate AI-editable tokens from
render-critical locked tokens when that distinction affects replay validity.

```vmd
@tokens.editable {
  accent: #c96442
  surface: #ffffff
}

@tokens.locked {
  border: #e6e4e0
  title.line-height: 1.05
  grid.gap: 24px
}
```

Tokens should be edited by AI only when the user is changing visual style.
Render-critical tokens should be locked or listed in `@residual_index` so AI
edits do not silently invalidate replay data.

Inline annotations are a compact equivalent when a single block is easier to
author:

```vmd
@tokens {
  accent: #c96442 [editable]
  title.line-height: 1.05 [locked]
}
```

## Recipe Layer

`@recipes` maps source slots to shared renderer recipes.

```vmd
@recipes {
  workspace: analytics.workspace
  metric-grid: analytics.metric-grid
  account-table: analytics.table.compact
}
```

Recipes are how repeated visual patterns become short source instead of
repeated HTML/CSS.

## Frame And Block Syntax

VMD keeps Markdown headings and double-colon blocks.

```vmd
# Main title

::frame[role="dashboard-overview" recipe="analytics.workspace"]
  title: Overview - April 2026

  ::component.card[title="Revenue - 30 days"]
  value: $842k
  change: +14.6%
  ::
::
```

Blocks can nest. Attributes use bracket syntax with quoted values.

## AI-Readable Blocks

### Semantic Blocks

- `intent`
- `claim`
- `evidence`
- `insight`
- `decision`
- `action`
- `observation`
- `counterpoint`
- `principle`
- `risk`
- `question`

### Visual Pattern Blocks

- `visual.compare`
- `visual.loop`
- `visual.timeline`
- `visual.matrix`

### Layout Blocks

- `layout.stack`
- `layout.grid`
- `layout.split`
- `layout.cluster`
- `layout.panel`
- `layout.device`
- `layout.tabs`

### Component Blocks

- `component.card`
- `component.metric`
- `component.persona`
- `component.phone`
- `component.token-table`
- `component.browser`

## Residual Index

`@residual_index` is the bridge between AI editing and lossless replay. The AI
does not need to read the full residual payload, but it must know which slots
are constrained by replay data.

```vmd
@residual_index {
  affected:
    - frame.dashboard-overview.title
    - frame.dashboard-overview.component.metric-grid

  constraints:
    frame.dashboard-overview.title.max-lines: 2
    frame.dashboard-overview.component.metric-grid.items: 2..4

  ai-note: Edit source slots only. Do not edit replay data directly.
}
```

A visual-lossless document should include `@residual_index` whenever residual
or raw replay data can be invalidated by source edits.

`@residual_index` is not just a summary. It is an edit guardrail. A mature
converter should describe why a slot is residual-bound, which edits are safe,
and what recalculation is required on change.

```vmd
@residual_index {
  affected:
    frame.dashboard-overview.title:
      reason: measured-text-box
      safe-edit: text-within-42-chars
      unsafe-edit: multiline-expansion
      on-change: remeasure
}
```

## Replay And Residual

`@replay` declares the replay codec.

```vmd
@replay {
  encoding: visual-replay@0.1
  contains:
    - dom-delta
    - css-cascade
    - layout-boxes
    - asset-map
    - state-lock
}
```

`@residual` stores restoration data that should not be directly edited by AI.

```vmd
@residual {
  mode: visual-lossless
  ai: ignore
  encoding: dom-delta@0.1
  payload: ...
}
```

`@raw` is the fallback when compact replay cannot yet represent the source.

```vmd
@raw {
  mode: fallback
  ai: ignore
  payload: ...
}
```

## Raw Compatibility Blocks

The reference renderer also supports legacy raw blocks:

- `raw.html`
- `raw.css`
- `raw.svg`
- `raw.js`
- `style.css`
- `style.tokens`

Raw JavaScript is parsed but not executed by the reference renderer. Raw
HTML/SVG sanitizes executable surfaces such as `<script>`, inline event
handlers, and `javascript:` URLs.

## Restoration Verification

A visual-lossless implementation should verify:

- renderer and dictionary match the `@lock`
- viewport and browser match the `@lock`
- external assets are available or embedded
- restored DOM/style/layout produces pixel-equivalent output
- source edit constraints in `@residual_index` are respected
- hashes or render signatures match the expected output where provided
- after source edits, dirty slots are identified and replay/residual/hash data
  is regenerated before visual-lossless status is restored

Reference thresholds are documented in `docs/visual-fidelity.md`.

## Renderer Behavior

Renderers should treat:

- semantic blocks as meaning
- frame/component blocks as editable source slots
- token blocks as controlled style inputs
- lock/replay/residual/raw blocks as restoration data
- residual index as AI-visible edit constraints

A semantic renderer may ignore replay data. A visual-lossless renderer may not.
