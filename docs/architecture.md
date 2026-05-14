# Architecture

VMD is a file format plus a rendering contract.

```text
.vmd source
  -> parser
  -> AST
  -> validator
  -> renderer
  -> browser HTML/CSS output
  -> visual restoration check
```

## File Layers

VMD keeps editable source and restoration data in the same file.

```text
AI Source Layer
  @doc
  ::intent
  @tokens.editable
  ::frame
  ::component.*
  ::visual.*
  @residual_index
  @edit_state / @dirty

Render Replay Layer
  @lock
  @tokens.locked
  @recipes
  @replay
  @residual
  @raw
```

The source layer should be compact enough for AI to inspect and patch. The
replay layer can be larger because normal editing does not require the AI to
read it.

## Parser

The parser accepts:

- Markdown-style headings
- `@doc` document contracts
- directive blocks such as `@lock`, `@tokens`, `@replay`, `@residual_index`
- double-colon blocks such as `::frame`, `::intent`, `::component.card`

The output is a plain AST so renderers, validators, and tooling can share the
same representation.

## Validator

The validator checks:

- missing document title
- unknown fidelity tier
- missing frames
- unknown blocks
- visual block completeness
- raw executable surfaces
- visual-lossless documents missing `@lock`
- visual-lossless documents missing replay data
- visual-lossless documents missing `@residual_index`
- residual blocks that do not declare `ai: ignore`
- visual-lossless documents missing edit state or dirty markers

Validation does not prove visual restoration. Restoration requires screenshot or
render-signature verification under the declared `@lock`.

## Renderer

The current renderer produces HTML for:

- read mode
- deck mode
- map mode

It can render visual-lossless directives for inspection, but the final replay
codec is still a research target. A production visual-lossless renderer must
apply `@replay`, `@residual`, and `@raw` data to restore the locked output.

## Complete Restoration Loop

A converter should run this loop:

```text
1. Parse source HTML/CSS artifact.
2. Extract AI source slots.
3. Map known patterns to recipes and tokens.
4. Encode remaining differences into replay/residual/raw.
5. Render VMD back to browser output.
6. Compare against the original under @lock.
7. If drift remains, expand replay/residual/raw and repeat.
```

Only the passing result should claim `fidelity: visual-lossless`.

After an AI edit, the loop starts again from the changed slots. The old replay
data may be stale, so the document must mark affected slots through
`@edit_state` or `@dirty`, then regenerate replay/residual/hash data before
visual-lossless status is restored.

## Why This Architecture

HTML is the deployment target. Markdown is a good writing surface. CSS is a
reusable styling system. VMD combines the useful parts by separating:

- intent from implementation
- editable slots from replay bytes
- style tokens from raw CSS
- AI constraints from renderer payloads

That separation is what lets VMD reduce token cost without pretending arbitrary
HTML/CSS can be losslessly replaced by semantic blocks alone.
