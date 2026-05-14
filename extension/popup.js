document.getElementById("open-viewer").addEventListener("click", async () => {
  const url = chrome.runtime.getURL("viewer.html");
  await chrome.tabs.create({ url });
  window.close();
});
