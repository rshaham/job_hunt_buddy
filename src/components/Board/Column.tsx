import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Job, Status } from '../../types';
import { JobCard } from './JobCard';
import { cn } from '../../utils/helpers';

interface ColumnProps {
  status: Status;
  jobs: Job[];
  onJobClick: (jobId: string) => void;
}

export function Column({ status, jobs, onJobClick }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status.name,
  });

  return (
    <div ref={setNodeRef} className="flex flex-col w-64 min-w-[256px] flex-shrink-0">
      {/* Column Header */}
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-t-lg',
          isOver && 'ring-2 ring-primary/30'
        )}
        style={{ backgroundColor: `${status.color}15` }}
      >
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: status.color }}
        />
        <h3 className="text-sm font-medium text-foreground">
          {status.name}
        </h3>
        <span className="ml-auto text-xs text-slate-500 bg-surface px-1.5 py-0.5 rounded">
          {jobs.length}
        </span>
      </div>

      {/* Column Content */}
      <div
        className={cn(
          'flex-1 p-2 space-y-2 bg-slate-50 dark:bg-slate-900/50 rounded-b-lg border border-t-0 border-border min-h-[200px] overflow-y-auto',
          isOver && 'bg-primary/5 border-primary/30'
        )}
      >
        <SortableContext items={jobs.map((j) => j.id)} strategy={verticalListSortingStrategy}>
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} onClick={() => onJobClick(job.id)} />
          ))}
        </SortableContext>

        {jobs.length === 0 && (
          <div className="flex items-center justify-center h-20 text-xs text-slate-400">
            Drop jobs here
          </div>
        )}
      </div>
    </div>
  );
}
