# Release Guide

VMD currently has three distributable surfaces:

- source repository
- Chrome extension zip
- VS Code VSIX

## Pre-Release Checklist

Run:

```bash
npm install
npm run check
npm run test:chrome
npm run test:vscode
npm run package:chrome
npm run package:vscode
```

Expected artifacts:

```text
dist/vmd-chrome-extension.zip
dist/vmd-vscode.vsix
dist/family-platform.html
```

Artifacts are generated locally and are not committed to Git by default.

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

The zip can be loaded manually or submitted to the Chrome Web Store later.

Before publishing publicly, review extension permissions carefully. Auto-render
requires matching `.vmd` URLs, and local file rendering requires explicit user
approval in Chrome.

## VS Code Extension Release

```bash
npm run package:vscode
```

The VSIX can be installed manually or published to the VS Code Marketplace later.

Before marketplace publication:

- choose a stable publisher id
- add icon assets
- add screenshots
- verify extension display names
- decide whether preview should be a default editor or optional editor

## GitHub Release

For a tagged release:

1. Update `CHANGELOG.md`.
2. Run all checks.
3. Create the package artifacts.
4. Tag the release.
5. Attach artifacts to the GitHub release.

The release notes should describe both format changes and runtime changes.
