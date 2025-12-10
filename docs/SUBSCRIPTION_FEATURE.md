# Pro Subscription Feature - Implementation Status

## Overview

This document tracks the implementation of a $15/month Pro subscription tier using Stripe. The feature allows users to use AI features without needing their own API keys.

**Branch:** `managed-api-keys`

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER CHOICE                              │
├─────────────────────────────────────────────────────────────────┤
│  Option A: BYO Key (Free)         Option B: Pro ($15/mo)        │
│  • Own API keys                   • Subscribe via Stripe        │
│  • Direct to providers            • Through /api/ai proxy       │
│  • 100% local                     • Token-metered               │
│  • Need own Tavily/SerApi keys    • Includes Tavily/SerApi      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Status

### Completed

| Phase | Description | Files |
|-------|-------------|-------|
| 1 | Stripe API endpoints | `api/stripe/checkout.ts`, `api/stripe/portal.ts`, `api/stripe/webhook.ts`, `api/stripe/lookup.ts`, `api/stripe/session.ts`, `api/_lib/stripe.ts` |
| 2 | Managed AI provider | `api/ai/chat.ts`, `src/services/providers/managed.ts`, `src/services/providers/index.ts` |
| 3 | Types & Settings UI | `src/types/index.ts` (ProviderType, Subscription), `src/components/Settings/SubscriptionCard.tsx`, `src/components/Settings/SettingsModal.tsx` |
| 4 | Trial system | Built into Stripe checkout (50k tokens, 7 days) |
| 5 | Privacy disclosure | `src/components/Privacy/PrivacyModal.tsx` |
| 6 | Onboarding flow | `src/components/GettingStarted/steps/ApiKeyStep.tsx` (Pro vs BYO choice) |
| 6 | Auto-unlock features | `src/utils/featureFlags.ts` (Pro users bypass consent for web search/job search) |

### Not Started / Remaining

| Task | Description | Priority |
|------|-------------|----------|
| Stripe Dashboard Setup | Create product, price, webhook in Stripe | Required before testing |
| Environment Variables | Add `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`, `ANTHROPIC_API_KEY` to Vercel | Required before testing |
| E2E Testing | Test full subscription flow with Stripe test mode | High |
| Usage Reset on Billing Cycle | Verify token usage resets properly | Medium |
| Error Handling Polish | Better error messages for edge cases | Low |

---

## Key Files Reference

### API Endpoints (Vercel Serverless)

| File | Purpose |
|------|---------|
| `api/_lib/stripe.ts` | Stripe utilities, subscription status, token tracking |
| `api/stripe/checkout.ts` | Create Stripe Checkout session (with trial support) |
| `api/stripe/portal.ts` | Redirect to Stripe Customer Portal |
| `api/stripe/webhook.ts` | Handle Stripe events (subscription changes) |
| `api/stripe/lookup.ts` | Email lookup for device restore |
| `api/stripe/session.ts` | Get customer info after checkout |
| `api/ai/chat.ts` | AI proxy for Pro subscribers with token tracking |

### Frontend

| File | Purpose |
|------|---------|
| `src/services/providers/managed.ts` | Frontend provider that routes through `/api/ai/chat` |
| `src/components/Settings/SubscriptionCard.tsx` | Subscribe/manage/restore UI |
| `src/components/GettingStarted/steps/ApiKeyStep.tsx` | Onboarding with Pro vs BYO choice |
| `src/utils/featureFlags.ts` | Auto-unlock web search/job search for Pro users |

### Types

| File | Changes |
|------|---------|
| `src/types/index.ts` | Added `'managed'` to `ProviderType`, `Subscription` interface, `SubscriptionStatus` type |

---

## Environment Variables Required

```bash
# Stripe
STRIPE_SECRET_KEY=sk_live_...           # Your Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_...         # Webhook signing secret
STRIPE_PRICE_ID=price_...               # The Pro plan price ID ($15/mo)

# Anthropic (for managed AI)
ANTHROPIC_API_KEY=sk-ant-...            # Server-side Anthropic key for Pro users

# Already should exist:
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
SERPAPI_API_KEY=...                     # For Pro users' job search
TAVILY_API_KEY=...                      # For Pro users' web research
```

---

## Stripe Dashboard Setup (When Ready)

### 1. Create Product & Price
1. Go to **Products** → **Add Product**
2. Name: `Job Hunt Buddy Pro`
3. Description: `AI-powered job hunting tools with 1M tokens/month`
4. Add Price: `$15.00/month` recurring
5. Copy the **Price ID** (`price_...`)

### 2. Set Up Webhook
1. Go to **Developers** → **Webhooks** → **Add Endpoint**
2. URL: `https://your-domain.vercel.app/api/stripe/webhook`
3. Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_failed`
4. Copy the **Signing Secret** (`whsec_...`)

### 3. Configure Customer Portal
1. Go to **Settings** → **Billing** → **Customer Portal**
2. Enable: update payment, cancel subscription, view invoices

---

## Token Limits

| Tier | Monthly Limit | Notes |
|------|--------------|-------|
| Pro (active) | 1,000,000 | Resets on billing date |
| Trial | 50,000 | 7 days, CC required |

Usage tracked in Redis: `usage:{customer_id}:{YYYY-MM}`

---

## User Flows

### New User - Pro Path
1. Onboarding shows Pro vs BYO choice
2. User clicks "Start Free Trial"
3. Redirect to Stripe Checkout
4. After payment → redirect back with `?session_id=xxx`
5. App fetches session, stores subscription info
6. Provider set to "managed", user can use all features

### Returning User (New Device)
1. Click "Restore Access" in Settings
2. Enter subscription email
3. API looks up Stripe customer
4. Subscription restored locally

### Manage Subscription
- "Manage Billing" button in SubscriptionCard
- Opens Stripe Customer Portal (hosted by Stripe)

---

## Testing Checklist

- [ ] Create Stripe test product/price
- [ ] Add test environment variables to Vercel
- [ ] Test checkout flow (use card `4242 4242 4242 4242`)
- [ ] Test subscription activation after checkout
- [ ] Test AI calls through managed provider
- [ ] Test token usage tracking
- [ ] Test token limit enforcement
- [ ] Test "Restore Access" flow
- [ ] Test Customer Portal access
- [ ] Test webhook handling (subscription canceled)
- [ ] Test trial expiration

---

## Related Documentation

- Full implementation plan: `.claude/plans/wise-tickling-lightning.md`
- Stripe API docs: https://stripe.com/docs/api
- Stripe Checkout: https://stripe.com/docs/payments/checkout
