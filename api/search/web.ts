/**
 * Web Search API Proxy
 *
 * Proxies requests to Tavily API while keeping the API key server-side.
 * Includes rate limiting to prevent abuse.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkAllRateLimits } from '../_lib/rateLimit.js';

interface TavilySearchRequest {
  query: string;
  includeDomains?: string[];
  excludeDomains?: string[];
  maxResults?: number;
  searchDepth?: 'basic' | 'advanced';
}

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

interface TavilyResponse {
  results: TavilySearchResult[];
  answer?: string;
  query: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get API key from server environment (never exposed to client)
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    console.error('[WebSearch] TAVILY_API_KEY not configured');
    return res.status(500).json({
      error: 'Search service not configured',
      code: 'NOT_CONFIGURED',
    });
  }

  // Get client IP for rate limiting
  const forwardedFor = req.headers['x-forwarded-for'];
  const clientIP = typeof forwardedFor === 'string'
    ? forwardedFor.split(',')[0].trim()
    : req.socket?.remoteAddress || 'unknown';

  // Check rate limits
  const rateLimitResult = await checkAllRateLimits(clientIP, 'web-search');
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
  const body = req.body as TavilySearchRequest;

  if (!body.query || typeof body.query !== 'string') {
    return res.status(400).json({
      error: 'Query is required',
      code: 'INVALID_REQUEST',
    });
  }

  // Sanitize and limit parameters
  const maxResults = Math.min(body.maxResults || 5, 10); // Cap at 10 results

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query: body.query,
        search_depth: body.searchDepth || 'basic',
        include_domains: body.includeDomains || [],
        exclude_domains: body.excludeDomains || [],
        max_results: maxResults,
        include_answer: false,
        include_raw_content: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[WebSearch] Tavily API error:', response.status, errorText);

      // Don't expose internal error details to client
      return res.status(502).json({
        error: 'Search service temporarily unavailable',
        code: 'UPSTREAM_ERROR',
      });
    }

    const data: TavilyResponse = await response.json();

    // Return results
    return res.status(200).json({
      results: data.results || [],
      query: data.query,
    });
  } catch (error) {
    console.error('[WebSearch] Proxy error:', error);
    return res.status(500).json({
      error: 'Search service error',
      code: 'INTERNAL_ERROR',
    });
  }
}
