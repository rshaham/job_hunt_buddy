/**
 * External Service Consent Dialog
 *
 * Shows a consent prompt before using features that send data
 * to external third-party services.
 */

import { Globe, AlertTriangle, ExternalLink } from 'lucide-react';
import { Button } from './Button';

export type ExternalService = 'jobSearch' | 'webResearch';

interface ServiceInfo {
  title: string;
  provider: string;
  providerUrl: string;
  description: string;
  dataShared: string[];
}

const SERVICE_INFO: Record<ExternalService, ServiceInfo> = {
  jobSearch: {
    title: 'Job Search',
    provider: 'SerApi',
    providerUrl: 'https://serpapi.com',
    description: 'Search for job listings from Google Jobs and other sources.',
    dataShared: [
      'Your search query (e.g., "software engineer")',
      'Location (if provided)',
    ],
  },
  webResearch: {
    title: 'Web Research',
    provider: 'Tavily',
    providerUrl: 'https://tavily.com',
    description: 'Research companies and roles to help prepare for interviews.',
    dataShared: [
      'Research queries (e.g., company name, role)',
      'Context about the job you\'re researching',
    ],
  },
};

interface ExternalServiceConsentProps {
  service: ExternalService;
  onConsent: () => void;
  onDecline: () => void;
}

export function ExternalServiceConsent({
  service,
  onConsent,
  onDecline,
}: ExternalServiceConsentProps) {
  const info = SERVICE_INFO[service];

  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-8 px-6">
      <div className="max-w-md">
        {/* Icon */}
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <Globe className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold text-foreground mb-2">
          {info.title} uses an external service
        </h2>

        {/* Description */}
        <p className="text-foreground-muted mb-6">
          {info.description} This requires sending some data to{' '}
          <a
            href={info.providerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1"
          >
            {info.provider}
            <ExternalLink className="w-3 h-3" />
          </a>
          .
        </p>

        {/* Data shared warning */}
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-left mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-amber-800 dark:text-amber-200 text-sm mb-2">
                Data sent externally:
              </h3>
              <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                {info.dataShared.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-amber-500">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Privacy note */}
        <p className="text-xs text-foreground-muted mb-6">
          All other data (resume, cover letters, notes) stays on your device.
          You can revoke this consent anytime in Settings.
        </p>

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <Button variant="secondary" onClick={onDecline}>
            No thanks
          </Button>
          <Button onClick={onConsent}>
            I understand, continue
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Inline consent banner (for use in modals)
 */
interface ConsentBannerProps {
  service: ExternalService;
  onConsent: () => void;
}

export function ExternalServiceConsentBanner({
  service,
  onConsent,
}: ConsentBannerProps) {
  const info = SERVICE_INFO[service];

  return (
    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
      <div className="flex items-start gap-3">
        <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-medium text-blue-800 dark:text-blue-200 text-sm mb-1">
            External service required
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
            {info.title} sends your search query to {info.provider} to find results.
            Your resume and other data stays on your device.
          </p>
          <Button size="sm" onClick={onConsent}>
            Enable {info.title}
          </Button>
        </div>
      </div>
    </div>
  );
}
