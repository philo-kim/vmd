(() => {
  if (!isVmdUrl(window.location.href)) {
    return;
  }

  const source = readBrowserTextView();
  if (!source.trim()) {
    return;
  }

  try {
    const { parseVmd, renderVmd, escapeHtml } = globalThis.VMDCore;
    const ast = parseVmd(source);
    document.title = ast.doc.title;

    if (String(ast.doc.attrs?.fidelity || "").toLowerCase() === "preserve") {
      applyPreserveDocumentAttrs(ast);
      document.body.innerHTML = renderVmd(ast, "read");
      return;
    }

    injectStyles().catch(() => {});
    document.documentElement.lang = "en";
    document.body.className = "vmd-auto-page";
    document.body.innerHTML = renderShell(ast, escapeHtml);

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
    const escapeHtml = globalThis.VMDCore ? globalThis.VMDCore.escapeHtml : fallbackEscapeHtml;
    injectStyles().catch(() => {});
    document.body.className = "vmd-auto-page";
    document.body.innerHTML = `<div class="error">${escapeHtml(error.message)}</div>`;
  }

  function isVmdUrl(value) {
    try {
      const url = new URL(value);
      return ["file:", "http:", "https:"].includes(url.protocol) &&
        decodeURIComponent(url.pathname).toLowerCase().endsWith(".vmd");
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

  function applyPreserveDocumentAttrs(ast) {
    const attrs = ast.doc?.attrs || {};
    applyElementAttrs(document.documentElement, {
      lang: attrs["html-lang"] || "",
      dir: attrs["html-dir"] || ""
    });
    applyElementAttrs(document.body, {
      class: attrs["body-class"] || "",
      id: attrs["body-id"] || "",
      style: attrs["body-style"] || "",
      dir: attrs["body-dir"] || "",
      lang: attrs["body-lang"] || ""
    });

    for (const attr of Array.from(document.body.attributes)) {
      if (/^(?:data-|aria-)/.test(attr.name)) {
        document.body.removeAttribute(attr.name);
      }
    }

    for (const [key, value] of Object.entries(attrs)) {
      if (!value || !key.startsWith("body-")) {
        continue;
      }
      const attrName = key.slice("body-".length);
      if (/^(?:data-[\w-]+|aria-[\w-]+)$/.test(attrName)) {
        document.body.setAttribute(attrName, value);
      }
    }
  }

  function applyElementAttrs(element, attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (value) {
        element.setAttribute(key, value);
      } else {
        element.removeAttribute(key);
      }
    }
  }

  async function injectStyles() {
    const response = await fetch(chrome.runtime.getURL("styles.css"));
    const style = document.createElement("style");
    style.textContent = await response.text();
    document.head.appendChild(style);
  }

  function renderShell(ast, escapeHtml) {
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

  function fallbackEscapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();
