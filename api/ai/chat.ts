/**
 * AI Chat Proxy for Pro Subscribers
 * POST /api/ai/chat
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getSubscriptionStatus,
  incrementTokenUsage,
  MONTHLY_TOKEN_LIMIT,
  TRIAL_TOKEN_LIMIT,
} from '../_lib/stripe.js';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  customerId: string;
  messages: Message[];
  system?: string;
  model?: string;
  max_tokens?: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    console.error('[AI Chat] ANTHROPIC_API_KEY not configured');
    return res.status(500).json({ error: 'AI service not configured' });
  }

  const { customerId, messages, system, model, max_tokens } = req.body as ChatRequest;

  if (!customerId) {
    return res.status(401).json({ error: 'Customer ID required' });
  }

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array required' });
  }

  // Validate subscription
  const subscription = await getSubscriptionStatus(customerId);

  if (!subscription) {
    return res.status(401).json({ error: 'Invalid customer' });
  }

  if (subscription.status === 'inactive') {
    return res.status(402).json({ error: 'Subscription inactive' });
  }

  if (subscription.status === 'past_due') {
    return res.status(402).json({ error: 'Payment past due' });
  }

  // Check token limit
  const tokenLimit =
    subscription.status === 'trialing' ? TRIAL_TOKEN_LIMIT : MONTHLY_TOKEN_LIMIT;

  if (subscription.tokensUsed >= tokenLimit) {
    return res.status(429).json({
      error: 'Token limit exceeded',
      tokensUsed: subscription.tokensUsed,
      tokenLimit,
    });
  }

  // Call Anthropic
  try {
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'claude-sonnet-4-5-20250514',
        max_tokens: max_tokens || 4096,
        system: system || undefined,
        messages,
      }),
    });

    if (!anthropicResponse.ok) {
      const errorData = await anthropicResponse.json().catch(() => ({}));
      console.error('[AI Chat] Anthropic error:', errorData);
      return res.status(anthropicResponse.status).json({
        error: 'AI request failed',
        details: errorData,
      });
    }

    const data = await anthropicResponse.json();

    // Log token usage
    const tokensIn = data.usage?.input_tokens || 0;
    const tokensOut = data.usage?.output_tokens || 0;
    const newTotal = await incrementTokenUsage(customerId, tokensIn, tokensOut);

    // Return response with usage info
    return res.json({
      ...data,
      subscription: {
        tokensUsed: newTotal,
        tokenLimit,
        remaining: tokenLimit - newTotal,
      },
    });
  } catch (error) {
    console.error('[AI Chat] Error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'AI request failed',
    });
  }
}
