import { useState } from 'react';
import { Modal, Button, Textarea } from '../ui';
import { useAppStore } from '../../stores/appStore';
import type { RejectionReason, RejectionDetails } from '../../types';
import { REJECTION_REASON_LABELS } from '../../types';

export function RejectionModal() {
  const {
    isRejectionModalOpen,
    pendingStatusChange,
    confirmStatusChange,
    cancelStatusChange,
    jobs,
  } = useAppStore();

  const [reason, setReason] = useState<RejectionReason | ''>('');
  const [stageRejectedAt, setStageRejectedAt] = useState('');
  const [feedbackReceived, setFeedbackReceived] = useState('');
  const [lessonsLearned, setLessonsLearned] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const job = pendingStatusChange ? jobs.find((j) => j.id === pendingStatusChange.jobId) : null;

  // Get interview rounds for the stage dropdown
  const interviewRounds = job?.interviews || [];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const details: RejectionDetails = {};
      if (reason) details.reason = reason;
      if (stageRejectedAt) details.stageRejectedAt = stageRejectedAt;
      if (feedbackReceived.trim()) details.feedbackReceived = feedbackReceived.trim();
      if (lessonsLearned.trim()) details.lessonsLearned = lessonsLearned.trim();

      await confirmStatusChange(details);
      resetForm();
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = async () => {
    setIsSaving(true);
    try {
      await confirmStatusChange();
      resetForm();
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    cancelStatusChange();
    resetForm();
  };

  const resetForm = () => {
    setReason('');
    setStageRejectedAt('');
    setFeedbackReceived('');
    setLessonsLearned('');
  };

  if (!isRejectionModalOpen) return null;

  return (
    <Modal
      isOpen={isRejectionModalOpen}
      onClose={handleClose}
      title={
        <span>
          Rejection Details
          {job && (
            <span className="text-sm font-normal text-foreground-muted ml-2">
              — {job.company}
            </span>
          )}
        </span>
      }
      size="md"
    >
      <div className="p-4 space-y-4">
        <p className="text-sm text-foreground-muted">
          Capture details about this rejection (all fields optional).
        </p>

        {/* Reason dropdown */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Rejection Reason
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as RejectionReason | '')}
            className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">Select a reason...</option>
            {Object.entries(REJECTION_REASON_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Stage rejected at */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Stage Rejected At
          </label>
          {interviewRounds.length > 0 ? (
            <select
              value={stageRejectedAt}
              onChange={(e) => setStageRejectedAt(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Select a stage...</option>
              <option value="Application">Application</option>
              {interviewRounds.map((round) => (
                <option key={round.id} value={`Round ${round.roundNumber}`}>
                  Round {round.roundNumber} - {round.type.replace('_', ' ')}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={stageRejectedAt}
              onChange={(e) => setStageRejectedAt(e.target.value)}
              placeholder="e.g., Phone screen, Final round"
              className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          )}
        </div>

        {/* Feedback received */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Feedback Received
          </label>
          <Textarea
            value={feedbackReceived}
            onChange={(e) => setFeedbackReceived(e.target.value)}
            placeholder="Any feedback they shared..."
            rows={3}
          />
        </div>

        {/* Lessons learned */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Lessons Learned
          </label>
          <Textarea
            value={lessonsLearned}
            onChange={(e) => setLessonsLearned(e.target.value)}
            placeholder="What can you learn from this experience?"
            rows={3}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={handleSkip} disabled={isSaving}>
            Skip
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Details'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
