# Visual Fidelity Verification

VMD has two different conversion goals:

- semantic equivalence: keep the content roles and document structure so the
  renderer can produce a VMD-native visual document
- pixel equivalence: preserve the exact browser rendering of an existing
  HTML/CSS/JavaScript page

The current VMD renderer now supports both semantic conversion and preserve
conversion. The important decision is explicit:

- `--conversion semantic` produces a VMD-native interpretation
- `--conversion preserve` wraps existing HTML/CSS in the compatibility layer and
  asks the renderer to avoid normal VMD wrappers

## Why This Boundary Matters

VMD is useful because authors and AI agents can write a smaller semantic source
instead of hand-authoring complete HTML, CSS, and JavaScript. That advantage
depends on keeping VMD above the browser's low-level styling surface.

An existing HTML page may already be a final artifact. If it contains custom
CSS grids, handcrafted cards, phone mockups, tables, inline styles, and scripts,
a semantic VMD conversion should not be expected to look identical. It should be
expected to produce a readable VMD-native interpretation of the same document.

## Verification Tool

Run the visual fidelity checker against a folder of HTML pages:

```bash
npm run verify:visual-fidelity -- --source-dir /path/to/html/folder
```

Common options:

```bash
npm run verify:visual-fidelity -- \
  --source-dir /path/to/html/folder \
  --output-dir dist/visual-fidelity/my-check \
  --viewport 1440x1600 \
  --conversion preserve
```

The tool:

- collects HTML files under the source folder
- converts each page into semantic or preserve-mode VMD
- renders the converted VMD back to HTML
- captures original and converted first-viewport screenshots with Playwright
- computes pixel drift in the browser
- writes `summary.json`, `summary.md`, generated VMD, generated HTML, and local
  screenshots under the output folder

Keep generated artifacts under `dist/` when the source pages are private.

## Interpreting Results

The checker treats a page as pixel-equivalent only when both are true:

- changed pixels are at or below 2%
- mean pixel delta is at or below 3

These thresholds are intentionally strict. They are for checking whether a
conversion visually preserves an existing page, not whether the converted VMD is
usable.

High drift usually means the source page relies on one or more surfaces that the
selected conversion mode does not represent:

- custom CSS rules
- inline style attributes
- layout-specific class systems
- SVG illustration or icon systems
- data tables
- scripted interaction or animation
- custom component geometry such as device mockups

## Conversion Modes

### Semantic Mode

Semantic mode extracts visible text and headings, then rebuilds the page as VMD
frames and blocks. This is useful for AI-editable documents, but it should not
be expected to match arbitrary HTML/CSS pixels.

### Preserve Mode

Preserve mode extracts CSS and body HTML into:

```vmd
@doc "Imported Page" {
  fidelity: preserve
}

::raw.css
...
::

::raw.html
...
::
```

The reference read renderer emits preserved content directly, without the normal
VMD document shell. This is the correct mode when the goal is “open the VMD and
see the same browser page.”

### Hybrid Mode

Hybrid conversion is the next target. It should keep semantic structure where
possible, then use layout/component/style/raw blocks only where the source page
requires visual precision.

The browser-native ambition should not collapse VMD into another spelling of
HTML. The practical path is to make the fidelity mode explicit so authors know
whether they are asking for editable semantic structure, structured visual
authoring, or exact page preservation.
