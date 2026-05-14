# Contributing

VMD is an open draft for intent-readable visual-lossless documents.

The most valuable contributions right now are those that improve the format's
clarity, portability, and usefulness for AI-assisted visual documents.

## Good First Contributions

- Add sample `.vmd` documents.
- Improve wording in the public docs.
- Propose source-slot, replay, residual, and edit-state improvements.
- Add renderer test cases.
- Improve CLI, validator, or gallery behavior.
- Improve accessibility mappings.
- Improve extension preview behavior.

## Design Rules

- Keep VMD readable as plain text.
- Treat visual-lossless as a strict restoration claim under a fixed render lock.
- Treat AI-editable slots and renderer replay payloads as separate responsibilities.
- Keep parser and renderer behavior shared through `core/vmd-core.cjs`.
- Avoid adding a build system unless the complexity is clearly justified.
- Prefer small, testable changes.

## Development Setup

```bash
npm install
npm run check
```

Run extension tests:

```bash
npm run test:chrome
npm run test:vscode
```

Build the public gallery:

```bash
npm run build:site
```

Package local extensions:

```bash
npm run package:chrome
npm run package:vscode
npm run package:npm:dry-run
```

## Pull Request Checklist

Before opening a PR:

- Run `npm run check`.
- Update docs when behavior changes.
- Add or update samples when adding syntax.
- Run `npm run capture:screenshots` when README-visible rendering changes.
- Run extension tests when changing Chrome or VS Code behavior.
- Keep generated runtime copies synced with `npm run sync:core`.
- Run `npm run smoke:public` after Pages-facing changes are deployed.

## Proposing Syntax

A syntax proposal should include:

- the problem it solves
- example `.vmd` source
- expected AST shape
- expected rendering behavior across read, deck, and map modes
- expected restoration or dirty-state behavior when the proposal affects
  `fidelity: visual-lossless`
- why the meaning cannot be expressed with existing blocks

Avoid adding new blocks for decoration-only use cases.
