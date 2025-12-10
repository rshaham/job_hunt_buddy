/**
 * Stripe Webhook Handler
 * POST /api/stripe/webhook
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { stripe, invalidateSubscriptionCache } from '../_lib/stripe.js';
import type Stripe from 'stripe';

// Disable body parsing - we need raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[Webhook] STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  const sig = req.headers['stripe-signature'];
  if (!sig) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  let event: Stripe.Event;

  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('[Webhook] Signature verification failed:', err);
    return res.status(400).json({
      error: `Webhook signature verification failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
    });
  }

  // Handle events
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.customer && typeof session.customer === 'string') {
          await invalidateSubscriptionCache(session.customer);
          console.log(`[Webhook] Checkout completed for customer ${session.customer}`);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        if (typeof subscription.customer === 'string') {
          await invalidateSubscriptionCache(subscription.customer);
          console.log(`[Webhook] Subscription ${event.type} for customer ${subscription.customer}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        if (typeof subscription.customer === 'string') {
          await invalidateSubscriptionCache(subscription.customer);
          console.log(`[Webhook] Subscription deleted for customer ${subscription.customer}`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        if (typeof invoice.customer === 'string') {
          await invalidateSubscriptionCache(invoice.customer);
          console.log(`[Webhook] Payment failed for customer ${invoice.customer}`);
        }
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error(`[Webhook] Error handling ${event.type}:`, error);
    // Don't fail the webhook - Stripe will retry
  }

  return res.json({ received: true });
}
