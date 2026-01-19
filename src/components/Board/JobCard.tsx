import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import type { Job } from '../../types';
import { Badge } from '../ui';
import { formatTimeAgo, getJobTypeIcon, getGradeColor } from '../../utils/helpers';

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
    opacity: isDragging ? 0.5 : 1,
  };

  const jobType = job.summary?.jobType || 'unknown';
  const grade = job.resumeAnalysis?.grade;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative bg-surface rounded-lg border border-border shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer group"
      onClick={onClick}
    >
      <div className="p-3">
        {/* Header: Company + Job Type */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-foreground truncate">
            {job.company}
          </span>
          <div className="flex items-center gap-1">
            <span className="text-xs">{getJobTypeIcon(jobType)}</span>
            <span className="text-xs text-slate-500 capitalize">{jobType}</span>
          </div>
        </div>

        {/* Title */}
        <p className="text-xs text-foreground-muted truncate mb-2">
          {job.title}
        </p>

        {/* Divider */}
        <div className="border-t border-slate-100 dark:border-slate-700 mb-2" />

        {/* Footer: Grade, Time, Salary */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {grade && (
              <Badge className={getGradeColor(grade)}>{grade}</Badge>
            )}
            <span className="text-slate-500">{formatTimeAgo(new Date(job.dateAdded))}</span>
          </div>
          {job.summary?.salary && (
            <span className="text-slate-500 truncate max-w-[80px]">
              {job.summary.salary}
            </span>
          )}
        </div>
      </div>

      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-4 h-4 text-slate-400" />
      </div>
    </div>
  );
}
