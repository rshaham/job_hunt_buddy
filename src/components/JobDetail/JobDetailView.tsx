import { useState } from 'react';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { Button, Tabs, TabsList, TabsTrigger, TabsContent, ConfirmModal } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { OverviewTab } from './OverviewTab';
import { ResumeFitTab } from './ResumeFitTab';
import { CoverLetterTab } from './CoverLetterTab';
import { PrepTab } from './PrepTab';
import { NotesTab } from './NotesTab';
import type { Job } from '../../types';

interface JobDetailViewProps {
  job: Job;
}

export function JobDetailView({ job }: JobDetailViewProps) {
  const { selectJob, updateJob, deleteJob, settings } = useAppStore();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    await updateJob(job.id, { status: newStatus });
  };

  const handleDelete = async () => {
    await deleteJob(job.id);
  };

  const currentStatus = settings.statuses.find((s) => s.name === job.status);

  return (
    <div className="fixed inset-0 z-40 bg-white dark:bg-slate-900 overflow-hidden flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-4 px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <Button variant="ghost" size="sm" onClick={() => selectJob(null)}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>

        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-slate-900 dark:text-white truncate">
            {job.company}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 truncate">{job.title}</p>
        </div>

        {/* Status Dropdown */}
        <select
          value={job.status}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="px-3 py-1.5 text-sm rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          style={currentStatus ? { borderColor: currentStatus.color } : undefined}
        >
          {settings.statuses.map((status) => (
            <option key={status.id} value={status.name}>
              {status.name}
            </option>
          ))}
        </select>

        <Button variant="ghost" size="sm" onClick={() => setIsDeleteModalOpen(true)} className="text-danger">
          <Trash2 className="w-4 h-4" />
        </Button>
      </header>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Job"
        message={`Delete "${job.title}" at ${job.company}? This cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />

      {/* Tabs */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="overview" className="h-full flex flex-col">
          <div className="px-6 pt-4 border-b border-slate-200 dark:border-slate-700">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="resume">Resume Fit</TabsTrigger>
              <TabsTrigger value="cover">Cover Letter</TabsTrigger>
              <TabsTrigger value="prep">Prep & Q&A</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <TabsContent value="overview">
              <OverviewTab job={job} />
            </TabsContent>

            <TabsContent value="resume">
              <ResumeFitTab job={job} />
            </TabsContent>

            <TabsContent value="cover">
              <CoverLetterTab job={job} />
            </TabsContent>

            <TabsContent value="prep">
              <PrepTab job={job} />
            </TabsContent>

            <TabsContent value="notes">
              <NotesTab job={job} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
