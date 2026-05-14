# Changelog

This project follows a human-readable changelog style inspired by
[Keep a Changelog](https://keepachangelog.com/).

## Unreleased

### Added

- Public VMD manifesto, draft spec, browser integration, and implementation
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
- Reproducible VMD vs Markdown vs HTML format benchmark.
- Open Design AI artifact benchmark for measuring generated HTML as VMD source
  material.
- Layered VMD fidelity tiers covering semantic, structured, visual, preserve,
  and future interactive documents.
- Layout, style, raw compatibility, component, and matrix visual blocks.
- Preserve-mode Chrome auto-render behavior for high-fidelity HTML/CSS imports.
- Preserve-mode Chrome auto-render guard that avoids injecting extension CSS
  into preserved documents.
- Preserve-mode rendering for supported `html` and `body` attributes so
  imported pages can keep root selectors such as `body.source-page`.
- Raw HTML/SVG executable markup guard that disables script tags, inline event
  handlers, and `javascript:` URL attributes in the reference renderer.
- Packaged Chrome viewer layered sample for layout/style/raw compatibility
  preview.
- Playwright visual fidelity checker for semantic and preserve conversion.
- Static HTML sample rendering.
- CLI test coverage.
- Integration tests for Chrome and VS Code extensions.
- Contribution, security, support, and release documentation.

### Notes

- VMD is pre-1.0 and the AST is not stable yet.
