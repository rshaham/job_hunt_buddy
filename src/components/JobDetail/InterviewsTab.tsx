import { useState } from 'react';
import { Plus, Calendar } from 'lucide-react';
import { Button, Modal, Input, Textarea, InterviewTypeSelect } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { InterviewRoundCard } from './InterviewRoundCard';
import { InterviewPrepModal } from './InterviewPrepModal';
import { cn } from '../../utils/helpers';
import type { Job, InterviewStatus, InterviewRound } from '../../types';
import { INTERVIEW_STATUS_LABELS } from '../../types';

// Section header component
const SectionHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-2 text-sm font-medium text-foreground-muted pt-2">
    <span>{children}</span>
    <div className="flex-1 h-px bg-border" />
  </div>
);

interface InterviewsTabProps {
  job: Job;
}

export function InterviewsTab({ job }: InterviewsTabProps) {
  const { addInterviewRound, updateInterviewRound, deleteInterviewRound, openTeleprompterModal } = useAppStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRoundForPrep, setSelectedRoundForPrep] = useState<InterviewRound | null>(null);
  const [isPrepModalOpen, setIsPrepModalOpen] = useState(false);

  // New round form state
  const [newRound, setNewRound] = useState({
    type: 'phone_screen',
    scheduledAt: '',
    duration: '',
    location: '',
    status: 'scheduled' as InterviewStatus,
    notes: '',
    interviewerIds: [] as string[],
  });

  const contacts = job.contacts || [];

  const interviews = job.interviews || [];
  const sortedInterviews = [...interviews].sort((a, b) => a.roundNumber - b.roundNumber);

  const handleAddRound = async () => {
    setIsSubmitting(true);
    try {
      const nextRoundNumber = interviews.length > 0
        ? Math.max(...interviews.map((i) => i.roundNumber)) + 1
        : 1;

      await addInterviewRound(job.id, {
        roundNumber: nextRoundNumber,
        type: newRound.type,
        scheduledAt: newRound.scheduledAt ? new Date(newRound.scheduledAt) : undefined,
        duration: newRound.duration ? parseInt(newRound.duration) : undefined,
        location: newRound.location || undefined,
        status: newRound.status,
        outcome: 'pending',
        notes: newRound.notes || undefined,
        interviewerIds: newRound.interviewerIds.length > 0 ? newRound.interviewerIds : undefined,
      });

      setIsAddModalOpen(false);
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRound = async (roundId: string, updates: Partial<InterviewRound>) => {
    await updateInterviewRound(job.id, roundId, updates);
  };

  const handleDeleteRound = async (roundId: string) => {
    await deleteInterviewRound(job.id, roundId);
  };

  const resetForm = () => {
    setNewRound({
      type: 'phone_screen',
      scheduledAt: '',
      duration: '',
      location: '',
      status: 'scheduled',
      notes: '',
      interviewerIds: [],
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Interview Rounds</h3>
          <p className="text-sm text-foreground-muted">
            Track your interview process with {job.company}
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Add Round
        </Button>
      </div>

      {/* Interview list */}
      {sortedInterviews.length > 0 ? (
        <div className="space-y-3">
          {sortedInterviews.map((round) => (
            <InterviewRoundCard
              key={round.id}
              round={round}
              contacts={job.contacts || []}
              onUpdate={(updates) => handleUpdateRound(round.id, updates)}
              onDelete={() => handleDeleteRound(round.id)}
              onOpenPrep={() => {
                setSelectedRoundForPrep(round);
                setIsPrepModalOpen(true);
              }}
              onOpenTeleprompter={() => {
                // Open teleprompter with interview context
                openTeleprompterModal(job.id);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
          <Calendar className="w-12 h-12 text-foreground-subtle mx-auto mb-3" />
          <h4 className="text-foreground font-medium mb-1">No interview rounds yet</h4>
          <p className="text-sm text-foreground-muted mb-4">
            Add your first interview round to track your progress
          </p>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Add Round
          </Button>
        </div>
      )}

      {/* Interview Prep Modal */}
      {selectedRoundForPrep && (
        <InterviewPrepModal
          isOpen={isPrepModalOpen}
          onClose={() => {
            setIsPrepModalOpen(false);
            setSelectedRoundForPrep(null);
          }}
          job={job}
          interviewRound={selectedRoundForPrep}
        />
      )}

      {/* Add Round Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          resetForm();
        }}
        title="Add Interview Round"
        size="lg"
      >
        <div className="p-5 space-y-5">
          {/* Interview Type - full width at top */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Interview Type
            </label>
            <InterviewTypeSelect
              value={newRound.type}
              onChange={(type) => setNewRound({ ...newRound, type })}
            />
          </div>

          {/* Scheduling Section */}
          <div className="space-y-4">
            <SectionHeader>Scheduling</SectionHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Date & Time
                </label>
                <Input
                  type="datetime-local"
                  value={newRound.scheduledAt}
                  onChange={(e) => setNewRound({ ...newRound, scheduledAt: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Duration (minutes)
                </label>
                <Input
                  type="number"
                  value={newRound.duration}
                  onChange={(e) => setNewRound({ ...newRound, duration: e.target.value })}
                  placeholder="e.g., 45"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Location
                </label>
                <Input
                  type="text"
                  value={newRound.location}
                  onChange={(e) => setNewRound({ ...newRound, location: e.target.value })}
                  placeholder="e.g., Zoom, HQ Office"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Status
                </label>
                <select
                  value={newRound.status}
                  onChange={(e) => setNewRound({ ...newRound, status: e.target.value as InterviewStatus })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {Object.entries(INTERVIEW_STATUS_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Interviewers Section - only shown if contacts exist */}
          {contacts.length > 0 && (
            <div className="space-y-3">
              <SectionHeader>Interviewers</SectionHeader>
              <div className="flex flex-wrap gap-2">
                {contacts.map((contact) => {
                  const isSelected = newRound.interviewerIds.includes(contact.id);
                  return (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => {
                        setNewRound({
                          ...newRound,
                          interviewerIds: isSelected
                            ? newRound.interviewerIds.filter((id) => id !== contact.id)
                            : [...newRound.interviewerIds, contact.id],
                        });
                      }}
                      className={cn(
                        'px-3 py-1.5 text-sm rounded-full border transition-colors',
                        isSelected
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'border-border text-foreground-muted hover:border-primary/50'
                      )}
                    >
                      {contact.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes Section */}
          <div className="space-y-3">
            <SectionHeader>Notes</SectionHeader>
            <Textarea
              value={newRound.notes}
              onChange={(e) => setNewRound({ ...newRound, notes: e.target.value })}
              placeholder="Any prep notes, questions to ask, topics to cover..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => {
                setIsAddModalOpen(false);
                resetForm();
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleAddRound} disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Round'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
