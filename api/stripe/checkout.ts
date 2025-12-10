/**
 * Create Stripe Checkout Session
 * POST /api/stripe/checkout
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { stripe } from '../_lib/stripe.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, trial } = req.body as { email?: string; trial?: boolean };

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    console.error('[Checkout] STRIPE_PRICE_ID not configured');
    return res.status(500).json({ error: 'Checkout not configured' });
  }

  try {
    // Check if customer already exists
    const existingCustomers = await stripe.customers.list({
      email: email.toLowerCase(),
      limit: 1,
    });

    let customerId: string | undefined;
    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;

      // Check if already has active subscription
      const subs = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 1,
      });

      if (subs.data.length > 0) {
        return res.status(400).json({
          error: 'Already subscribed',
          customerId,
        });
      }
    }

    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:5173';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: customerId,
      customer_email: customerId ? undefined : email.toLowerCase(),
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: trial
        ? {
            trial_period_days: 7,
          }
        : undefined,
      success_url: `${baseUrl}/?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/?subscription=canceled`,
      metadata: {
        email: email.toLowerCase(),
      },
    });

    return res.json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('[Checkout] Error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Checkout failed',
    });
  }
}
