/**
 * Job Preview Modal Component
 *
 * Displays full job description with option to import.
 * Used by both JobFinder modal and CommandBar (agent mode).
 */

import { ExternalLink, MapPin, Clock, DollarSign, Building2, Plus, Search } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { MatchScoreBadge } from './MatchScoreBadge';
import type { ScoreStatus } from '../../types/jobSearch';

/** Job data for preview - common fields from both EnrichedSearchResult and RankedJobResult */
export interface PreviewJob {
  title: string;
  company: string;
  location: string;
  description: string;
  source: string;
  link?: string;
  applyLink?: string;  // Direct application URL from SerApi
  postedAt?: string;
  salary?: string;
  remote?: boolean;
  matchScore?: number;
  matchGrade?: string;
  scoreStatus?: ScoreStatus;
  jobId?: string; // Google Jobs ID for building deep links
}

interface JobPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: PreviewJob | null;
  onImport?: () => void;
  isImporting?: boolean;
  isImported?: boolean;
}

export function JobPreviewModal({
  isOpen,
  onClose,
  job,
  onImport,
  isImporting = false,
  isImported = false,
}: JobPreviewModalProps) {
  if (!job) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <div className="flex flex-col h-full max-h-[80vh]">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-start gap-4">
            {/* Match Score */}
            {(job.matchScore !== undefined || job.scoreStatus) && (
              <MatchScoreBadge
                score={job.matchScore}
                grade={job.matchGrade}
                status={job.scoreStatus || 'complete'}
                size="lg"
                className="flex-shrink-0"
              />
            )}

            {/* Title & Company */}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold text-foreground">
                {job.title}
              </h2>
              <div className="flex items-center gap-1 text-foreground-muted mt-1">
                <Building2 className="w-4 h-4 flex-shrink-0" />
                <span>{job.company}</span>
              </div>

              {/* Meta info */}
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-foreground-muted">
                {job.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{job.location}</span>
                  </span>
                )}
                {job.salary && (
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>{job.salary}</span>
                  </span>
                )}
                {job.postedAt && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{job.postedAt}</span>
                  </span>
                )}
                {job.remote && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    Remote
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Show "View Original" only if link looks valid (starts with http) */}
              {job.link?.startsWith('http') ? (
                <a
                  href={job.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-primary border border-primary rounded-lg hover:bg-primary/5 transition-colors"
                >
                  View Original
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                /* Fallback: Google Jobs search when no valid link */
                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent(job.title + ' ' + job.company + ' jobs')}&ibp=htl;jobs`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-foreground-muted border border-border-muted rounded-lg hover:bg-surface-raised transition-colors"
                >
                  Search on Google
                  <Search className="w-3.5 h-3.5" />
                </a>
              )}
              {onImport && !isImported && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onImport();
                  }}
                  disabled={isImporting}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {isImporting ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Importing...
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      Import
                    </>
                  )}
                </button>
              )}
              {isImported && (
                <span className="px-3 py-1.5 text-sm text-slate-500 bg-surface-raised rounded-lg">
                  Already Saved
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Job Description */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <h3 className="text-lg font-medium mb-3">Job Description</h3>
            <div className="whitespace-pre-wrap text-foreground">
              {job.description || 'No description available.'}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-surface">
          <div className="flex items-center justify-between">
            <span className="text-xs text-foreground-subtle">
              Source: {job.source}
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-foreground-muted hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
