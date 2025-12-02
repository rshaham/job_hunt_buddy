(function() {
  'use strict';

  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================

  /**
   * Get text content from an element matching the selector
   */
  function getText(selector) {
    const el = document.querySelector(selector);
    return el?.innerText?.trim() || '';
  }

  /**
   * Get inner HTML from an element matching the selector
   */
  function getHTML(selector) {
    const el = document.querySelector(selector);
    return el?.innerHTML?.trim() || '';
  }

  /**
   * Get text content from first matching selector in a list
   */
  function getTextFromAny(selectors) {
    for (const selector of selectors) {
      const text = getText(selector);
      if (text) return text;
    }
    return '';
  }

  /**
   * Get HTML content from first matching selector in a list
   */
  function getHTMLFromAny(selectors) {
    for (const selector of selectors) {
      const html = getHTML(selector);
      if (html) return html;
    }
    return '';
  }

  /**
   * Find and parse JSON-LD JobPosting schema from page
   */
  function findJobPostingSchema() {
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

  // =============================================================================
  // SITE EXTRACTORS
  // =============================================================================

  /**
   * Extract job data from LinkedIn job pages
   */
  function extractLinkedIn() {
    // 1. Try JSON-LD first (most reliable)
    const jsonLdData = findJobPostingSchema();
    if (jsonLdData && jsonLdData.title && jsonLdData.description) {
      return jsonLdData;
    }

    // 2. DOM fallback - LinkedIn uses various class names
    const titleSelectors = [
      '.job-details-jobs-unified-top-card__job-title',
      '.jobs-unified-top-card__job-title h1',
      '.jobs-unified-top-card__job-title',
      'h1.t-24',
      'h1'
    ];

    const companySelectors = [
      '.job-details-jobs-unified-top-card__company-name a',
      '.job-details-jobs-unified-top-card__company-name',
      '.jobs-unified-top-card__company-name a',
      '.jobs-unified-top-card__company-name',
      '.jobs-unified-top-card__subtitle-primary-grouping a'
    ];

    const descriptionSelectors = [
      '.jobs-description__content',
      '.jobs-box__html-content',
      '.jobs-description-content__text',
      '#job-details',
      '.jobs-description'
    ];

    return {
      title: getTextFromAny(titleSelectors),
      company: getTextFromAny(companySelectors),
      description: getHTMLFromAny(descriptionSelectors),
      url: window.location.href
    };
  }

  /**
   * Extract job data from Indeed job pages
   */
  function extractIndeed() {
    // 1. Try JSON-LD first
    const jsonLdData = findJobPostingSchema();
    if (jsonLdData && jsonLdData.title && jsonLdData.description) {
      return jsonLdData;
    }

    // 2. DOM extraction
    const titleSelectors = [
      'h1.jobsearch-JobInfoHeader-title',
      '.jobsearch-JobInfoHeader-title',
      'h1[data-testid="jobsearch-JobInfoHeader-title"]',
      '.icl-u-xs-mb--xs h1'
    ];

    const companySelectors = [
      '[data-company-name="true"] a',
      '[data-company-name="true"]',
      '.jobsearch-InlineCompanyRating-companyHeader a',
      '.jobsearch-InlineCompanyRating-companyHeader',
      '[data-testid="inlineHeader-companyName"]'
    ];

    const descriptionSelectors = [
      '#jobDescriptionText',
      '.jobsearch-jobDescriptionText',
      '[data-testid="jobDescriptionText"]',
      '.jobsearch-JobComponent-description'
    ];

    return {
      title: getTextFromAny(titleSelectors),
      company: getTextFromAny(companySelectors),
      description: getHTMLFromAny(descriptionSelectors),
      url: window.location.href
    };
  }

  /**
   * Extract job data from Greenhouse ATS job pages
   */
  function extractGreenhouse() {
    // 1. Try JSON-LD first
    const jsonLdData = findJobPostingSchema();
    if (jsonLdData && jsonLdData.title && jsonLdData.description) {
      return jsonLdData;
    }

    // 2. DOM extraction
    const titleSelectors = [
      '.app-title',
      'h1.posting-headline',
      '.posting-headline h1',
      'h1'
    ];

    const companySelectors = [
      '#header .company-name',
      '.company-name',
      '.main-header__logo-link'
    ];

    const descriptionSelectors = [
      '#content',
      '.content',
      '.section-wrapper .body',
      '.posting-content',
      '.job__description'
    ];

    let company = getTextFromAny(companySelectors);

    // Fallback: try to extract from page title
    if (!company) {
      const titleMatch = document.title.match(/at\s+(.+?)\s*[-–—]/);
      if (titleMatch) {
        company = titleMatch[1].trim();
      }
    }

    // Fallback: extract from URL path (e.g., /anthropic/jobs/...)
    if (!company) {
      const pathMatch = window.location.pathname.match(/^\/([^\/]+)\/jobs/);
      if (pathMatch) {
        // Convert slug to title case (e.g., "anthropic" -> "Anthropic")
        company = pathMatch[1]
          .replace(/-/g, ' ')
          .replace(/\b\w/g, c => c.toUpperCase());
      }
    }

    return {
      title: getTextFromAny(titleSelectors),
      company,
      description: getHTMLFromAny(descriptionSelectors),
      url: window.location.href
    };
  }

  /**
   * Extract job data from Lever ATS job pages
   */
  function extractLever() {
    // 1. Try JSON-LD first
    const jsonLdData = findJobPostingSchema();
    if (jsonLdData && jsonLdData.title && jsonLdData.description) {
      return jsonLdData;
    }

    // 2. DOM extraction
    const titleSelectors = [
      '.posting-headline h2',
      '.posting-headline',
      'h2'
    ];

    const descriptionSelectors = [
      '.section-wrapper .content',
      '.posting-content',
      '.content'
    ];

    // Company name is usually in the logo alt text or header
    let company = '';
    const logoImg = document.querySelector('.main-header-logo img');
    if (logoImg) {
      company = logoImg.alt || '';
    }

    // Fallback: try page title
    if (!company) {
      const titleMatch = document.title.match(/(.+?)\s*[-–—]/);
      if (titleMatch) {
        company = titleMatch[1].trim();
      }
    }

    return {
      title: getTextFromAny(titleSelectors),
      company,
      description: getHTMLFromAny(descriptionSelectors),
      url: window.location.href
    };
  }

  /**
   * Generic fallback extractor for unknown job sites
   */
  function extractGeneric() {
    // 1. Try JSON-LD JobPosting schema
    const jsonLdData = findJobPostingSchema();
    if (jsonLdData && jsonLdData.description) {
      return jsonLdData;
    }

    // 2. Try Open Graph meta tags
    const ogTitle = document.querySelector('meta[property="og:title"]')?.content || '';

    // 3. Try to find main content area
    const mainContentSelectors = [
      'main',
      '[role="main"]',
      'article',
      '.job-description',
      '.job-details',
      '.job-content',
      '#job-description',
      '#job-details',
      '.posting-content',
      '.description'
    ];

    let description = '';
    for (const selector of mainContentSelectors) {
      const el = document.querySelector(selector);
      if (el && el.innerText.length > 200) {
        description = el.innerText;
        break;
      }
    }

    // Fallback to body text if nothing found
    if (!description) {
      description = document.body.innerText;
    }

    // Limit description size
    description = description.slice(0, 50000);

    // Try to find title
    let title = ogTitle || getText('h1') || document.title;

    // Clean up title (remove site name suffix)
    title = title.replace(/\s*[-–—|]\s*(?:LinkedIn|Indeed|Glassdoor|Jobs|Careers?).*$/i, '').trim();

    return {
      title,
      company: '', // User will fill in for generic sites
      description,
      url: window.location.href
    };
  }

  // =============================================================================
  // MAIN LOGIC
  // =============================================================================

  /**
   * Check if we're on LinkedIn
   */
  function isLinkedIn() {
    return window.location.hostname.includes('linkedin.com');
  }

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

      console.log('[Career Forager] Extracted job data:', {
        title: jobData.title,
        company: jobData.company,
        descriptionLength: jobData.description.length
      });

      return jobData;
    } catch (error) {
      console.error('[Career Forager] Extraction error:', error);
      return null;
    }
  }

  /**
   * Extract with retry logic for SPAs like LinkedIn that load content dynamically
   * @param {number} maxRetries - Maximum number of retry attempts
   * @param {number} delay - Delay between retries in ms
   */
  function extractWithRetry(maxRetries = 5, delay = 1000) {
    let attempts = 0;

    function tryExtract() {
      attempts++;
      const data = extractAndStore();

      // Check if we got meaningful content
      const hasContent = data && (data.title || data.description.length > 100);

      if (hasContent) {
        console.log(`[Career Forager] Successfully extracted on attempt ${attempts}`);
        return;
      }

      // Retry if we haven't hit max attempts
      if (attempts < maxRetries) {
        console.log(`[Career Forager] Content not ready, retrying in ${delay}ms (attempt ${attempts}/${maxRetries})`);
        setTimeout(tryExtract, delay);
      } else {
        console.log(`[Career Forager] Max retries reached, extraction may be incomplete`);
      }
    }

    // Start first attempt with initial delay for SPAs
    if (isLinkedIn()) {
      // LinkedIn needs extra time for initial content load
      setTimeout(tryExtract, 1500);
    } else {
      tryExtract();
    }
  }

  // =============================================================================
  // INITIALIZATION
  // =============================================================================

  // Extract on page load with retry logic for SPAs
  extractWithRetry();

  // Re-extract when URL changes (for SPAs like LinkedIn)
  let lastUrl = window.location.href;
  const observer = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      // Use retry logic for URL changes too
      extractWithRetry();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Listen for messages from popup or background
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'EXTRACT') {
      // For manual extraction requests, use retry logic
      if (isLinkedIn()) {
        // For LinkedIn, do a fresh extraction with retries
        extractWithRetry(3, 500);
        // Return current data immediately, it will update in storage
        setTimeout(() => {
          chrome.storage.local.get('currentJob', (result) => {
            sendResponse(result.currentJob || null);
          });
        }, 2000);
        return true;
      }
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

})();
