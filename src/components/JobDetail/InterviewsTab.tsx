import { useState } from 'react';
import { Plus, Calendar } from 'lucide-react';
import { Button, Modal, Input, Textarea } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { InterviewRoundCard } from './InterviewRoundCard';
import type { Job, InterviewType, InterviewStatus, InterviewOutcome, InterviewRound } from '../../types';
import { INTERVIEW_TYPE_LABELS, INTERVIEW_STATUS_LABELS, INTERVIEW_OUTCOME_LABELS } from '../../types';

interface InterviewsTabProps {
  job: Job;
}

export function InterviewsTab({ job }: InterviewsTabProps) {
  const { addInterviewRound, updateInterviewRound, deleteInterviewRound } = useAppStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New round form state
  const [newRound, setNewRound] = useState({
    type: 'phone_screen' as InterviewType,
    scheduledAt: '',
    duration: '',
    location: '',
    status: 'scheduled' as InterviewStatus,
    outcome: 'pending' as InterviewOutcome,
    notes: '',
  });

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
        outcome: newRound.outcome,
        notes: newRound.notes || undefined,
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
      outcome: 'pending',
      notes: '',
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

      {/* Add Round Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          resetForm();
        }}
        title="Add Interview Round"
        size="md"
      >
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Interview Type
              </label>
              <select
                value={newRound.type}
                onChange={(e) => setNewRound({ ...newRound, type: e.target.value as InterviewType })}
                className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {Object.entries(INTERVIEW_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
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
                Outcome
              </label>
              <select
                value={newRound.outcome}
                onChange={(e) => setNewRound({ ...newRound, outcome: e.target.value as InterviewOutcome })}
                className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {Object.entries(INTERVIEW_OUTCOME_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Notes
            </label>
            <Textarea
              value={newRound.notes}
              onChange={(e) => setNewRound({ ...newRound, notes: e.target.value })}
              placeholder="Any prep notes, questions to ask, topics to cover..."
              rows={3}
            />
          </div>

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
