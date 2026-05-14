# Testing

VMD tests cover the core renderer, CLI, Chrome extension, and VS Code extension.

## Core Check

```bash
npm run check
```

This command:

- verifies that shared core copies are synced into extension runtimes
- checks JavaScript syntax
- validates the VS Code extension syntax
- runs core parser/renderer assertions
- runs CLI assertions
- verifies generated benchmark outputs are current
- renders the sample document to static HTML
- builds the static gallery and playground

If this fails because runtime copies are stale, run:

```bash
npm run sync:core
npm run check
```

## Chrome Extension Test

```bash
npm run test:chrome
```

This test launches a real Chromium instance with the unpacked Chrome extension.
It serves a `.vmd` file over localhost, opens the URL, waits for automatic VMD
rendering, switches render mode, verifies preserve-mode rendering without the
toolbar wrapper, extension stylesheet injection, VMD body classes, or root
attribute loss, verifies local `file://` preserve-mode rendering, opens the
extension viewer, loads the packaged samples, and verifies viewer diagnostics.

The test runs headed by default because extension service workers and content
scripts are more reliable in a real browser window. To try headless mode:

```bash
HEADLESS=1 npm run test:chrome
```

## VS Code Extension Test

```bash
npm run test:vscode
```

This test downloads or reuses a VS Code build through `@vscode/test-electron`,
loads the extension development path, opens a `.vmd` fixture, verifies language
registration, validator diagnostics, semantic/layout/component/style/raw snippet
completions, local resource webview roots, and the preview command.

The test script clears inherited VS Code/Electron environment variables before
launching the test host. This matters when the command is run from an existing
VS Code terminal.

## CLI Test

```bash
npm run test:cli
```

This test renders a sample to HTML, writes an AST file, validates all samples,
builds a gallery in a temporary directory, and confirms invalid VMD returns a
non-zero exit code.

## Packaging Smoke Tests

```bash
npm run package:chrome
npm run package:vscode
npm run package:npm:dry-run
```

Expected outputs:

```text
dist/vmd-chrome-extension.zip
dist/vmd-vscode.vsix
```

The `dist/` directory is ignored by Git.

## Canonical Site Smoke Test

```bash
npm run smoke:public
```

This opens the canonical public VMD page at `https://philo.kim/vmd/` in
Chromium and checks that the page renders with the current visual-lossless framing.
It is intentionally not part of `npm run check` because it depends on the public
network and the latest site deployment.

## Format Benchmark

```bash
npm run benchmark:formats
```

This compares the same sample document in VMD, Markdown, and browser-ready
HTML. It writes:

```text
benchmarks/results/format-benchmark.json
benchmarks/results/format-benchmark.md
docs/format-benchmark.md
```

`npm run check` verifies these generated files are current.

## Open Design AI Artifact Benchmark

```bash
npm run benchmark:open-design
```

This optional benchmark expects a local checkout of
`https://github.com/nexu-io/open-design` near the VMD checkout, or an
`OPEN_DESIGN_DIR` environment variable pointing to that repo. It measures real
AI/agent-generated HTML examples as source material for VMD: HTML size, AI
source layer size, full visual-lossless prototype size, token pressure,
round-trip drift, and the remaining restoration gap.

The committed report is:

```text
benchmarks/results/open-design-ai-artifacts.md
docs/open-design-ai-artifact-benchmark.md
```

## Visual Fidelity Verification

```bash
npm run verify:visual-fidelity -- --source-dir /path/to/html/folder
```

This runs a Playwright-based check against existing HTML pages. It converts each
page into a VMD candidate, renders the converted VMD back to HTML, captures
original and converted first-viewport screenshots, then reports pixel drift.

The outputs are written under `dist/visual-fidelity/` by default and are ignored
by Git. Use this when testing whether an existing HTML document set can be
represented by the current VMD vocabulary and replay strategy without visible
loss. After AI edits, the same verification must be rerun after dirty slots are
refreshed.

See `docs/visual-fidelity.md`.

## Screenshot Capture

```bash
npm run capture:screenshots
```

This rebuilds the static site, serves it locally, and captures:

```text
docs/assets/vmd-gallery.png
docs/assets/vmd-playground.png
```
