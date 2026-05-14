const assert = require("assert");
const path = require("path");
const vscode = require("vscode");

async function run() {
  const extension = vscode.extensions.getExtension("vmd.vmd-vscode");
  assert.ok(extension, "VMD VS Code extension should be registered");
  await extension.activate();

  const commands = await vscode.commands.getCommands(true);
  assert.ok(commands.includes("vmd.preview.open"), "preview command should be registered");
  assert.ok(commands.includes("vmd.preview.openToSide"), "preview-to-side command should be registered");

  const fixture = path.resolve(__dirname, "../../../samples/source-layer-brief.vmd");
  const document = await vscode.workspace.openTextDocument(vscode.Uri.file(fixture));
  assert.strictEqual(document.languageId, "vmd");

  await vscode.window.showTextDocument(document);
  await wait(250);

  const diagnostics = vscode.languages.getDiagnostics(document.uri);
  assert.ok(
    diagnostics.some((diagnostic) => diagnostic.code === "claim-without-evidence"),
    "validator diagnostics should be published for the active document"
  );

  const completions = await vscode.commands.executeCommand(
    "vscode.executeCompletionItemProvider",
    document.uri,
    new vscode.Position(0, 0),
    "@"
  );
  assert.ok(
    completions.items.some((item) => item.label === "doc"),
    "completion provider should offer VMD snippets"
  );
  assert.ok(
    completions.items.some((item) => item.label === "layout.grid"),
    "completion provider should offer layout snippets"
  );
  assert.ok(
    completions.items.some((item) => item.label === "component.metric"),
    "completion provider should offer component snippets"
  );
  assert.ok(
    completions.items.some((item) => item.label === "style.tokens"),
    "completion provider should offer style snippets"
  );
  assert.ok(
    completions.items.some((item) => item.label === "raw.html"),
    "completion provider should offer raw compatibility snippets"
  );

  const panel = await vscode.commands.executeCommand("vmd.preview.openToSide");
  assert.ok(panel, "preview command should return a WebviewPanel");
  assert.ok(panel.webview, "preview panel should expose a webview");
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  run
};
