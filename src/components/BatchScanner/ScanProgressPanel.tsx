/**
 * Scan Progress Panel
 *
 * Shows progress during URL scanning and job scoring.
 * Displays per-URL status and overall progress bars.
 */

import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Globe,
  Briefcase,
} from 'lucide-react';
import type { ScannedUrl, BatchScanProgress, ScoringProgress } from '../../types/batchScanner';

interface ScanProgressPanelProps {
  scannedUrls: ScannedUrl[];
  scanProgress: BatchScanProgress;
  isScanning: boolean;
  isScoring: boolean;
  scoringProgress: ScoringProgress;
}

export function ScanProgressPanel({
  scannedUrls,
  scanProgress,
  isScanning,
  isScoring,
  scoringProgress,
}: ScanProgressPanelProps) {
  const scanPercent = scanProgress.urlsTotal > 0
    ? Math.round((scanProgress.urlsComplete / scanProgress.urlsTotal) * 100)
    : 0;

  const scorePercent = scoringProgress.total > 0
    ? Math.round((scoringProgress.completed / scoringProgress.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <div className="space-y-4">
        {/* Scanning Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary-500" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {isScanning ? 'Scanning URLs...' : 'URLs Scanned'}
              </span>
            </div>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {scanProgress.urlsComplete} / {scanProgress.urlsTotal}
            </span>
          </div>
          <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 transition-all duration-300"
              style={{ width: `${scanPercent}%` }}
            />
          </div>
          {scanProgress.currentUrl && isScanning && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">
              Fetching: {scanProgress.currentUrl}
            </p>
          )}
        </div>

        {/* Scoring Progress */}
        {(isScoring || scoringProgress.total > 0) && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {isScoring ? 'Scoring Jobs...' : 'Jobs Scored'}
                </span>
              </div>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {scoringProgress.completed} / {scoringProgress.total}
              </span>
            </div>
            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${scorePercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Jobs Found Counter */}
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <Briefcase className="w-4 h-4" />
          <span>{scanProgress.jobsFound} jobs found so far</span>
        </div>
      </div>

      {/* Per-URL Status */}
      <div>
        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
          URL Status
        </h4>
        <div className="max-h-64 overflow-y-auto space-y-2">
          {scannedUrls.map((url) => (
            <UrlStatusRow key={url.id} url={url} />
          ))}
        </div>
      </div>
    </div>
  );
}

interface UrlStatusRowProps {
  url: ScannedUrl;
}

function UrlStatusRow({ url }: UrlStatusRowProps) {
  const getStatusIcon = () => {
    switch (url.status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-slate-400" />;
      case 'fetching':
      case 'extracting':
        return <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />;
      case 'complete':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusText = () => {
    switch (url.status) {
      case 'pending':
        return 'Waiting';
      case 'fetching':
        return 'Fetching page...';
      case 'extracting':
        return 'Extracting jobs...';
      case 'complete':
        return `${url.extractedJobs.length} jobs found`;
      case 'error':
        return url.error || 'Failed';
    }
  };

  const displayName = url.original.companyHint || new URL(url.original.url).hostname;

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
      {getStatusIcon()}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
            {displayName}
          </span>
        </div>
        <p className={`text-xs truncate ${
          url.status === 'error'
            ? 'text-red-500 dark:text-red-400'
            : 'text-slate-500 dark:text-slate-400'
        }`}>
          {getStatusText()}
        </p>
      </div>
      {url.extractionResult?.atsType && url.extractionResult.atsType !== 'unknown' && (
        <span className="px-2 py-0.5 text-xs rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
          {url.extractionResult.atsType}
        </span>
      )}
    </div>
  );
}
