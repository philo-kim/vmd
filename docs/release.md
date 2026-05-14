# Release Guide

VMD currently has five distributable surfaces:

- source repository
- CLI and static renderer
- GitHub Pages gallery
- Chrome extension zip
- VS Code VSIX

The npm package name is `vmd-format` because `vmd` is already used by another
published package. The installed binary remains `vmd`.

## Pre-Release Checklist

Run:

```bash
npm install
npm run check
npm run benchmark:formats
npm run test:chrome
npm run test:vscode
npm run build:site
npm run capture:screenshots
npm run package:chrome
npm run package:vscode
npm run package:npm:dry-run
```

Expected artifacts:

```text
dist/vmd-chrome-extension.zip
dist/vmd-vscode.vsix
dist/family-platform.html
dist/site/index.html
docs/assets/vmd-gallery.png
docs/assets/vmd-playground.png
benchmarks/results/format-benchmark.md
```

Package artifacts and `dist/` output are generated locally and are not committed
to Git by default. Screenshot assets are committed because they are part of the
public README.

After Pages deploys, run:

```bash
npm run smoke:public
```

This checks the published gallery, sample page, and playground in Chromium.

## Versioning

The repository is pre-1.0.

Until the AST stabilizes, minor versions may include breaking grammar or renderer
changes. Every breaking change should update:

- `docs/spec-draft-v0.md`
- `CHANGELOG.md`
- sample `.vmd` files
- extension tests

## Chrome Extension Release

```bash
npm run package:chrome
```

The zip can be loaded manually.

Before distributing the extension, review permissions carefully. Auto-render
requires matching `.vmd` URLs, and local file rendering requires explicit user
approval in Chrome.

## VS Code Extension Release

```bash
npm run package:vscode
```

The VSIX can be installed manually.

## GitHub Pages Release

The Pages workflow builds `dist/site` from sample `.vmd` files and publishes the
gallery and playground.

Before relying on Pages as the public demo surface:

- verify the repository Pages setting is enabled
- confirm the latest Pages workflow has deployed successfully
- open the published gallery URL and check a sample page plus playground

The generated site is not committed to Git.

## GitHub Release

For a tagged release:

1. Update `CHANGELOG.md`.
2. Run all checks.
3. Create the package artifacts.
4. Tag the release.
5. Attach artifacts to the GitHub release.

The release notes should describe both format changes and runtime changes.
