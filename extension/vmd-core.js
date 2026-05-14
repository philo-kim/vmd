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
    "visual.timeline"
  ];
  const SEMANTIC_BLOCKS = new Set(SEMANTIC_BLOCK_TYPES);
  const VISUAL_BLOCKS = new Set(VISUAL_BLOCK_TYPES);

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
    const cssHref = options.cssHref || "../extension/styles.css";
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(ast.doc.title)}</title>
    <link rel="stylesheet" href="${escapeHtml(cssHref)}">
  </head>
  <body>
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

    if (!ast.doc || !ast.doc.title || ast.doc.title === "Untitled VMD") {
      diagnostics.push({
        level: "warning",
        code: "missing-doc-title",
        message: "Document should define an @doc title."
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

      if (SEMANTIC_BLOCKS.has(node.type) || VISUAL_BLOCKS.has(node.type)) {
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

    const hasSemanticChild = node.children.some((child) => SEMANTIC_BLOCKS.has(child.type));
    if (!hasSemanticChild) {
      diagnostics.push({
        level: "warning",
        code: "frame-without-semantic-block",
        line: node.line,
        message: "Frame should include at least one semantic block."
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
    if (!lines.length) {
      return "";
    }
    return `<p>${lines.map(escapeHtml).join("<br>")}</p>`;
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
    escapeHtml
  };
});
