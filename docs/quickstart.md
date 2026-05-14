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
samples/family-platform.vmd
```

The source is plain text. It uses Markdown-style headings and semantic blocks:

```vmd
::frame[role="opening"]
  ::claim
  Allowance management is not the end point.
  It is the starting point for self-directed behavior inside the family.
  ::
::
```

## 3. Render To Static HTML

```bash
npm run render:sample
```

The rendered file is written to:

```text
dist/family-platform.html
```

## 4. Try The Chrome Polyfill

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
7. Open `samples/family-platform.vmd` in Chrome

The file should render as a visual document instead of remaining plain text.

## 5. Try The VS Code Extension

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

## 6. Run Checks

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
