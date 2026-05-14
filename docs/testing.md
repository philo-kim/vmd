# Testing

VMD tests cover the core renderer, Chrome extension, and VS Code extension.

## Core Check

```bash
npm run check
```

This command:

- verifies that shared core copies are synced into extension runtimes
- checks JavaScript syntax
- validates the VS Code extension syntax
- runs core parser/renderer assertions
- renders the sample document to static HTML

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
rendering, and switches render mode.

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
registration, and runs the preview command.

The test script clears inherited VS Code/Electron environment variables before
launching the test host. This matters when the command is run from an existing
VS Code terminal.

## Packaging Smoke Tests

```bash
npm run package:chrome
npm run package:vscode
```

Expected outputs:

```text
dist/vmd-chrome-extension.zip
dist/vmd-vscode.vsix
```

The `dist/` directory is ignored by Git.
