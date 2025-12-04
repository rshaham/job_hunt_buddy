/**
 * Search Result Card Component
 *
 * Displays a job search result with match score, company info,
 * and selection checkbox.
 */

import { Check, ExternalLink, MapPin, Clock, DollarSign, Building2 } from 'lucide-react';
import { cn } from '../../utils/helpers';
import { MatchScoreBadge } from './MatchScoreBadge';
import type { EnrichedSearchResult } from '../../types/jobSearch';

interface SearchResultCardProps {
  job: EnrichedSearchResult;
  onToggleSelect: (jobId: string) => void;
}

export function SearchResultCard({ job, onToggleSelect }: SearchResultCardProps) {
  const handleClick = () => {
    if (!job.isImported) {
      onToggleSelect(job.jobId);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !job.isImported) {
      e.preventDefault();
      onToggleSelect(job.jobId);
    }
  };

  return (
    <div
      role="option"
      aria-selected={job.isSelected}
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'flex gap-3 p-4 rounded-lg border transition-all cursor-pointer',
        'hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        job.isSelected
          ? 'border-primary bg-primary/5 dark:bg-primary/10'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800',
        job.isImported && 'opacity-60 cursor-not-allowed'
      )}
    >
      {/* Checkbox */}
      <div className="flex-shrink-0 pt-1">
        <div
          className={cn(
            'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
            job.isSelected
              ? 'bg-primary border-primary text-white'
              : 'border-slate-300 dark:border-slate-600',
            job.isImported && 'bg-slate-200 dark:bg-slate-700 border-slate-300'
          )}
        >
          {(job.isSelected || job.isImported) && <Check className="w-3 h-3" />}
        </div>
      </div>

      {/* Match Score Badge */}
      <MatchScoreBadge
        score={job.matchScore}
        grade={job.matchGrade}
        status={job.scoreStatus}
        size="md"
        className="flex-shrink-0"
      />

      {/* Job Info */}
      <div className="flex-1 min-w-0">
        {/* Company & Title */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-medium text-slate-900 dark:text-white truncate">
              {job.title}
            </h3>
            <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
              <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{job.company}</span>
            </div>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {job.remote && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                Remote
              </span>
            )}
            {job.isImported && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                Saved
              </span>
            )}
          </div>
        </div>

        {/* Meta info */}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
          {job.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              <span className="truncate max-w-[150px]">{job.location}</span>
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
        </div>

        {/* Source & Link */}
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {job.source}
          </span>
          {job.link && (
            <a
              href={job.link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              View Original
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
