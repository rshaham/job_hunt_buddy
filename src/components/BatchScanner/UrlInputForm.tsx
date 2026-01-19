/**
 * URL Input Form
 *
 * Textarea for entering career page URLs with validation feedback.
 * Supports various formats: plain URLs, URLs with company hints, numbered lists.
 */

import { useEffect } from 'react';
import { Link, AlertCircle } from 'lucide-react';
import { useBatchScannerStore } from '../../stores/batchScannerStore';

export function UrlInputForm() {
  const { urlInput, setUrlInput, parseUrls, parsedUrls } = useBatchScannerStore();

  // Parse URLs whenever input changes
  useEffect(() => {
    parseUrls();
  }, [urlInput, parseUrls]);

  const urlCount = parsedUrls.length;
  const lineCount = urlInput.split('\n').filter(l => l.trim()).length;
  const hasInvalidLines = lineCount > 0 && urlCount < lineCount;

  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">
        Career Page URLs
      </label>

      <p className="text-sm text-foreground-muted mb-3">
        Paste URLs to company career pages (one per line). Optionally include company name:
      </p>

      <div className="relative">
        <textarea
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder={`https://boards.greenhouse.io/figma
Supabase - https://supabase.com/careers
1. Webflow - https://webflow.com/careers`}
          className="w-full h-64 px-4 py-3 rounded-lg border border-border-muted bg-background text-foreground placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm resize-none"
        />

        {/* URL Count Badge */}
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          {hasInvalidLines && (
            <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-3 h-3" />
              {lineCount - urlCount} invalid
            </span>
          )}
          <span className="px-2 py-1 text-xs font-medium rounded bg-surface-raised text-foreground-muted">
            {urlCount} {urlCount === 1 ? 'URL' : 'URLs'}
          </span>
        </div>
      </div>

      {/* Parsed URLs Preview */}
      {urlCount > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-foreground-muted mb-2">
            Detected URLs:
          </p>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {parsedUrls.slice(0, 10).map((url) => (
              <div
                key={url.id}
                className="flex items-center gap-2 text-xs text-foreground-muted"
              >
                <Link className="w-3 h-3 flex-shrink-0" />
                {url.companyHint && (
                  <span className="font-medium text-foreground">
                    {url.companyHint}:
                  </span>
                )}
                <span className="truncate">{url.url}</span>
              </div>
            ))}
            {urlCount > 10 && (
              <p className="text-xs text-foreground-muted italic">
                ... and {urlCount - 10} more
              </p>
            )}
          </div>
        </div>
      )}

      {/* Format Tips */}
      <div className="mt-4 p-3 bg-surface rounded-lg">
        <p className="text-xs font-medium text-foreground-muted mb-2">
          Supported formats:
        </p>
        <ul className="text-xs text-foreground-muted space-y-1">
          <li><code className="px-1 bg-surface-raised rounded">https://company.com/careers</code> - Plain URL</li>
          <li><code className="px-1 bg-surface-raised rounded">Company Name - https://...</code> - With company hint</li>
          <li><code className="px-1 bg-surface-raised rounded">1. Company - https://...</code> - Numbered list</li>
          <li><code className="px-1 bg-surface-raised rounded">https://lnkd.in/...</code> - LinkedIn redirect URLs</li>
        </ul>
      </div>
    </div>
  );
}
