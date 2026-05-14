# Browser Integration

This repository includes a Chrome extension that renders `.vmd` files with the
reference parser and renderer.

## Automatic Local File Rendering

When a local `.vmd` file is opened in Chrome, the content script detects the
file, parses the source, and replaces the plain-text view with rendered HTML.

Chrome requires explicit file access:

1. Open `chrome://extensions`
2. Open the VMD extension details page
3. Enable `Allow access to file URLs`
4. Open a local `.vmd` file in Chrome

If a document declares preserve fidelity:

```vmd
@doc "Imported Page" {
  fidelity: preserve
}
```

the automatic renderer skips the normal VMD toolbar, avoids injecting the
extension stylesheet, avoids adding VMD classes to `body`, and applies preserved
`html` and `body` attributes before replacing the page content.

## Manual Viewer

The extension also includes a viewer page where users can upload or drag a
`.vmd` file. The viewer can render read, deck, and map modes and display
validator diagnostics.

## Web-Served VMD

The extension can also render web-served `.vmd` URLs that match the extension's
host permissions. Web-served files do not require Chrome's local file access
permission.

## Static HTML Output

The CLI can render `.vmd` source into static HTML:

```bash
node bin/vmd.mjs render samples/source-layer-brief.vmd --out dist/source-layer-brief.html
```

The gallery builder uses the same renderer to produce the static demo site.

## References

- [Chrome extension match patterns](https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns)
  support `file:///` local-file matching, but require the user to grant file
  access.
- [Chrome extension permissions](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions)
  document the user-controlled `Allow access to file URLs` setting.
