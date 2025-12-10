/**
 * Feature Flags
 *
 * Controls availability of features that use external services.
 * Set via Vercel environment variables.
 */

import type { AppSettings } from '../types';

/**
 * Feature flags from environment variables.
 * These are baked in at build time.
 *
 * To disable a feature in Vercel:
 * 1. Go to Project → Settings → Environment Variables
 * 2. Set VITE_FEATURE_JOB_SEARCH_ENABLED=false
 * 3. Vercel will auto-rebuild with feature disabled
 */
export const featureFlags = {
  /** Job Finder uses SerApi to search jobs */
  jobSearchEnabled: import.meta.env.VITE_FEATURE_JOB_SEARCH_ENABLED === 'true',

  /** Web Research uses Tavily for company research */
  webResearchEnabled: import.meta.env.VITE_FEATURE_WEB_RESEARCH_ENABLED === 'true',
} as const;

export type FeatureKey = 'jobSearch' | 'webResearch';

export interface FeatureAvailability {
  available: boolean;
  reason?: 'disabled' | 'no_consent';
}

/**
 * Check if user has an active Pro subscription
 */
function isProSubscriber(settings: AppSettings): boolean {
  const status = settings.subscription?.status;
  return status === 'active' || status === 'trialing';
}

/**
 * Check if a feature is available.
 *
 * Priority:
 * 1. If user is a Pro subscriber → always available (included in subscription)
 * 2. If user has their own API key → always available (direct mode)
 * 3. If server feature flag is disabled → not available
 * 4. If user hasn't consented → not available
 *
 * @param feature - The feature to check
 * @param settings - App settings containing consent status and API keys
 * @returns Availability status with reason if unavailable
 */
export function isFeatureAvailable(
  feature: FeatureKey,
  settings: AppSettings
): FeatureAvailability {
  const consent = settings.externalServicesConsent;

  // Pro subscribers get all features
  if (isProSubscriber(settings)) {
    return { available: true };
  }

  if (feature === 'jobSearch') {
    // User has their own API key → always available (direct mode)
    if (consent?.serpApiKey) {
      return { available: true };
    }
    // Otherwise check server feature flag
    if (!featureFlags.jobSearchEnabled) {
      return { available: false, reason: 'disabled' };
    }
    if (!consent?.jobSearch) {
      return { available: false, reason: 'no_consent' };
    }
    return { available: true };
  }

  if (feature === 'webResearch') {
    // User has their own API key → always available (direct mode)
    if (consent?.tavilyApiKey) {
      return { available: true };
    }
    // Otherwise check server feature flag
    if (!featureFlags.webResearchEnabled) {
      return { available: false, reason: 'disabled' };
    }
    if (!consent?.webResearch) {
      return { available: false, reason: 'no_consent' };
    }
    return { available: true };
  }

  return { available: false, reason: 'disabled' };
}

/**
 * Check if a feature flag is enabled (ignores consent).
 * Use this to show/hide UI elements.
 *
 * Returns true if:
 * - User is a Pro subscriber (included in subscription), OR
 * - Server feature flag is enabled, OR
 * - User has their own API key (direct mode)
 */
export function isFeatureEnabled(feature: FeatureKey, settings?: AppSettings): boolean {
  // Pro subscribers see all features
  if (settings && isProSubscriber(settings)) {
    return true;
  }

  const consent = settings?.externalServicesConsent;

  if (feature === 'jobSearch') {
    // Show if user has their own key OR server enables it
    return !!consent?.serpApiKey || featureFlags.jobSearchEnabled;
  }
  if (feature === 'webResearch') {
    // Show if user has their own key OR server enables it
    return !!consent?.tavilyApiKey || featureFlags.webResearchEnabled;
  }
  return false;
}
