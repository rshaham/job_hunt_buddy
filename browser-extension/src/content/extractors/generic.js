import { getText, findJobPostingSchema } from './utils.js';

/**
 * Generic fallback extractor for unknown job sites
 * Uses heuristics to find job content
 */
export function extractGeneric() {
  // 1. Try JSON-LD JobPosting schema (many sites use this)
  const jsonLdData = findJobPostingSchema();
  if (jsonLdData && jsonLdData.description) {
    return jsonLdData;
  }

  // 2. Try Open Graph meta tags
  const ogTitle = document.querySelector('meta[property="og:title"]')?.content || '';
  const ogDescription = document.querySelector('meta[property="og:description"]')?.content || '';

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
