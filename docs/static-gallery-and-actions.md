# Static Gallery And Render Actions

This repository includes a static sample gallery, browser playground, and local
composite GitHub Action for rendering `.vmd` files.

The canonical public VMD page is hosted as part of the `philo.kim` site:

```text
https://philo.kim/vmd/
```

This repository's gallery build is a reference output for samples and local
testing. It is not the canonical public homepage.

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
  source-layer-brief.html
  lesson-outline.html
  visual-fidelity-layers.html
  assets/
  samples/
```

The gallery renders each sample in read, deck, and map modes. The playground
lets authors edit VMD source in the browser and see the rendered result. The
benchmark page publishes the VMD vs Markdown vs HTML comparison.

## Reusable Render Action

The local composite action is:

```text
.github/actions/render-vmd/action.yml
```

Example use inside this repository:

```yaml
- uses: ./.github/actions/render-vmd
  with:
    input: samples/source-layer-brief.vmd
    output: dist/source-layer-brief.html
    mode: deck
    css: ../extension/styles.css
```

The action is meant as a reference for VMD rendering pipelines. It does not
publish a separate public site by itself.
