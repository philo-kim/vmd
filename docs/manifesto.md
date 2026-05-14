# VMD Manifesto

## The Missing Layer

The web already has strong primitives:

- HTML for browser structure
- CSS for presentation
- JavaScript for behavior
- Markdown for readable writing

What is missing is a visual document source that is both AI-editable and
restorable.

Generated HTML can look good in a browser, but it mixes content, structure,
style, state, layout, and exceptions into one implementation surface. That is
too noisy for repeated AI editing.

Markdown is easy to read, but it cannot restore a complex visual page.

VMD exists between those two constraints.

```text
AI edits intent and slots.
Renderer restores browser output from replay data.
```

## The Core Claim

VMD is not shorter HTML and it is not prettier Markdown.

VMD is a visual document container with two paths:

- an AI-readable source layer
- a renderer-readable replay layer

The source layer contains intent, tokens, frames, components, and constraints.
The replay layer contains lock, recipes, residual, raw fallback, and hashes.

## Lossless Means Locked

`fidelity: visual-lossless` is a strict claim. It means the renderer can restore
the target browser output under fixed conditions:

- renderer version
- dictionary version
- browser engine
- viewport
- device pixel ratio
- fonts
- assets
- source hash
- render hash

If those conditions are not fixed, lossless is not a meaningful claim.

## Editing Changes The Contract

Visual-lossless restoration is true for the current source state. After an AI
edits the source layer, replay and residual data may become stale.

That is why VMD needs edit-state tracking:

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

The edited document becomes visual-lossless again only after the renderer
refreshes replay/residual/hash data and verification passes.

## Why This Matters For AI

The economic value of VMD is not only full file compression. The real gain is
AI-facing context compression.

The model should not need to read every CSS rule, wrapper, computed layout box,
and fallback payload to change a title or update a metric. It should read the
source layer and the residual index, then let the renderer refresh the replay
layer.

## What VMD Is For

VMD targets visual artifacts that are currently trapped in one-off outputs:

- generated HTML pages
- presentation decks
- PDF reports
- design handoff files
- visual research maps
- dashboards and briefings

Those outputs can remain delivery surfaces. VMD should become the durable source
that AI and renderers can both understand.
