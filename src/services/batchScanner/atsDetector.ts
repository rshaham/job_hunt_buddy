/**
 * ATS (Applicant Tracking System) Detector
 *
 * Detects which ATS platform a career page uses based on URL patterns
 * and HTML content. This helps optimize job extraction by using
 * ATS-specific methods when available.
 */

import type { ATSType } from '../../types/batchScanner';

/**
 * URL patterns for common ATS platforms
 */
const ATS_URL_PATTERNS: { type: ATSType; patterns: RegExp[] }[] = [
  {
    type: 'greenhouse',
    patterns: [
      /boards\.greenhouse\.io/i,
      /grnh\.se/i,
      /greenhouse\.io\/.*\/jobs/i,
    ],
  },
  {
    type: 'lever',
    patterns: [
      /jobs\.lever\.co/i,
      /lever\.co\/.*\/jobs/i,
    ],
  },
  {
    type: 'ashby',
    patterns: [
      /jobs\.ashbyhq\.com/i,
      /ashbyhq\.com\/.*\/jobs/i,
    ],
  },
  {
    type: 'workday',
    patterns: [
      /\.myworkdayjobs\.com/i,
      /\.wd\d+\.myworkday/i,
      /workday\.com\/.*\/jobs/i,
    ],
  },
  {
    type: 'smartrecruiters',
    patterns: [
      /jobs\.smartrecruiters\.com/i,
      /smartrecruiters\.com\/.*\/jobs/i,
    ],
  },
];

/**
 * HTML content patterns that indicate specific ATS platforms
 */
const ATS_HTML_PATTERNS: { type: ATSType; patterns: RegExp[] }[] = [
  {
    type: 'greenhouse',
    patterns: [
      /greenhouse\.io/i,
      /"grnhse"/i,
      /data-greenhouse/i,
    ],
  },
  {
    type: 'lever',
    patterns: [
      /lever\.co/i,
      /"lever-/i,
      /data-lever/i,
    ],
  },
  {
    type: 'ashby',
    patterns: [
      /ashbyhq\.com/i,
      /_next\/static.*ashby/i,
    ],
  },
  {
    type: 'workday',
    patterns: [
      /workday/i,
      /wd-uic/i,
    ],
  },
];

/**
 * Detect ATS type from URL
 */
export function detectATSFromUrl(url: string): ATSType | null {
  for (const { type, patterns } of ATS_URL_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(url)) {
        return type;
      }
    }
  }
  return null;
}

/**
 * Detect ATS type from HTML content
 */
export function detectATSFromHtml(html: string): ATSType | null {
  // Only check first 50KB to avoid performance issues
  const htmlSample = html.slice(0, 50000);

  for (const { type, patterns } of ATS_HTML_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(htmlSample)) {
        return type;
      }
    }
  }
  return null;
}

/**
 * Detect ATS type from both URL and HTML content
 * URL detection takes precedence as it's more reliable
 */
export function detectATS(url: string, html?: string): ATSType {
  // Try URL-based detection first (most reliable)
  const urlATS = detectATSFromUrl(url);
  if (urlATS) {
    return urlATS;
  }

  // Fall back to HTML-based detection
  if (html) {
    const htmlATS = detectATSFromHtml(html);
    if (htmlATS) {
      return htmlATS;
    }
  }

  return 'unknown';
}

/**
 * Get the JSON API URL for ATS platforms that support it
 */
export function getATSApiUrl(url: string, atsType: ATSType): string | null {
  switch (atsType) {
    case 'greenhouse': {
      // Greenhouse: boards.greenhouse.io/company -> boards.greenhouse.io/company/jobs?content=true
      const match = url.match(/boards\.greenhouse\.io\/([^/?#]+)/i);
      if (match) {
        return `https://boards.greenhouse.io/${match[1]}/jobs?content=true`;
      }
      return null;
    }

    case 'lever': {
      // Lever: jobs.lever.co/company -> jobs.lever.co/company?mode=json
      const match = url.match(/jobs\.lever\.co\/([^/?#]+)/i);
      if (match) {
        return `https://jobs.lever.co/${match[1]}?mode=json`;
      }
      return null;
    }

    case 'ashby': {
      // Ashby: jobs.ashbyhq.com/company -> api.ashbyhq.com/posting-api/job-board/company
      const match = url.match(/jobs\.ashbyhq\.com\/([^/?#]+)/i);
      if (match) {
        return `https://api.ashbyhq.com/posting-api/job-board/${match[1]}`;
      }
      return null;
    }

    default:
      return null;
  }
}

/**
 * Check if an ATS type supports JSON API for job listing
 */
export function hasJsonApi(atsType: ATSType): boolean {
  return atsType === 'greenhouse' || atsType === 'lever' || atsType === 'ashby';
}
