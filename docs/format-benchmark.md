# VMD Format Benchmark

This benchmark compares the same sample document written as VMD, Markdown, and
browser-ready HTML.

It is not a universal performance benchmark. It is a reproducible authoring and
portability benchmark for one representative visual sample document.

It measures source size, authoring overhead, semantic portability, available
render modes, and validation support. It does not prove visual-lossless
restoration. Visual restoration is measured separately in
`docs/open-design-ai-artifact-benchmark.md`.

## Method

- VMD source: AI-readable source rendered by the repository's VMD renderer.
- Markdown source: Markdown-only document with human-readable role labels.
- HTML source: browser-ready HTML that manually implements read, deck, and map
  views with CSS and JavaScript.
- Case: Source Layer Brief
- Fixtures: `benchmarks/cases/source-layer-brief.vmd`, `benchmarks/cases/source-layer-brief.md`,
  and `benchmarks/cases/source-layer-brief.html`.

The HTML case intentionally implements read, deck, and map views directly so it can match VMD's multi-view output without a VMD renderer.

Run it again with:

```bash
npm run benchmark:formats
```

## Results

| Format | Source bytes | Lines | Approx tokens | Authoring overhead | Native semantic roles | Convention hints | Visual primitives | Render modes | Pixel preservation path | Browser-native today | Content validation |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |
| VMD | 1527 | 72 | 382 | 279 (18.3%) | 10 | 0 | 3 | 3 | visual-lossless replay, residual, or raw fallback | no | yes (0 errors, 0 warnings) |
| Markdown | 1336 | 52 | 334 | 192 (14.4%) | 0 | 9 | 3 | 1 | not supported | no | no |
| HTML | 6749 | 98 | 1688 | 4793 (71%) | 0 | 6 | 4 | 3 | native HTML/CSS rendering | yes | no |

## VMD Compared With Markdown

- VMD source bytes delta: 14.3%.
- VMD render mode gain: 2.
- VMD native semantic role gain: 10.
- VMD validator gain: 1.

Markdown is shorter and widely understood as plain text, but its labels such as
`Claim:` or `Evidence:` are conventions. A renderer or AI tool has to infer
their meaning from prose. VMD makes those roles part of the source grammar, so
the same source can be checked and rendered as read, deck, and map views.

## VMD Compared With HTML

- VMD source is 77.4% smaller than this browser-ready HTML fixture.
- VMD render mode gain: 0.
- VMD native semantic role gain: 10.

HTML is the strongest deployment target because browsers open it natively today.
The tradeoff is authoring burden: matching VMD's three output modes in raw HTML
requires duplicated content, CSS, JavaScript, and custom class conventions. VMD
keeps the AI editing surface smaller, while the visual-lossless path adds replay
or residual data when complete browser restoration matters.

## Pros, Cons, And Effects

| Format | Best use | Main advantage | Main cost |
| --- | --- | --- | --- |
| Markdown | Linear notes, READMEs, essays, simple docs | Lowest writing friction and strong plain-text readability | Semantic roles and visual structure remain conventions |
| HTML | Final browser-native pages and custom web apps | Opens directly in browsers with full layout and interaction control | High authoring overhead when content, style, and interaction are hand-written together |
| VMD | Restorable visual reports, decks, maps, AI-authored visual documents, and HTML/CSS imports | One file can carry AI-readable slots plus renderer-readable replay data | Needs a renderer, extension, or converter until browsers support it natively |

The practical effect is not that VMD should replace Markdown or HTML everywhere.
It creates a middle source layer for documents that are too visual and structured
for Markdown, but too repetitive and low-level to author directly as HTML.

## Practical Interpretation

VMD is not a replacement for Markdown when the document is mostly linear prose.
Markdown remains better for simple notes, READMEs, and long-form writing.

VMD is useful when the document needs semantic roles, multiple visual modes,
validation, AI-generated visual structure, or a visual-lossless path for
existing browser pages.

HTML remains the final native browser substrate. VMD's current value is as a
higher-level source that can compile to HTML and become easier for AI-assisted
authors to produce reliably.
