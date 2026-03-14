// Background service worker for Raalhu extension

chrome.runtime.onInstalled.addListener(() => {
  console.log("[Raalhu] Extension installed");
});

// Handle messages from popup/content scripts
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_AUTH") {
    chrome.storage.sync.get(["apiUrl", "sessionToken"], (result) => {
      sendResponse(result);
    });
    return true; // async response
  }
});
