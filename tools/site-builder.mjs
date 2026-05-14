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
  await copyFile(path.join(root, "docs", "assets", "vmd-gallery.png"), path.join(outDir, "assets", "vmd-gallery.png"));
  await copyFile(path.join(root, "docs", "assets", "vmd-playground.png"), path.join(outDir, "assets", "vmd-playground.png"));

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
      title: ast.doc.title,
      source,
      views: {
        read: renderVmd(ast, "read"),
        deck: renderVmd(ast, "deck"),
        map: renderVmd(ast, "map")
      }
    });

    await writeFile(path.join(outDir, "samples", file), source, "utf8");
    await writeFile(path.join(outDir, htmlFile), renderSamplePage(ast, source, file), "utf8");
  }

  await writeFile(path.join(outDir, "index.html"), renderIndex(samples), "utf8");
  await writeFile(path.join(outDir, "playground.html"), renderPlayground(samples[0]), "utf8");
  await writeFile(path.join(outDir, "benchmark.html"), await renderBenchmarkPage(root), "utf8");
}

function renderIndex(samples) {
  const heroSample = samples.find((sample) => sample.file === "ai-native-brief.vmd") || samples[0];
  const codePreview = heroSample ? truncateSource(heroSample.source, 620) : "";
  const renderedPreview = heroSample?.views?.deck || "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>VMD · Visual Semantic Markdown</title>
    <meta name="description" content="VMD is an open draft for AI-native visual documents that compile readable source into semantic, structured, visual, and preserved browser output.">
    <link rel="stylesheet" href="assets/vmd.css">
    <style>
      :root {
        --home-bg: #f8fafc;
        --home-ink: #101828;
        --home-muted: #536471;
        --home-line: #d7dee8;
        --home-panel: #ffffff;
        --home-teal: #0f766e;
        --home-blue: #1d4ed8;
        --home-green: #15803d;
        --home-amber: #b45309;
        --home-slate: #243447;
      }
      body { background: var(--home-bg); color: var(--home-ink); }
      a { color: inherit; }
      .site-nav {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 30;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        padding: 14px clamp(18px, 4vw, 56px);
        background: rgba(248, 250, 252, 0.9);
        border-bottom: 1px solid rgba(215, 222, 232, 0.72);
        backdrop-filter: blur(14px);
      }
      .brand {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        color: var(--home-ink);
        font-weight: 800;
        text-decoration: none;
      }
      .brand-mark {
        display: grid;
        width: 30px;
        height: 30px;
        place-items: center;
        border: 1px solid #91d5cf;
        border-radius: 8px;
        background: #ecfdf5;
        color: var(--home-teal);
        font-size: 12px;
      }
      .nav-links { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 8px; }
      .nav-links a,
      .hero-actions a,
      .link-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 38px;
        border: 1px solid var(--home-line);
        border-radius: 8px;
        padding: 8px 12px;
        background: #fff;
        color: var(--home-ink);
        text-decoration: none;
        font-size: 14px;
      }
      .nav-links a.primary,
      .hero-actions a.primary,
      .link-button.primary {
        border-color: var(--home-teal);
        background: var(--home-teal);
        color: #fff;
      }
      .hero {
        min-height: min(76vh, 720px);
        display: grid;
        align-items: end;
        padding: 110px clamp(18px, 5vw, 72px) 44px;
        background-image: linear-gradient(rgba(8, 18, 32, 0.64), rgba(8, 18, 32, 0.28)), url("assets/vmd-playground.png");
        background-size: cover;
        background-position: center;
        color: #fff;
      }
      .hero-inner { max-width: 1120px; }
      .hero h1 {
        max-width: 780px;
        font-size: clamp(56px, 9vw, 128px);
        line-height: 0.88;
        letter-spacing: 0;
      }
      .hero-copy {
        max-width: 760px;
        margin: 18px 0 0;
        color: #e5edf6;
        font-size: clamp(18px, 2.3vw, 28px);
        line-height: 1.34;
      }
      .hero-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 28px; }
      .hero-actions a { background: rgba(255, 255, 255, 0.92); }
      .hero-actions a.primary { background: #14b8a6; border-color: #14b8a6; color: #052e2b; font-weight: 800; }
      .section {
        padding: clamp(40px, 7vw, 84px) clamp(18px, 5vw, 72px);
      }
      .section-inner { max-width: 1180px; margin: 0 auto; }
      .section-head { display: grid; gap: 10px; max-width: 780px; margin-bottom: 24px; }
      .section-head h2 { font-size: clamp(32px, 4.5vw, 58px); line-height: 0.98; }
      .section-head p { margin: 0; color: var(--home-muted); font-size: 18px; line-height: 1.55; }
      .proof-strip {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        border-bottom: 1px solid var(--home-line);
        background: #fff;
      }
      .proof-item {
        min-height: 122px;
        border-right: 1px solid var(--home-line);
        padding: 22px clamp(16px, 3vw, 34px);
      }
      .proof-item:last-child { border-right: 0; }
      .proof-item strong { display: block; font-size: 26px; line-height: 1; }
      .proof-item span { display: block; margin-top: 8px; color: var(--home-muted); line-height: 1.4; }
      .split-demo {
        display: grid;
        grid-template-columns: minmax(320px, 0.9fr) minmax(380px, 1.1fr);
        gap: 18px;
        align-items: stretch;
      }
      .split-demo > *,
      .install-grid > *,
      .screenshot-band > * { min-width: 0; }
      .code-window,
      .render-window,
      .format-card,
      .tier-card,
      .install-panel,
      .sample-card {
        border: 1px solid var(--home-line);
        border-radius: 8px;
        background: var(--home-panel);
        box-shadow: 0 18px 42px rgba(16, 24, 40, 0.07);
      }
      .window-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        min-height: 44px;
        padding: 10px 14px;
        border-bottom: 1px solid var(--home-line);
        color: var(--home-muted);
        font-size: 13px;
      }
      .code-window pre {
        min-height: 460px;
        max-height: 560px;
        overflow: auto;
        margin: 0;
        padding: 18px;
        background: #0b1220;
        color: #dbeafe;
        font: 13px/1.62 "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      }
      .render-window { overflow: hidden; }
      .render-window .deck-view {
        display: grid;
        grid-auto-flow: row;
        grid-auto-columns: auto;
        grid-template-columns: 1fr;
        min-height: 460px;
        padding: 18px;
        background: #eef6f8;
        overflow: auto;
      }
      .render-window .slide {
        min-height: 420px;
        border: 1px solid #c6d8df;
        box-shadow: none;
      }
      .format-grid,
      .tier-grid,
      .sample-grid,
      .install-grid {
        display: grid;
        gap: 14px;
      }
      .format-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); }
      .tier-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
      .sample-grid { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
      .install-grid { grid-template-columns: 1.15fr 0.85fr; align-items: start; }
      .format-card,
      .tier-card,
      .sample-card,
      .install-panel {
        padding: 18px;
      }
      .format-card small,
      .tier-card small {
        display: inline-flex;
        min-height: 26px;
        align-items: center;
        border-radius: 999px;
        padding: 4px 9px;
        background: #eef2ff;
        color: #3730a3;
        font-weight: 700;
      }
      .format-card h3,
      .tier-card h3,
      .install-panel h3 { margin-top: 14px; font-size: 20px; }
      .format-card p,
      .tier-card p,
      .install-panel p,
      .sample-card span {
        color: var(--home-muted);
        line-height: 1.5;
      }
      .format-card p,
      .tier-card p,
      .install-panel p { margin-bottom: 0; }
      .tier-card:nth-child(1) { border-top: 4px solid var(--home-blue); }
      .tier-card:nth-child(2) { border-top: 4px solid var(--home-green); }
      .tier-card:nth-child(3) { border-top: 4px solid var(--home-amber); }
      .tier-card:nth-child(4) { border-top: 4px solid var(--home-teal); }
      .research-note {
        margin-top: 18px;
        border-left: 4px solid var(--home-teal);
        padding: 14px 16px;
        background: #ecfdf5;
        color: #164e45;
        line-height: 1.55;
      }
      .install-panel pre {
        overflow: auto;
        margin: 14px 0 0;
        border-radius: 8px;
        padding: 16px;
        background: #111827;
        color: #d1fae5;
        font: 13px/1.6 "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      }
      .sample-card {
        display: block;
        color: var(--home-ink);
        text-decoration: none;
      }
      .sample-card strong { display: block; font-size: 18px; }
      .sample-card span { display: block; margin-top: 8px; font-size: 13px; }
      .screenshot-band {
        display: grid;
        grid-template-columns: 0.9fr 1.1fr;
        gap: 18px;
        align-items: center;
      }
      .screenshot-band img {
        width: 100%;
        border: 1px solid var(--home-line);
        border-radius: 8px;
        background: #fff;
        box-shadow: 0 18px 42px rgba(16, 24, 40, 0.1);
      }
      .footer {
        padding: 28px clamp(18px, 5vw, 72px);
        border-top: 1px solid var(--home-line);
        background: #fff;
        color: var(--home-muted);
      }
      .footer-inner { max-width: 1180px; margin: 0 auto; display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; }
      .footer a { color: var(--home-ink); }
      @media (max-width: 1020px) {
        .format-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .tier-grid,
        .proof-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .split-demo,
        .install-grid,
        .screenshot-band { grid-template-columns: 1fr; }
      }
      @media (max-width: 680px) {
        .site-nav { position: static; align-items: flex-start; flex-direction: column; }
        .nav-links { justify-content: flex-start; }
        .hero { min-height: 620px; padding-top: 56px; }
        .proof-strip,
        .format-grid,
        .tier-grid { grid-template-columns: 1fr; }
        .proof-item { border-right: 0; border-bottom: 1px solid var(--home-line); }
        .code-window pre { min-height: 320px; }
        .render-window .deck-view { min-height: 320px; }
        .render-window .slide { min-height: 280px; }
      }
    </style>
  </head>
  <body>
    <nav class="site-nav" aria-label="Primary navigation">
      <a class="brand" href="index.html"><span class="brand-mark">VMD</span><span>Visual Semantic Markdown</span></a>
      <div class="nav-links">
        <a href="playground.html">Playground</a>
        <a href="benchmark.html">Benchmark</a>
        <a href="https://github.com/philo-kim/vmd">GitHub</a>
        <a class="primary" href="https://github.com/philo-kim/vmd/blob/main/docs/spec-draft-v0.md">Spec draft</a>
      </div>
    </nav>

    <main>
      <section class="hero">
        <div class="hero-inner">
          <p class="eyebrow">Open draft · .vmd</p>
          <h1>VMD</h1>
          <p class="hero-copy">A readable source format for AI-native visual documents: semantic like Markdown, structured like HTML, rendered through reusable visual systems.</p>
          <div class="hero-actions">
            <a class="primary" href="playground.html">Try the playground</a>
            <a href="https://github.com/philo-kim/vmd">View source</a>
            <a href="benchmark.html">Read the benchmark</a>
          </div>
        </div>
      </section>

      <section class="proof-strip" aria-label="VMD proof points">
        <div class="proof-item"><strong>3 modes</strong><span>Read, deck, and map from the same source.</span></div>
        <div class="proof-item"><strong>4 layers</strong><span>Semantic, structured, visual, and preserve fidelity.</span></div>
        <div class="proof-item"><strong>92.9%</strong><span>Average semantic draft reduction in the AI artifact benchmark.</span></div>
        <div class="proof-item"><strong>0 build lock-in</strong><span>Static HTML, Chrome polyfill, VS Code preview, and CLI.</span></div>
      </section>

      <section class="section">
        <div class="section-inner">
          <div class="section-head">
            <p class="eyebrow">Live shape</p>
            <h2>Write the role of the idea. Let the renderer choose the surface.</h2>
            <p>VMD treats the source as the durable artifact. HTML and CSS remain the browser output layer, while the VMD file keeps intent, structure, visual meaning, and fidelity choices inspectable.</p>
          </div>
          <div class="split-demo">
            <section class="code-window" aria-label="VMD source example">
              <div class="window-bar"><span>Source</span><strong>${escapeHtml(heroSample?.file || "sample.vmd")}</strong></div>
              <pre><code>${escapeHtml(codePreview)}</code></pre>
            </section>
            <section class="render-window" aria-label="Rendered VMD preview">
              <div class="window-bar"><span>Rendered output</span><strong>Deck mode</strong></div>
              ${renderedPreview}
            </section>
          </div>
        </div>
      </section>

      <section class="section" id="principles">
        <div class="section-inner">
          <div class="section-head">
            <p class="eyebrow">Source principles</p>
            <h2>The web needs a visual source format that AI can reason about.</h2>
            <p>The browser already renders. The missing layer is a compact source that can say what an idea is, what visual structure it needs, and when exact HTML/CSS preservation matters.</p>
          </div>
          <div class="format-grid">
            <article class="format-card">
              <small>Meaning</small>
              <h3>Thought has roles.</h3>
              <p>A block can be a claim, evidence, contrast, decision, or action instead of only styled prose.</p>
            </article>
            <article class="format-card">
              <small>Visual structure</small>
              <h3>Visuals carry reasoning.</h3>
              <p>Matrices, loops, timelines, and comparisons are part of the document argument.</p>
            </article>
            <article class="format-card">
              <small>Fidelity</small>
              <h3>Preservation is explicit.</h3>
              <p>Semantic documents stay compact; exact HTML/CSS artifacts use preserve mode.</p>
            </article>
            <article class="format-card">
              <small>Renderer</small>
              <h3>The browser remains the target.</h3>
              <p>The reference renderer produces browser-native HTML/CSS from the same source contract.</p>
            </article>
            <article class="format-card">
              <small>Inspection</small>
              <h3>The source must be reviewable.</h3>
              <p>A VMD file should stay readable in git and small enough for AI to edit safely.</p>
            </article>
          </div>
          <p class="research-note">VMD is not another page builder. It is the source layer before browser output.</p>
        </div>
      </section>

      <section class="section">
        <div class="section-inner">
          <div class="section-head">
            <p class="eyebrow">Fidelity ladder</p>
            <h2>VMD separates content, structure, style, and compatibility.</h2>
            <p>That separation is the point: new documents stay small and semantic, while existing HTML/CSS artifacts still have a preservation path.</p>
          </div>
          <div class="tier-grid">
            <article class="tier-card"><small>01</small><h3>Semantic</h3><p>Frames, claims, evidence, insight, decisions, and actions that validators can inspect.</p></article>
            <article class="tier-card"><small>02</small><h3>Structured</h3><p>Layout and component primitives for grids, panels, metrics, devices, and tabs.</p></article>
            <article class="tier-card"><small>03</small><h3>Visual</h3><p>Theme tokens, trusted CSS, SVG, matrices, timelines, loops, and comparisons.</p></article>
            <article class="tier-card"><small>04</small><h3>Preserve</h3><p>Raw compatibility blocks for imported HTML/CSS when pixel-level browser output matters.</p></article>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-inner screenshot-band">
          <div class="section-head">
            <p class="eyebrow">Use it today</p>
            <h2>A format draft with real rendering surfaces.</h2>
            <p>Open <code>.vmd</code> in the playground, render it from the CLI, load the Chrome polyfill, or preview it inside VS Code.</p>
            <div class="hero-actions">
              <a class="link-button primary" href="playground.html">Open playground</a>
              <a class="link-button" href="https://github.com/philo-kim/vmd/blob/main/docs/quickstart.md">Quickstart</a>
            </div>
          </div>
          <img src="assets/vmd-gallery.png" alt="VMD static gallery screenshot">
        </div>
      </section>

      <section class="section">
        <div class="section-inner">
          <div class="section-head">
            <p class="eyebrow">Install and render</p>
            <h2>Small enough for local workflows, explicit enough for AI agents.</h2>
          </div>
          <div class="install-grid">
            <article class="install-panel">
              <h3>CLI and static HTML</h3>
              <p>The npm package is named <code>vmd-format</code>; the installed binary is <code>vmd</code>.</p>
              <pre><code>npm install
node bin/vmd.mjs validate samples/source-layer-brief.vmd
node bin/vmd.mjs render samples/source-layer-brief.vmd --out dist/source-layer-brief.html
node bin/vmd.mjs gallery --out dist/site</code></pre>
            </article>
            <article class="install-panel">
              <h3>Reference extensions</h3>
              <p>Chrome renders local or web-served <code>.vmd</code> files. VS Code provides highlighting, snippets, diagnostics, and live preview.</p>
              <pre><code>npm run package:chrome
npm run package:vscode
npm run test:extensions</code></pre>
            </article>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-inner">
          <div class="section-head">
            <p class="eyebrow">Samples</p>
            <h2>Inspect the source and switch output modes.</h2>
          </div>
          <section class="sample-grid" aria-label="Samples">
        ${samples.map((sample) => `<a class="sample-card" href="${sample.htmlFile}">
          <strong>${escapeHtml(sample.title)}</strong>
          <span>${escapeHtml(sample.file)}</span>
        </a>`).join("")}
          </section>
        </div>
      </section>
    </main>
    <footer class="footer">
      <div class="footer-inner">
        <span>VMD is an experimental open draft for layered visual documents.</span>
        <span><a href="https://github.com/philo-kim/vmd">GitHub</a> · <a href="https://github.com/philo-kim/vmd/blob/main/docs/spec-draft-v0.md">Spec</a> · <a href="benchmark.html">Benchmark</a></span>
      </div>
    </footer>
  </body>
</html>`;
}

function truncateSource(source, maxLength) {
  const text = String(source || "").trim();
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength).trimEnd()}\n...`;
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
        <p>HTML remains the native browser substrate. VMD is the higher-level source for layered visual documents with explicit fidelity.</p>
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
