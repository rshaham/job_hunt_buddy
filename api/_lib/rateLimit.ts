/**
 * Rate Limiting Utility for Vercel API Routes
 *
 * Uses Upstash Redis for distributed rate limiting across
 * serverless function instances.
 *
 * Configuration via environment variables:
 * - UPSTASH_REDIS_REST_URL: Redis endpoint from Upstash
 * - UPSTASH_REDIS_REST_TOKEN: Auth token from Upstash
 * - RATE_LIMIT_PER_HOUR: Requests per IP per hour (default: 20)
 * - DAILY_GLOBAL_CAP: Total daily requests across all users (default: 500)
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize Redis client from environment variables
const redis = Redis.fromEnv();

// Configurable rate limit per IP
const RATE_LIMIT_PER_HOUR = parseInt(process.env.RATE_LIMIT_PER_HOUR || '20', 10);

// Create rate limiter with sliding window algorithm
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(RATE_LIMIT_PER_HOUR, '1 h'),
  analytics: true,
});

export interface RateLimitResult {
  allowed: boolean;
  retryAfter: number;
  remaining?: number;
}

/**
 * Check if a request is within rate limits
 *
 * @param ip - Client IP address
 * @param prefix - Namespace prefix (e.g., 'search', 'jobs')
 * @returns Rate limit result with allowed status and retry info
 */
export async function checkRateLimit(
  ip: string,
  prefix: string
): Promise<RateLimitResult> {
  try {
    const { success, reset, remaining } = await ratelimit.limit(`${prefix}:${ip}`);

    return {
      allowed: success,
      retryAfter: success ? 0 : Math.ceil((reset - Date.now()) / 1000),
      remaining,
    };
  } catch (error) {
    // If Redis is unavailable, fail open (allow the request)
    // This prevents outages when Upstash is down
    console.error('[RateLimit] Redis error, failing open:', error);
    return {
      allowed: true,
      retryAfter: 0,
    };
  }
}

// Daily global cap (configurable)
const DAILY_GLOBAL_CAP = parseInt(process.env.DAILY_GLOBAL_CAP || '500', 10);

/**
 * Check and increment daily global usage cap
 * Returns true if under cap, false if exceeded
 *
 * @returns Whether the request is allowed under the daily cap
 */
export async function checkDailyGlobalCap(): Promise<{
  allowed: boolean;
  currentCount: number;
  dailyCap: number;
}> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const dailyKey = `global:daily:${today}`;

    const currentCount = await redis.incr(dailyKey);

    // Set expiry if this is a new key (24 hours)
    if (currentCount === 1) {
      await redis.expire(dailyKey, 86400);
    }

    return {
      allowed: currentCount <= DAILY_GLOBAL_CAP,
      currentCount,
      dailyCap: DAILY_GLOBAL_CAP,
    };
  } catch (error) {
    // If Redis is unavailable, fail open
    console.error('[DailyCap] Redis error, failing open:', error);
    return {
      allowed: true,
      currentCount: 0,
      dailyCap: DAILY_GLOBAL_CAP,
    };
  }
}

/**
 * Combined rate limit check: IP-based + daily global cap
 */
export async function checkAllRateLimits(
  ip: string,
  prefix: string
): Promise<{
  allowed: boolean;
  reason?: 'ip_limit' | 'daily_cap';
  retryAfter: number;
}> {
  // Check daily global cap first (cheaper operation)
  const dailyResult = await checkDailyGlobalCap();
  if (!dailyResult.allowed) {
    // Calculate seconds until midnight UTC
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    const retryAfter = Math.ceil((tomorrow.getTime() - now.getTime()) / 1000);

    return {
      allowed: false,
      reason: 'daily_cap',
      retryAfter,
    };
  }

  // Check IP-based rate limit
  const ipResult = await checkRateLimit(ip, prefix);
  if (!ipResult.allowed) {
    return {
      allowed: false,
      reason: 'ip_limit',
      retryAfter: ipResult.retryAfter,
    };
  }

  return {
    allowed: true,
    retryAfter: 0,
  };
}
