---
title: Source Layer Brief
format: deck
theme: clean
audience: builders
---

# A Source Layer For Visual Documents

## Opening

**Claim:** Generated HTML is useful output. It should not always be the editable
source.

**Evidence:** When HTML becomes the source of record, every edit must carry
content, structure, styling, and responsive behavior at once.

**Loop:** Intent -> Structure -> Render -> Verify

## HTML As Source Becomes Noisy

**Evidence:** A visual page mixes argument, DOM structure, CSS decisions,
responsive behavior, and interaction details in one implementation surface.

**Compare:**

| HTML-first source | VMD source |
| --- | --- |
| implementation details | declared intent |
| page-specific CSS | reusable visual mapping |
| hard-to-diff output | inspectable document roles |

## The Source Shift

**Insight:** The durable artifact is the document's meaning and required
fidelity, not every generated node.

**Decision:** Use VMD as the source layer, then render to HTML and CSS when the
browser needs to display it.

## Near-Term Execution

**Timeline:**

- Keep the grammar small
- Build one shared parser and AST
- Render through browser-native HTML and CSS
- Validate claim, evidence, and fidelity choices

**Action:** Treat VMD as an inspectable source contract before treating it as a
visual renderer.
