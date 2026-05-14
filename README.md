# VMD

VMD is an open draft for **Intent-Readable Visual-Lossless Markup**.

The goal is not to make Markdown prettier. The goal is to make visual documents
small and safe for AI to read and edit, while still giving the browser enough
information to restore the original visual output.

```text
HTML/CSS artifact
  -> visual-lossless VMD
     -> AI-readable source layer
     -> renderer-readable replay layer
  -> restored browser output
```

## Non-Negotiable Rule

A document may call itself `visual-lossless` only if the renderer can restore
the target visual output under the declared lock.

Compression is useful only after that condition is met. If a structured source
layer is not enough, the VMD file must carry replay, residual, or raw fallback
data until restoration passes.

The optimization target is:

```text
the smallest complete-restoration format that an LLM can still understand and edit safely
```

That gives VMD three priorities:

1. Complete visual restoration
2. LLM-readable and LLM-editable structure
3. Compression of the AI-facing source layer

## Core Model

VMD has two reading paths inside one `.vmd` file.

### AI Source Layer

This is the part an AI model should read and edit:

- `@doc`: document contract and fidelity tier
- `::intent`: audience, purpose, editable slots, non-editable constraints
- `@tokens`: design tokens that affect the document
- `::frame` and component blocks: the editable visible structure
- `@residual_index`: the replay constraints the AI must respect
- `@edit_state` or `@dirty`: whether source edits have invalidated replay data

### Render Replay Layer

This is the part the renderer uses to restore the original browser output:

- `@lock`: renderer, dictionary, browser, viewport, source hash, render hash
- `@recipes`: known component and layout recipes
- `@replay`: encoded DOM, CSS, layout, asset, and state replay contract
- `@residual`: lossless data not represented by source slots
- `@raw`: fallback source when replay cannot be compacted yet

AI systems should not edit `@residual` or `@raw` directly. They should edit the
source slots and respect `@residual_index`.

Visual-lossless restoration is guaranteed for the locked source state, not for
arbitrary future edits. After an AI changes the source layer, affected replay or
residual data may be stale. The document must mark the affected slots dirty and
the renderer must rerender, remeasure, regenerate replay/residual data, and
update hashes before the edited document can claim visual-lossless status again.

## Format Preview

```vmd
@doc "Pulse Analytics Overview" {
  spec: vmd@0.1
  fidelity: visual-lossless
  intent: analytics-dashboard
  surfaces: browser-page deck pdf
}

@lock {
  renderer: vmd-web@0.3.0
  renderer-hash: sha256:renderer-placeholder
  dictionary: dashboard-system@1.0.0
  dictionary-hash: sha256:dictionary-placeholder
  browser: chromium
  viewport: 1440x1200
  dpr: 1
  font-pack: inter@4.0.0
  asset-map-hash: sha256:asset-placeholder
  source-hash: sha256:source-placeholder
  render-hash: sha256:render-placeholder
}

@edit_state {
  source: clean
  replay: current
  dirty: none
  on-source-edit: mark affected slots stale, rerender, remeasure, update-render-hash
}

# Pulse Analytics Overview

::intent
audience: growth team
purpose: scan revenue, accounts, and recent events quickly
editable: title, metrics, tables, events, date range
::

@tokens {
  accent: #c96442
  surface: #ffffff
  border: #e6e4e0
}

::frame[role="dashboard-overview" recipe="analytics.workspace"]
  title: Overview - April 2026

  ::component.card[title="Revenue - 30 days"]
  value: $842k
  change: +14.6%
  ::

  ::component.card[title="New accounts"]
  value: 42
  change: +8
  ::
::

@residual_index {
  affected:
    - frame.dashboard-overview.title
    - frame.dashboard-overview.component.metric-grid

  constraints:
    frame.dashboard-overview.title.max-lines: 2
    frame.dashboard-overview.component.metric-grid.items: 2..4

  ai-note: Edit source slots only. Do not edit replay data directly.
}

@replay {
  encoding: visual-replay@0.1
  contains:
    - dom-delta
    - css-cascade
    - layout-boxes
    - asset-map
    - state-lock
}

@residual {
  mode: visual-lossless
  ai: ignore
  payload: omitted in this public sample
}
```

## Why Not Just HTML?

HTML and CSS are excellent browser targets. They are not always good AI editing
targets. A polished generated page often contains a large implementation surface:
utility classes, nested wrappers, repeated styles, inline layout decisions, and
component details that obscure the document's intent.

VMD keeps the browser output restorable, but moves routine AI edits to a smaller
source layer. The renderer and replay layer carry the low-level details.

## Why Not Just Markdown?

Markdown is compact and readable, but it does not contain enough visual contract
to restore a complex browser page. VMD keeps Markdown-style readability where it
helps, then adds frames, components, tokens, constraints, and replay data.

## Current Research Baseline

The current Open Design experiment is a prototype, not the finished codec.

- Cases: 102 AI-generated HTML artifacts
- Original HTML: 3031.8 KB
- AI source slot layer: 485.7 KB, 84.0% smaller than HTML
- Full prototype VMD with replay/residual: 1527.3 KB, 49.6% smaller than HTML
- GPT-4 token estimate: slot source reduced 83.2%; full prototype reduced 39.5%
- Current prototype round-trip pixel-equivalent cases: 46/102

The result is important but limited: the AI-facing layer is already much smaller,
but the lossless replay codec is not complete. The public spec therefore treats
complete restoration as a validity requirement, not as a nice-to-have.

The same benchmark also clarifies the edit rule: a file can be lossless at the
current source hash and stale after an AI edit. Editability therefore requires
dirty-state tracking and replay refresh, not only initial decoding.

See `docs/open-design-ai-artifact-benchmark.md` and
`docs/visual-fidelity.md`.

## Repository Contents

- `core/`: shared parser, validator, and reference renderer
- `extension/`: Chrome reference polyfill and manual viewer
- `vscode-extension/`: VS Code authoring and preview extension
- `samples/visual-lossless-dashboard.vmd`: visual-lossless sample
- `samples/source-layer-brief.vmd`: compact source-layer sample
- `docs/spec-draft-v0.md`: current draft grammar and restoration contract
- `docs/visual-fidelity.md`: visual restoration verification model
- `docs/open-design-ai-artifact-benchmark.md`: AI artifact compression and fidelity benchmark
- `docs/ai-authoring-guide.md`: how AI systems should edit VMD
- `docs/browser-integration.md`: Chrome rendering behavior
- `docs/extension-architecture.md`: extension design
- `docs/testing.md`: local verification workflow
- `tools/verify-vmd-fidelity.mjs`: Playwright visual drift checker
- `tools/benchmark-ai-artifacts.mjs`: Open Design benchmark script
- `bin/vmd.mjs`: CLI for validate, AST, render, and gallery builds

## Install And Check

Requires Node.js 18 or newer.

```bash
npm install
npm run check
```

Run the core renderer tests:

```bash
npm run test:core
```

Render a sample:

```bash
npm run render:sample
```

Validate a VMD file:

```bash
node bin/vmd.mjs validate samples/visual-lossless-dashboard.vmd --strict
```

## Chrome Extension

The Chrome extension is a reference polyfill for `.vmd` files.

It supports:

- automatic rendering for local or hosted `.vmd` files
- a manual viewer with upload and drag-and-drop
- read, deck, and map preview modes
- validator diagnostics
- packaged source-layer, layered, and visual-lossless samples

Install locally:

1. Open `chrome://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select the `extension/` directory
5. Enable `Allow access to file URLs` in the extension details page
6. Open a `.vmd` file in Chrome

Package it:

```bash
npm run package:chrome
```

## VS Code Extension

The VS Code extension supports:

- `.vmd` language detection
- syntax highlighting and folding
- visual-lossless shell snippets
- directive snippets for `@lock`, `@tokens`, `@residual_index`, `@replay`, and `@residual`
- validator diagnostics
- live preview with read, deck, and map modes

Package it:

```bash
npm run package:vscode
```

## Public Page

The public project page is:

```text
https://philo.kim/vmd/
```

Build the repository gallery:

```bash
npm run build:site
```

## Status

VMD is an experimental public draft. The current implementation parses and
renders the final visual-lossless document contract, but the replay codec is
still a research target. Until the replay codec is complete, a file should only
claim verified visual-lossless status when its restoration check passes under
the declared renderer lock.

## Contributing

Useful contributions include:

- visual-lossless sample documents
- HTML-to-VMD conversion experiments
- replay/residual codec design
- renderer lock and verification improvements
- LLM editability benchmarks
- Chrome and VS Code extension improvements
- accessibility and browser portability feedback
