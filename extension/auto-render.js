(() => {
  if (!isVmdFileUrl(window.location.href)) {
    return;
  }

  const source = readBrowserTextView();
  if (!source.trim()) {
    return;
  }

  injectStyles().catch(() => {});

  try {
    const ast = parseVmd(source);
    document.documentElement.lang = "en";
    document.title = ast.doc.title;
    document.body.className = "vmd-auto-page";
    document.body.innerHTML = renderShell(ast);

    const preview = document.getElementById("vmd-auto-preview");
    const tabs = Array.from(document.querySelectorAll(".mode-tab"));
    const renderMode = (mode) => {
      preview.innerHTML = renderVmd(ast, mode);
      for (const tab of tabs) {
        tab.classList.toggle("active", tab.dataset.mode === mode);
      }
    };

    for (const tab of tabs) {
      tab.addEventListener("click", () => renderMode(tab.dataset.mode));
    }

    renderMode("read");
  } catch (error) {
    document.body.className = "vmd-auto-page";
    document.body.innerHTML = `<div class="error">${escapeHtml(error.message)}</div>`;
  }

  function isVmdFileUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === "file:" && decodeURIComponent(url.pathname).toLowerCase().endsWith(".vmd");
    } catch {
      return false;
    }
  }

  function readBrowserTextView() {
    const pre = document.querySelector("pre");
    if (pre && pre.innerText.trim()) {
      return pre.innerText;
    }
    return document.body ? document.body.innerText : "";
  }

  async function injectStyles() {
    const response = await fetch(chrome.runtime.getURL("styles.css"));
    const style = document.createElement("style");
    style.textContent = await response.text();
    document.head.appendChild(style);
  }

  function renderShell(ast) {
    return `
      <header class="auto-banner">
        <div>
          <p class="eyebrow">VMD</p>
          <h1>${escapeHtml(ast.doc.title)}</h1>
        </div>
        <div class="mode-tabs" role="tablist" aria-label="VMD render mode">
          <button class="mode-tab active" data-mode="read" type="button">Read</button>
          <button class="mode-tab" data-mode="deck" type="button">Deck</button>
          <button class="mode-tab" data-mode="map" type="button">Map</button>
        </div>
      </header>
      <main id="vmd-auto-preview"></main>
    `;
  }

  function parseVmd(sourceText) {
    const blockOpenRe = /^::([a-zA-Z][\w-]*)(?:\.([a-zA-Z][\w-]*))?(?:\[(.*)\])?\s*$/;
    const headingRe = /^(#{1,6})\s+(.+)$/;
    const docRe = /^@doc\s+"([^"]+)"\s*\{\s*$/;
    const lines = sourceText.replace(/\r\n?/g, "\n").split("\n");
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

      const docMatch = trimmed.match(docRe);
      if (docMatch) {
        const parsed = parseDocAttrs(lines, index + 1);
        ast.doc = {
          title: docMatch[1],
          attrs: parsed.attrs
        };
        index = parsed.endIndex;
        continue;
      }

      if (trimmed === "::") {
        if (stack.length === 1) {
          throw new Error(`Unexpected block close at line ${index + 1}`);
        }
        stack.pop();
        continue;
      }

      const blockMatch = trimmed.match(blockOpenRe);
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

      const headingMatch = trimmed.match(headingRe);
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

  function parseInlineAttrs(sourceText) {
    const attrs = {};
    const attrRe = /([a-zA-Z][\w-]*)\s*=\s*"([^"]*)"/g;
    let match = attrRe.exec(sourceText);
    while (match) {
      attrs[match[1]] = match[2];
      match = attrRe.exec(sourceText);
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

  function renderVmd(ast, mode = "read") {
    if (mode === "deck") {
      return renderDeck(ast);
    }
    if (mode === "map") {
      return renderMap(ast);
    }
    return renderRead(ast);
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
    if (isSemanticBlock(node.type)) {
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

  function findFrameLabel(frame) {
    const heading = frame.children.find((node) => node.type === "heading");
    if (heading) {
      return heading.text;
    }

    const semantic = frame.children.find((node) => isSemanticBlock(node.type) && node.lines.length);
    if (semantic) {
      return semantic.lines.join(" ");
    }

    return frame.lines.join(" ");
  }

  function isSemanticBlock(type) {
    return [
      "claim",
      "evidence",
      "insight",
      "decision",
      "action",
      "observation",
      "counterpoint"
    ].includes(type);
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
})();
