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
}

interface SerpapiResponse {
  jobs_results?: SerpapiJobResult[];
  search_metadata?: {
    google_jobs_url?: string;
  };
  error?: string;
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
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get API key from server environment
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) {
    console.error('[JobSearch] SERPAPI_API_KEY not configured');
    return res.status(500).json({
      error: 'Job search service not configured',
      code: 'NOT_CONFIGURED',
    });
  }

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

  // Validate request body
  const body = req.body as JobSearchRequest;

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

      return res.status(502).json({
        error: 'Job search service temporarily unavailable',
        code: 'UPSTREAM_ERROR',
      });
    }

    const data: SerpapiResponse = await response.json();

    if (data.error) {
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
