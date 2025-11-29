// Utility functions for extractors

/**
 * Get text content from an element matching the selector
 * @param {string} selector - CSS selector
 * @returns {string} Text content or empty string
 */
export function getText(selector) {
  const el = document.querySelector(selector);
  return el?.innerText?.trim() || '';
}

/**
 * Get inner HTML from an element matching the selector
 * @param {string} selector - CSS selector
 * @returns {string} Inner HTML or empty string
 */
export function getHTML(selector) {
  const el = document.querySelector(selector);
  return el?.innerHTML?.trim() || '';
}

/**
 * Get text content from first matching selector in a list
 * @param {string[]} selectors - Array of CSS selectors to try
 * @returns {string} Text content or empty string
 */
export function getTextFromAny(selectors) {
  for (const selector of selectors) {
    const text = getText(selector);
    if (text) return text;
  }
  return '';
}

/**
 * Get HTML content from first matching selector in a list
 * @param {string[]} selectors - Array of CSS selectors to try
 * @returns {string} HTML content or empty string
 */
export function getHTMLFromAny(selectors) {
  for (const selector of selectors) {
    const html = getHTML(selector);
    if (html) return html;
  }
  return '';
}

/**
 * Find and parse JSON-LD JobPosting schema from page
 * @returns {Object|null} Extracted job data or null
 */
export function findJobPostingSchema() {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');

  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent || '');

      // Handle single object
      if (data['@type'] === 'JobPosting') {
        return {
          title: data.title || '',
          company: data.hiringOrganization?.name || '',
          description: data.description || '',
          url: window.location.href
        };
      }

      // Handle array of objects
      if (Array.isArray(data)) {
        const jobPosting = data.find(item => item['@type'] === 'JobPosting');
        if (jobPosting) {
          return {
            title: jobPosting.title || '',
            company: jobPosting.hiringOrganization?.name || '',
            description: jobPosting.description || '',
            url: window.location.href
          };
        }
      }

      // Handle @graph structure
      if (data['@graph']) {
        const jobPosting = data['@graph'].find(item => item['@type'] === 'JobPosting');
        if (jobPosting) {
          return {
            title: jobPosting.title || '',
            company: jobPosting.hiringOrganization?.name || '',
            description: jobPosting.description || '',
            url: window.location.href
          };
        }
      }
    } catch (e) {
      // Continue to next script
    }
  }

  return null;
}
