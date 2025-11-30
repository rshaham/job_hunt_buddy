import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Plus, Settings, HelpCircle, Shield } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { Column } from './Column';
import { JobCard } from './JobCard';
import { Button } from '../ui';
import type { Job } from '../../types';

export function BoardView() {
  const {
    jobs,
    settings,
    moveJob,
    selectJob,
    openAddJobModal,
    openSettingsModal,
    openGettingStartedModal,
    openPrivacyModal,
  } = useAppStore();

  const [activeJob, setActiveJob] = useState<Job | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const job = jobs.find((j) => j.id === event.active.id);
    if (job) setActiveJob(job);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveJob(null);

    if (!over) return;

    const jobId = active.id as string;
    const overId = over.id as string;

    // Check if dropping on a column
    const isColumn = settings.statuses.some((s) => s.name === overId);

    let newStatus: string;
    if (isColumn) {
      newStatus = overId;
    } else {
      // Dropping on another job - find that job's status
      const targetJob = jobs.find((j) => j.id === overId);
      if (!targetJob) return;
      newStatus = targetJob.status;
    }

    const job = jobs.find((j) => j.id === jobId);
    if (job && job.status !== newStatus) {
      moveJob(jobId, newStatus);
    }
  };

  const jobsByStatus = settings.statuses.reduce(
    (acc, status) => {
      acc[status.name] = jobs.filter((job) => job.status === status.name);
      return acc;
    },
    {} as Record<string, Job[]>
  );

  return (
    <div className="flex flex-col h-screen bg-slate-100 dark:bg-slate-900">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="Job Hunt Buddy" className="w-16 h-16 rounded-xl" />
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
            Job Hunt Buddy
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={openAddJobModal} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Add Job
          </Button>
          <Button variant="ghost" size="sm" onClick={openGettingStartedModal} title="Getting Started">
            <HelpCircle className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={openPrivacyModal} title="Privacy & Terms">
            <Shield className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={openSettingsModal} title="Settings">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Board */}
      <div className="flex-1 overflow-x-auto p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full">
            {settings.statuses
              .sort((a, b) => a.order - b.order)
              .map((status) => (
                <Column
                  key={status.id}
                  status={status}
                  jobs={jobsByStatus[status.name] || []}
                  onJobClick={selectJob}
                />
              ))}
          </div>

          <DragOverlay>
            {activeJob && (
              <div className="w-64 rotate-3 opacity-90">
                <JobCard job={activeJob} onClick={() => {}} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Empty State */}
      {jobs.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-slate-400" />
            </div>
            <h2 className="text-lg font-medium text-slate-600 dark:text-slate-400 mb-2">
              No jobs yet
            </h2>
            <p className="text-sm text-slate-500 mb-4">
              Add your first job to start tracking
            </p>
            <Button onClick={openAddJobModal} className="pointer-events-auto">
              <Plus className="w-4 h-4 mr-1" />
              Add Job
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
