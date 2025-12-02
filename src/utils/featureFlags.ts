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
 * Check if a feature is available (both enabled and consented).
 *
 * @param feature - The feature to check
 * @param settings - App settings containing consent status
 * @returns Availability status with reason if unavailable
 */
export function isFeatureAvailable(
  feature: FeatureKey,
  settings: AppSettings
): FeatureAvailability {
  const consent = settings.externalServicesConsent;

  if (feature === 'jobSearch') {
    if (!featureFlags.jobSearchEnabled) {
      return { available: false, reason: 'disabled' };
    }
    if (!consent?.jobSearch) {
      return { available: false, reason: 'no_consent' };
    }
    return { available: true };
  }

  if (feature === 'webResearch') {
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
 */
export function isFeatureEnabled(feature: FeatureKey): boolean {
  if (feature === 'jobSearch') {
    return featureFlags.jobSearchEnabled;
  }
  if (feature === 'webResearch') {
    return featureFlags.webResearchEnabled;
  }
  return false;
}
