import { extractLinkedIn } from './extractors/linkedin.js';
import { extractIndeed } from './extractors/indeed.js';
import { extractGreenhouse } from './extractors/greenhouse.js';
import { extractLever } from './extractors/lever.js';
import { extractGeneric } from './extractors/generic.js';

/**
 * Get the appropriate extractor for the current site
 */
function getExtractor() {
  const host = window.location.hostname;

  if (host.includes('linkedin.com')) return extractLinkedIn;
  if (host.includes('indeed.com')) return extractIndeed;
  if (host.includes('greenhouse.io')) return extractGreenhouse;
  if (host.includes('lever.co')) return extractLever;

  return extractGeneric;
}

/**
 * Extract job data and store it
 */
function extractAndStore() {
  try {
    const extractor = getExtractor();
    const extracted = extractor();

    // Clean up the data
    const jobData = {
      title: (extracted.title || '').trim(),
      company: (extracted.company || '').trim(),
      description: (extracted.description || '').trim(),
      url: extracted.url || window.location.href,
      extractedAt: Date.now()
    };

    // Store for popup to retrieve
    chrome.storage.local.set({ currentJob: jobData });

    console.log('[Job Hunt Buddy] Extracted job data:', {
      title: jobData.title,
      company: jobData.company,
      descriptionLength: jobData.description.length
    });

    return jobData;
  } catch (error) {
    console.error('[Job Hunt Buddy] Extraction error:', error);
    return null;
  }
}

// Extract on page load
extractAndStore();

// Re-extract when URL changes (for SPAs like LinkedIn)
let lastUrl = window.location.href;
const observer = new MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    // Delay to let page content load
    setTimeout(extractAndStore, 1000);
  }
});

observer.observe(document.body, { childList: true, subtree: true });

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXTRACT') {
    const data = extractAndStore();
    sendResponse(data);
    return true;
  }

  if (message.type === 'GET_SELECTION') {
    sendResponse({
      text: window.getSelection().toString(),
      url: window.location.href
    });
    return true;
  }

  if (message.type === 'PING') {
    sendResponse({ ok: true });
    return true;
  }
});
