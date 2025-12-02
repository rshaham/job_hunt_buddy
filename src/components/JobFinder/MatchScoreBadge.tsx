/**
 * Match Score Badge Component
 *
 * Displays a match score with letter grade and percentage.
 * Color-coded based on grade quality.
 */

import { cn } from '../../utils/helpers';
import { Loader2 } from 'lucide-react';
import type { ScoreStatus } from '../../types/jobSearch';

interface MatchScoreBadgeProps {
  score?: number;
  grade?: string;
  status: ScoreStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Get background and text colors based on grade
 */
function getGradeColors(grade: string): { bg: string; text: string } {
  if (grade.startsWith('A')) {
    return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' };
  }
  if (grade.startsWith('B')) {
    return { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' };
  }
  if (grade.startsWith('C')) {
    return { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400' };
  }
  // D or F
  return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' };
}

export function MatchScoreBadge({
  score,
  grade,
  status,
  size = 'md',
  className,
}: MatchScoreBadgeProps) {
  const sizeClasses = {
    sm: 'w-12 h-12 text-xs',
    md: 'w-14 h-14 text-sm',
    lg: 'w-16 h-16 text-base',
  };

  // Pending state - show skeleton
  if (status === 'pending') {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-lg',
          'bg-slate-100 dark:bg-slate-700 animate-pulse',
          sizeClasses[size],
          className
        )}
      >
        <span className="text-slate-400 dark:text-slate-500 text-xs">--</span>
      </div>
    );
  }

  // Calculating state - show spinner
  if (status === 'calculating') {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-lg',
          'bg-slate-100 dark:bg-slate-700',
          sizeClasses[size],
          className
        )}
      >
        <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
      </div>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-lg',
          'bg-slate-100 dark:bg-slate-700',
          sizeClasses[size],
          className
        )}
      >
        <span className="text-slate-400 dark:text-slate-500 text-xs">N/A</span>
      </div>
    );
  }

  // Complete state - show score with "Quick" label and tooltip
  const colors = getGradeColors(grade || 'F');

  return (
    <div className="relative group">
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-lg font-semibold',
          colors.bg,
          colors.text,
          sizeClasses[size],
          className
        )}
      >
        <span className="text-[0.5rem] opacity-60 uppercase tracking-wider leading-none">Quick</span>
        <span className="leading-tight">{grade}</span>
        <span className="text-[0.6rem] opacity-75 leading-none">{score}%</span>
      </div>

      {/* Tooltip on hover */}
      <div
        className={cn(
          'absolute z-50 hidden group-hover:block',
          'bottom-full left-1/2 -translate-x-1/2 mb-2',
          'px-3 py-2 w-48 text-xs text-center',
          'bg-slate-900 dark:bg-slate-700 text-white rounded-lg shadow-lg',
          'pointer-events-none'
        )}
      >
        <div className="font-medium mb-1">Quick Match Estimate</div>
        <div className="opacity-80">
          Based on keyword similarity. Import job for detailed AI analysis.
        </div>
        {/* Arrow */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-700" />
      </div>
    </div>
  );
}
