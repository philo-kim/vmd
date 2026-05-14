# Quickstart

This guide gets from a plain `.vmd` file to a rendered visual document.

## 1. Install

```bash
git clone https://github.com/philo-kim/vmd.git
cd vmd
npm install
```

## 2. Read The Sample

Open:

```text
samples/source-layer-brief.vmd
```

The source is plain text. It uses Markdown-style headings and semantic blocks:

```vmd
::frame[role="opening"]
  ::claim
  Generated HTML is useful output.
  It should not always be the editable source.
  ::
::
```

## 3. Render To Static HTML

```bash
npm run render:sample
```

The rendered file is written to:

```text
dist/source-layer-brief.html
```

You can also use the CLI directly:

```bash
node bin/vmd.mjs render samples/source-layer-brief.vmd --out dist/source-layer-brief.html --mode read
```

## 4. Validate The Source

```bash
node bin/vmd.mjs validate samples/source-layer-brief.vmd
```

Validation reports parse errors, unknown blocks, incomplete visual blocks, and
semantic authoring warnings such as claims without evidence.

## 5. Build The Gallery And Playground

```bash
npm run build:site
```

Open:

```text
dist/site/index.html
```

The generated site includes rendered samples and a browser playground.

## 6. Try The Chrome Polyfill

```bash
npm run package:chrome
```

Then:

1. Open `chrome://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select the `extension/` directory
5. Open the extension details page
6. Enable `Allow access to file URLs`
7. Open `samples/source-layer-brief.vmd` in Chrome

The file should render as a visual document instead of remaining plain text.

## 7. Try The VS Code Extension

```bash
npm run package:vscode
```

Then install:

```bash
code --install-extension dist/vmd-vscode.vsix
```

If `code` is not available in your shell, open VS Code and run:

```text
Extensions: Install from VSIX...
```

Open a `.vmd` file and run:

```text
VMD: Open Preview to Side
```

The extension also provides syntax highlighting, snippets, validator
diagnostics, and a live preview webview.

## 8. Run Checks

```bash
npm run check
```

Run integration checks:

```bash
npm run test:chrome
npm run test:vscode
```

The Chrome test launches a real Chromium instance with the unpacked extension.
The VS Code test launches a real VS Code extension host.
