import { getText, getHTML, getTextFromAny, getHTMLFromAny, findJobPostingSchema } from './utils.js';

/**
 * Extract job data from Indeed job pages
 */
export function extractIndeed() {
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
