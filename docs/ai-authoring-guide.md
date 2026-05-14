# AI Authoring Guide

VMD is designed to be a better target for AI-assisted visual documents than raw
HTML and CSS.

The model should describe semantic structure first. The renderer should handle
the page.

## Prompt Pattern

Use prompts that ask for VMD source, not final HTML.

```text
Create a VMD document for a 6-frame strategy brief.
Use frames, claims, evidence, insights, decisions, actions, and visual.compare
where useful.
Keep the source readable as plain text.
Do not add CSS or HTML.
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
- Avoid inline HTML and CSS.
- Keep source readable before rendering.

## Review Checklist

Before accepting AI-generated VMD, check:

- Does every frame have a clear role?
- Does every major claim have support?
- Are visual blocks used for structure rather than decoration?
- Is the document understandable as plain text?
- Could the same source render as read, deck, and map views?

Then run:

```bash
node bin/vmd.mjs validate path/to/document.vmd
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
