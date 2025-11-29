import { getText, getHTML, getTextFromAny, getHTMLFromAny, findJobPostingSchema } from './utils.js';

/**
 * Extract job data from Greenhouse ATS job pages
 * Greenhouse has fairly consistent structure across companies
 */
export function extractGreenhouse() {
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

  // Company name often in header or can be extracted from title
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

  // Fallback: try to extract from page title (usually "Job Title at Company - Greenhouse")
  if (!company) {
    const titleMatch = document.title.match(/at\s+(.+?)\s*[-–—]/);
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
