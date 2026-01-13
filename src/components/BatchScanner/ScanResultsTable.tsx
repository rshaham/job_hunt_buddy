/**
 * Scan Results Table
 *
 * Displays scanned jobs in a sortable table with dual scores.
 * Allows selection for batch import.
 */

import {
  CheckSquare,
  Square,
  ExternalLink,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  MapPin,
} from 'lucide-react';
import type { ScoredJob, SortField } from '../../types/batchScanner';
import { useBatchScannerStore } from '../../stores/batchScannerStore';
import { cn } from '../../utils/helpers';

interface ScanResultsTableProps {
  jobs: ScoredJob[];
  onToggleSelect: (jobId: string) => void;
}

export function ScanResultsTable({ jobs, onToggleSelect }: ScanResultsTableProps) {
  const { sortBy, sortDirection, setSortBy } = useBatchScannerStore();

  const handleSort = (field: SortField) => {
    setSortBy(field);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="w-4 h-4 opacity-50" />;
    }
    return sortDirection === 'desc'
      ? <ArrowDown className="w-4 h-4" />
      : <ArrowUp className="w-4 h-4" />;
  };

  return (
    <table className="w-full">
      <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
        <tr>
          <th className="w-12 px-4 py-3 text-left">
            <span className="sr-only">Select</span>
          </th>
          <th
            className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
            onClick={() => handleSort('company')}
          >
            <div className="flex items-center gap-1">
              Company
              <SortIcon field="company" />
            </div>
          </th>
          <th
            className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
            onClick={() => handleSort('title')}
          >
            <div className="flex items-center gap-1">
              Position
              <SortIcon field="title" />
            </div>
          </th>
          <th
            className="px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
            onClick={() => handleSort('resumeFit')}
          >
            <div className="flex items-center justify-center gap-1">
              Resume Fit
              <SortIcon field="resumeFit" />
            </div>
          </th>
          <th
            className="px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
            onClick={() => handleSort('trajectoryFit')}
          >
            <div className="flex items-center justify-center gap-1">
              Career Fit
              <SortIcon field="trajectoryFit" />
            </div>
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Location
          </th>
          <th className="w-20 px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Actions
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
        {jobs.map((job) => (
          <JobRow
            key={job.id}
            job={job}
            onToggleSelect={onToggleSelect}
          />
        ))}
      </tbody>
    </table>
  );
}

interface JobRowProps {
  job: ScoredJob;
  onToggleSelect: (jobId: string) => void;
}

function JobRow({ job, onToggleSelect }: JobRowProps) {
  const isDisabled = job.isImported;

  return (
    <tr className={cn(
      'transition-colors',
      job.isImported
        ? 'bg-green-50/50 dark:bg-green-900/10'
        : job.isSelected
          ? 'bg-primary-50 dark:bg-primary-900/20'
          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
    )}>
      {/* Checkbox */}
      <td className="px-4 py-3">
        <button
          onClick={() => !isDisabled && onToggleSelect(job.id)}
          disabled={isDisabled}
          className={cn(
            'p-1 rounded transition-colors',
            isDisabled
              ? 'cursor-not-allowed opacity-50'
              : 'hover:bg-slate-100 dark:hover:bg-slate-700'
          )}
        >
          {job.isImported ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : job.isSelected ? (
            <CheckSquare className="w-5 h-5 text-primary-500" />
          ) : (
            <Square className="w-5 h-5 text-slate-400" />
          )}
        </button>
      </td>

      {/* Company */}
      <td className="px-4 py-3">
        <span className="text-sm font-medium text-slate-900 dark:text-white">
          {job.company}
        </span>
      </td>

      {/* Title */}
      <td className="px-4 py-3">
        <div>
          <span className="text-sm text-slate-700 dark:text-slate-300">
            {job.title}
          </span>
          {job.department && (
            <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
              ({job.department})
            </span>
          )}
        </div>
      </td>

      {/* Resume Fit Score */}
      <td className="px-4 py-3 text-center">
        <ScoreBadge score={job.resumeFitScore} grade={job.resumeFitGrade} />
      </td>

      {/* Trajectory Fit Score */}
      <td className="px-4 py-3 text-center">
        <ScoreBadge score={job.trajectoryFitScore} grade={job.trajectoryFitGrade} />
      </td>

      {/* Location */}
      <td className="px-4 py-3">
        {job.location ? (
          <span className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
            <MapPin className="w-3 h-3" />
            {job.location}
          </span>
        ) : (
          <span className="text-sm text-slate-400 dark:text-slate-500">—</span>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3 text-center">
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          title="View Job"
        >
          <ExternalLink className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        </a>
      </td>
    </tr>
  );
}

interface ScoreBadgeProps {
  score?: number;
  grade?: string;
}

function ScoreBadge({ score, grade }: ScoreBadgeProps) {
  if (score === undefined || grade === undefined) {
    return (
      <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
    );
  }

  const getScoreColor = () => {
    if (score >= 80) return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
    if (score >= 60) return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
    return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
  };

  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
      getScoreColor()
    )}>
      <span>{score}%</span>
      <span className="opacity-70">({grade})</span>
    </span>
  );
}
