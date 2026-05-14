# Public Site, Vercel, And GitHub Actions

This repository includes a static sample gallery, browser playground, and local
composite GitHub Action for rendering `.vmd` files.

## Static Gallery

Build locally:

```bash
npm run build:site
```

Output:

```text
dist/site/
  index.html
  playground.html
  benchmark.html
  ai-native-brief.html
  family-platform.html
  lesson-outline.html
  assets/
  samples/
```

The gallery renders each sample in read, deck, and map modes. The playground
lets authors edit VMD source in the browser and see the rendered result. The
benchmark page publishes the VMD vs Markdown vs HTML comparison.

The current production site is:

```text
https://vmd-sandy.vercel.app/
```

## Vercel Deployment

The Vercel project uses:

```text
vercel.json
```

Project settings:

- install command: `npm ci`
- build command: `npm run build:site`
- output directory: `dist/site`

The `.vercelignore` file excludes local dependencies, generated output, and
private local notes from deploy uploads.

## GitHub Pages Workflow

The Pages workflow is:

```text
.github/workflows/pages.yml
```

On `main`, it installs dependencies, runs `npm run build:site`, uploads
`dist/site`, and deploys through GitHub Pages.

Repository Pages settings may need to be enabled in GitHub before the first
deploy.

## Reusable Render Action

The local composite action is:

```text
.github/actions/render-vmd/action.yml
```

Example use inside this repository:

```yaml
- uses: ./.github/actions/render-vmd
  with:
    input: samples/family-platform.vmd
    output: dist/family-platform.html
    mode: deck
    css: ../extension/styles.css
```
