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

The current renderer escapes text content before inserting it into generated
HTML. Any future feature that allows embedded HTML, remote assets, scripting, or
custom themes must be reviewed as a security-sensitive change.

Chrome extension permissions should remain narrow. The extension should only
auto-render `.vmd` URLs and should not inspect unrelated pages.
