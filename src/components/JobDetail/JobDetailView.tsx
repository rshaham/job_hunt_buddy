import { useState } from 'react';
import { Trash2, Radio, ArrowLeft } from 'lucide-react';
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
import { InterviewsTab } from './InterviewsTab';
import type { Job } from '../../types';

interface JobDetailViewProps {
  job: Job;
}

export function JobDetailView({ job }: JobDetailViewProps) {
  const { selectJob, deleteJob, settings, initiateStatusChange, openTeleprompterModal } = useAppStore();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleStatusChange = (newStatus: string) => {
    initiateStatusChange(job.id, newStatus);
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
          {/* Back button - left side, matches slide-in direction */}
          <button
            onClick={handleClose}
            className="p-2 -ml-2 rounded-lg text-foreground-muted hover:bg-surface-raised hover:text-foreground transition-colors duration-fast group"
            title="Back to board"
          >
            <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" />
            <span className="sr-only">Back to board</span>
          </button>

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

          <button
            onClick={() => openTeleprompterModal(job.id)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            title="Start Interview Mode"
          >
            <Radio className="w-4 h-4" />
            <span className="hidden sm:inline">Interview</span>
          </button>

          <Button variant="ghost" size="sm" onClick={() => setIsDeleteModalOpen(true)} className="text-danger">
            <Trash2 className="w-4 h-4" />
          </Button>
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
                <TabsTrigger value="interviews">Interviews</TabsTrigger>
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
              <TabsContent value="interviews">
                <InterviewsTab job={job} />
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
