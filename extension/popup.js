document.addEventListener("DOMContentLoaded", () => {
  const apiUrlInput = document.getElementById("apiUrl");
  const workspaceIdInput = document.getElementById("workspaceId");
  const saveBtn = document.getElementById("save");
  const statusDiv = document.getElementById("status");

  // Load saved settings
  chrome.storage.local.get(
    { apiBaseUrl: "http://localhost:3000", workspaceId: "" },
    (config) => {
      apiUrlInput.value = config.apiBaseUrl;
      workspaceIdInput.value = config.workspaceId;
    }
  );

  // Save settings
  saveBtn.addEventListener("click", () => {
    const config = {
      apiBaseUrl: apiUrlInput.value.replace(/\/$/, ""),
      workspaceId: workspaceIdInput.value.trim(),
    };

    chrome.storage.local.set(config, () => {
      statusDiv.textContent = "Settings saved!";
      statusDiv.className = "status";
      setTimeout(() => {
        statusDiv.textContent = "";
      }, 2000);
    });
  });
});
