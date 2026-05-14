const path = require("path");
const vscode = require("vscode");
const {
  parseVmd,
  renderVmd,
  validateVmdAst,
  SEMANTIC_BLOCK_TYPES,
  VISUAL_BLOCK_TYPES,
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
      webviewOptions(this.context)
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
    webviewPanel.webview.options = webviewOptions(this.context);
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

function webviewOptions(context) {
  return {
    enableScripts: true,
    localResourceRoots: [
      vscode.Uri.joinPath(context.extensionUri, "media")
    ]
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
      read: renderVmd(ast, "read"),
      deck: renderVmd(ast, "deck"),
      map: renderVmd(ast, "map")
    };
    const data = serializeScriptData({ mode, views });

    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
    <link rel="stylesheet" href="${styleUri}">
    <title>${title}</title>
  </head>
  <body class="vscode-vmd">
    <header class="vmd-toolbar">
      <div>
        <p class="eyebrow">VMD Preview</p>
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

function createCompletionProvider() {
  return {
    provideCompletionItems() {
      const items = [
        createSnippet(
          "doc",
          '@doc "${1:Document title}" {\n  format: ${2:deck}\n  theme: ${3:clean}\n  audience: ${4:reader}\n}\n\n$0',
          "Create a VMD document header."
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

  return `::${block}\n  $0\n::`;
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
