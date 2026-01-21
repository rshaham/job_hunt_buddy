import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import type { Job } from '../../types';
import { Badge } from '../ui';
import { formatTimeAgo, getJobTypeIcon, getGradeColor } from '../../utils/helpers';
import { cn } from '../../utils/helpers';

interface JobCardProps {
  job: Job;
  onClick: () => void;
}

export function JobCard({ job, onClick }: JobCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: job.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const jobType = job.summary?.jobType || 'unknown';
  const grade = job.resumeAnalysis?.grade;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative bg-surface rounded-card border border-border p-4',
        'hover:shadow-card-hover hover:border-primary/30',
        'transition-all duration-fast ease-out cursor-pointer group',
        isDragging && 'opacity-50 rotate-2 shadow-lg'
      )}
      onClick={onClick}
    >
      {/* Header: Company (teal) + Job Type */}
      <div className="flex items-center justify-between mb-1">
        <span className="font-display text-heading text-primary truncate">
          {job.company}
        </span>
        <div className="flex items-center gap-1 text-foreground-subtle">
          <span className="text-xs">{getJobTypeIcon(jobType)}</span>
          <span className="text-xs font-body capitalize">{jobType}</span>
        </div>
      </div>

      {/* Title */}
      <p className="font-body text-sm text-foreground truncate mb-3">
        {job.title}
      </p>

      {/* Divider */}
      <div className="border-t border-border mb-3" />

      {/* Footer: Grade, Time, Salary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {grade && (
            <Badge className={cn(getGradeColor(grade), 'font-body text-xs font-medium uppercase tracking-tight')}>
              {grade}
            </Badge>
          )}
          <span className="font-body text-xs text-foreground-subtle">
            {formatTimeAgo(new Date(job.dateAdded))}
          </span>
        </div>
        {job.summary?.salary && (
          <span className="font-body text-xs text-foreground-muted truncate max-w-[80px]">
            {job.summary.salary}
          </span>
        )}
      </div>

      {/* Drag Handle - 6 dots pattern, left edge */}
      <div
        {...attributes}
        {...listeners}
        className={cn(
          'absolute left-1 top-1/2 -translate-y-1/2 p-1',
          'opacity-0 group-hover:opacity-100 transition-opacity duration-fast',
          'cursor-grab active:cursor-grabbing'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-4 h-4 text-foreground-subtle" />
      </div>
    </div>
  );
}
