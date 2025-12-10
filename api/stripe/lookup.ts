/**
 * Look up subscription by email (for device restore)
 * POST /api/stripe/lookup
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { findCustomerByEmail } from '../_lib/stripe.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body as { email?: string };

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const subscription = await findCustomerByEmail(email.toLowerCase());

    if (!subscription) {
      return res.status(404).json({ error: 'No subscription found for this email' });
    }

    if (subscription.status === 'inactive') {
      return res.status(402).json({
        error: 'Subscription is inactive',
        customerId: subscription.customerId,
      });
    }

    return res.json({
      customerId: subscription.customerId,
      email: subscription.email,
      status: subscription.status,
      tokensUsed: subscription.tokensUsed,
      tokenLimit: subscription.tokenLimit,
    });
  } catch (error) {
    console.error('[Lookup] Error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Lookup failed',
    });
  }
}
