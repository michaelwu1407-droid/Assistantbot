/**
 * Pj Buddy CRM — Browser Extension Background Service Worker
 *
 * Handles communication between content scripts and the CRM API.
 * Stores the API base URL and workspace ID in chrome.storage.
 */

// Default config — user sets these in the popup
const DEFAULT_CONFIG = {
  apiBaseUrl: "http://localhost:3000",
  workspaceId: "",
};

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "PUSH_TO_CRM") {
    pushToCRM(message.data)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // Keep channel open for async response
  }

  if (message.type === "GET_CONFIG") {
    chrome.storage.local.get(DEFAULT_CONFIG, (config) => {
      sendResponse(config);
    });
    return true;
  }
});

/**
 * Push scraped data to the CRM via API route.
 */
async function pushToCRM(data) {
  const config = await new Promise((resolve) => {
    chrome.storage.local.get(DEFAULT_CONFIG, resolve);
  });

  if (!config.workspaceId) {
    return { success: false, error: "Workspace ID not configured. Open the extension popup to set it up." };
  }

  try {
    const response = await fetch(`${config.apiBaseUrl}/api/extension/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        workspaceId: config.workspaceId,
      }),
    });

    return await response.json();
  } catch (err) {
    return { success: false, error: `Network error: ${err.message}` };
  }
}
