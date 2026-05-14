# Artifact Replacement Scope

VMD should not be judged only as nicer Markdown or shorter HTML.

The larger target is the editable source layer behind visual artifacts that are
usually trapped inside one output format:

- presentation decks
- PDF reports
- design handoff files
- generated HTML pages
- visual research maps
- preserved AI-generated browser artifacts

The goal is not to remove those outputs. They remain useful delivery surfaces.
The goal is to stop treating each output file as the only source of truth.

## Why Existing Artifact Formats Are Hard For AI

Presentation files, PDFs, design files, and generated HTML all encode a lot of
visual state. That is useful when the artifact is being displayed, but awkward
when an AI model needs to revise the underlying document.

The model often has to infer:

- which sentence is the claim
- which block is evidence
- which frame is a decision
- which visual element is structural
- which layout decision is reusable
- which part must preserve exact pixels

VMD makes those roles explicit before rendering.

## Source First, Artifact Second

A VMD document should be able to say:

```vmd
@doc "Visual Decision Room" {
  format: product-design-brief
  fidelity: visual
  surfaces: browser-page deck pdf design-handoff
}
```

That source can then feed several artifact surfaces:

| Surface | VMD role |
| --- | --- |
| Browser page | primary visual render target |
| Presentation deck | frame-by-frame view over the same source |
| PDF report | fixed export after validation |
| Design handoff | tokens, components, states, and decisions |
| Preserve artifact | exact HTML/CSS compatibility when pixels are the record |

This is the replacement claim: VMD should replace the fragile editable source,
not every final artifact.

## The Open Design Benchmark

Open Design-style AI design artifacts are a useful benchmark because they show
the pressure clearly: AI can already create polished HTML-based design
documents, but those documents can become large, brittle authoring targets.

VMD needs to support two paths:

- a compact semantic or visual source for new documents
- a preserve or hybrid source for existing browser-native artifacts

The best case is hybrid: most of the document stays AI-readable and structured,
while exact HTML/CSS is preserved only where fidelity truly matters.

## What Good Looks Like

A strong VMD example should feel like a real artifact, not just a syntax sample.
It should be visually convincing after rendering and still remain readable as
plain source.

The source should be able to carry:

- semantic roles such as `claim`, `evidence`, `decision`, and `action`
- visual structures such as `visual.matrix`, `visual.timeline`, and
  `visual.compare`
- layout primitives such as `layout.grid`, `layout.split`, and `layout.device`
- component primitives such as `component.card` and `component.metric`
- style tokens before raw CSS
- raw compatibility islands only where exact output is required

See `samples/ai-artifact-stress.vmd` for the current stress sample.
