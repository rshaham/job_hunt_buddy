import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button, Tabs, TabsList, TabsTrigger, TabsContent, ConfirmModal, SlideOverPanel } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { OverviewTab } from './OverviewTab';
import { ResumeFitTab } from './ResumeFitTab';
import { CoverLetterTab } from './CoverLetterTab';
import { EmailsTab } from './EmailsTab';
import { PrepTab } from './PrepTab';
import { NotesTab } from './NotesTab';
import { ContactsEventsTab } from './ContactsEventsTab';
import { LearningTasksTab } from './LearningTasksTab';
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

  const handleClose = () => selectJob(null);

  const currentStatus = settings.statuses.find((s) => s.name === job.status);

  return (
    <>
      <SlideOverPanel
        isOpen={true}
        onClose={handleClose}
        size="full"
      >
        {/* Custom Header */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-border bg-surface sticky top-0 z-10">
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-heading-lg text-primary truncate">
              {job.company}
            </h1>
            <p className="font-body text-sm text-foreground-muted truncate">{job.title}</p>
          </div>

          {/* Status Dropdown */}
          <select
            value={job.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg border border-border bg-surface text-foreground font-body focus:outline-none focus:ring-2 focus:ring-primary"
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

          <button
            onClick={handleClose}
            className="p-2 rounded-lg text-foreground-muted hover:bg-surface-raised hover:text-foreground transition-colors duration-fast"
          >
            <span className="sr-only">Close</span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <Tabs defaultValue="overview" className="h-full flex flex-col">
            <div className="px-6 pt-4 border-b border-border">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="resume">Resume Fit</TabsTrigger>
                <TabsTrigger value="cover">Cover Letter</TabsTrigger>
                <TabsTrigger value="emails">Emails</TabsTrigger>
                <TabsTrigger value="prep">Prep & Q&A</TabsTrigger>
                <TabsTrigger value="learning">Learning</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="contacts">Contacts & Events</TabsTrigger>
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
              <TabsContent value="emails">
                <EmailsTab job={job} />
              </TabsContent>
              <TabsContent value="prep">
                <PrepTab job={job} />
              </TabsContent>
              <TabsContent value="learning">
                <LearningTasksTab job={job} />
              </TabsContent>
              <TabsContent value="notes">
                <NotesTab job={job} />
              </TabsContent>
              <TabsContent value="contacts">
                <ContactsEventsTab job={job} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </SlideOverPanel>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Job"
        message={`Delete "${job.title}" at ${job.company}? This cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </>
  );
}
