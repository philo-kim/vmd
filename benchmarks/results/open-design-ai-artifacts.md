# AI Artifact Benchmark

This benchmark uses real AI/agent-generated HTML artifacts as the stress case for VMD.
The point is not that VMD should merely wrap HTML. Preserve mode proves browser fidelity, while semantic compression shows why a smaller, editable, AI-native visual source is needed.

## Source

- Source: [nexu-io/open-design](https://github.com/nexu-io/open-design) at `75498838a911`
- Source folder: `design-templates/`
- Cases: 6

## Aggregate Result

- HTML source: 225.9 KB (57683 approx tokens)
- Preserve VMD source: 224.5 KB (57327 approx tokens)
- Semantic draft VMD source: 10.9 KB (2765 approx tokens)
- Average semantic draft reduction: 92.9%
- Average preserve source delta: -0.6%
- Visual surface: 1229 CSS rules, 45 inline styles, 1069 class attributes

## Case Results

| Artifact | HTML | Preserve VMD | Semantic Draft VMD | Semantic Reduction | CSS Rules | Inline Styles | Classes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| open-design-landing/example.html | 91.5 KB | 90.8 KB | 3.5 KB | 96.2% | 376 | 12 | 578 |
| open-design-landing-deck/example.html | 80.7 KB | 80.2 KB | 1.9 KB | 97.6% | 493 | 0 | 171 |
| html-ppt-pitch-deck/example.html | 28.3 KB | 28.2 KB | 2.6 KB | 90.8% | 227 | 17 | 125 |
| finance-report/example.html | 12.9 KB | 12.8 KB | 2.2 KB | 82.9% | 55 | 15 | 110 |
| dashboard/example.html | 6.5 KB | 6.4 KB | 400 B | 94% | 39 | 0 | 35 |
| mobile-app/example.html | 6.1 KB | 6 KB | 255 B | 95.9% | 39 | 1 | 50 |

## Interpretation

- AI-generated HTML is already a useful visual artifact, but it is a large browser implementation surface rather than a compact authoring source.
- Preserve VMD is a compatibility tier for exact rendering. It should be used when the visual page itself is the artifact of record.
- Semantic VMD is much smaller and easier for AI to edit, but it intentionally loses bespoke layout and style detail.
- Hybrid VMD can combine semantic frames, structured layouts, reusable components, theme tokens, and raw compatibility where exact visual fidelity requires it.
