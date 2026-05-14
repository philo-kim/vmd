import { runTests } from "@vscode/test-electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

delete process.env.ELECTRON_RUN_AS_NODE;
for (const key of Object.keys(process.env)) {
  if (key.startsWith("VSCODE_")) {
    delete process.env[key];
  }
}

await runTests({
  extensionDevelopmentPath: path.join(root, "vscode-extension"),
  extensionTestsPath: path.join(root, "vscode-extension", "test", "suite", "index.js"),
  launchArgs: [
    "--disable-workspace-trust"
  ]
});

console.log("vscode extension integration test passed");
