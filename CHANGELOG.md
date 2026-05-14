# Changelog

This project follows a human-readable changelog style inspired by
[Keep a Changelog](https://keepachangelog.com/).

## Unreleased

### Added

- Public VMD manifesto, vision, draft spec, roadmap, and browser integration
  documents.
- Shared VMD parser and renderer core.
- Chrome extension browser polyfill for `.vmd` URLs.
- VS Code extension for `.vmd` authoring, diagnostics, snippets, and preview.
- Reference CLI for rendering, AST output, validation, and gallery builds.
- Shared validator for semantic and visual block diagnostics.
- Strict and JSON validation output for CLI workflows.
- Chrome viewer diagnostics for loaded VMD source.
- Draft AST JSON Schema.
- Static gallery and playground builder with GitHub Pages workflow.
- Reusable local GitHub Action for rendering VMD to HTML.
- Public Pages smoke test script.
- End-to-end project audit document.
- Reproducible VMD vs Markdown vs HTML format benchmark.
- Layered VMD fidelity tiers covering semantic, structured, visual, preserve,
  and future interactive documents.
- Layout, style, raw compatibility, component, and matrix visual blocks.
- Preserve-mode Chrome auto-render behavior for high-fidelity HTML/CSS imports.
- Preserve-mode Chrome auto-render guard that avoids injecting extension CSS
  into preserved documents.
- Packaged Chrome viewer layered sample for layout/style/raw compatibility
  preview.
- Playwright visual fidelity checker for semantic and preserve conversion.
- Static HTML sample rendering.
- CLI test coverage.
- Integration tests for Chrome and VS Code extensions.
- Contribution, security, support, and release documentation.

### Notes

- VMD is pre-1.0 and the AST is not stable yet.
