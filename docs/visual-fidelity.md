# Visual Fidelity And Restoration

VMD's final target is complete visual restoration with a smaller AI-readable
editing surface.

That means visual fidelity is not an optional publishing feature. It is the
condition that allows a file to claim:

```vmd
fidelity: visual-lossless
```

## What Complete Restoration Means

Complete restoration means the renderer can reproduce the target browser output
under the declared lock.

The lock must include at least:

- renderer version
- dictionary or recipe package version
- browser engine
- viewport
- source and render hashes where available
- required asset map or embedded assets

If the restored output drifts, the VMD file is not visual-lossless yet. The
converter must add or expand `@replay`, `@residual`, or `@raw` until the check
passes.

## Edit-Time Staleness

Visual-lossless status is tied to the current source hash. If an AI changes the
source layer, the old replay and residual data may no longer match.

```text
before edit:
  source + replay = restored output

after edit:
  source changed
  replay/residual may be stale

after renderer refresh:
  source + updated replay = restored edited output
```

The file should record that transition:

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

Until the affected replay/residual/hash data is regenerated and verification
passes again, the edited file is not a refreshed visual-lossless artifact.

## Why Compression Still Works

The AI does not need to read all replay bytes during normal editing.

```text
AI reads:
  @doc, ::intent, @tokens, frames, components, @residual_index

Renderer reads:
  @lock, @recipes, @replay, @residual, @raw
```

The full file may include enough data to restore the page, while the AI-facing
source layer remains much smaller than the original HTML/CSS.

## Verification Tool

Run the visual fidelity checker against a folder of HTML pages:

```bash
npm run verify:visual-fidelity -- --source-dir /path/to/html/folder
```

Common options:

```bash
npm run verify:visual-fidelity -- \
  --source-dir /path/to/html/folder \
  --output-dir dist/visual-fidelity/my-check \
  --viewport 1440x1600 \
  --conversion preserve
```

The current tool:

- collects HTML files under the source folder
- converts each page into a VMD candidate
- renders the candidate back to HTML
- captures original and converted first-viewport screenshots with Playwright
- computes changed pixels and mean pixel delta
- writes `summary.json`, `summary.md`, generated VMD, generated HTML, and screenshots

Keep generated artifacts under `dist/` when source pages are private.

## Current Equivalence Threshold

The reference checker treats a page as pixel-equivalent only when both are true:

- changed pixels are at or below 2%
- mean pixel delta is at or below 3

These thresholds are intentionally strict. They are not a statement that humans
would notice every small difference. They are a gate for whether a conversion
can claim visual-lossless status.

## Current Conversion Modes

### Semantic

Semantic conversion extracts visible text and headings, then rebuilds the page
as VMD-native frames and blocks.

Use this for understanding and source-layer experiments. Do not claim complete
visual restoration from semantic conversion alone.

### Preserve

Preserve conversion wraps CSS and body HTML so the current reference renderer
can show the same browser page with minimal interference.

This is useful as a compatibility baseline, but it is not the final standard.
It proves that restoration is possible when enough source is carried, while the
visual-lossless target is to compress that replay data and expose a better AI
source layer.

### Visual-Lossless

Visual-lossless conversion should produce:

- source slots for AI edits
- component and token recipes where possible
- replay or residual data for exact restoration
- a residual index that tells AI which edits are constrained
- edit state or dirty markers that identify stale replay after AI edits
- a verification result proving the round trip

This is the target mode for VMD v1.

## Interpreting Drift

High drift usually means the candidate lacks one or more of these:

- CSS cascade details
- inline styles
- layout-specific class systems
- SVG or icon systems
- exact asset dimensions
- font and line-height locks
- scroll and viewport state
- scripted initial DOM state
- component geometry such as device mockups

The correct response is not to loosen the definition of lossless. The converter
must preserve more replay information or fall back to raw data.
