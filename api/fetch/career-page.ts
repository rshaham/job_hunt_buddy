/**
 * Career Page Fetch API Proxy
 *
 * Fetches career pages from URLs, following redirects (e.g., lnkd.in -> company site).
 * Returns HTML content for job extraction.
 * Includes rate limiting to prevent abuse.
 *
 * SECURITY: Includes SSRF protection to block requests to internal networks,
 * cloud metadata endpoints, and private IP ranges.
 */

// Load environment variables first (for local development on Windows)
import '../_lib/loadEnv.js';

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkAllRateLimits } from '../_lib/rateLimit.js';
import dns from 'dns';
import { promisify } from 'util';

const dnsLookup = promisify(dns.lookup);

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
  errorCode?: 'TIMEOUT' | 'NETWORK_ERROR' | 'BLOCKED' | 'NOT_FOUND' | 'RATE_LIMITED' | 'INVALID_URL' | 'SSRF_BLOCKED';
}

// Browser-like User-Agent to avoid blocking
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Timeout for fetch requests (10 seconds)
const FETCH_TIMEOUT = 10000;

// ============================================================================
// SSRF Protection
// ============================================================================

/**
 * Blocked hostnames that should never be fetched
 */
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '[::1]',
  'metadata.google.internal',
  'metadata.goog',
  'kubernetes.default.svc',
]);

/**
 * Blocked hostname patterns (regex)
 */
const BLOCKED_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /\.local$/i,           // *.local
  /\.internal$/i,        // *.internal
  /\.localhost$/i,       // *.localhost
  /^metadata\./i,        // metadata.*
  /\.metadata\./i,       // *.metadata.*
  /^169\.254\./,         // Link-local (AWS metadata)
  /^10\./,               // Private 10.x.x.x
  /^172\.(1[6-9]|2\d|3[01])\./,  // Private 172.16-31.x.x
  /^192\.168\./,         // Private 192.168.x.x
  /^127\./,              // Loopback 127.x.x.x
  /^0\./,                // 0.x.x.x
];

/**
 * Check if an IP address is in a private/blocked range
 */
function isBlockedIP(ip: string): boolean {
  // Handle IPv6
  if (ip.includes(':')) {
    const ipLower = ip.toLowerCase();
    // Block localhost IPv6
    if (ipLower === '::1' || ipLower === '0:0:0:0:0:0:0:1') return true;
    // Block link-local IPv6 (fe80::/10)
    if (ipLower.startsWith('fe80:')) return true;
    // Block private IPv6 (fc00::/7 - includes fd00::/8)
    if (ipLower.startsWith('fc') || ipLower.startsWith('fd')) return true;
    // Block loopback
    if (ipLower.startsWith('::ffff:127.')) return true;
    return false;
  }

  // IPv4 checks
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
    return true; // Invalid IP = blocked
  }

  const [a, b] = parts;

  // 0.0.0.0/8 - Current network
  if (a === 0) return true;

  // 10.0.0.0/8 - Private
  if (a === 10) return true;

  // 127.0.0.0/8 - Loopback
  if (a === 127) return true;

  // 169.254.0.0/16 - Link-local (AWS/cloud metadata)
  if (a === 169 && b === 254) return true;

  // 172.16.0.0/12 - Private
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.168.0.0/16 - Private
  if (a === 192 && b === 168) return true;

  // 224.0.0.0/4 - Multicast
  if (a >= 224 && a <= 239) return true;

  // 240.0.0.0/4 - Reserved
  if (a >= 240) return true;

  return false;
}

/**
 * Check if a hostname is blocked
 */
function isBlockedHostname(hostname: string): boolean {
  const hostLower = hostname.toLowerCase();

  // Check exact matches
  if (BLOCKED_HOSTNAMES.has(hostLower)) {
    return true;
  }

  // Check patterns
  for (const pattern of BLOCKED_HOSTNAME_PATTERNS) {
    if (pattern.test(hostLower)) {
      return true;
    }
  }

  return false;
}

/**
 * Validate URL is safe to fetch (SSRF protection)
 * Returns { safe: true } or { safe: false, reason: string }
 */
async function validateUrlSafety(urlString: string): Promise<{ safe: boolean; reason?: string }> {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return { safe: false, reason: 'Invalid URL format' };
  }

  // Only allow HTTPS (with HTTP allowed for lnkd.in which redirects)
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return { safe: false, reason: 'Only HTTP/HTTPS URLs are allowed' };
  }

  // Block non-standard ports except 80, 443
  if (url.port && url.port !== '80' && url.port !== '443') {
    return { safe: false, reason: 'Non-standard ports are not allowed' };
  }

  const hostname = url.hostname;

  // Check blocked hostnames
  if (isBlockedHostname(hostname)) {
    return { safe: false, reason: `Hostname "${hostname}" is not allowed` };
  }

  // Resolve DNS and check the actual IP
  try {
    const { address } = await dnsLookup(hostname);
    if (isBlockedIP(address)) {
      return { safe: false, reason: `Resolved IP ${address} is in a blocked range` };
    }
  } catch (err) {
    // DNS lookup failed - could be a non-existent domain
    // We'll let the fetch fail naturally with a better error
  }

  return { safe: true };
}

/**
 * Validate and normalize URL (basic format check)
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

  // SSRF Protection: Validate URL is safe to fetch
  const safetyCheck = await validateUrlSafety(body.url);
  if (!safetyCheck.safe) {
    console.warn(`[CareerPageFetch] SSRF blocked: ${body.url} - ${safetyCheck.reason}`);
    return res.status(403).json({
      success: false,
      finalUrl: body.url,
      error: `Request blocked: ${safetyCheck.reason}`,
      errorCode: 'SSRF_BLOCKED',
    } as CareerPageResponse);
  }

  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    // Follow redirects manually with SSRF protection on each hop
    const MAX_REDIRECTS = 10;
    let currentUrl = body.url;
    let response: Response | null = null;

    for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
      // Validate each URL before fetching (SSRF protection for redirects)
      if (redirectCount > 0) {
        const redirectSafetyCheck = await validateUrlSafety(currentUrl);
        if (!redirectSafetyCheck.safe) {
          console.warn(`[CareerPageFetch] SSRF blocked redirect: ${currentUrl} - ${redirectSafetyCheck.reason}`);
          clearTimeout(timeoutId);
          return res.status(403).json({
            success: false,
            finalUrl: currentUrl,
            error: `Redirect blocked: ${redirectSafetyCheck.reason}`,
            errorCode: 'SSRF_BLOCKED',
          } as CareerPageResponse);
        }
      }

      response = await fetch(currentUrl, {
        method: 'GET',
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        redirect: 'manual', // Handle redirects manually for SSRF protection
        signal: controller.signal,
      });

      // Check if this is a redirect
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) {
          break; // No location header, stop following
        }

        // Resolve relative URLs
        try {
          currentUrl = new URL(location, currentUrl).toString();
        } catch {
          break; // Invalid redirect URL
        }

        continue; // Follow the redirect
      }

      break; // Not a redirect, we're done
    }

    clearTimeout(timeoutId);

    if (!response) {
      return res.status(500).json({
        success: false,
        finalUrl: currentUrl,
        error: 'Failed to get response',
        errorCode: 'NETWORK_ERROR',
      } as CareerPageResponse);
    }

    // Check for HTTP errors
    if (!response.ok) {
      if (response.status === 404) {
        return res.status(200).json({
          success: false,
          finalUrl: currentUrl,
          error: 'Page not found',
          errorCode: 'NOT_FOUND',
        } as CareerPageResponse);
      }

      if (response.status === 403 || response.status === 401) {
        return res.status(200).json({
          success: false,
          finalUrl: currentUrl,
          error: 'Access denied - page may require authentication or be blocking automated access',
          errorCode: 'BLOCKED',
        } as CareerPageResponse);
      }

      return res.status(200).json({
        success: false,
        finalUrl: currentUrl,
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
      finalUrl: currentUrl, // URL after following redirects
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
