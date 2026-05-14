# VMD Language Design

## Definition

VMD is a semantic visual document language.

It lets a person write in a Markdown-like source format while marking the role
of each idea. A renderer can then turn the same source into multiple visual
formats: article, deck, map, report, or interactive web page.

## Design Position

VMD should not be treated as a direct HTML/CSS/Markdown mashup.

It borrows a narrow strength from each:

- Markdown: readable source text
- HTML: explicit structure and meaning
- CSS: reusable visual rules separated from content

The language should make this promise:

```text
If the author marks the role of an idea, the system can choose the right visual form.
```

## Core Layers

### 1. Source Layer

The source must remain readable before rendering.

Good:

```vmd
::claim
The real market is not allowance management.
It is behavior change inside the family.
::
```

Avoid:

```html
<block type="claim" display="hero" weight="high">
  <content>The real market is not allowance management.</content>
</block>
```

### 2. Semantic Layer

Semantic blocks describe the role of the content.

Initial semantic blocks:

- `frame`: one unit of thought
- `claim`: primary argument
- `evidence`: supporting proof or context
- `insight`: interpretation or discovery
- `decision`: selected direction
- `action`: next step

These are not CSS classes. They are meaning-bearing document nodes.

### 3. Visual Pattern Layer

Visual blocks describe structural visualization intent.

Initial visual blocks:

- `visual.compare`: two-sided comparison
- `visual.loop`: repeated cycle
- `visual.timeline`: ordered sequence

These should remain separate from semantic blocks.

Example:

```vmd
::frame[role="problem"]
  ::claim
  Existing allowance apps manage money flow but do not change behavior.
  ::

  ::visual.compare
  left: Existing apps
  right: VMD framing

  - money flow vs behavior change
  - parent as manager vs parent as growth partner
  ::
::
```

### 4. Theme Layer

Themes should translate semantic roles into visual treatment.

Example direction:

```vmd
@theme strategy-report {
  density: medium
  tone: confident

  claim {
    treatment: bold-statement
    emphasis: high
  }

  evidence {
    treatment: quiet-support
    emphasis: medium
  }
}
```

The first prototype does not implement a full theme language yet. It uses a
single built-in theme in CSS.

## Frame As The Base Unit

VMD should use `frame` as the base unit.

A frame is not a page, slide, section, or card. It is one unit of thought.

The same frame can render differently:

- Read mode: document section
- Deck mode: slide
- Map mode: node
- Web mode: interactive section

## MVP Syntax

```vmd
@doc "Family Platform" {
  format: deck
  theme: clean
  audience: investor
}

# A Family Platform For Behavior Change

::frame[role="opening"]
  ::claim
  Allowance management is not the end point.
  It is the starting point for self-directed behavior.
  ::
::

::frame[role="problem"]
  ## Existing Market Limit

  ::evidence
  Most allowance apps track money, but family conflict usually happens around
  responsibility, habits, and trust.
  ::

  ::visual.compare
  left: Existing apps
  right: New category

  - allowance record vs habit formation
  - parent manager vs growth partner
  ::
::
```

## Semantic AST

The AST is the real product boundary.

Expected shape:

```json
{
  "doc": {
    "title": "Family Platform",
    "attrs": {
      "format": "deck",
      "theme": "clean"
    }
  },
  "children": [
    {
      "type": "heading",
      "level": 1,
      "text": "A Family Platform For Behavior Change"
    },
    {
      "type": "frame",
      "attrs": {
        "role": "opening"
      },
      "children": [
        {
          "type": "claim",
          "lines": [
            "Allowance management is not the end point.",
            "It is the starting point for self-directed behavior."
          ]
        }
      ]
    }
  ]
}
```

This lets later renderers target HTML, PDF, deck, SVG, or interactive web
without reparsing the source.

## Quality Checks Enabled By Semantics

Once blocks have roles, automated review becomes possible:

- claim exists but evidence is missing
- contrast exists but decision is missing
- opening frame does not match the declared audience
- problem frame has no transition into solution
- too many insights appear before enough evidence

This is where VMD becomes more than a visual renderer. It can become a system
for checking the structure of thinking.

## Near-Term Roadmap

1. Stabilize parser and AST schema.
2. Define the first 8 to 10 semantic and visual blocks.
3. Improve the HTML renderer.
4. Add a theme token layer.
5. Add export targets: static HTML first, then PDF/deck later.
6. Add semantic quality checks.
