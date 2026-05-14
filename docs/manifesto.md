# VMD Manifesto

## The Missing Layer

The internet has strong primitives for publishing and interaction:

- HTML describes document structure.
- CSS describes visual presentation.
- JavaScript describes behavior.
- Markdown made writing plain-text documents easier.

But modern visual documents still have two missing primitives.

They can describe what something looks like, but they usually do not describe
what role an idea plays. They also rarely say whether the document should be
editable semantic structure or exact visual preservation.

Is this paragraph a claim? Evidence? A decision? A contrast? A next action? A
turning point in the argument?

Most tools cannot know.

VMD exists to make both the role and the fidelity target explicit.

## Meaning Before Appearance

VMD starts from a simple rule:

```text
Mark the role of the idea before choosing its visual treatment.
```

For example:

```vmd
::claim
The product is not a tracker.
It is a behavior-change loop.
::
```

This is not just a styled box. It is a semantic claim.

Once that meaning is known, different renderers can decide how to show it:

- as a section in an article
- as a slide in a deck
- as a node in a map
- as a highlighted block in a report
- as an interactive frame on the web

When exact visual preservation matters, VMD should say that too:

```vmd
@doc "Imported Page" {
  fidelity: preserve
}
```

That tells the renderer not to reinterpret the page as a normal semantic
document.

## A Portable Format For Visual Thinking

Visual documents are often locked inside specific tools. Decks, documents,
whiteboards, and reports each have their own editing model.

VMD proposes a portable source format for the thinking underneath those outputs.

The same `.vmd` file should be able to move across tools, renderers, and media
without losing its declared intent. For semantic documents, that means meaning.
For preserve documents, that means visual fidelity.

## A Better Target For AI

AI-assisted creation is changing how people make software and documents.

But asking an AI model to generate complete visual HTML is often an awkward
target. It forces the model to decide content, structure, layout, styling, and
interaction at the same time.

VMD separates that work.

An AI model can produce semantic source, structured layout, or a preserve-mode
container for existing HTML/CSS. A renderer can produce the visual page.

This makes visual document creation more accessible to people who can describe
what they want but do not want to hand-author HTML, CSS, and JavaScript for
every page.

## What VMD Is Not

VMD is not a replacement for HTML.

VMD is not a replacement for CSS.

VMD is not a replacement for Markdown.

VMD is a layer above them: a layered source format for visual documents.

## Format Requirements

The format should be:

- readable as plain text
- parseable into a stable AST
- renderer-independent
- friendly to web output
- useful for documents, decks, reports, and maps
- explicit about fidelity tiers
- simple enough for people to write directly
