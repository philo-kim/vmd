# Browser Integration

VMD is intended to become a browser-readable visual document format.

The ideal future behavior:

```text
Open a .vmd file in a browser.
The browser renders it as a visual webpage.
```

Until browsers support VMD natively, this repository treats the Chrome extension
as a polyfill.

## Level 1: Extension Polyfill

The current extension provides two paths.

### Automatic Local File Rendering

When a local `.vmd` file is opened in Chrome, a content script detects the file,
parses the source, and replaces the plain-text view with rendered HTML.

Chrome requires the user to enable file URL access for this:

1. Open `chrome://extensions`
2. Open the VMD extension details page
3. Enable `Allow access to file URLs`
4. Open a local `.vmd` file in Chrome

This is the closest current behavior to browser-native VMD rendering.

### Manual Viewer

The extension also includes a viewer page where users can upload or drag a
`.vmd` file. This remains useful when automatic file rendering is unavailable.

## Level 2: Installed Web App File Handler

A VMD web app can later register itself as a file handler using the web app File
Handling API.

That would let an installed VMD app open `.vmd` files from the operating system.
This behaves more like a document app than browser-native rendering, but it is a
strong distribution path.

## Level 3: Web-Served VMD

A future server can publish VMD with a dedicated MIME type, for example:

```text
text/vmd
```

Before native support exists, a server could transform VMD to HTML at request
time or serve a small renderer shell that loads the VMD source.

The current repository implements the static version of this path:

```text
.vmd source -> CLI/gallery builder -> static HTML -> GitHub Pages
```

That is not native browser support, but it gives the format a public,
browser-readable distribution surface immediately.

## Level 4: Native Browser Support

If VMD becomes widely used, the long-term target is native browser support:

- registered MIME type
- browser-level parser
- default rendering to web-native HTML/CSS
- inspectable semantic AST
- extension and DevTools hooks
- accessibility mapping for semantic blocks

That path requires ecosystem adoption first. The repository should therefore
focus on making the format useful, readable, interoperable, and easy to
implement.

## Current Constraints

The extension cannot silently become the operating-system default handler for
all `.vmd` files across every desktop environment.

Current practical paths are:

- content script rendering for local `.vmd` files opened in Chrome
- upload and drag-and-drop viewer
- installed PWA file handling
- static HTML export
- GitHub Pages gallery and playground
- future browser-native support if adoption justifies it

## References

- [Chrome extension match patterns](https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns)
  support `file:///` local-file matching, but require the user to grant file
  access.
- [Chrome extension permissions](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions)
  document the user-controlled `Allow access to file URLs` setting.
- [Chrome extension file handlers](https://developer.chrome.com/docs/extensions/reference/manifest/file-handlers)
  are currently scoped to ChromeOS extensions.
- [The web app File Handling API](https://developer.chrome.com/docs/capabilities/web-apis/file-handling)
  is the stronger installed-app path for desktop file association.
