/**
 * Get session/customer info after checkout
 * GET /api/stripe/session?session_id=xxx
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { stripe, getSubscriptionStatus } from '../_lib/stripe.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { session_id } = req.query;

  if (!session_id || typeof session_id !== 'string') {
    return res.status(400).json({ error: 'session_id is required' });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (!session.customer || typeof session.customer !== 'string') {
      return res.status(400).json({ error: 'No customer in session' });
    }

    const subscription = await getSubscriptionStatus(session.customer);

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    return res.json({
      customerId: subscription.customerId,
      email: subscription.email,
      status: subscription.status,
      tokensUsed: subscription.tokensUsed,
      tokenLimit: subscription.tokenLimit,
    });
  } catch (error) {
    console.error('[Session] Error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Session retrieval failed',
    });
  }
}
