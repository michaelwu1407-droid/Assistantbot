/**
 * Pj Buddy CRM — Browser Extension Background Service Worker
 *
 * Handles communication between content scripts and the CRM API.
 * Stores the API base URL and workspace ID in chrome.storage.
 */

const DEFAULT_CONFIG = {
  apiBaseUrl: "",
  workspaceId: "",
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "PUSH_TO_CRM") {
    pushToCRM(message.data)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === "STREAM_CHAT") {
    streamFromChatAPI(message.payload)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
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
  const config = await getConfig();

  if (!config.apiBaseUrl) {
    return { success: false, error: "API URL not configured. Open the extension popup to set your deployment URL." };
  }
  if (!config.workspaceId) {
    return { success: false, error: "Workspace ID not configured. Open the extension popup to set it up." };
  }

  try {
    const response = await fetch(`${config.apiBaseUrl}/api/extension/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, workspaceId: config.workspaceId }),
    });
    return await response.json();
  } catch (err) {
    return { success: false, error: `Network error: ${err.message}` };
  }
}

/**
 * Stream a chat completion from the API.
 * Wraps the stream reader in try/catch; on idle-timeout resumes by
 * re-issuing the request with the partial text appended to the prompt.
 *
 * @param {{ messages: Array, endpoint?: string }} payload
 * @returns {{ success: boolean, text?: string, error?: string }}
 */
async function streamFromChatAPI(payload) {
  const config = await getConfig();

  if (!config.apiBaseUrl) {
    return { success: false, error: "API URL not configured." };
  }

  const endpoint = payload.endpoint ?? "/api/chat";
  const MAX_RETRIES = 3;

  let accumulated = "";
  let messages = payload.messages ?? [];

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const body = JSON.stringify({ messages, workspaceId: config.workspaceId });

    let response;
    try {
      response = await fetch(`${config.apiBaseUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
    } catch (err) {
      return { success: false, error: `Network error: ${err.message}` };
    }

    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText);
      return { success: false, error: `HTTP ${response.status}: ${text}` };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
      }
      // Clean stream finish — return everything collected
      return { success: true, text: accumulated };
    } catch (err) {
      reader.cancel().catch(() => {});

      const isIdleTimeout =
        err.name === "TimeoutError" ||
        /idle timeout|stream idle/i.test(err.message);

      if (!isIdleTimeout || attempt === MAX_RETRIES) {
        return {
          success: false,
          error: err.message,
          partial: accumulated || undefined,
        };
      }

      // Resume: append what arrived so far as a partial assistant turn,
      // then ask the model to continue from where it left off.
      messages = [
        ...messages,
        { role: "assistant", content: accumulated },
        { role: "user", content: "Continue exactly from where you left off." },
      ];
    }
  }

  return { success: false, error: "Max retries exceeded.", partial: accumulated };
}

function getConfig() {
  return new Promise((resolve) => {
    chrome.storage.local.get(DEFAULT_CONFIG, resolve);
  });
}
