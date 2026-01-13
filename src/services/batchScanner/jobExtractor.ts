/**
 * Job Extractor Service
 *
 * Extracts job listings from career pages using multiple strategies:
 * 1. ATS-specific JSON APIs (Greenhouse, Lever, Ashby)
 * 2. Structured data (JSON-LD)
 * 3. Heuristic HTML parsing
 */

import type {
  ExtractedJob,
  ExtractionResult,
  ExtractionMethod,
  ExtractionConfidence,
  ATSType,
  CareerPageFetchResponse,
} from '../../types/batchScanner';
import { detectATS, getATSApiUrl, hasJsonApi } from './atsDetector';
import { useAppStore } from '../../stores/appStore';

// ============================================================================
// Career Keyword Extraction & Job Relevance Filtering
// ============================================================================

/**
 * Extract career-relevant keywords from user profile for pre-filtering jobs.
 * Keywords come from: resume, skill profile skills, and career goal documents.
 */
export function extractCareerKeywords(): string[] {
  const { settings, careerCoachState } = useAppStore.getState();
  const keywords: Set<string> = new Set();

  // From resume - extract common role/skill keywords
  if (settings.defaultResumeText) {
    const rolePatterns = /\b(engineer|developer|manager|lead|senior|staff|principal|architect|designer|analyst|scientist|director|product|data|software|frontend|backend|fullstack|devops|cloud|mobile|web|machine learning|ml|ai|security|infrastructure|platform|systems|solutions)\b/gi;
    const matches = settings.defaultResumeText.match(rolePatterns) || [];
    matches.forEach(m => keywords.add(m.toLowerCase()));
  }

  // From skill profile - extract skill keywords
  if (careerCoachState?.skillProfile?.skills) {
    careerCoachState.skillProfile.skills.forEach(entry => {
      // Split skill into words and add meaningful ones
      entry.skill.split(/\s+/).forEach(word => {
        if (word.length > 3) keywords.add(word.toLowerCase());
      });
    });
  }

  // From context documents (career goals)
  if (settings.contextDocuments) {
    settings.contextDocuments.forEach(doc => {
      const nameLower = doc.name.toLowerCase();
      if (nameLower.includes('goal') || nameLower.includes('target') || nameLower.includes('career')) {
        // Extract key words from career goal documents (use fullText property)
        const words = doc.fullText.match(/\b[a-zA-Z]{4,}\b/g) || [];
        words.slice(0, 30).forEach(w => keywords.add(w.toLowerCase()));
      }
    });
  }

  return Array.from(keywords);
}

/**
 * Quick relevance check based on job title.
 * Returns true if title contains any career keyword.
 */
export function isJobTitleRelevant(title: string, careerKeywords: string[]): boolean {
  // If no keywords configured, all jobs are relevant
  if (careerKeywords.length === 0) return true;

  const titleLower = title.toLowerCase();
  return careerKeywords.some(keyword => titleLower.includes(keyword));
}

/**
 * Fetch full job description from an individual job posting page.
 */
export async function fetchJobFullDescription(jobUrl: string): Promise<string | null> {
  try {
    const result = await fetchCareerPage(jobUrl);
    if (!result.success || !result.html) {
      return null;
    }

    const html = result.html;

    // Strategy 1: JSON-LD structured data (most reliable)
    const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    if (jsonLdMatches) {
      for (const match of jsonLdMatches) {
        try {
          const jsonContent = match.replace(/<script[^>]*>|<\/script>/gi, '');
          const data = JSON.parse(jsonContent);
          if (data['@type'] === 'JobPosting' && data.description) {
            return data.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          }
        } catch { /* Continue to next match */ }
      }
    }

    // Strategy 2: Common job description containers
    const descPatterns = [
      /<div[^>]*class=["'][^"']*job-description[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*class=["'][^"']*description[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*id=["']job-description["'][^>]*>([\s\S]*?)<\/div>/i,
      /<section[^>]*class=["'][^"']*content[^"']*["'][^>]*>([\s\S]*?)<\/section>/i,
      /<article[^>]*class=["'][^"']*job[^"']*["'][^>]*>([\s\S]*?)<\/article>/i,
    ];

    for (const pattern of descPatterns) {
      const match = html.match(pattern);
      if (match && match[1].length > 200) {
        return match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      }
    }

    return null;
  } catch (error) {
    console.error('[BatchScanner] Failed to fetch full description:', error);
    return null;
  }
}

/**
 * Generate a unique ID for extracted jobs
 */
function generateJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Direct browser-side fetch (fallback for local development)
 * Works for CORS-enabled sites and ATS platforms with open APIs
 */
async function directFetch(url: string): Promise<CareerPageFetchResponse> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      signal: controller.signal,
      // Note: Can't set User-Agent in browser, but most career pages work without it
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        finalUrl: response.url,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const contentType = response.headers.get('content-type') || '';
    const html = await response.text();

    return {
      success: true,
      finalUrl: response.url,
      html,
      contentType,
    };
  } catch (error) {
    // CORS error or network failure
    const message = error instanceof Error ? error.message : 'Unknown error';

    // Provide helpful error for CORS issues
    if (message.includes('CORS') || message.includes('Failed to fetch')) {
      return {
        success: false,
        error: `CORS blocked: ${url} - This URL requires the API proxy (use "vercel dev" or deploy to Vercel)`,
      };
    }

    return {
      success: false,
      error: `Direct fetch failed: ${message}`,
    };
  }
}

/**
 * Fetch a career page through the proxy, with fallback to direct fetch for local development
 */
export async function fetchCareerPage(url: string): Promise<CareerPageFetchResponse> {
  // Try the API proxy first (works in production & with vercel dev)
  try {
    const response = await fetch('/api/fetch/career-page', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Batch-Scanner': 'internal', // Bypass API rate limiting for batch scans
      },
      body: JSON.stringify({ url }),
    });

    // If API is available, use it
    if (response.ok) {
      return response.json();
    }

    // If 404, API isn't available (local dev with npm run dev)
    if (response.status === 404) {
      console.log('[BatchScanner] API proxy not available, using direct fetch');
      return directFetch(url);
    }

    // Handle rate limiting gracefully - don't retry, just report
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const waitSeconds = retryAfter ? parseInt(retryAfter, 10) : undefined;
      const hostname = new URL(url).hostname;

      console.warn(`[BatchScanner] Rate limited by ${hostname}${waitSeconds ? ` (retry after ${waitSeconds}s)` : ''}`);

      return {
        success: false,
        error: `Rate limited by ${hostname}. ${waitSeconds ? `Wait ${waitSeconds}s` : 'Please wait a few minutes'} and try with fewer URLs.`,
        errorCode: 'RATE_LIMITED',
        retryAfterSeconds: waitSeconds,
      };
    }

    // Other errors from API
    const data = await response.json().catch(() => ({}));
    return {
      success: false,
      error: data.error || `API error: ${response.status}`,
    };
  } catch (error) {
    // Network error or API unavailable - try direct fetch
    console.log('[BatchScanner] API proxy failed, using direct fetch:', error);
    return directFetch(url);
  }
}

/**
 * Extract jobs from Greenhouse JSON API
 */
async function extractFromGreenhouse(apiUrl: string): Promise<ExtractedJob[]> {
  const response = await fetch('/api/fetch/career-page', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Batch-Scanner': 'internal',
    },
    body: JSON.stringify({ url: apiUrl }),
  });

  const data: CareerPageFetchResponse = await response.json();
  if (!data.success || !data.html) {
    return [];
  }

  try {
    const jobs = JSON.parse(data.html);
    if (!Array.isArray(jobs.jobs)) {
      return [];
    }

    return jobs.jobs.map((job: {
      title?: string;
      absolute_url?: string;
      location?: { name?: string };
      content?: string;
      departments?: { name?: string }[];
    }) => ({
      id: generateJobId(),
      title: job.title || 'Unknown Position',
      url: job.absolute_url || '',
      location: job.location?.name,
      descriptionSnippet: job.content?.slice(0, 300)?.replace(/<[^>]+>/g, '') || undefined,
      department: job.departments?.[0]?.name,
    }));
  } catch {
    return [];
  }
}

/**
 * Extract jobs from Lever JSON API
 */
async function extractFromLever(apiUrl: string): Promise<ExtractedJob[]> {
  const response = await fetch('/api/fetch/career-page', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Batch-Scanner': 'internal',
    },
    body: JSON.stringify({ url: apiUrl }),
  });

  const data: CareerPageFetchResponse = await response.json();
  if (!data.success || !data.html) {
    return [];
  }

  try {
    const jobs = JSON.parse(data.html);
    if (!Array.isArray(jobs)) {
      return [];
    }

    return jobs.map((job: {
      text?: string;
      hostedUrl?: string;
      categories?: { location?: string; team?: string };
      descriptionPlain?: string;
    }) => ({
      id: generateJobId(),
      title: job.text || 'Unknown Position',
      url: job.hostedUrl || '',
      location: job.categories?.location,
      descriptionSnippet: job.descriptionPlain?.slice(0, 300),
      department: job.categories?.team,
    }));
  } catch {
    return [];
  }
}

/**
 * Extract jobs from Ashby JSON API
 */
async function extractFromAshby(apiUrl: string): Promise<ExtractedJob[]> {
  const response = await fetch('/api/fetch/career-page', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Batch-Scanner': 'internal',
    },
    body: JSON.stringify({ url: apiUrl }),
  });

  const data: CareerPageFetchResponse = await response.json();
  if (!data.success || !data.html) {
    return [];
  }

  try {
    const result = JSON.parse(data.html);
    const jobs = result.jobs || result.jobPostings || [];
    if (!Array.isArray(jobs)) {
      return [];
    }

    return jobs.map((job: {
      title?: string;
      jobUrl?: string;
      location?: string;
      descriptionPlain?: string;
      department?: string;
      team?: string;
    }) => ({
      id: generateJobId(),
      title: job.title || 'Unknown Position',
      url: job.jobUrl || '',
      location: job.location,
      descriptionSnippet: job.descriptionPlain?.slice(0, 300),
      department: job.department || job.team,
    }));
  } catch {
    return [];
  }
}

/**
 * Extract jobs using ATS-specific JSON API
 */
async function extractFromAtsApi(url: string, atsType: ATSType): Promise<ExtractedJob[]> {
  const apiUrl = getATSApiUrl(url, atsType);
  if (!apiUrl) {
    return [];
  }

  switch (atsType) {
    case 'greenhouse':
      return extractFromGreenhouse(apiUrl);
    case 'lever':
      return extractFromLever(apiUrl);
    case 'ashby':
      return extractFromAshby(apiUrl);
    default:
      return [];
  }
}

/**
 * Extract jobs from JSON-LD structured data in HTML
 */
function extractFromJsonLd(html: string, baseUrl: string): ExtractedJob[] {
  const jobs: ExtractedJob[] = [];

  // Find all JSON-LD scripts
  const jsonLdPattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = jsonLdPattern.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);

      // Handle JobPosting schema
      if (data['@type'] === 'JobPosting') {
        jobs.push({
          id: generateJobId(),
          title: data.title || 'Unknown Position',
          url: data.url || baseUrl,
          location: typeof data.jobLocation === 'object'
            ? data.jobLocation.address?.addressLocality
            : data.jobLocation,
          descriptionSnippet: data.description?.slice(0, 300)?.replace(/<[^>]+>/g, ''),
        });
      }

      // Handle arrays of JobPostings
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item['@type'] === 'JobPosting') {
            jobs.push({
              id: generateJobId(),
              title: item.title || 'Unknown Position',
              url: item.url || baseUrl,
              location: typeof item.jobLocation === 'object'
                ? item.jobLocation.address?.addressLocality
                : item.jobLocation,
              descriptionSnippet: item.description?.slice(0, 300)?.replace(/<[^>]+>/g, ''),
            });
          }
        }
      }
    } catch {
      // Invalid JSON-LD, continue
    }
  }

  return jobs;
}

/**
 * Extract jobs using heuristic HTML parsing
 * Looks for common patterns in career page HTML
 */
function extractFromHeuristics(html: string, baseUrl: string): ExtractedJob[] {
  const jobs: ExtractedJob[] = [];
  const seenUrls = new Set<string>();

  // Parse base URL for resolving relative links
  let baseUrlObj: URL;
  try {
    baseUrlObj = new URL(baseUrl);
  } catch {
    return [];
  }

  // Common patterns for job links
  const jobLinkPatterns = [
    // Standard job paths
    /href=["']([^"']*\/jobs?\/[^"'#]+)["']/gi,
    /href=["']([^"']*\/careers?\/[^"'#]+)["']/gi,
    /href=["']([^"']*\/positions?\/[^"'#]+)["']/gi,
    /href=["']([^"']*\/openings?\/[^"'#]+)["']/gi,
    /href=["']([^"']*\/opportunities?\/[^"'#]+)["']/gi,

    // ATS-specific patterns
    /href=["']([^"']*greenhouse\.io\/[^"'#]+\/jobs\/[^"'#]+)["']/gi,
    /href=["']([^"']*lever\.co\/[^"'#]+\/[a-f0-9-]+)["']/gi,
    /href=["']([^"']*ashbyhq\.com\/[^"'#]+\/[^"'#]+)["']/gi,
  ];

  // Extract links and their surrounding context
  for (const pattern of jobLinkPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      let jobUrl = match[1];

      // Resolve relative URLs
      if (!jobUrl.startsWith('http')) {
        try {
          jobUrl = new URL(jobUrl, baseUrlObj).href;
        } catch {
          continue;
        }
      }

      // Skip duplicates
      if (seenUrls.has(jobUrl)) {
        continue;
      }
      seenUrls.add(jobUrl);

      // Skip non-job URLs (apply pages, search, etc.)
      if (/\/(apply|search|filter|login|signup)/i.test(jobUrl)) {
        continue;
      }

      // Try to extract job title from surrounding HTML context
      const linkIndex = match.index;
      const contextStart = Math.max(0, linkIndex - 500);
      const contextEnd = Math.min(html.length, linkIndex + 500);
      const context = html.slice(contextStart, contextEnd);

      // Look for title in common patterns
      let title = 'Unknown Position';

      // Try to find title in link text
      const linkTextMatch = context.match(new RegExp(`href=["']${match[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>([^<]+)<`, 'i'));
      if (linkTextMatch && linkTextMatch[1].trim().length > 3) {
        title = linkTextMatch[1].trim();
      }

      // Try to find title in nearby heading or strong tag
      if (title === 'Unknown Position') {
        const headingMatch = context.match(/<(?:h[1-4]|strong)[^>]*>([^<]{5,100})<\/(?:h[1-4]|strong)>/i);
        if (headingMatch) {
          title = headingMatch[1].trim();
        }
      }

      // Try to find location
      let location: string | undefined;
      const locationMatch = context.match(/(?:location|city|office)[:\s]*([^<,]{3,50})/i);
      if (locationMatch) {
        location = locationMatch[1].trim();
      }

      jobs.push({
        id: generateJobId(),
        title,
        url: jobUrl,
        location,
      });
    }
  }

  return jobs;
}

/**
 * Extract company name from URL or HTML
 */
function extractCompanyName(url: string, html: string): string {
  // Try to get from Greenhouse/Lever URL
  const greenhouseMatch = url.match(/boards\.greenhouse\.io\/([^/?#]+)/i);
  if (greenhouseMatch) {
    return formatCompanyName(greenhouseMatch[1]);
  }

  const leverMatch = url.match(/jobs\.lever\.co\/([^/?#]+)/i);
  if (leverMatch) {
    return formatCompanyName(leverMatch[1]);
  }

  const ashbyMatch = url.match(/jobs\.ashbyhq\.com\/([^/?#]+)/i);
  if (ashbyMatch) {
    return formatCompanyName(ashbyMatch[1]);
  }

  // Try to get from <title> tag
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    const title = titleMatch[1].trim();
    // Remove common suffixes
    const cleanTitle = title
      .replace(/\s*[-|–]\s*(careers?|jobs?|openings?|opportunities?|hiring|work with us).*$/i, '')
      .replace(/\s*[-|–]\s*.*$/i, '')
      .trim();
    if (cleanTitle.length > 1 && cleanTitle.length < 100) {
      return cleanTitle;
    }
  }

  // Try to get from og:site_name
  const ogSiteMatch = html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i);
  if (ogSiteMatch) {
    return ogSiteMatch[1].trim();
  }

  // Fall back to domain name
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace(/^www\./, '');
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      return formatCompanyName(parts[parts.length - 2]);
    }
  } catch {
    // Invalid URL
  }

  return 'Unknown Company';
}

/**
 * Format company name from URL slug
 */
function formatCompanyName(slug: string): string {
  return slug
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}

/**
 * Main extraction function - tries multiple strategies
 */
export async function extractJobsFromPage(
  url: string,
  html: string
): Promise<ExtractionResult> {
  const atsType = detectATS(url, html);
  let jobs: ExtractedJob[] = [];
  let extractionMethod: ExtractionMethod = 'heuristic';
  let confidence: ExtractionConfidence = 'low';

  // Strategy 1: ATS-specific JSON API (highest confidence)
  if (hasJsonApi(atsType)) {
    jobs = await extractFromAtsApi(url, atsType);
    if (jobs.length > 0) {
      extractionMethod = 'json-api';
      confidence = 'high';
    }
  }

  // Strategy 2: JSON-LD structured data (high confidence)
  if (jobs.length === 0) {
    jobs = extractFromJsonLd(html, url);
    if (jobs.length > 0) {
      extractionMethod = 'structured-data';
      confidence = 'high';
    }
  }

  // Strategy 3: Heuristic HTML parsing (lower confidence)
  if (jobs.length === 0) {
    jobs = extractFromHeuristics(html, url);
    if (jobs.length > 0) {
      extractionMethod = 'heuristic';
      confidence = jobs.length > 3 ? 'medium' : 'low';
    }
  }

  // Extract company name
  const company = extractCompanyName(url, html);

  return {
    company,
    jobs,
    extractionMethod,
    atsType,
    confidence,
  };
}

/**
 * Fetch and extract jobs from a single URL
 */
export async function fetchAndExtractJobs(url: string): Promise<{
  success: boolean;
  result?: ExtractionResult;
  finalUrl?: string;
  error?: string;
}> {
  // Fetch the page
  const fetchResult = await fetchCareerPage(url);

  if (!fetchResult.success) {
    return {
      success: false,
      finalUrl: fetchResult.finalUrl,
      error: fetchResult.error || 'Failed to fetch page',
    };
  }

  if (!fetchResult.html) {
    return {
      success: false,
      finalUrl: fetchResult.finalUrl,
      error: 'No content received from page',
    };
  }

  // Extract jobs - use original url as fallback if finalUrl is not available
  const finalUrl = fetchResult.finalUrl || url;
  const result = await extractJobsFromPage(finalUrl, fetchResult.html);

  return {
    success: true,
    result,
    finalUrl,
  };
}
