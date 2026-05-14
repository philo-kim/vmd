import { copyFile, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  parseVmd,
  renderVmd,
  escapeHtml
} = require("../core/vmd-core.cjs");

export async function buildSite({ root, samplesDir, outDir }) {
  await mkdir(outDir, { recursive: true });
  await mkdir(path.join(outDir, "assets"), { recursive: true });
  await mkdir(path.join(outDir, "samples"), { recursive: true });

  await copyFile(path.join(root, "core", "vmd-core.cjs"), path.join(outDir, "assets", "vmd-core.js"));
  await copyFile(path.join(root, "extension", "styles.css"), path.join(outDir, "assets", "vmd.css"));

  const sampleFiles = (await readdir(samplesDir))
    .filter((file) => file.endsWith(".vmd"))
    .sort();
  const samples = [];

  for (const file of sampleFiles) {
    const source = await readFile(path.join(samplesDir, file), "utf8");
    const ast = parseVmd(source);
    const slug = path.basename(file, ".vmd");
    const htmlFile = `${slug}.html`;
    samples.push({
      file,
      slug,
      htmlFile,
      title: ast.doc.title
    });

    await writeFile(path.join(outDir, "samples", file), source, "utf8");
    await writeFile(path.join(outDir, htmlFile), renderSamplePage(ast, source, file), "utf8");
  }

  await writeFile(path.join(outDir, "index.html"), renderIndex(samples), "utf8");
  await writeFile(path.join(outDir, "playground.html"), renderPlayground(samples[0]), "utf8");
  await writeFile(path.join(outDir, "benchmark.html"), await renderBenchmarkPage(root), "utf8");
}

function renderIndex(samples) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>VMD Gallery</title>
    <link rel="stylesheet" href="assets/vmd.css">
    <style>
      .gallery-shell { padding: clamp(24px, 5vw, 72px); }
      .gallery-hero { max-width: 960px; margin: 0 auto 32px; }
      .gallery-hero h1 { font-size: 72px; line-height: 0.95; }
      .gallery-links { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 22px; }
      .gallery-link { border: 1px solid var(--line); border-radius: 8px; padding: 9px 12px; background: #fff; color: var(--ink); text-decoration: none; }
      .sample-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; max-width: 960px; margin: 0 auto; }
      .sample-card { border: 1px solid var(--line); border-radius: 8px; padding: 18px; background: #fff; color: var(--ink); text-decoration: none; }
      .sample-card span { display: block; margin-top: 8px; color: var(--muted); font-size: 13px; }
      @media (max-width: 760px) { .gallery-hero h1 { font-size: 44px; } }
    </style>
  </head>
  <body>
    <main class="gallery-shell">
      <section class="gallery-hero">
        <p class="eyebrow">VMD Gallery</p>
        <h1>Semantic visual documents for AI-assisted creation.</h1>
        <div class="gallery-links">
          <a class="gallery-link" href="playground.html">Open playground</a>
          <a class="gallery-link" href="benchmark.html">View benchmark</a>
          <a class="gallery-link" href="https://github.com/philo-kim/vmd">GitHub repo</a>
        </div>
      </section>
      <section class="sample-grid" aria-label="Samples">
        ${samples.map((sample) => `<a class="sample-card" href="${sample.htmlFile}">
          <strong>${escapeHtml(sample.title)}</strong>
          <span>${escapeHtml(sample.file)}</span>
        </a>`).join("")}
      </section>
    </main>
  </body>
</html>`;
}

async function renderBenchmarkPage(root) {
  const benchmark = JSON.parse(await readFile(path.join(root, "benchmarks", "results", "format-benchmark.json"), "utf8"));
  const rows = benchmark.results.map((result) => `<tr>
    <th scope="row">${escapeHtml(result.format)}</th>
    <td>${result.sourceBytes}</td>
    <td>${result.sourceLines}</td>
    <td>${result.approxTokens}</td>
    <td>${result.authoringOverheadBytes} (${result.authoringOverheadPercent}%)</td>
    <td>${result.standardizedSemanticRoles}</td>
    <td>${result.conventionSemanticHints}</td>
    <td>${result.visualPrimitives}</td>
    <td>${result.renderModesFromOneSource}</td>
    <td>${result.browserNativeToday ? "yes" : "no"}</td>
    <td>${result.contentValidation.supported ? `yes (${result.contentValidation.errors} errors, ${result.contentValidation.warnings} warnings)` : "no"}</td>
  </tr>`).join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>VMD Benchmark</title>
    <link rel="stylesheet" href="assets/vmd.css">
    <style>
      .benchmark-shell { padding: clamp(24px, 5vw, 72px); }
      .benchmark-hero, .benchmark-section { max-width: 1080px; margin: 0 auto 28px; }
      .benchmark-hero h1 { font-size: 56px; line-height: 0.98; }
      .benchmark-links { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
      .benchmark-link { border: 1px solid var(--line); border-radius: 8px; padding: 9px 12px; background: #fff; color: var(--ink); text-decoration: none; }
      .table-wrap { overflow: auto; border: 1px solid var(--line); border-radius: 8px; background: #fff; }
      table { width: 100%; border-collapse: collapse; min-width: 980px; }
      th, td { padding: 12px; border-bottom: 1px solid var(--line); text-align: left; vertical-align: top; }
      thead th { background: var(--surface-strong); font-size: 12px; text-transform: uppercase; }
      tbody th { color: var(--accent-strong); }
      .takeaways { display: grid; gap: 12px; }
      .takeaways p { margin: 0; border: 1px solid var(--line); border-radius: 8px; padding: 14px; background: #fff; line-height: 1.55; }
      @media (max-width: 760px) { .benchmark-hero h1 { font-size: 38px; } }
    </style>
  </head>
  <body>
    <main class="benchmark-shell">
      <section class="benchmark-hero">
        <p class="eyebrow">VMD Benchmark</p>
        <h1>VMD vs Markdown vs browser-ready HTML.</h1>
        <div class="benchmark-links">
          <a class="benchmark-link" href="index.html">Gallery</a>
          <a class="benchmark-link" href="playground.html">Playground</a>
          <a class="benchmark-link" href="https://github.com/philo-kim/vmd/blob/main/docs/format-benchmark.md">Benchmark source</a>
        </div>
      </section>
      <section class="benchmark-section">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Format</th>
                <th>Bytes</th>
                <th>Lines</th>
                <th>Tokens</th>
                <th>Overhead</th>
                <th>Native roles</th>
                <th>Hints</th>
                <th>Visuals</th>
                <th>Modes</th>
                <th>Native</th>
                <th>Validation</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </section>
      <section class="benchmark-section takeaways">
        <p>Compared with Markdown, VMD is ${benchmark.comparisons.vmdVsMarkdown.sourceBytesDeltaPercent}% larger in this case, but adds ${benchmark.comparisons.vmdVsMarkdown.standardizedSemanticRoleGain} native semantic roles, ${benchmark.comparisons.vmdVsMarkdown.renderModeGain} extra render modes, and validator support.</p>
        <p>Compared with the browser-ready HTML fixture, VMD is ${benchmark.comparisons.vmdVsHtml.sourceBytesReductionPercent}% smaller while preserving the same number of render modes through the renderer.</p>
        <p>HTML remains the native browser substrate. VMD is the higher-level source for semantic visual documents.</p>
      </section>
    </main>
  </body>
</html>`;
}

function renderSamplePage(ast, source, file) {
  const data = JSON.stringify({
    source,
    views: {
      read: renderVmd(ast, "read"),
      deck: renderVmd(ast, "deck"),
      map: renderVmd(ast, "map")
    }
  }).replace(/<\//g, "<\\/");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(ast.doc.title)}</title>
    <link rel="stylesheet" href="assets/vmd.css">
    <style>
      .sample-toolbar { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px clamp(18px, 4vw, 48px); border-bottom: 1px solid var(--line); background: rgba(247,244,237,0.94); }
      .sample-toolbar a { color: var(--accent-strong); text-decoration: none; }
      .source-panel { max-width: 960px; margin: 0 auto; padding: 24px; }
      .source-panel pre { overflow: auto; border-radius: 8px; padding: 18px; background: #0f172a; color: #dbeafe; line-height: 1.55; }
    </style>
  </head>
  <body>
    <header class="sample-toolbar">
      <a href="index.html">VMD Gallery</a>
      <div class="mode-tabs" role="tablist" aria-label="Render mode">
        <button class="mode-tab active" data-mode="read" type="button">Read</button>
        <button class="mode-tab" data-mode="deck" type="button">Deck</button>
        <button class="mode-tab" data-mode="map" type="button">Map</button>
        <button class="mode-tab" data-mode="source" type="button">Source</button>
      </div>
    </header>
    <main id="preview"></main>
    <script>
      const data = ${data};
      const preview = document.getElementById("preview");
      const tabs = Array.from(document.querySelectorAll(".mode-tab"));
      function render(mode) {
        if (mode === "source") {
          preview.innerHTML = '<section class="source-panel"><p class="eyebrow">${escapeHtml(file)}</p><pre><code></code></pre></section>';
          preview.querySelector("code").textContent = data.source;
        } else {
          preview.innerHTML = data.views[mode] || data.views.read;
        }
        for (const tab of tabs) tab.classList.toggle("active", tab.dataset.mode === mode);
      }
      for (const tab of tabs) tab.addEventListener("click", () => render(tab.dataset.mode));
      render("read");
    </script>
  </body>
</html>`;
}

function renderPlayground(firstSample) {
  const sampleUrl = firstSample ? `samples/${firstSample.file}` : "";
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>VMD Playground</title>
    <link rel="stylesheet" href="assets/vmd.css">
    <style>
      body { overflow: hidden; }
      .playground { display: grid; grid-template-columns: minmax(320px, 0.8fr) minmax(420px, 1.2fr); height: 100vh; }
      .editor-pane, .render-pane { min-width: 0; min-height: 0; }
      .editor-pane { display: grid; grid-template-rows: auto 1fr; border-right: 1px solid var(--line); }
      .playground-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--line); }
      .playground-head a, .playground-head button { border: 1px solid var(--line); border-radius: 8px; padding: 8px 10px; background: #fff; color: var(--ink); text-decoration: none; cursor: pointer; }
      textarea { width: 100%; height: 100%; resize: none; border: 0; padding: 16px; background: #0f172a; color: #dbeafe; font: 13px/1.6 "SFMono-Regular", Consolas, monospace; outline: none; }
      #preview { height: 100%; overflow: auto; background: var(--surface); }
      .render-pane { display: grid; grid-template-rows: auto auto 1fr; }
      .diagnostics { display: none; gap: 8px; max-height: 120px; overflow: auto; padding: 10px 16px; border-bottom: 1px solid var(--line); background: #fff; }
      .diagnostics.active { display: grid; }
      .diagnostic { border-left: 3px solid var(--warn); padding-left: 8px; color: var(--muted); font-size: 13px; line-height: 1.4; }
      .diagnostic.error { border-color: #dc2626; color: #991b1b; }
      .error { margin: 20px; }
      @media (max-width: 900px) { .playground { grid-template-columns: 1fr; grid-template-rows: minmax(280px, 0.8fr) minmax(320px, 1.2fr); } .editor-pane { border-right: 0; border-bottom: 1px solid var(--line); } }
    </style>
  </head>
  <body>
    <main class="playground">
      <section class="editor-pane" aria-label="VMD source editor">
        <div class="playground-head">
          <a href="index.html">Gallery</a>
          <button id="load-sample" type="button">Load sample</button>
        </div>
        <textarea id="source" spellcheck="false" wrap="off"></textarea>
      </section>
      <section class="render-pane" aria-label="Rendered preview">
        <div class="playground-head">
          <p class="eyebrow">Preview</p>
          <div class="mode-tabs" role="tablist" aria-label="Render mode">
            <button class="mode-tab active" data-mode="read" type="button">Read</button>
            <button class="mode-tab" data-mode="deck" type="button">Deck</button>
            <button class="mode-tab" data-mode="map" type="button">Map</button>
          </div>
        </div>
        <div id="diagnostics" class="diagnostics"></div>
        <div id="preview"></div>
      </section>
    </main>
    <script src="assets/vmd-core.js"></script>
    <script>
      const source = document.getElementById("source");
      const preview = document.getElementById("preview");
      const diagnostics = document.getElementById("diagnostics");
      const tabs = Array.from(document.querySelectorAll(".mode-tab"));
      let mode = "read";

      function render() {
        try {
          const ast = VMDCore.parseVmd(source.value);
          renderDiagnostics(VMDCore.validateVmdAst(ast));
          preview.innerHTML = VMDCore.renderVmd(ast, mode);
        } catch (error) {
          renderDiagnostics([]);
          preview.innerHTML = '<div class="error"></div>';
          preview.querySelector(".error").textContent = error.message;
        }
        for (const tab of tabs) tab.classList.toggle("active", tab.dataset.mode === mode);
      }

      for (const tab of tabs) tab.addEventListener("click", () => { mode = tab.dataset.mode; render(); });
      source.addEventListener("input", render);
      document.getElementById("load-sample").addEventListener("click", loadSample);

      async function loadSample() {
        const response = await fetch("${sampleUrl}");
        source.value = await response.text();
        render();
      }

      function renderDiagnostics(items) {
        diagnostics.classList.toggle("active", items.length > 0);
        diagnostics.innerHTML = "";
        for (const item of items) {
          const row = document.createElement("div");
          row.className = "diagnostic " + item.level;
          row.textContent = (item.line ? "Line " + item.line + ": " : "") + item.code + " - " + item.message;
          diagnostics.appendChild(row);
        }
      }

      loadSample();
    </script>
  </body>
</html>`;
}
