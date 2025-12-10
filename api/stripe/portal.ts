/**
 * Create Stripe Customer Portal Session
 * POST /api/stripe/portal
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { stripe } from '../_lib/stripe.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { customerId } = req.body as { customerId?: string };

  if (!customerId || typeof customerId !== 'string') {
    return res.status(400).json({ error: 'Customer ID is required' });
  }

  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:5173';

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/`,
    });

    return res.json({ url: session.url });
  } catch (error) {
    console.error('[Portal] Error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Portal creation failed',
    });
  }
}
