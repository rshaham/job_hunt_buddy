import { useState, useMemo } from 'react';
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
import { Plus, Settings, HelpCircle, Shield, BookOpen, GraduationCap, Sparkles, Search, ArrowUpDown, X, ListChecks } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { useCommandBarStore } from '../../stores/commandBarStore';
import { Column } from './Column';
import { JobCard } from './JobCard';
import { Button } from '../ui';
import { EmbeddingStatus } from '../EmbeddingStatus';
import { isFeatureEnabled } from '../../utils/featureFlags';
import type { Job } from '../../types';

type SortOption = 'dateAdded' | 'company' | 'title' | 'resumeFit';
type SortDirection = 'asc' | 'desc';

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
    openFeatureGuideModal,
    openCareerCoachModal,
    openJobFinderModal,
    openBatchScannerModal,
  } = useAppStore();

  const [activeJob, setActiveJob] = useState<Job | null>(null);

  // Filter and sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('dateAdded');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

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

  // Filter and sort jobs
  const filteredAndSortedJobs = useMemo(() => {
    let result = [...jobs];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (job) =>
          job.company.toLowerCase().includes(query) ||
          job.title.toLowerCase().includes(query) ||
          job.summary?.shortDescription?.toLowerCase().includes(query)
      );
    }

    // Sort jobs
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'dateAdded':
          comparison = new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime();
          break;
        case 'company':
          comparison = a.company.localeCompare(b.company);
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'resumeFit': {
          const aFit = a.resumeAnalysis?.matchPercentage ?? -1;
          const bFit = b.resumeAnalysis?.matchPercentage ?? -1;
          comparison = aFit - bFit;
          break;
        }
      }

      return sortDirection === 'desc' ? -comparison : comparison;
    });

    return result;
  }, [jobs, searchQuery, sortBy, sortDirection]);

  const jobsByStatus = settings.statuses.reduce(
    (acc, status) => {
      acc[status.name] = filteredAndSortedJobs.filter((job) => job.status === status.name);
      return acc;
    },
    {} as Record<string, Job[]>
  );

  const totalVisible = filteredAndSortedJobs.length;
  const hasActiveFilters = searchQuery.trim() !== '';

  const clearFilters = () => {
    setSearchQuery('');
    setSortBy('dateAdded');
    setSortDirection('desc');
  };

  const toggleSortDirection = () => {
    setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
  };

  return (
    <div className="flex flex-col h-screen bg-slate-100 dark:bg-slate-900">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="Job Hunt Buddy" className="w-16 h-16 rounded-xl" />
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
            Job Hunt Buddy
            <span className="ml-2 text-sm font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full align-middle">
              beta
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={openAddJobModal} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Add Job
          </Button>
          {isFeatureEnabled('jobSearch', settings) && (
            <Button onClick={openJobFinderModal} size="sm" variant="secondary">
              <Search className="w-4 h-4 mr-1" />
              Find Jobs
            </Button>
          )}
          <Button onClick={openBatchScannerModal} size="sm" variant="secondary" title="Scan multiple career pages">
            <ListChecks className="w-4 h-4 mr-1" />
            Batch Scan
          </Button>
          <button
            type="button"
            onClick={() => useCommandBarStore.getState().open()}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300
              hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            title="Open AI Agent (Ctrl+K)"
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Agent</span>
            <kbd className="px-1.5 py-0.5 text-xs bg-slate-200 dark:bg-slate-600 rounded font-mono">
              Ctrl+K
            </kbd>
          </button>
          {/* Active AI Model Indicator */}
          <div
            className="flex items-center gap-1.5 px-2 py-1 text-xs text-slate-500 dark:text-slate-400
              bg-slate-100 dark:bg-slate-700/50 rounded-md border border-slate-200 dark:border-slate-600"
            title={`Active AI: ${settings.providers[settings.activeProvider]?.model || 'Not configured'}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="font-medium">{settings.providers[settings.activeProvider]?.model || 'No model'}</span>
          </div>
          <EmbeddingStatus />
          <Button variant="ghost" size="sm" onClick={openGettingStartedModal} title="Getting Started">
            <HelpCircle className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={openFeatureGuideModal} title="Feature Guide">
            <BookOpen className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={openCareerCoachModal} title="Career Coach">
            <GraduationCap className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={openPrivacyModal} title="Privacy & Terms">
            <Shield className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={openSettingsModal} title="Settings">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Filter/Sort Toolbar */}
      <div className="flex items-center gap-4 px-6 py-2 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search jobs..."
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-md
              bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-slate-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            title="Sort by"
            className="px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-md
              bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="dateAdded">Date Added</option>
            <option value="resumeFit">Resume Fit</option>
            <option value="company">Company</option>
            <option value="title">Title</option>
          </select>
          <button
            type="button"
            onClick={toggleSortDirection}
            className="px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-md
              bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
            title={sortDirection === 'desc' ? 'Descending' : 'Ascending'}
          >
            {sortDirection === 'desc' ? '↓' : '↑'}
          </button>
        </div>

        {/* Clear & Count */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="flex items-center gap-1 px-2 py-1 text-sm text-slate-600 dark:text-slate-400
              hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            <X className="w-4 h-4" />
            Clear
          </button>
        )}
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {hasActiveFilters ? `${totalVisible} of ${jobs.length}` : `${jobs.length} jobs`}
        </span>
      </div>

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
