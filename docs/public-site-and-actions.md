# Public Site And GitHub Actions

VMD needs a public surface that demonstrates the format without requiring users
to install an editor or browser extension first.

This repository provides two GitHub-native pieces:

- a static sample gallery and playground
- a reusable render action for `.vmd` files

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
  ai-native-brief.html
  family-platform.html
  lesson-outline.html
  assets/
  samples/
```

The gallery renders each sample in read, deck, and map modes. The playground
lets authors edit VMD source in the browser and see the rendered result.

## GitHub Pages Workflow

The Pages workflow is:

```text
.github/workflows/pages.yml
```

On `main`, it installs dependencies, runs `npm run build:site`, uploads
`dist/site`, and deploys through GitHub Pages.

Repository Pages settings may still need to be enabled for the first deploy,
depending on the GitHub repository configuration.

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

The purpose is not only convenience. It demonstrates how other repositories
could make `.vmd` files part of their documentation pipelines.

## Strategic Role

Markdown spread because it was useful inside existing workflows. For VMD, the
GitHub path should become:

```text
write .vmd -> validate in CI -> render previews -> publish a visual page
```

That loop is the practical bridge between a local draft format and a format that
could later be rendered natively by browsers or platforms.
