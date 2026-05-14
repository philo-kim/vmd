# Open Design AI Artifact Benchmark

This benchmark uses AI-generated HTML design artifacts as the stress case for
VMD. The reason is direct: VMD is meant to reduce the AI editing surface of
visual documents without giving up complete browser restoration.

The result does **not** prove that the current prototype is already fully
visual-lossless. It proves two things:

- the AI-facing source layer can be much smaller than HTML/CSS
- the current replay/residual codec still needs work before every case can
  claim complete restoration

## Source

- Source: [nexu-io/open-design](https://github.com/nexu-io/open-design)
- Source folder: `design-templates/`
- Cases: 102 `example.html` artifacts
- Tokenizer used in the experiment: `js-tiktoken` GPT-4 tokenizer

## Aggregate Size Results

| Candidate | Size | Reduction vs HTML |
| --- | ---: | ---: |
| Original HTML | 3031.8 KB | 0% |
| Minified HTML | 2239.7 KB | 26.1% |
| Visible text lower bound | 289.4 KB | 90.5% |
| Intent core | 86.1 KB | 97.2% |
| Slot source | 485.7 KB | 84.0% |
| Residual DOM stream | 1041.5 KB | 65.6% |
| Full visual-lossless prototype | 1527.3 KB | 49.6% |

## Token Results

| Candidate | Tokens | Reduction vs HTML |
| --- | ---: | ---: |
| Original HTML | 931,370 | 0% |
| Minified HTML | 749,339 | 19.5% |
| Intent core | 25,620 | 97.2% |
| Slot source | 156,467 | 83.2% |
| Full visual-lossless prototype | 563,036 | 39.5% |

## Round Trip Result

- Pixel-equivalent pages: 46/102
- Pixel-equivalent rate: 45.1%
- Average changed pixels: 25.12%
- Average mean delta: 18.97

This is intentionally reported as a limitation. A page that does not pass the
visual check is not visual-lossless yet. The converter must add stronger replay,
residual, or raw fallback data until restoration passes.

## What The Numbers Mean

The most important number is not the smallest file. It is the size of the
LLM-editable layer inside a fully restorable file.

In this experiment:

- `intent core` is tiny, but too thin to edit a real visual document safely
- `slot source` is the best current AI-facing source layer: compact, readable,
  and still tied to visible content
- `residual DOM stream` carries restoration data but is not a good LLM editing
  surface
- `full visual-lossless prototype` shows the combined cost of source plus
  replay today

The target format should therefore keep one `.vmd` file with two reading paths:

```text
AI reads: intent + slots + tokens + components + residual_index
Renderer reads: lock + recipes + replay + residual + raw
```

After source edits, replay data may be stale. A useful VMD benchmark must
therefore measure not only initial decode restoration, but also whether dirty
slots are detected and replay/residual/hash data can be regenerated after an
LLM edit.

## Distribution Results

- Slot reduction p10/p50/p90: 61% / 82.9% / 93%
- Full visual-lossless reduction p10/p50/p90: 12.9% / 48.9% / 66.8%
- Roundtrip changed pixels p10/p50/p90: 0% / 4.6% / 98.5%

## Dictionary Amortization

Shared dictionaries and recipes matter. If many documents share the same visual
system, the AI source layer stays small while replay cost can be amortized.

| Docs | HTML KB | AI Slot KB | Slot Reduction | Slot + Prorated Dictionary KB | Reduction | Full Residual KB | Full Reduction |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 91.5 | 14.9 | 83.7% | 25.8 | 71.8% | 49.3 | 46.1% |
| 5 | 435.7 | 44.4 | 89.8% | 98.5 | 77.4% | 165.1 | 62.1% |
| 10 | 761.9 | 91.5 | 88.0% | 199.7 | 73.8% | 332.0 | 56.4% |
| 25 | 1467.2 | 159.5 | 89.1% | 430.2 | 70.7% | 619.6 | 57.8% |
| 50 | 2285.7 | 314.5 | 86.2% | 855.8 | 62.6% | 1066.4 | 53.3% |
| 100 | 3030.4 | 485.1 | 84.0% | 1567.8 | 48.3% | 1526.1 | 49.6% |
| 102 | 3031.8 | 485.7 | 84.0% | 1590.0 | 47.6% | 1527.3 | 49.6% |

## Residual Strategy Comparison

| Strategy | Size | Reduction vs HTML | Risk |
| --- | ---: | ---: | --- |
| DOM stream | 1041.5 KB | 65.6% | Low for static DOM, weaker when scripts or computed layout are essential |
| CSS dictionary | 1104.3 KB | 63.6% | Useful with DOM replay; not a document source alone |
| Selector patch estimate | 530.2 KB | 82.5% | Compact, but selector drift can break edits |
| Layout box patch estimate | 1821.7 KB | 39.9% | Can lock geometry, but not typography and paint alone |
| Computed style patch estimate | 22503.6 KB | -642.3% | Too large; often worse than HTML |
| Recipe parameter patch estimate | 57.3 KB | 98.1% | Best long-term target when dictionaries are strong |

## Conclusion

The best direction is not separate `semantic`, `compact`, and `lossless` file
formats. The best direction is one `.vmd` format:

```text
VMD = AI-readable source layer + renderer-readable visual-lossless replay layer
```

The current prototype validates the compression opportunity. The next hard
problem is the visual replay codec that turns the remaining 54.9% non-equivalent
round trips into verified complete restoration, then repeats that verification
after source-layer edits.
