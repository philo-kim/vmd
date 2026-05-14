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
rendering, switches render mode, opens the extension viewer, loads the packaged
sample, and verifies viewer diagnostics.

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
registration, validator diagnostics, snippet completions, and the preview
command.

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

## Public Pages Smoke Test

```bash
npm run smoke:public
```

This opens the deployed GitHub Pages gallery, a rendered sample page, and the
playground in Chromium. It is intentionally not part of `npm run check` because
it depends on the public network and the latest Pages deployment.

## Format Benchmark

```bash
npm run benchmark:formats
```

This compares the same strategy document in VMD, Markdown, and browser-ready
HTML. It writes:

```text
benchmarks/results/format-benchmark.json
benchmarks/results/format-benchmark.md
docs/format-benchmark.md
```

`npm run check` verifies these generated files are current.

## Screenshot Capture

```bash
npm run capture:screenshots
```

This rebuilds the static site, serves it locally, and captures:

```text
docs/assets/vmd-gallery.png
docs/assets/vmd-playground.png
```
