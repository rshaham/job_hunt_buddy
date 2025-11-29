const DEFAULT_APP_URL = 'http://localhost:5173';

// DOM Elements
const elements = {
  detected: document.getElementById('detected'),
  notDetected: document.getElementById('notDetected'),
  loading: document.getElementById('loading'),
  error: document.getElementById('error'),
  errorMessage: document.getElementById('errorMessage'),
  title: document.getElementById('title'),
  company: document.getElementById('company'),
  preview: document.getElementById('preview'),
  sendBtn: document.getElementById('send'),
  useSelectionBtn: document.getElementById('useSelection'),
  retryBtn: document.getElementById('retry'),
  openOptionsLink: document.getElementById('openOptions')
};

let currentJob = null;
let appUrl = DEFAULT_APP_URL;

/**
 * Show a specific state and hide others
 */
function showState(state) {
  elements.detected.classList.add('hidden');
  elements.notDetected.classList.add('hidden');
  elements.loading.classList.add('hidden');
  elements.error.classList.add('hidden');

  if (state === 'detected') elements.detected.classList.remove('hidden');
  if (state === 'notDetected') elements.notDetected.classList.remove('hidden');
  if (state === 'loading') elements.loading.classList.remove('hidden');
  if (state === 'error') elements.error.classList.remove('hidden');
}

/**
 * Show error state with message
 */
function showError(message) {
  elements.errorMessage.textContent = message;
  showState('error');
}

/**
 * Display detected job data
 */
function showDetectedJob(job) {
  currentJob = job;

  elements.title.value = job.title || '';
  elements.company.value = job.company || '';

  // Show description preview (first 500 chars)
  let previewText = job.description || '';
  // Strip HTML tags for preview
  previewText = previewText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (previewText.length > 500) {
    previewText = previewText.slice(0, 500) + '...';
  }
  elements.preview.textContent = previewText || 'No description extracted';

  showState('detected');
}

/**
 * Send job data to the app
 */
function sendToApp(job) {
  const title = elements.title?.value || job.title || '';
  const company = elements.company?.value || job.company || '';

  const params = new URLSearchParams({
    jd_url: job.url || '',
    jd_text: job.description || '',
    jd_title: title,
    jd_company: company
  });

  chrome.tabs.create({ url: `${appUrl}?${params}` });
  window.close();
}

/**
 * Get selected text from the current tab
 */
async function getSelectedText() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => ({
        text: window.getSelection().toString(),
        url: window.location.href
      })
    });

    return result.result;
  } catch (error) {
    console.error('Failed to get selection:', error);
    return null;
  }
}

/**
 * Request extraction from content script
 */
async function requestExtraction() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // First check if content script is loaded
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'PING' });
    } catch {
      // Content script not loaded, inject it manually for generic pages
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['src/content/content.js']
      });
    }

    // Request extraction
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT' });
    return response;
  } catch (error) {
    console.error('Extraction request failed:', error);
    return null;
  }
}

/**
 * Initialize popup
 */
async function init() {
  showState('loading');

  // Load app URL from settings
  try {
    const settings = await chrome.storage.sync.get('appUrl');
    appUrl = settings.appUrl || DEFAULT_APP_URL;
  } catch {
    appUrl = DEFAULT_APP_URL;
  }

  // Try to get stored job data first
  try {
    const stored = await chrome.storage.local.get('currentJob');

    if (stored.currentJob && stored.currentJob.title && stored.currentJob.description) {
      showDetectedJob(stored.currentJob);
      return;
    }
  } catch (error) {
    console.error('Failed to get stored job:', error);
  }

  // Try to extract from current page
  const extracted = await requestExtraction();

  if (extracted && extracted.description && extracted.description.length > 100) {
    showDetectedJob(extracted);
  } else {
    showState('notDetected');
  }
}

// Event Listeners
elements.sendBtn.addEventListener('click', () => {
  if (currentJob) {
    sendToApp(currentJob);
  }
});

elements.useSelectionBtn.addEventListener('click', async () => {
  showState('loading');

  const selection = await getSelectedText();

  if (selection && selection.text && selection.text.length > 50) {
    showDetectedJob({
      title: '',
      company: '',
      description: selection.text,
      url: selection.url
    });
  } else {
    showError('Please select some text on the page first (at least 50 characters)');
  }
});

elements.retryBtn.addEventListener('click', () => {
  init();
});

elements.openOptionsLink.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

// Initialize on load
init();
