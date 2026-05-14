# Security Policy

VMD is experimental and pre-1.0.

## Supported Versions

Only the current `main` branch is supported at this stage.

## Reporting A Vulnerability

Please do not open a public GitHub issue for security-sensitive reports.

Instead, contact the maintainer directly through the GitHub repository owner
profile or open a private advisory if GitHub security advisories are enabled.

Include:

- affected files
- reproduction steps
- expected behavior
- actual behavior
- impact
- suggested fix, if available

## Security Notes

The renderer escapes normal text content before inserting it into generated
HTML.

Compatibility blocks can intentionally carry raw HTML, SVG, CSS, and preserved
browser output. Treat `.vmd` files that use `raw.*` or `style.css` as trusted
content. The reference renderer disables `raw.js`, and raw HTML/SVG rendering
also disables `<script>` tags, inline event-handler attributes, and
`javascript:` URL attributes. This is a defense-in-depth guard, not a complete
HTML sanitizer.

Chrome extension permissions should remain narrow. The extension should only
auto-render `.vmd` URLs and should not inspect unrelated pages.
