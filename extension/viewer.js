const { parseVmd, renderVmd, validateVmdAst } = window.VMDCore;

const fileInput = document.getElementById("file-input");
const sourceInput = document.getElementById("source-input");
const fileName = document.getElementById("file-name");
const preview = document.getElementById("preview");
const dropZone = document.getElementById("drop-zone");
const diagnostics = document.getElementById("diagnostics");
const sampleButton = document.getElementById("sample-button");
const layeredSampleButton = document.getElementById("layered-sample-button");
const modeTabs = Array.from(document.querySelectorAll(".mode-tab"));

let mode = "read";

fileInput.addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (file) {
    await loadFile(file);
  }
});

sourceInput.addEventListener("input", () => {
  fileName.textContent = "Edited source";
  render();
});

sampleButton.addEventListener("click", async () => {
  const response = await fetch(chrome.runtime.getURL("sample.vmd"));
  const source = await response.text();
  sourceInput.value = source;
  fileName.textContent = "source-layer-brief.vmd";
  render();
});

layeredSampleButton.addEventListener("click", async () => {
  const response = await fetch(chrome.runtime.getURL("layered-sample.vmd"));
  const source = await response.text();
  sourceInput.value = source;
  fileName.textContent = "visual-fidelity-layers.vmd";
  render();
});

for (const tab of modeTabs) {
  tab.addEventListener("click", () => {
    mode = tab.dataset.mode;
    for (const candidate of modeTabs) {
      candidate.classList.toggle("active", candidate === tab);
    }
    render();
  });
}

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("dragging");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragging");
});

dropZone.addEventListener("drop", async (event) => {
  event.preventDefault();
  dropZone.classList.remove("dragging");
  const [file] = event.dataTransfer.files;
  if (file) {
    await loadFile(file);
  }
});

async function loadFile(file) {
  const source = await file.text();
  sourceInput.value = source;
  fileName.textContent = file.name;
  render();
}

function render() {
  const source = sourceInput.value.trim();
  if (!source) {
    renderDiagnostics([]);
    preview.className = "preview empty-state";
    preview.innerHTML = "<p>Open or drop a `.vmd` file to render it.</p>";
    return;
  }

  try {
    const ast = parseVmd(source);
    renderDiagnostics(validateVmdAst(ast));
    preview.className = "preview";
    preview.innerHTML = renderVmd(ast, mode);
  } catch (error) {
    renderDiagnostics([
      {
        level: "error",
        code: "parse-error",
        message: error.message
      }
    ]);
    preview.className = "preview";
    preview.innerHTML = `<div class="error">${escapeHtml(error.message)}</div>`;
  }
}

function renderDiagnostics(items) {
  diagnostics.classList.toggle("active", Boolean(items.length));
  diagnostics.innerHTML = "";

  for (const item of items) {
    const row = document.createElement("div");
    row.className = `diagnostic ${item.level}`;
    row.textContent = `${item.line ? `Line ${item.line}: ` : ""}${item.code} - ${item.message}`;
    diagnostics.appendChild(row);
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
