# VMD Manifesto

## The Missing Layer

The internet has strong primitives for publishing and interaction:

- HTML describes document structure.
- CSS describes visual presentation.
- JavaScript describes behavior.
- Markdown made writing plain-text documents easier.

But modern visual documents still have a missing primitive.

They can describe what something looks like, but they usually do not describe
what role an idea plays.

Is this paragraph a claim? Evidence? A decision? A contrast? A next action? A
turning point in the argument?

Most tools cannot know.

VMD exists to make that role explicit.

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

## A Portable Format For Visual Thinking

Visual documents are often locked inside specific tools. Decks, documents,
whiteboards, and reports each have their own editing model.

VMD proposes a portable source format for the thinking underneath those outputs.

The same `.vmd` file should be able to move across tools, renderers, and media
without losing its semantic structure.

## What VMD Is Not

VMD is not a replacement for HTML.

VMD is not a replacement for CSS.

VMD is not a replacement for Markdown.

VMD is a layer above them: a semantic source format for visual documents.

## Standard Direction

If VMD succeeds, it should become more like a shared format than a single app.

The format should be:

- readable as plain text
- parseable into a stable AST
- renderer-independent
- friendly to web output
- useful for documents, decks, reports, and maps
- simple enough for people to write directly

The long-term ambition is a common language for structured visual thinking.
