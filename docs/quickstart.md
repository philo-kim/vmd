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
samples/visual-lossless-dashboard.vmd
```

The source is plain text. It declares a visual-lossless contract:

```vmd
@doc "Pulse Analytics Overview" {
  spec: vmd@0.1
  fidelity: visual-lossless
}

@lock {
  renderer: vmd-web@0.3.0
}

@edit_state {
  source: clean
  replay: current
  dirty: none
}
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
node bin/vmd.mjs render samples/visual-lossless-dashboard.vmd --out dist/visual-lossless-dashboard.html --mode read
```

## 4. Validate The Source

```bash
node bin/vmd.mjs validate samples/visual-lossless-dashboard.vmd
```

Validation reports parse errors, unknown blocks, incomplete visual blocks, and
visual-lossless contract warnings such as missing lock, replay, residual index,
or edit-state handling.

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
7. Open `samples/visual-lossless-dashboard.vmd` in Chrome

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
