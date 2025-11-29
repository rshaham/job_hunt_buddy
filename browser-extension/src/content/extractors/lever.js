import { getText, getHTML, getTextFromAny, getHTMLFromAny, findJobPostingSchema } from './utils.js';

/**
 * Extract job data from Lever ATS job pages
 * Lever has consistent structure across all hosted pages
 */
export function extractLever() {
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
