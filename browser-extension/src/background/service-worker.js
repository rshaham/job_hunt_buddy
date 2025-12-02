// Service worker for Career Forager extension
// Handles background tasks and coordinates between content scripts and popup

const DEFAULT_APP_URL = 'http://localhost:5173';

/**
 * Clear stored job data when tab changes
 */
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  // Clear current job when switching tabs
  await chrome.storage.local.remove('currentJob');
});

/**
 * Clear stored job data when URL changes
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    await chrome.storage.local.remove('currentJob');
  }
});

/**
 * Handle messages from popup or content scripts
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_APP_URL') {
    chrome.storage.sync.get('appUrl').then((settings) => {
      sendResponse({ url: settings.appUrl || DEFAULT_APP_URL });
    });
    return true;
  }

  if (message.type === 'OPEN_APP') {
    chrome.storage.sync.get('appUrl').then((settings) => {
      const appUrl = settings.appUrl || DEFAULT_APP_URL;
      const params = new URLSearchParams(message.params);
      chrome.tabs.create({ url: `${appUrl}?${params}` });
    });
    return true;
  }
});

/**
 * Handle extension install/update
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Set default app URL on first install
    chrome.storage.sync.set({ appUrl: DEFAULT_APP_URL });

    // Open options page to configure
    chrome.runtime.openOptionsPage();
  }
});

console.log('[Career Forager] Service worker initialized');
