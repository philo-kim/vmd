const path = require("path");
const vscode = require("vscode");
const {
  parseVmd,
  renderVmd,
  validateVmdAst,
  SEMANTIC_BLOCK_TYPES,
  VISUAL_BLOCK_TYPES,
  LAYOUT_BLOCK_TYPES,
  STYLE_BLOCK_TYPES,
  RAW_BLOCK_TYPES,
  COMPONENT_BLOCK_TYPES,
  DIRECTIVE_BLOCK_TYPES,
  escapeHtml
} = require("./vendor/vmd-core.cjs");

function activate(context) {
  const previewManager = new PreviewManager(context);
  const customEditorProvider = new VmdPreviewEditorProvider(context);
  const diagnostics = vscode.languages.createDiagnosticCollection("vmd");

  for (const document of vscode.workspace.textDocuments) {
    updateDiagnostics(document, diagnostics);
  }

  context.subscriptions.push(
    diagnostics,
    vscode.commands.registerCommand("vmd.preview.open", async (uri) => {
      return previewManager.open(uri, vscode.ViewColumn.Active);
    }),
    vscode.commands.registerCommand("vmd.preview.openToSide", async (uri) => {
      return previewManager.open(uri, vscode.ViewColumn.Beside);
    }),
    vscode.window.registerCustomEditorProvider("vmd.previewEditor", customEditorProvider, {
      supportsMultipleEditorsPerDocument: false,
      webviewOptions: {
        retainContextWhenHidden: true
      }
    }),
    vscode.languages.registerCompletionItemProvider("vmd", createCompletionProvider(), ":", "@"),
    vscode.workspace.onDidOpenTextDocument((document) => updateDiagnostics(document, diagnostics)),
    vscode.workspace.onDidChangeTextDocument((event) => updateDiagnostics(event.document, diagnostics)),
    vscode.workspace.onDidCloseTextDocument((document) => diagnostics.delete(document.uri))
  );
}

function deactivate() {}

class PreviewManager {
  constructor(context) {
    this.context = context;
    this.panels = new Map();
  }

  async open(uri, column) {
    const document = await resolveDocument(uri);
    const key = document.uri.toString();
    const existing = this.panels.get(key);

    if (existing) {
      existing.reveal(column);
      return existing;
    }

    const panel = vscode.window.createWebviewPanel(
      "vmd.preview",
      `VMD: ${path.basename(document.uri.fsPath)}`,
      column,
      webviewOptions(this.context, document)
    );
    const update = () => {
      panel.webview.html = renderPreviewHtml(this.context, panel.webview, document);
    };

    update();
    const changeSubscription = vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.uri.toString() === key) {
        update();
      }
    });

    panel.onDidDispose(() => {
      changeSubscription.dispose();
      this.panels.delete(key);
    });

    this.panels.set(key, panel);
    return panel;
  }
}

class VmdPreviewEditorProvider {
  constructor(context) {
    this.context = context;
  }

  resolveCustomTextEditor(document, webviewPanel) {
    webviewPanel.webview.options = webviewOptions(this.context, document);
    const update = () => {
      webviewPanel.webview.html = renderPreviewHtml(this.context, webviewPanel.webview, document);
    };

    update();
    const changeSubscription = vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.uri.toString() === document.uri.toString()) {
        update();
      }
    });

    webviewPanel.onDidDispose(() => changeSubscription.dispose());
  }
}

async function resolveDocument(uri) {
  if (uri) {
    return vscode.workspace.openTextDocument(uri);
  }

  const active = vscode.window.activeTextEditor;
  if (active && isVmdDocument(active.document)) {
    return active.document;
  }

  const picked = await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
    filters: {
      "VMD documents": ["vmd"]
    },
    title: "Open VMD document"
  });

  if (!picked || !picked.length) {
    throw new Error("No VMD document selected.");
  }

  return vscode.workspace.openTextDocument(picked[0]);
}

function isVmdDocument(document) {
  return document.languageId === "vmd" || document.uri.fsPath.toLowerCase().endsWith(".vmd");
}

function webviewOptions(context, document) {
  const roots = [
    vscode.Uri.joinPath(context.extensionUri, "media")
  ];

  if (document && document.uri.scheme === "file") {
    roots.push(vscode.Uri.file(path.dirname(document.uri.fsPath)));
  }

  return {
    enableScripts: true,
    localResourceRoots: roots
  };
}

function renderPreviewHtml(context, webview, document) {
  const mode = vscode.workspace.getConfiguration("vmd.preview").get("defaultMode", "read");
  const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, "media", "vmd.css"));
  const nonce = createNonce();
  const title = escapeHtml(path.basename(document.uri.fsPath));

  try {
    const ast = parseVmd(document.getText());
    const views = {
      read: rewritePreviewResourceUris(renderVmd(ast, "read"), document, webview),
      deck: rewritePreviewResourceUris(renderVmd(ast, "deck"), document, webview),
      map: rewritePreviewResourceUris(renderVmd(ast, "map"), document, webview)
    };
    const data = serializeScriptData({ mode, views });

    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data: https: http:; font-src ${webview.cspSource} data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <link rel="stylesheet" href="${styleUri}">
    <title>${title}</title>
  </head>
  <body class="vscode-vmd">
    <header class="vmd-toolbar">
      <div>
        <p class="eyebrow">VMD Preview - ${escapeHtml(ast.doc.attrs?.fidelity || "semantic")}</p>
        <h1>${escapeHtml(ast.doc.title)}</h1>
      </div>
      <div class="mode-tabs" role="tablist" aria-label="Preview mode">
        <button class="mode-tab" data-mode="read" type="button">Read</button>
        <button class="mode-tab" data-mode="deck" type="button">Deck</button>
        <button class="mode-tab" data-mode="map" type="button">Map</button>
      </div>
    </header>
    <main id="preview"></main>
    <script nonce="${nonce}">
      const data = ${data};
      const preview = document.getElementById("preview");
      const tabs = Array.from(document.querySelectorAll(".mode-tab"));
      function render(mode) {
        preview.innerHTML = data.views[mode] || data.views.read;
        for (const tab of tabs) {
          tab.classList.toggle("active", tab.dataset.mode === mode);
        }
      }
      for (const tab of tabs) {
        tab.addEventListener("click", () => render(tab.dataset.mode));
      }
      render(data.mode);
    </script>
  </body>
</html>`;
  } catch (error) {
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource};">
    <link rel="stylesheet" href="${styleUri}">
    <title>${title}</title>
  </head>
  <body class="vscode-vmd">
    <div class="error">${escapeHtml(error.message)}</div>
  </body>
</html>`;
  }
}

function createNonce() {
  const source = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let value = "";
  for (let index = 0; index < 32; index += 1) {
    value += source.charAt(Math.floor(Math.random() * source.length));
  }
  return value;
}

function serializeScriptData(value) {
  return JSON.stringify(value).replace(/<\//g, "<\\/");
}

function rewritePreviewResourceUris(html, document, webview) {
  if (!document || document.uri.scheme !== "file") {
    return html;
  }

  const baseDir = path.dirname(document.uri.fsPath);
  return String(html)
    .replace(/\b(src|href|poster)=["']([^"']+)["']/gi, (match, attr, value) => {
      if (isExternalOrSpecialUrl(value)) {
        return match;
      }
      const uri = webview.asWebviewUri(vscode.Uri.file(path.resolve(baseDir, value)));
      return `${attr}="${uri}"`;
    })
    .replace(/url\(([^)]+)\)/gi, (match, rawValue) => {
      const value = rawValue.trim().replace(/^["']|["']$/g, "");
      if (isExternalOrSpecialUrl(value)) {
        return match;
      }
      const uri = webview.asWebviewUri(vscode.Uri.file(path.resolve(baseDir, value)));
      return `url("${uri}")`;
    });
}

function isExternalOrSpecialUrl(value) {
  return /^(?:[a-z][a-z0-9+.-]*:|#|\/)/i.test(String(value));
}

function createCompletionProvider() {
  return {
    provideCompletionItems() {
      const items = [
        createSnippet(
          "doc",
          '@doc "${1:Document title}" {\n  spec: vmd@0.1\n  fidelity: ${2:visual-lossless}\n  intent: ${3:visual-document}\n}\n\n$0',
          "Create a VMD document header."
        ),
        createSnippet(
          "doc.visual-lossless",
          '@doc "${1:Document title}" {\n  spec: vmd@0.1\n  fidelity: visual-lossless\n  intent: ${2:dashboard}\n}\n\n@lock {\n  renderer: vmd-web@${3:0.3.0}\n  dictionary: ${4:system}@${5:1.0.0}\n  browser: chromium\n  viewport: ${6:1440x1200}\n}\n\n@edit_state {\n  source: clean\n  replay: current\n  dirty: none\n  on-source-edit: mark affected slots stale, rerender, remeasure, update-render-hash\n}\n\n::intent\npurpose: ${7:restore this visual document and keep AI edits safe}\neditable: ${8:title, metrics, tables}\n::\n\n@tokens.editable {\n  accent: ${9:#c96442}\n  surface: #ffffff\n}\n\n@tokens.locked {\n  title.line-height: 1.05\n  grid.gap: 24px\n}\n\n::frame[role="${10:overview}"]\n  $0\n::\n\n@residual_index {\n  affected:\n    - frame.${10:overview}.title\n  constraints:\n    frame.${10:overview}.title.max-lines: 2\n  ai-note: Edit source slots only. Do not edit replay data directly.\n}\n\n@replay {\n  encoding: visual-replay@0.1\n  contains: dom-delta css-cascade layout-boxes\n}\n\n@residual {\n  mode: visual-lossless\n  ai: ignore\n}\n',
          "Create a visual-lossless VMD shell."
        ),
        createSnippet(
          "frame",
          '::frame[role="${1:opening}"]\n  $0\n::',
          "Create a frame block."
        )
      ];

      for (const block of SEMANTIC_BLOCK_TYPES) {
        items.push(createSnippet(
          block,
          `::${block}\n  $0\n::`,
          `Create a ${block} semantic block.`
        ));
      }

      for (const block of VISUAL_BLOCK_TYPES) {
        items.push(createSnippet(
          block,
          snippetForVisualBlock(block),
          `Create a ${block} visual block.`
        ));
      }

      for (const block of LAYOUT_BLOCK_TYPES) {
        items.push(createSnippet(
          block,
          snippetForLayoutBlock(block),
          `Create a ${block} layout block.`
        ));
      }

      for (const block of COMPONENT_BLOCK_TYPES) {
        items.push(createSnippet(
          block,
          snippetForComponentBlock(block),
          `Create a ${block} component block.`
        ));
      }

      for (const block of STYLE_BLOCK_TYPES) {
        items.push(createSnippet(
          block,
          snippetForStyleBlock(block),
          `Create a ${block} style block.`
        ));
      }

      for (const block of RAW_BLOCK_TYPES) {
        items.push(createSnippet(
          block,
          snippetForRawBlock(block),
          `Create a ${block} compatibility block.`
        ));
      }

      for (const block of DIRECTIVE_BLOCK_TYPES) {
        items.push(createSnippet(
          `@${block}`,
          snippetForDirectiveBlock(block),
          `Create a @${block} directive.`
        ));
      }

      items.push(
        createSnippet(
          "@tokens.editable",
          "@tokens.editable {\n  accent: ${1:#c96442}\n  surface: #ffffff\n}",
          "Create editable design tokens for AI-safe changes."
        ),
        createSnippet(
          "@tokens.locked",
          "@tokens.locked {\n  title.line-height: ${1:1.05}\n  grid.gap: ${2:24px}\n}",
          "Create locked design tokens tied to replay fidelity."
        )
      );

      return items;
    }
  };
}

function createSnippet(label, snippet, detail) {
  const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Snippet);
  item.insertText = new vscode.SnippetString(snippet);
  item.detail = detail;
  item.sortText = `0-${label}`;
  return item;
}

function snippetForVisualBlock(block) {
  if (block === "visual.compare") {
    return "::visual.compare\nleft: ${1:Current}\nright: ${2:Future}\n\n- ${3:A} vs ${4:B}\n::";
  }

  if (block === "visual.loop") {
    return "::visual.loop\n${1:Start} -> ${2:Action} -> ${3:Feedback}\n::";
  }

  if (block === "visual.timeline") {
    return "::visual.timeline\n- ${1:First step}\n- ${2:Second step}\n- ${3:Third step}\n::";
  }

  if (block === "visual.matrix") {
    return "::visual.matrix[x=\"${1:Low -> High}\" y=\"${2:Low -> High}\"]\ntop-left: ${3:Option A}\ntop-right: ${4:Option B}\nbottom-left: ${5:Option C}\nbottom-right: ${6:Option D}\n::";
  }

  return `::${block}\n  $0\n::`;
}

function snippetForLayoutBlock(block) {
  if (block === "layout.grid") {
    return "::layout.grid[columns=\"${1:2}\" gap=\"${2:medium}\"]\n  $0\n::";
  }

  if (block === "layout.split") {
    return "::layout.split[gap=\"${1:large}\"]\n  $0\n::";
  }

  if (block === "layout.device") {
    return "::layout.device[kind=\"${1:phone}\" width=\"${2:390px}\"]\n  $0\n::";
  }

  if (block === "layout.tabs") {
    return "::layout.tabs\n  ::component.card[title=\"${1:Tab content}\"]\n  $0\n  ::\n::";
  }

  return `::${block}\n  $0\n::`;
}

function snippetForComponentBlock(block) {
  if (block === "component.metric") {
    return "::component.metric[label=\"${1:Metric}\" value=\"${2:42}\" detail=\"${3:Meaningful detail}\"]\n::";
  }

  if (block === "component.card") {
    return "::component.card[title=\"${1:Card title}\"]\n${2:Card body}\n::";
  }

  if (block === "component.persona") {
    return "::component.persona[name=\"${1:Persona}\" role=\"${2:Role}\"]\n- ${3:Need}\n- ${4:Pain point}\n::";
  }

  if (block === "component.token-table") {
    return "::component.token-table\ncolor-accent: #0e7490 - Primary action\nspace-md: 16px - Default gap\n::";
  }

  return `::${block}\n  $0\n::`;
}

function snippetForStyleBlock(block) {
  if (block === "style.tokens") {
    return "::style.tokens\naccent: #0e7490 - Primary accent\nsurface: #fffdfa - Default surface\n::";
  }

  if (block === "style.css") {
    return "::style.css\n.custom-block {\n  display: grid;\n}\n::";
  }

  return `::${block}\n  $0\n::`;
}

function snippetForRawBlock(block) {
  if (block === "raw.html") {
    return "::raw.html\n<div class=\"${1:preserved-block}\">\n  ${2:Preserved HTML}\n</div>\n::";
  }

  if (block === "raw.css") {
    return "::raw.css\n.${1:preserved-block} {\n  display: grid;\n}\n::";
  }

  if (block === "raw.svg") {
    return "::raw.svg\n<svg viewBox=\"0 0 100 100\" role=\"img\" aria-label=\"${1:Graphic}\">\n  <circle cx=\"50\" cy=\"50\" r=\"40\" />\n</svg>\n::";
  }

  return `::${block}\n  $0\n::`;
}

function snippetForDirectiveBlock(block) {
  if (block === "lock") {
    return "@lock {\n  renderer: vmd-web@${1:0.3.0}\n  dictionary: ${2:system}@${3:1.0.0}\n  browser: chromium\n  viewport: ${4:1440x1200}\n}";
  }

  if (block === "tokens") {
    return "@tokens.editable {\n  accent: ${1:#c96442}\n  surface: #ffffff\n}\n\n@tokens.locked {\n  border: #e6e4e0\n  title.line-height: 1.05\n}";
  }

  if (block === "edit_state") {
    return "@edit_state {\n  source: ${1:clean}\n  replay: ${2:current}\n  dirty: ${3:none}\n  on-source-edit: mark affected slots stale, rerender, remeasure, update-render-hash\n}";
  }

  if (block === "dirty") {
    return "@dirty {\n  ${1:frame.overview.title}\n  render-hash\n}";
  }

  if (block === "residual_index") {
    return "@residual_index {\n  affected:\n    - ${1:frame.overview.title}\n  constraints:\n    ${1:frame.overview.title}.max-lines: 2\n  ai-note: Edit source slots only. Do not edit replay data directly.\n}";
  }

  if (block === "replay") {
    return "@replay {\n  encoding: visual-replay@0.1\n  contains: dom-delta css-cascade layout-boxes\n}";
  }

  if (block === "residual") {
    return "@residual {\n  mode: visual-lossless\n  ai: ignore\n  payload: ${1:omitted}\n}";
  }

  if (block === "raw") {
    return "@raw {\n  mode: fallback\n  ai: ignore\n  payload: ${1:omitted}\n}";
  }

  return `@${block} {\n  $0\n}`;
}

function updateDiagnostics(document, collection) {
  if (!isVmdDocument(document)) {
    return;
  }

  try {
    const ast = parseVmd(document.getText());
    collection.set(document.uri, validateVmdAst(ast).map((diagnostic) => toVsCodeDiagnostic(document, diagnostic)));
  } catch (error) {
    const line = parseLineNumber(error.message);
    collection.set(document.uri, [
      toVsCodeDiagnostic(document, {
        level: "error",
        code: "parse-error",
        line,
        message: error.message
      })
    ]);
  }
}

function toVsCodeDiagnostic(document, diagnostic) {
  const range = rangeForLine(document, diagnostic.line);
  const severity = diagnostic.level === "error"
    ? vscode.DiagnosticSeverity.Error
    : vscode.DiagnosticSeverity.Warning;
  const result = new vscode.Diagnostic(range, `${diagnostic.code}: ${diagnostic.message}`, severity);
  result.source = "vmd";
  result.code = diagnostic.code;
  return result;
}

function rangeForLine(document, oneBasedLine) {
  const lineNumber = Math.min(
    Math.max((oneBasedLine || 1) - 1, 0),
    Math.max(document.lineCount - 1, 0)
  );
  const line = document.lineAt(lineNumber);
  return new vscode.Range(lineNumber, 0, lineNumber, line.text.length);
}

function parseLineNumber(message) {
  const match = String(message).match(/line\s+(\d+)/i);
  return match ? Number(match[1]) : 1;
}

module.exports = {
  activate,
  deactivate
};
