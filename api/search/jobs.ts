/**
 * Job Search API Proxy
 *
 * Proxies requests to SerApi's Google Jobs engine while keeping
 * the API key server-side. Includes rate limiting.
 */

// Load environment variables first (for local development on Windows)
import '../_lib/loadEnv.js';

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkAllRateLimits } from '../_lib/rateLimit.js';

interface JobSearchRequest {
  query: string;
  location?: string;
  num?: number;
  /** User-provided API key (uses their quota, skips rate limiting) */
  userApiKey?: string;
}

interface SerpapiJobResult {
  title: string;
  company_name: string;
  location: string;
  via: string;
  description?: string;
  job_highlights?: {
    title: string;
    items: string[];
  }[];
  detected_extensions?: {
    posted_at?: string;
    salary?: string;
    work_from_home?: boolean;
  };
  job_id?: string;
  link?: string;
  // Apply options contain actual application links (LinkedIn, Indeed, company site, etc.)
  apply_options?: {
    title: string;  // e.g., "LinkedIn", "Indeed", "Company Website"
    link: string;   // Direct application URL
  }[];
}

interface SerpapiResponse {
  jobs_results?: SerpapiJobResult[];
  search_metadata?: {
    google_jobs_url?: string;
  };
  error?: string;
}

/**
 * Select the best apply link from apply_options based on priority:
 * 1. Company site (matches company name in title/link, or careers/corporate keywords)
 * 2. Greendoor
 * 3. LinkedIn
 * 4. Indeed
 * 5. Any other option (except blocklisted sites)
 * 6. Blocklisted sites (bandana, etc.) - only as last resort
 */
function selectBestApplyLink(
  applyOptions: { title: string; link: string }[] | undefined,
  companyName: string
): string | undefined {
  if (!applyOptions || applyOptions.length === 0) return undefined;

  // Sites that require login or have poor UX - use only as last resort
  const isBlocklisted = (opt: { title: string; link: string }) =>
    /bandana/i.test(opt.title) || /bandana/i.test(opt.link);

  // Filter out blocklisted options for priority matching
  const goodOptions = applyOptions.filter(opt => !isBlocklisted(opt));

  // Normalize company name for matching (remove common suffixes, lowercase)
  const normalizedCompany = companyName
    .toLowerCase()
    .replace(/\s*(inc\.?|llc|ltd\.?|corp\.?|corporation|company|co\.?)$/i, '')
    .trim();

  // Check if option matches company (by name or typical company site patterns)
  const isCompanySite = (opt: { title: string; link: string }) => {
    const titleLower = opt.title.toLowerCase();
    const linkLower = opt.link.toLowerCase();

    // Match company name in title or link
    if (normalizedCompany && (titleLower.includes(normalizedCompany) || linkLower.includes(normalizedCompany))) {
      return true;
    }

    // Match generic company site patterns
    return /company|career|jobs?\.|corporate|hire/i.test(opt.title) ||
           /career|jobs?\./i.test(opt.link);
  };

  // Priority 1: Company site
  const companySite = goodOptions.find(isCompanySite);
  if (companySite) return companySite.link;

  // Priority 2: Greendoor
  const greendoor = goodOptions.find(opt =>
    /greendoor|green\s*door/i.test(opt.title) || /greendoor/i.test(opt.link)
  );
  if (greendoor) return greendoor.link;

  // Priority 3: LinkedIn
  const linkedin = goodOptions.find(opt =>
    /linkedin/i.test(opt.title) || /linkedin/i.test(opt.link)
  );
  if (linkedin) return linkedin.link;

  // Priority 4: Indeed
  const indeed = goodOptions.find(opt =>
    /indeed/i.test(opt.title) || /indeed/i.test(opt.link)
  );
  if (indeed) return indeed.link;

  // Priority 5: Any non-blocklisted option
  if (goodOptions.length > 0) {
    return goodOptions[0].link;
  }

  // Last resort: blocklisted option (better than nothing)
  return applyOptions[0]?.link;
}

// Transform SerApi response to a simpler format
interface JobResult {
  title: string;
  company: string;
  location: string;
  source: string;
  description: string;
  postedAt?: string;
  salary?: string;
  remote?: boolean;
  jobId?: string;
  link?: string;
  applyLink?: string;  // Direct application link from apply_options
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validate request body
  const body = req.body as JobSearchRequest;

  // Check if user provided their own API key
  const userProvidedKey = body.userApiKey;

  // Get API key - prefer user's key, fall back to server key
  const apiKey = userProvidedKey || process.env.SERPAPI_API_KEY;
  if (!apiKey) {
    console.error('[JobSearch] No API key available (user or server)');
    return res.status(500).json({
      error: 'Job search service not configured',
      code: 'NOT_CONFIGURED',
    });
  }

  // Only apply rate limiting if using server's API key
  if (!userProvidedKey) {
    // Get client IP for rate limiting
    const forwardedFor = req.headers['x-forwarded-for'];
    const clientIP = typeof forwardedFor === 'string'
      ? forwardedFor.split(',')[0].trim()
      : req.socket?.remoteAddress || 'unknown';

    // Check rate limits (use separate prefix for job searches)
    const rateLimitResult = await checkAllRateLimits(clientIP, 'job-search');
    if (!rateLimitResult.allowed) {
      const errorMessage = rateLimitResult.reason === 'daily_cap'
        ? 'Daily search limit reached. Try again tomorrow.'
        : 'Rate limit exceeded. Please wait before searching again.';

      return res.status(429).json({
        error: errorMessage,
        code: rateLimitResult.reason === 'daily_cap' ? 'DAILY_CAP' : 'RATE_LIMITED',
        retryAfter: rateLimitResult.retryAfter,
      });
    }
  }

  if (!body.query || typeof body.query !== 'string') {
    return res.status(400).json({
      error: 'Query is required',
      code: 'INVALID_REQUEST',
    });
  }

  // Sanitize parameters
  const numResults = Math.min(body.num || 10, 20); // Cap at 20 results

  try {
    // Build SerApi URL
    const params = new URLSearchParams({
      api_key: apiKey,
      engine: 'google_jobs',
      q: body.query,
      num: String(numResults),
    });

    // Add location if provided
    if (body.location) {
      params.set('location', body.location);
    }

    const response = await fetch(`https://serpapi.com/search?${params}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[JobSearch] SerApi error:', response.status, errorText);

      // Parse error for more specific message
      let errorMessage = 'Job search service temporarily unavailable';
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error) {
          errorMessage = `SerApi: ${errorJson.error}`;
        }
      } catch {
        // Keep default message
      }

      return res.status(502).json({
        error: errorMessage,
        code: 'UPSTREAM_ERROR',
      });
    }

    const data: SerpapiResponse = await response.json();

    if (data.error) {
      // "No results" is not an error - just return empty array
      if (data.error.toLowerCase().includes('hasn\'t returned any results')) {
        console.log('[JobSearch] No results found for query');
        return res.status(200).json({
          results: [],
          query: body.query,
          location: body.location,
        });
      }

      console.error('[JobSearch] SerApi returned error:', data.error);
      return res.status(502).json({
        error: 'Job search service error',
        code: 'UPSTREAM_ERROR',
      });
    }

    // Transform results to our format
    const results: JobResult[] = (data.jobs_results || []).map((job) => ({
      title: job.title,
      company: job.company_name,
      location: job.location,
      source: job.via,
      description: job.description || '',
      postedAt: job.detected_extensions?.posted_at,
      salary: job.detected_extensions?.salary,
      remote: job.detected_extensions?.work_from_home,
      jobId: job.job_id,
      link: job.link,
      // Select best apply link based on priority (company site > greendoor > linkedin > indeed)
      applyLink: selectBestApplyLink(job.apply_options, job.company_name),
    }));

    return res.status(200).json({
      results,
      query: body.query,
      location: body.location,
    });
  } catch (error) {
    console.error('[JobSearch] Proxy error:', error);
    return res.status(500).json({
      error: 'Job search service error',
      code: 'INTERNAL_ERROR',
    });
  }
}
