import { getText, getHTMLFromAny, findJobPostingSchema } from './utils.js';

/**
 * Extract job data from LinkedIn job pages
 * LinkedIn embeds JSON-LD structured data which is most reliable
 */
export function extractLinkedIn() {
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

  let title = '';
  for (const sel of titleSelectors) {
    title = getText(sel);
    if (title) break;
  }

  let company = '';
  for (const sel of companySelectors) {
    company = getText(sel);
    if (company) break;
  }

  const description = getHTMLFromAny(descriptionSelectors);

  return {
    title,
    company,
    description,
    url: window.location.href
  };
}
