/**
 * Career Page Fetch API Proxy
 *
 * Fetches career pages from URLs, following redirects (e.g., lnkd.in -> company site).
 * Returns HTML content for job extraction.
 * Includes rate limiting to prevent abuse.
 */

// Load environment variables first (for local development on Windows)
import '../_lib/loadEnv.js';

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkAllRateLimits } from '../_lib/rateLimit.js';

interface CareerPageRequest {
  url: string;
  companyHint?: string;
}

interface CareerPageResponse {
  success: boolean;
  finalUrl: string;
  html?: string;
  contentType?: string;
  error?: string;
  errorCode?: 'TIMEOUT' | 'NETWORK_ERROR' | 'BLOCKED' | 'NOT_FOUND' | 'RATE_LIMITED' | 'INVALID_URL';
}

// Browser-like User-Agent to avoid blocking
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Timeout for fetch requests (10 seconds)
const FETCH_TIMEOUT = 10000;

/**
 * Validate and normalize URL
 */
function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<VercelResponse> {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Allow batch scanner to bypass rate limiting (internal use only)
  const isBatchScanner = req.headers['x-batch-scanner'] === 'internal';

  if (!isBatchScanner) {
    // Get client IP for rate limiting
    const forwardedFor = req.headers['x-forwarded-for'];
    const clientIP = typeof forwardedFor === 'string'
      ? forwardedFor.split(',')[0].trim()
      : req.socket?.remoteAddress || 'unknown';

    // Check rate limits (use separate prefix for career page fetches)
    const rateLimitResult = await checkAllRateLimits(clientIP, 'career-page');
    if (!rateLimitResult.allowed) {
      const errorMessage = rateLimitResult.reason === 'daily_cap'
        ? 'Daily fetch limit reached. Try again tomorrow.'
        : 'Rate limit exceeded. Please wait before fetching again.';

      return res.status(429).json({
        success: false,
        finalUrl: '',
        error: errorMessage,
        errorCode: 'RATE_LIMITED',
        retryAfter: rateLimitResult.retryAfter,
      } as CareerPageResponse);
    }
  }

  // Validate request body
  const body = req.body as CareerPageRequest;

  if (!body.url || typeof body.url !== 'string') {
    return res.status(400).json({
      success: false,
      finalUrl: '',
      error: 'URL is required',
      errorCode: 'INVALID_URL',
    } as CareerPageResponse);
  }

  // Validate URL format
  if (!isValidUrl(body.url)) {
    return res.status(400).json({
      success: false,
      finalUrl: body.url,
      error: 'Invalid URL format',
      errorCode: 'INVALID_URL',
    } as CareerPageResponse);
  }

  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    // Fetch the URL, following redirects
    const response = await fetch(body.url, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      redirect: 'follow',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Check for HTTP errors
    if (!response.ok) {
      if (response.status === 404) {
        return res.status(200).json({
          success: false,
          finalUrl: response.url,
          error: 'Page not found',
          errorCode: 'NOT_FOUND',
        } as CareerPageResponse);
      }

      if (response.status === 403 || response.status === 401) {
        return res.status(200).json({
          success: false,
          finalUrl: response.url,
          error: 'Access denied - page may require authentication or be blocking automated access',
          errorCode: 'BLOCKED',
        } as CareerPageResponse);
      }

      return res.status(200).json({
        success: false,
        finalUrl: response.url,
        error: `HTTP error: ${response.status}`,
        errorCode: 'NETWORK_ERROR',
      } as CareerPageResponse);
    }

    // Get content type
    const contentType = response.headers.get('content-type') || '';

    // Read the response body
    const html = await response.text();

    // Return successful response
    return res.status(200).json({
      success: true,
      finalUrl: response.url, // URL after following redirects
      html,
      contentType,
    } as CareerPageResponse);

  } catch (error) {
    console.error('[CareerPageFetch] Error:', error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return res.status(200).json({
          success: false,
          finalUrl: body.url,
          error: 'Request timed out after 10 seconds',
          errorCode: 'TIMEOUT',
        } as CareerPageResponse);
      }

      if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
        return res.status(200).json({
          success: false,
          finalUrl: body.url,
          error: 'Could not connect to server',
          errorCode: 'NETWORK_ERROR',
        } as CareerPageResponse);
      }
    }

    return res.status(200).json({
      success: false,
      finalUrl: body.url,
      error: 'Failed to fetch page',
      errorCode: 'NETWORK_ERROR',
    } as CareerPageResponse);
  }
}
