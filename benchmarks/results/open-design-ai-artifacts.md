# Open Design AI Artifact Benchmark

This checked 102 AI-generated HTML artifacts from `nexu-io/open-design`
`design-templates/` against VMD's visual-lossless goal.

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

## Round Trip

- Pixel-equivalent pages: 46/102 (45.1%)
- Average changed pixels: 25.12%
- Average mean delta: 18.97

This result is intentionally not treated as complete success. It shows that the
AI source layer compression is strong, while the replay codec still needs to
cover the non-equivalent cases before those files can claim `visual-lossless`.

## Key Interpretation

The target is one `.vmd` file with two reading paths:

```text
AI source layer:
  intent + slots + tokens + components + residual_index

Render replay layer:
  lock + recipes + replay + residual + raw
```

The optimization metric is the smallest file that restores the visual output
and still leaves the AI with a compact, safe editing surface.

After an AI edit, the previous replay/residual/hash data may be stale. Future
benchmarks should score dirty-slot detection and replay refresh after edits, not
only initial decode restoration.
