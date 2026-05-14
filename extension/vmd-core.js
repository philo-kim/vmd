(function initVmdCore(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.VMDCore = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createVmdCore() {
  const BLOCK_OPEN_RE = /^::([a-zA-Z][\w-]*)(?:\.([a-zA-Z][\w-]*))?(?:\[(.*)\])?\s*$/;
  const HEADING_RE = /^(#{1,6})\s+(.+)$/;
  const DOC_RE = /^@doc\s+"([^"]+)"\s*\{\s*$/;
  const SEMANTIC_BLOCK_TYPES = [
    "claim",
    "evidence",
    "insight",
    "decision",
    "action",
    "observation",
    "counterpoint",
    "principle",
    "risk",
    "question"
  ];
  const VISUAL_BLOCK_TYPES = [
    "visual.compare",
    "visual.loop",
    "visual.timeline",
    "visual.matrix"
  ];
  const LAYOUT_BLOCK_TYPES = [
    "layout.stack",
    "layout.grid",
    "layout.split",
    "layout.cluster",
    "layout.panel",
    "layout.device",
    "layout.tabs"
  ];
  const STYLE_BLOCK_TYPES = [
    "style.tokens",
    "style.css"
  ];
  const RAW_BLOCK_TYPES = [
    "raw.html",
    "raw.css",
    "raw.svg",
    "raw.js"
  ];
  const COMPONENT_BLOCK_TYPES = [
    "component.card",
    "component.metric",
    "component.persona",
    "component.phone",
    "component.token-table",
    "component.browser"
  ];
  const SEMANTIC_BLOCKS = new Set(SEMANTIC_BLOCK_TYPES);
  const VISUAL_BLOCKS = new Set(VISUAL_BLOCK_TYPES);
  const LAYOUT_BLOCKS = new Set(LAYOUT_BLOCK_TYPES);
  const STYLE_BLOCKS = new Set(STYLE_BLOCK_TYPES);
  const RAW_BLOCKS = new Set(RAW_BLOCK_TYPES);
  const COMPONENT_BLOCKS = new Set(COMPONENT_BLOCK_TYPES);
  const FIDELITY_TIERS = new Set(["semantic", "structured", "visual", "preserve", "interactive"]);

  function parseVmd(source) {
    const lines = source.replace(/\r\n?/g, "\n").split("\n");
    const ast = {
      type: "document",
      doc: {
        title: "Untitled VMD",
        attrs: {}
      },
      children: []
    };
    const stack = [ast];

    for (let index = 0; index < lines.length; index += 1) {
      const raw = lines[index];
      const trimmed = raw.trim();

      if (!trimmed) {
        continue;
      }

      const docMatch = trimmed.match(DOC_RE);
      if (docMatch) {
        const { attrs, endIndex } = parseDocAttrs(lines, index + 1);
        ast.doc = {
          title: docMatch[1],
          attrs
        };
        index = endIndex;
        continue;
      }

      if (trimmed === "::") {
        if (stack.length === 1) {
          throw new Error(`Unexpected block close at line ${index + 1}`);
        }
        stack.pop();
        continue;
      }

      const blockMatch = trimmed.match(BLOCK_OPEN_RE);
      if (blockMatch) {
        const [, rawType, variant, attrSource] = blockMatch;
        const node = {
          type: variant ? `${rawType}.${variant}` : rawType,
          tag: rawType,
          variant: variant || null,
          attrs: parseInlineAttrs(attrSource || ""),
          lines: [],
          children: [],
          line: index + 1
        };
        appendNode(stack[stack.length - 1], node);
        stack.push(node);
        continue;
      }

      const headingMatch = trimmed.match(HEADING_RE);
      if (headingMatch) {
        appendNode(stack[stack.length - 1], {
          type: "heading",
          level: headingMatch[1].length,
          text: headingMatch[2],
          line: index + 1
        });
        continue;
      }

      appendLine(stack[stack.length - 1], raw);
    }

    if (stack.length > 1) {
      const openNode = stack[stack.length - 1];
      throw new Error(`Unclosed block "${openNode.type}" opened at line ${openNode.line}`);
    }

    return ast;
  }

  function renderVmd(ast, mode = "read") {
    if (mode === "deck") {
      return renderDeck(ast);
    }
    if (mode === "map") {
      return renderMap(ast);
    }
    return renderRead(ast);
  }

  function renderFullHtml(ast, mode = "read", options = {}) {
    const cssHref = Object.prototype.hasOwnProperty.call(options, "cssHref")
      ? options.cssHref
      : "../extension/styles.css";
    const stylesheet = cssHref
      ? `<link rel="stylesheet" href="${escapeHtml(cssHref)}">`
      : "";
    return `<!doctype html>
<html${renderHtmlAttrs(ast)}>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(ast.doc.title)}</title>
    ${stylesheet}
  </head>
  <body${renderBodyAttrs(ast)}>
    ${renderVmd(ast, mode)}
  </body>
</html>`;
  }

  function validateVmdSource(source) {
    try {
      return validateVmdAst(parseVmd(source));
    } catch (error) {
      return [
        {
          level: "error",
          code: "parse-error",
          message: error.message
        }
      ];
    }
  }

  function validateVmdAst(ast) {
    const diagnostics = [];
    const frames = ast.children.filter((node) => node.type === "frame");
    const fidelity = String(ast.doc?.attrs?.fidelity || "").toLowerCase();

    if (!ast.doc || !ast.doc.title || ast.doc.title === "Untitled VMD") {
      diagnostics.push({
        level: "warning",
        code: "missing-doc-title",
        message: "Document should define an @doc title."
      });
    }

    if (fidelity && !FIDELITY_TIERS.has(fidelity)) {
      diagnostics.push({
        level: "warning",
        code: "unknown-fidelity-tier",
        message: `Unknown fidelity tier "${ast.doc.attrs.fidelity}". Use semantic, structured, visual, preserve, or interactive.`
      });
    }

    if (!frames.length) {
      diagnostics.push({
        level: "warning",
        code: "missing-frames",
        message: "Document should contain at least one frame."
      });
    }

    walkAst(ast, (node) => {
      if (node.type === "document" || node.type === "heading") {
        return;
      }

      if (node.type === "frame") {
        validateFrame(node, diagnostics);
        return;
      }

      if (isKnownBlock(node.type)) {
        validateKnownBlock(node, diagnostics);
        return;
      }

      diagnostics.push({
        level: "warning",
        code: "unknown-block",
        line: node.line,
        message: `Unknown block "${node.type}" will render as a generic block.`
      });
    });

    return diagnostics;
  }

  function renderRead(ast) {
    if (isPreserveDocument(ast)) {
      return ast.children.map(renderPreserveNode).join("");
    }

    return `<article class="doc-view">
    ${renderDocHeader(ast)}
    ${ast.children.map(renderNode).join("")}
  </article>`;
  }

  function renderDeck(ast) {
    const frames = ast.children.filter((node) => node.type === "frame");
    const slides = frames.length
      ? frames.map((frame, index) => `<section class="slide" aria-label="Slide ${index + 1}">${renderFrame(frame)}</section>`)
      : [`<section class="slide">${renderDocHeader(ast)}</section>`];

    return `<article class="deck-view">${slides.join("")}</article>`;
  }

  function renderMap(ast) {
    const frames = ast.children.filter((node) => node.type === "frame");
    const nodes = frames.map((frame, index) => {
      const role = frame.attrs.role || `frame ${index + 1}`;
      const label = findFrameLabel(frame) || `Frame ${index + 1}`;
      return `<li class="map-node">
      <strong>${escapeHtml(role)}</strong>
      <span>${escapeHtml(label)}</span>
    </li>`;
    });

    return `<article class="map-view">
    ${renderDocHeader(ast)}
    <ol class="map-list">${nodes.join("")}</ol>
  </article>`;
  }

  function renderDocHeader(ast) {
    const attrs = Object.entries(ast.doc.attrs || {});
    const meta = attrs.length
      ? `<div class="doc-meta">${attrs.map(([key, value]) => `<span class="meta-pill">${escapeHtml(key)}: ${escapeHtml(value)}</span>`).join("")}</div>`
      : "";

    return `<header class="doc-title">
    <p class="eyebrow">VMD Document</p>
    <h1>${escapeHtml(ast.doc.title)}</h1>
    ${meta}
  </header>`;
  }

  function renderNode(node) {
    if (node.type === "heading") {
      const level = Math.min(Math.max(node.level, 1), 6);
      return `<h${level}>${escapeHtml(node.text)}</h${level}>`;
    }
    if (node.type === "frame") {
      return renderFrame(node);
    }
    if (node.type === "visual.compare") {
      return renderCompare(node);
    }
    if (node.type === "visual.loop") {
      return renderLoop(node);
    }
    if (node.type === "visual.timeline") {
      return renderTimeline(node);
    }
    if (node.type === "visual.matrix") {
      return renderMatrix(node);
    }
    if (LAYOUT_BLOCKS.has(node.type)) {
      return renderLayout(node);
    }
    if (STYLE_BLOCKS.has(node.type)) {
      return renderStyleBlock(node);
    }
    if (RAW_BLOCKS.has(node.type)) {
      return renderRawBlock(node);
    }
    if (COMPONENT_BLOCKS.has(node.type)) {
      return renderComponent(node);
    }
    if (SEMANTIC_BLOCKS.has(node.type)) {
      return renderSemanticBlock(node);
    }
    return renderGenericBlock(node);
  }

  function renderFrame(node) {
    const role = node.attrs.role ? `<p class="frame-role">${escapeHtml(node.attrs.role)}</p>` : "";
    return `<section class="frame">
    ${role}
    ${node.children.map(renderNode).join("")}
    ${renderLines(node.lines)}
  </section>`;
  }

  function renderSemanticBlock(node) {
    return `<section class="block block-${escapeClass(node.type)}">
    <p class="block-label">${escapeHtml(node.type)}</p>
    ${renderLines(node.lines)}
    ${node.children.map(renderNode).join("")}
  </section>`;
  }

  function renderGenericBlock(node) {
    return `<section class="block">
    <p class="block-label">${escapeHtml(node.type)}</p>
    ${renderLines(node.lines)}
    ${node.children.map(renderNode).join("")}
  </section>`;
  }

  function renderCompare(node) {
    const parsed = parseCompare(node.lines);
    const leftItems = parsed.rows.map((row) => `<li>${escapeHtml(row.left)}</li>`).join("");
    const rightItems = parsed.rows.map((row) => `<li>${escapeHtml(row.right)}</li>`).join("");

    return `<section class="block">
    <p class="block-label">compare</p>
    <div class="compare-grid">
      <div class="compare-column">
        <h3>${escapeHtml(parsed.leftLabel)}</h3>
        <ul>${leftItems}</ul>
      </div>
      <div class="compare-column">
        <h3>${escapeHtml(parsed.rightLabel)}</h3>
        <ul>${rightItems}</ul>
      </div>
    </div>
  </section>`;
  }

  function renderLoop(node) {
    const steps = node.lines
      .join(" ")
      .split(/\s*->\s*/)
      .map((step) => step.trim())
      .filter(Boolean);

    const content = steps.map((step, index) => {
      const arrow = index < steps.length - 1 ? '<span class="loop-arrow">→</span>' : '<span class="loop-arrow">↺</span>';
      return `<span class="loop-node">${escapeHtml(step)}</span>${arrow}`;
    }).join("");

    return `<section class="block">
    <p class="block-label">loop</p>
    <div class="loop-row">${content}</div>
  </section>`;
  }

  function renderTimeline(node) {
    const items = node.lines
      .map((line) => line.replace(/^-\s*/, "").trim())
      .filter(Boolean);

    return `<section class="block">
    <p class="block-label">timeline</p>
    <ol class="timeline-list">
      ${items.map((item, index) => `<li><span class="timeline-index">${index + 1}</span><span>${escapeHtml(item)}</span></li>`).join("")}
    </ol>
  </section>`;
  }

  function renderMatrix(node) {
    const fields = parseFields(node.lines);
    const cells = [
      ["top-left", fields["top-left"] || "Top left"],
      ["top-right", fields["top-right"] || "Top right"],
      ["bottom-left", fields["bottom-left"] || "Bottom left"],
      ["bottom-right", fields["bottom-right"] || "Bottom right"]
    ];
    const x = node.attrs.x || fields.x || "Low -> High";
    const y = node.attrs.y || fields.y || "Low -> High";

    return `<section class="block">
    <p class="block-label">matrix</p>
    <div class="matrix-block" aria-label="${escapeHtml(`${x}, ${y}`)}">
      <p class="matrix-axis matrix-axis-y">${escapeHtml(y)}</p>
      <div class="matrix-grid">
        ${cells.map(([key, value]) => `<div class="matrix-cell matrix-${escapeClass(key)}"><span>${escapeHtml(key.replace("-", " "))}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}
      </div>
      <p class="matrix-axis matrix-axis-x">${escapeHtml(x)}</p>
    </div>
  </section>`;
  }

  function renderLayout(node) {
    const label = node.attrs.label ? `<p class="layout-label">${escapeHtml(node.attrs.label)}</p>` : "";
    const content = `${renderLines(node.lines)}${node.children.map(renderNode).join("")}`;
    const style = layoutStyle(node.attrs);

    if (node.type === "layout.device" || node.type === "component.phone") {
      const kind = node.attrs.kind || "phone";
      return `<section class="layout layout-device layout-device-${escapeClass(kind)}"${style}>
    <div class="device-shell">
      <div class="device-bar" aria-hidden="true"></div>
      <div class="device-screen">
        ${label}
        ${content}
      </div>
    </div>
  </section>`;
    }

    if (node.type === "layout.tabs") {
      return renderTabs(node, style);
    }

    return `<section class="layout ${escapeClass(node.type)}"${style}>
    ${label}
    ${content}
  </section>`;
  }

  function renderTabs(node, style) {
    const panels = node.children.length
      ? node.children
      : [{
          type: "panel",
          attrs: { label: node.attrs.label || "Panel" },
          lines: node.lines,
          children: []
        }];

    return `<section class="layout layout-tabs"${style}>
    <div class="tab-list" role="tablist">
      ${panels.map((panel, index) => `<span class="tab-pill">${escapeHtml(panel.attrs?.label || findFrameLabel(panel) || `Tab ${index + 1}`)}</span>`).join("")}
    </div>
    <div class="tab-panels">
      ${panels.map((panel) => `<div class="tab-panel">${renderNode(panel)}</div>`).join("")}
    </div>
  </section>`;
  }

  function renderStyleBlock(node) {
    if (node.type === "style.css") {
      return renderCssBlock(node);
    }

    const tokens = parseTokens(node.lines);
    const styleVars = tokens.map((token) => {
      const value = safeCssValue(token.value);
      return value ? `--${escapeCssIdentifier(token.name)}: ${value};` : "";
    }).filter(Boolean).join("\n");
    const style = styleVars ? `<style data-vmd-style-tokens>\n:root {\n${styleVars}\n}\n</style>` : "";
    return `${style}<section class="block style-token-block">
    <p class="block-label">style tokens</p>
    <div class="token-grid">
      ${tokens.map(renderToken).join("")}
    </div>
  </section>`;
  }

  function renderRawBlock(node, options = {}) {
    if (node.type === "raw.css" || node.type === "style.css") {
      return renderCssBlock(node);
    }

    if (node.type === "raw.js") {
      return `<section class="block raw-disabled">
    <p class="block-label">raw.js disabled</p>
    <pre>${escapeHtml(normalizeRawLines(node.lines))}</pre>
  </section>`;
    }

    const content = sanitizeRawMarkup(normalizeRawLines(node.lines));
    if (options.preserve || node.type === "raw.html" || node.type === "raw.svg") {
      return options.preserve ? content : `<div class="raw-embed raw-embed-${escapeClass(node.variant || node.tag)}">${content}</div>`;
    }

    return `<pre class="raw-embed">${escapeHtml(content)}</pre>`;
  }

  function renderCssBlock(node) {
    const css = normalizeRawLines(node.lines).replace(/<\/style/gi, "<\\/style");
    return `<style data-vmd-raw-css>
${css}
</style>`;
  }

  function renderComponent(node) {
    if (node.type === "component.phone") {
      return renderLayout({ ...node, type: "layout.device" });
    }

    if (node.type === "component.browser") {
      return `<section class="component component-browser">
    <div class="browser-bar" aria-hidden="true"><span></span><span></span><span></span></div>
    <div class="browser-canvas">
      ${renderComponentBody(node)}
    </div>
  </section>`;
    }

    if (node.type === "component.metric") {
      const fields = parseFields(node.lines);
      const label = node.attrs.label || fields.label || "Metric";
      const value = node.attrs.value || fields.value || node.lines[0] || "";
      const detail = node.attrs.detail || fields.detail || fields.note || "";
      return `<section class="component component-metric">
    <p>${escapeHtml(label)}</p>
    <strong>${escapeHtml(value)}</strong>
    ${detail ? `<span>${escapeHtml(detail)}</span>` : ""}
  </section>`;
    }

    if (node.type === "component.persona") {
      const fields = parseFields(node.lines);
      const name = node.attrs.name || fields.name || "Persona";
      const role = node.attrs.role || fields.role || "";
      return `<section class="component component-persona">
    <div class="persona-avatar" aria-hidden="true">${escapeHtml(name.slice(0, 1).toUpperCase())}</div>
    <div>
      <h3>${escapeHtml(name)}</h3>
      ${role ? `<p class="persona-role">${escapeHtml(role)}</p>` : ""}
      ${renderLines(node.lines.filter((line) => !line.includes(":")))}
      ${node.children.map(renderNode).join("")}
    </div>
  </section>`;
    }

    if (node.type === "component.token-table") {
      const tokens = parseTokens(node.lines);
      return `<section class="component component-token-table">
    <table>
      <thead><tr><th>Token</th><th>Value</th><th>Note</th></tr></thead>
      <tbody>
        ${tokens.map((token) => `<tr><th>${escapeHtml(token.name)}</th><td>${escapeHtml(token.value)}</td><td>${escapeHtml(token.note || "")}</td></tr>`).join("")}
      </tbody>
    </table>
  </section>`;
    }

    return `<section class="component component-card">
    ${node.attrs.title ? `<h3>${escapeHtml(node.attrs.title)}</h3>` : ""}
    ${renderComponentBody(node)}
  </section>`;
  }

  function renderComponentBody(node) {
    return `${renderLines(node.lines)}${node.children.map(renderNode).join("")}`;
  }

  function renderPreserveNode(node) {
    if (node.type === "heading") {
      return "";
    }
    if (node.type === "frame" || LAYOUT_BLOCKS.has(node.type) || COMPONENT_BLOCKS.has(node.type)) {
      return `${renderLines(node.lines)}${node.children.map(renderPreserveNode).join("")}`;
    }
    if (RAW_BLOCKS.has(node.type) || node.type === "style.css") {
      return renderRawBlock(node, { preserve: true });
    }
    if (STYLE_BLOCKS.has(node.type)) {
      return renderStyleBlock(node);
    }
    if (SEMANTIC_BLOCKS.has(node.type) || VISUAL_BLOCKS.has(node.type)) {
      return `${renderLines(node.lines)}${node.children.map(renderPreserveNode).join("")}`;
    }
    return renderNode(node);
  }

  function parseCompare(lines) {
    const parsed = {
      leftLabel: "Left",
      rightLabel: "Right",
      rows: []
    };

    for (const line of lines) {
      if (line.startsWith("left:")) {
        parsed.leftLabel = line.slice("left:".length).trim();
        continue;
      }
      if (line.startsWith("right:")) {
        parsed.rightLabel = line.slice("right:".length).trim();
        continue;
      }

      const row = line.replace(/^-\s*/, "");
      const parts = row.split(/\s+vs\s+/i);
      if (parts.length >= 2) {
        parsed.rows.push({
          left: parts[0].trim(),
          right: parts.slice(1).join(" vs ").trim()
        });
      }
    }

    return parsed;
  }

  function validateFrame(node, diagnostics) {
    if (!node.attrs.role) {
      diagnostics.push({
        level: "warning",
        code: "missing-frame-role",
        line: node.line,
        message: "Frame should include a role attribute."
      });
    }

    const hasKnownChild = node.children.some((child) => isKnownBlock(child.type));
    if (!hasKnownChild && !hasNodeContent(node)) {
      diagnostics.push({
        level: "warning",
        code: "empty-frame",
        line: node.line,
        message: "Frame should include content or a known VMD block."
      });
    }

    const hasClaim = node.children.some((child) => child.type === "claim");
    const hasEvidence = node.children.some((child) => child.type === "evidence");
    if (hasClaim && !hasEvidence) {
      diagnostics.push({
        level: "warning",
        code: "claim-without-evidence",
        line: node.line,
        message: "Frame has a claim but no evidence block."
      });
    }
  }

  function validateKnownBlock(node, diagnostics) {
    if (SEMANTIC_BLOCKS.has(node.type) && !hasNodeContent(node)) {
      diagnostics.push({
        level: "warning",
        code: "empty-semantic-block",
        line: node.line,
        message: `Semantic block "${node.type}" should not be empty.`
      });
    }

    if (LAYOUT_BLOCKS.has(node.type) && !hasNodeContent(node)) {
      diagnostics.push({
        level: "warning",
        code: "empty-layout-block",
        line: node.line,
        message: `Layout block "${node.type}" should contain lines or child blocks.`
      });
    }

    if (RAW_BLOCKS.has(node.type) && node.type !== "raw.js" && !node.lines.some((line) => line.trim())) {
      diagnostics.push({
        level: "warning",
        code: "empty-raw-block",
        line: node.line,
        message: `Raw block "${node.type}" should contain preserved source.`
      });
    }

    if ((node.type === "raw.html" || node.type === "raw.svg") && hasExecutableRawMarkup(node.lines)) {
      diagnostics.push({
        level: "warning",
        code: "raw-executable-disabled",
        line: node.line,
        message: `Raw block "${node.type}" contains executable markup that the reference renderer disables.`
      });
    }

    if (node.type === "raw.js") {
      diagnostics.push({
        level: "warning",
        code: "raw-js-disabled",
        line: node.line,
        message: "raw.js is parsed but not executed by the reference renderer."
      });
    }

    if (node.type === "visual.compare") {
      const parsed = parseCompare(node.lines);
      const hasLeft = node.lines.some((line) => line.startsWith("left:"));
      const hasRight = node.lines.some((line) => line.startsWith("right:"));

      if (!hasLeft || !hasRight) {
        diagnostics.push({
          level: "warning",
          code: "compare-missing-labels",
          line: node.line,
          message: "visual.compare should include left: and right: labels."
        });
      }

      if (!parsed.rows.length) {
        diagnostics.push({
          level: "error",
          code: "compare-missing-rows",
          line: node.line,
          message: "visual.compare should include at least one '- left vs right' row."
        });
      }
    }

    if (node.type === "visual.loop") {
      const steps = node.lines.join(" ").split(/\s*->\s*/).map((step) => step.trim()).filter(Boolean);
      if (steps.length < 2) {
        diagnostics.push({
          level: "error",
          code: "loop-too-short",
          line: node.line,
          message: "visual.loop should include at least two steps separated by ->."
        });
      }
    }

    if (node.type === "visual.timeline") {
      const items = node.lines.map((line) => line.replace(/^-\s*/, "").trim()).filter(Boolean);
      if (items.length < 2) {
        diagnostics.push({
          level: "warning",
          code: "timeline-too-short",
          line: node.line,
          message: "visual.timeline is more useful with two or more items."
        });
      }
    }

    if (node.type === "visual.matrix") {
      const fields = parseFields(node.lines);
      const cellCount = ["top-left", "top-right", "bottom-left", "bottom-right"]
        .filter((key) => fields[key])
        .length;
      if (cellCount < 2) {
        diagnostics.push({
          level: "warning",
          code: "matrix-too-sparse",
          line: node.line,
          message: "visual.matrix is more useful with two or more quadrant values."
        });
      }
    }
  }

  function walkAst(node, visit) {
    visit(node);
    for (const child of node.children || []) {
      walkAst(child, visit);
    }
  }

  function hasNodeContent(node) {
    return Boolean(
      (node.lines && node.lines.some((line) => line.trim())) ||
      (node.children && node.children.length)
    );
  }

  function parseDocAttrs(lines, startIndex) {
    const attrs = {};

    for (let index = startIndex; index < lines.length; index += 1) {
      const trimmed = lines[index].trim();
      if (trimmed === "}") {
        return { attrs, endIndex: index };
      }
      parseKeyValue(trimmed, attrs);
    }

    throw new Error("Unclosed @doc block");
  }

  function parseInlineAttrs(source) {
    const attrs = {};
    const attrRe = /([a-zA-Z][\w-]*)\s*=\s*"([^"]*)"/g;
    let match = attrRe.exec(source);
    while (match) {
      attrs[match[1]] = match[2];
      match = attrRe.exec(source);
    }
    return attrs;
  }

  function parseKeyValue(line, target) {
    const cleaned = line.replace(/[;,]\s*$/, "");
    const match = cleaned.match(/^([a-zA-Z][\w-]*)\s*:\s*(.+)$/);
    if (!match) {
      return;
    }
    target[match[1]] = stripQuotes(match[2].trim());
  }

  function stripQuotes(value) {
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      return value.slice(1, -1);
    }
    return value;
  }

  function appendNode(parent, node) {
    if (!parent.children) {
      parent.children = [];
    }
    parent.children.push(node);
  }

  function appendLine(parent, raw) {
    if (!parent.lines) {
      parent.lines = [];
    }
    if (shouldPreserveLineWhitespace(parent)) {
      parent.lines.push(raw);
      return;
    }
    parent.lines.push(raw.trim());
  }

  function findFrameLabel(frame) {
    const heading = frame.children.find((node) => node.type === "heading");
    if (heading) {
      return heading.text;
    }

    const semantic = frame.children.find((node) => SEMANTIC_BLOCKS.has(node.type) && node.lines.length);
    if (semantic) {
      return semantic.lines.join(" ");
    }

    return frame.lines.join(" ");
  }

  function renderLines(lines = []) {
    const normalized = lines.map((line) => line.trim()).filter(Boolean);
    if (!normalized.length) {
      return "";
    }

    const chunks = [];
    let paragraph = [];
    let list = [];

    const flushParagraph = () => {
      if (paragraph.length) {
        chunks.push(`<p>${paragraph.map(escapeHtml).join("<br>")}</p>`);
        paragraph = [];
      }
    };
    const flushList = () => {
      if (list.length) {
        chunks.push(`<ul>${list.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`);
        list = [];
      }
    };

    for (const line of normalized) {
      const heading = line.match(/^(#{1,6})\s+(.+)$/);
      if (heading) {
        flushParagraph();
        flushList();
        const level = Math.min(6, Math.max(2, heading[1].length + 1));
        chunks.push(`<h${level}>${escapeHtml(heading[2])}</h${level}>`);
        continue;
      }

      const listItem = line.match(/^-\s+(.+)$/);
      if (listItem) {
        flushParagraph();
        list.push(listItem[1]);
        continue;
      }

      flushList();
      paragraph.push(line);
    }

    flushParagraph();
    flushList();
    return chunks.join("");
  }

  function renderHtmlAttrs(ast) {
    const attrs = ast.doc?.attrs || {};
    const rendered = [];
    const lang = attrs["html-lang"] || (isPreserveDocument(ast) ? "" : "en");
    if (lang) {
      rendered.push(`lang="${escapeHtml(lang)}"`);
    }
    if (attrs["html-dir"]) {
      rendered.push(`dir="${escapeHtml(attrs["html-dir"])}"`);
    }
    return rendered.length ? ` ${rendered.join(" ")}` : "";
  }

  function renderBodyAttrs(ast) {
    const attrs = ast.doc?.attrs || {};
    const rendered = [];
    const aliases = {
      "body-class": "class",
      "body-id": "id",
      "body-style": "style",
      "body-dir": "dir",
      "body-lang": "lang"
    };

    for (const [sourceKey, attrName] of Object.entries(aliases)) {
      if (attrs[sourceKey]) {
        rendered.push(`${attrName}="${escapeHtml(attrs[sourceKey])}"`);
      }
    }

    for (const [key, value] of Object.entries(attrs)) {
      if (!value || !key.startsWith("body-")) {
        continue;
      }

      const attrName = key.slice("body-".length);
      if (!/^(?:data-[\w-]+|aria-[\w-]+)$/.test(attrName)) {
        continue;
      }
      rendered.push(`${attrName}="${escapeHtml(value)}"`);
    }

    return rendered.length ? ` ${rendered.join(" ")}` : "";
  }

  function isKnownBlock(type) {
    return SEMANTIC_BLOCKS.has(type) ||
      VISUAL_BLOCKS.has(type) ||
      LAYOUT_BLOCKS.has(type) ||
      STYLE_BLOCKS.has(type) ||
      RAW_BLOCKS.has(type) ||
      COMPONENT_BLOCKS.has(type);
  }

  function isPreserveDocument(ast) {
    return String(ast.doc?.attrs?.fidelity || "").toLowerCase() === "preserve";
  }

  function shouldPreserveLineWhitespace(parent) {
    return Boolean(parent && (RAW_BLOCKS.has(parent.type) || parent.type === "style.css"));
  }

  function normalizeRawLines(lines = []) {
    const copy = [...lines];
    while (copy.length && !copy[0].trim()) {
      copy.shift();
    }
    while (copy.length && !copy[copy.length - 1].trim()) {
      copy.pop();
    }

    const indents = copy
      .filter((line) => line.trim())
      .map((line) => line.match(/^\s*/)[0].length);
    const commonIndent = indents.length ? Math.min(...indents) : 0;
    return copy.map((line) => line.slice(commonIndent)).join("\n");
  }

  function sanitizeRawMarkup(markup) {
    return String(markup)
      .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, (match) => {
        return `<template data-vmd-disabled-script>${escapeHtml(match)}</template>`;
      })
      .replace(/<script\b[^>]*\/?>/gi, (match) => {
        return `<template data-vmd-disabled-script>${escapeHtml(match)}</template>`;
      })
      .replace(/\s+on[a-z][\w:-]*\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+)/gi, "")
      .replace(/\s+(href|src|xlink:href|formaction)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, " $1=\"#\"")
      .replace(/\s+(href|src|xlink:href|formaction)\s*=\s*javascript:[^\s>]+/gi, " $1=\"#\"");
  }

  function hasExecutableRawMarkup(lines = []) {
    const source = normalizeRawLines(lines);
    return /<script\b/i.test(source) ||
      /\s+on[a-z][\w:-]*\s*=/i.test(source) ||
      /\s+(?:href|src|xlink:href|formaction)\s*=\s*(?:"|')?\s*javascript:/i.test(source);
  }

  function parseFields(lines = []) {
    const fields = {};
    for (const line of lines) {
      const match = line.trim().match(/^([a-zA-Z][\w-]*)\s*:\s*(.+)$/);
      if (match) {
        fields[match[1]] = match[2].trim();
      }
    }
    return fields;
  }

  function parseTokens(lines = []) {
    return lines.map((line) => {
      const cleaned = line.replace(/^-\s*/, "").trim();
      if (!cleaned) {
        return null;
      }

      const pipeParts = cleaned.split("|").map((part) => part.trim());
      if (pipeParts.length >= 2) {
        return {
          name: pipeParts[0],
          value: pipeParts[1],
          note: pipeParts.slice(2).join(" | ")
        };
      }

      const match = cleaned.match(/^([a-zA-Z][\w-]*)\s*:\s*(.+?)(?:\s+-\s+(.+))?$/);
      if (!match) {
        return {
          name: cleaned,
          value: "",
          note: ""
        };
      }
      return {
        name: match[1],
        value: match[2],
        note: match[3] || ""
      };
    }).filter(Boolean);
  }

  function renderToken(token) {
    const swatch = looksLikeColor(token.value)
      ? `<span class="token-swatch" style="background: ${safeCssValue(token.value)}"></span>`
      : "";
    return `<div class="token-item">
      ${swatch}
      <strong>${escapeHtml(token.name)}</strong>
      <code>${escapeHtml(token.value)}</code>
      ${token.note ? `<span>${escapeHtml(token.note)}</span>` : ""}
    </div>`;
  }

  function layoutStyle(attrs = {}) {
    const declarations = [];
    if (attrs.columns) {
      declarations.push(`--vmd-columns: ${safeCssValue(normalizeColumns(attrs.columns))}`);
    }
    if (attrs.gap) {
      declarations.push(`--vmd-gap: ${safeCssValue(spaceToken(attrs.gap))}`);
    }
    if (attrs.width) {
      declarations.push(`--vmd-width: ${safeCssValue(attrs.width)}`);
    }
    if (attrs.align) {
      declarations.push(`--vmd-align: ${safeCssValue(attrs.align)}`);
    }
    if (!declarations.length) {
      return "";
    }
    return ` style="${escapeHtml(declarations.join("; "))}"`;
  }

  function normalizeColumns(value) {
    if (/^\d+$/.test(String(value))) {
      return `repeat(${value}, minmax(0, 1fr))`;
    }
    return String(value);
  }

  function spaceToken(value) {
    const tokens = {
      none: "0",
      xs: "6px",
      small: "10px",
      medium: "16px",
      large: "24px",
      xl: "34px"
    };
    return tokens[value] || value;
  }

  function looksLikeColor(value) {
    return /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(String(value)) ||
      /^rgba?\(/i.test(String(value)) ||
      /^hsla?\(/i.test(String(value));
  }

  function safeCssValue(value) {
    const text = String(value || "").trim();
    if (!text || /[<>{};]/.test(text)) {
      return "";
    }
    return text;
  }

  function escapeCssIdentifier(value) {
    return String(value).replace(/[^a-zA-Z0-9_-]/g, "-");
  }

  function escapeClass(value) {
    return value.replace(/[^a-zA-Z0-9_-]/g, "-");
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  return {
    parseVmd,
    renderVmd,
    renderFullHtml,
    validateVmdAst,
    validateVmdSource,
    SEMANTIC_BLOCK_TYPES,
    VISUAL_BLOCK_TYPES,
    LAYOUT_BLOCK_TYPES,
    STYLE_BLOCK_TYPES,
    RAW_BLOCK_TYPES,
    COMPONENT_BLOCK_TYPES,
    FIDELITY_TIERS: Array.from(FIDELITY_TIERS),
    escapeHtml
  };
});
