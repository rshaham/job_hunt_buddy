/**
 * Stripe Utility for Subscription Management
 */

import './loadEnv.js';
import Stripe from 'stripe';
import { Redis } from '@upstash/redis';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia',
});

// Initialize Redis for caching
const redis = Redis.fromEnv();

// Token limits
export const MONTHLY_TOKEN_LIMIT = 1_000_000;
export const TRIAL_TOKEN_LIMIT = 50_000;
export const TRIAL_DAYS = 7;

export type SubscriptionStatus = 'active' | 'trialing' | 'inactive' | 'past_due';

export interface SubscriptionInfo {
  status: SubscriptionStatus;
  customerId: string;
  email: string;
  currentPeriodEnd?: Date;
  tokensUsed: number;
  tokenLimit: number;
}

/**
 * Get subscription status from cache or Stripe
 */
export async function getSubscriptionStatus(customerId: string): Promise<SubscriptionInfo | null> {
  try {
    // Check cache first (1 hour TTL)
    const cached = await redis.get<SubscriptionInfo>(`subscription:${customerId}`);
    if (cached) {
      // Refresh token usage from Redis
      const tokensUsed = await getTokenUsage(customerId);
      return { ...cached, tokensUsed };
    }

    // Fetch from Stripe
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) return null;

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 1,
    });

    const sub = subscriptions.data[0];
    if (!sub) return null;

    let status: SubscriptionStatus = 'inactive';
    if (sub.status === 'active') status = 'active';
    else if (sub.status === 'trialing') status = 'trialing';
    else if (sub.status === 'past_due') status = 'past_due';

    const tokensUsed = await getTokenUsage(customerId);
    const tokenLimit = status === 'trialing' ? TRIAL_TOKEN_LIMIT : MONTHLY_TOKEN_LIMIT;

    const info: SubscriptionInfo = {
      status,
      customerId,
      email: typeof customer.email === 'string' ? customer.email : '',
      currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : undefined,
      tokensUsed,
      tokenLimit,
    };

    // Cache for 1 hour
    await redis.set(`subscription:${customerId}`, info, { ex: 3600 });

    return info;
  } catch (error) {
    console.error('[Stripe] Error getting subscription:', error);
    return null;
  }
}

/**
 * Get token usage for current billing period
 */
export async function getTokenUsage(customerId: string): Promise<number> {
  const month = new Date().toISOString().slice(0, 7); // YYYY-MM
  const key = `usage:${customerId}:${month}`;
  const usage = await redis.get<number>(key);
  return usage || 0;
}

/**
 * Increment token usage
 */
export async function incrementTokenUsage(
  customerId: string,
  tokensIn: number,
  tokensOut: number
): Promise<number> {
  const month = new Date().toISOString().slice(0, 7);
  const key = `usage:${customerId}:${month}`;
  const total = tokensIn + tokensOut;
  const newTotal = await redis.incrby(key, total);

  // Set expiry to 40 days (covers billing cycle overlap)
  await redis.expire(key, 40 * 24 * 60 * 60);

  return newTotal;
}

/**
 * Look up customer by email
 */
export async function findCustomerByEmail(email: string): Promise<SubscriptionInfo | null> {
  try {
    const customers = await stripe.customers.list({
      email: email.toLowerCase(),
      limit: 1,
    });

    if (customers.data.length === 0) return null;

    const customer = customers.data[0];
    return getSubscriptionStatus(customer.id);
  } catch (error) {
    console.error('[Stripe] Error finding customer:', error);
    return null;
  }
}

/**
 * Invalidate subscription cache
 */
export async function invalidateSubscriptionCache(customerId: string): Promise<void> {
  await redis.del(`subscription:${customerId}`);
}

export { stripe };
