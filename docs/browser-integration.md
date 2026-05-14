# Browser Integration

Browsers do not currently render `.vmd` natively. This repository provides a
Chrome extension as a reference polyfill.

## Target Behavior

When a user opens a `.vmd` file, the browser integration should:

1. read the VMD source
2. parse the document contract
3. render the AI source layer for preview and editing
4. use the replay layer when restoration is required
5. show diagnostics when a document claims `visual-lossless` but lacks lock,
   replay, residual, residual-index, or edit-state data

## Current Chrome Polyfill

The current extension supports:

- automatic rendering of local and hosted `.vmd` files
- manual upload and drag-and-drop viewer
- read, deck, and map preview modes
- diagnostics from the shared validator
- packaged visual-lossless sample loading

The extension is a polyfill, not the standard. The standard is the file contract
described in `docs/spec-draft-v0.md`.

## Visual-Lossless Handling

For a visual-lossless document, the viewer surfaces:

- declared fidelity tier
- number of frames and components
- presence of `@lock`, `@replay`, `@residual`, and `@raw`
- presence of `@residual_index`
- source/replay freshness from `@edit_state` or `@dirty`

The current reference renderer does not yet implement the final replay codec.
Until that codec is complete, visual-lossless status must be proven by the
verification tools, not by extension display alone.

## Legacy Preserve Handling

The extension still supports `fidelity: preserve` for compatibility. Preserve
documents bypass the VMD toolbar and normal extension CSS so raw HTML/CSS can be
shown with minimal interference.

This is a compatibility path. The target format is `fidelity: visual-lossless`.
