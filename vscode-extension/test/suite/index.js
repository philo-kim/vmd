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

  const fixture = path.resolve(__dirname, "../../../samples/family-platform.vmd");
  const document = await vscode.workspace.openTextDocument(vscode.Uri.file(fixture));
  assert.strictEqual(document.languageId, "vmd");

  await vscode.window.showTextDocument(document);
  const panel = await vscode.commands.executeCommand("vmd.preview.openToSide");
  assert.ok(panel, "preview command should return a WebviewPanel");
  assert.ok(panel.webview, "preview panel should expose a webview");
}

module.exports = {
  run
};
