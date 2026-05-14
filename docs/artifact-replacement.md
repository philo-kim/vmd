# Artifact Replacement Scope

VMD should not be judged as a Markdown variant or an HTML shorthand.

The target is the editable source behind visual artifacts that are usually
trapped inside one output format:

- presentation decks
- PDF reports
- design handoff files
- generated HTML pages
- visual research maps
- dashboards

The goal is not to remove those outputs. They remain useful delivery surfaces.
The goal is to stop treating final output files as the only source of truth.

## Replacement Claim

VMD should replace the fragile editable source layer, not every final artifact.

```text
VMD source + replay
  -> browser page
  -> deck
  -> PDF
  -> design handoff
```

The browser page, deck, and PDF can still exist. The `.vmd` file should contain
the source and restoration contract that generated them.

## Why Existing Artifacts Are Hard For AI

Presentation files, PDFs, design files, and generated HTML encode a lot of
visual state. That is useful for display but awkward for AI revision.

The model has to infer:

- what can be edited
- what is locked visual state
- what text affects measured layout
- what token changes are safe
- what component changes require relayout
- what raw data exists only for restoration

VMD makes those boundaries explicit.

## Visual-Lossless Replacement

A serious VMD artifact should be able to say:

```vmd
@doc "Visual Decision Room" {
  spec: vmd@0.1
  fidelity: visual-lossless
  surfaces: browser-page deck pdf design-handoff
}
```

That means the file must include:

- source slots for AI edits
- tokens and recipes for reusable visual structure
- residual index constraints for safe editing
- lock/replay/residual/raw data for restoration
- edit state or dirty markers after changes

## Open Design Benchmark

AI-generated HTML design artifacts are a useful stress case because they already
show the target pressure: polished visual output, large implementation surface,
and difficult repeated AI edits.

VMD should handle them by:

- extracting a compact AI source layer
- mapping repeated patterns into recipes and tokens
- preserving the remaining details through replay/residual/raw data
- marking stale replay after source edits
- rerunning visual verification before claiming lossless status

## What Good Looks Like

A strong VMD example should feel like a real visual artifact after rendering and
still remain readable as source.

It should carry:

- intent and editable slots
- component and layout structure
- visual patterns
- editable and locked tokens
- residual-aware edit constraints
- replay data for complete restoration
- dirty-state handling after edits
