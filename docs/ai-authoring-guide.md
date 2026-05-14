# AI Authoring Guide

VMD is designed to be a better target for AI-assisted visual documents than raw
HTML and CSS.

For new documents, the model should describe semantic structure first and let
the renderer handle the page. For imported design documents, the model should
choose an explicit fidelity tier instead of pretending semantic blocks can
preserve arbitrary HTML/CSS pixels.

## Prompt Pattern

Use prompts that ask for VMD source, not final HTML, and state the fidelity
target.

```text
Create a VMD document for a 6-frame structured brief.
Use fidelity: structured.
Use frames, claims, evidence, insights, decisions, actions, and visual.compare
where useful.
Keep the source readable as plain text.
Use layout and component blocks if the document needs visual structure.
Do not use raw HTML/CSS unless exact preservation is required.
```

## Good Output Shape

```vmd
@doc "AI-Native Visual Documents" {
  format: deck
  theme: clean
  audience: builders
}

# AI needs a better visual document target

::frame[role="problem"]
  ::claim
  Raw HTML is too low-level for most AI-assisted visual documents.
  ::

  ::evidence
  The model must decide content, structure, spacing, hierarchy, responsive
  behavior, and visual polish at the same time.
  ::
::
```

## Authoring Rules For AI

- Prefer `frame` as the top-level unit.
- Use `claim` for the main point of a frame.
- Use `evidence` for support, proof, or context.
- Use `insight` only when the text changes interpretation.
- Use `decision` for an explicit chosen direction.
- Use `action` for next steps.
- Use `visual.compare` for opposing or before/after structures.
- Use `visual.loop` for repeated cycles.
- Use `visual.timeline` for ordered sequences.
- Use `layout.grid`, `layout.split`, and `component.card` when the output needs
  real visual structure.
- Use `style.tokens` before `style.css`.
- Use `raw.html` and `raw.css` only for preserve-mode imports or small
  compatibility islands.
- Do not use `raw.js`; the reference renderer will not execute it.
- Keep source readable before rendering.

## Review Checklist

Before accepting AI-generated VMD, check:

- Does every frame have a clear role?
- Does every major claim have support?
- Are visual blocks used for structure rather than decoration?
- Is the declared `fidelity` tier honest?
- Are layout/component blocks enough, or is preserve mode required?
- Are raw blocks limited to compatibility needs?
- Is the document understandable as plain text?
- Could the same source render as read, deck, and map views?

Then run:

```bash
node bin/vmd.mjs validate path/to/document.vmd
node bin/vmd.mjs validate path/to/document.vmd --strict
node bin/vmd.mjs validate path/to/document.vmd --json
```

For AI workflows, validation should be treated as the first feedback loop. The
model can revise the source until parse errors are gone and semantic warnings
are intentional.

## Example Request

```text
Turn this rough outline into VMD:

- AI-generated HTML is too fragile
- Vibe coders need easier visual documents
- VMD stores semantic intent
- Browser polyfill renders it as a page
- Long-term target is browser-native support
```

Expected shape:

```vmd
::frame[role="problem"]
  ::claim
  AI-generated HTML is often too fragile for reusable visual documents.
  ::
::

::frame[role="shift"]
  ::insight
  The better target is semantic visual structure, not final layout code.
  ::
::
```
