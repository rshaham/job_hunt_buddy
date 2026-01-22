import { useState } from 'react';
import { Calendar, Clock, MapPin, Users, Pencil, Trash2, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { Button, Textarea, Input } from '../ui';
import { cn } from '../../utils/helpers';
import type { InterviewRound, InterviewType, InterviewStatus, InterviewOutcome, Contact } from '../../types';
import { INTERVIEW_TYPE_LABELS, INTERVIEW_STATUS_LABELS, INTERVIEW_OUTCOME_LABELS } from '../../types';

interface InterviewRoundCardProps {
  round: InterviewRound;
  contacts: Contact[];
  onUpdate: (updates: Partial<InterviewRound>) => void;
  onDelete: () => void;
}

export function InterviewRoundCard({ round, contacts, onUpdate, onDelete }: InterviewRoundCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [editData, setEditData] = useState<Partial<InterviewRound>>({});

  const startEdit = () => {
    setEditData({
      type: round.type,
      scheduledAt: round.scheduledAt,
      duration: round.duration,
      location: round.location,
      status: round.status,
      outcome: round.outcome,
      notes: round.notes,
      feedback: round.feedback,
      interviewerIds: round.interviewerIds,
    });
    setIsEditing(true);
    setIsExpanded(true);
  };

  const handleSave = () => {
    onUpdate(editData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData({});
    setIsEditing(false);
  };

  // Get status color
  const getStatusColor = (status: InterviewStatus) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'rescheduled':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
    }
  };

  // Get outcome color
  const getOutcomeColor = (outcome: InterviewOutcome) => {
    switch (outcome) {
      case 'passed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'pending':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      case 'unknown':
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  // Get interviewers by IDs
  const interviewers = contacts.filter((c) => round.interviewerIds?.includes(c.id));

  return (
    <div className="border border-border rounded-lg bg-surface overflow-hidden">
      {/* Header - always visible */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-surface-raised transition-colors"
        onClick={() => !isEditing && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
          {round.roundNumber}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">
              {INTERVIEW_TYPE_LABELS[round.type]}
            </span>
            <span className={cn('px-2 py-0.5 text-xs rounded-full', getStatusColor(round.status))}>
              {INTERVIEW_STATUS_LABELS[round.status]}
            </span>
            {round.status === 'completed' && (
              <span className={cn('px-2 py-0.5 text-xs rounded-full', getOutcomeColor(round.outcome))}>
                {INTERVIEW_OUTCOME_LABELS[round.outcome]}
              </span>
            )}
          </div>
          {round.scheduledAt && (
            <div className="flex items-center gap-1 text-xs text-foreground-muted mt-0.5">
              <Calendar className="w-3 h-3" />
              {format(new Date(round.scheduledAt), 'MMM d, yyyy h:mm a')}
              {round.duration && (
                <>
                  <span className="mx-1">•</span>
                  <Clock className="w-3 h-3" />
                  {round.duration} min
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {!isEditing && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  startEdit();
                }}
                className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-foreground-muted"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
          {!isEditing && (
            isExpanded ? <ChevronUp className="w-4 h-4 text-foreground-muted" /> : <ChevronDown className="w-4 h-4 text-foreground-muted" />
          )}
        </div>
      </div>

      {/* Expanded content */}
      {(isExpanded || isEditing) && (
        <div className="border-t border-border px-4 py-3 space-y-3">
          {isEditing ? (
            <>
              {/* Edit form */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground-muted mb-1">Type</label>
                  <select
                    value={editData.type || round.type}
                    onChange={(e) => setEditData({ ...editData, type: e.target.value as InterviewType })}
                    className="w-full px-2 py-1.5 text-sm border border-border rounded-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {Object.entries(INTERVIEW_TYPE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground-muted mb-1">Status</label>
                  <select
                    value={editData.status || round.status}
                    onChange={(e) => setEditData({ ...editData, status: e.target.value as InterviewStatus })}
                    className="w-full px-2 py-1.5 text-sm border border-border rounded-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {Object.entries(INTERVIEW_STATUS_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground-muted mb-1">Outcome</label>
                  <select
                    value={editData.outcome || round.outcome}
                    onChange={(e) => setEditData({ ...editData, outcome: e.target.value as InterviewOutcome })}
                    className="w-full px-2 py-1.5 text-sm border border-border rounded-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {Object.entries(INTERVIEW_OUTCOME_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground-muted mb-1">Duration (min)</label>
                  <Input
                    type="number"
                    value={editData.duration || ''}
                    onChange={(e) => setEditData({ ...editData, duration: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder="e.g., 45"
                    className="text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground-muted mb-1">Date & Time</label>
                  <Input
                    type="datetime-local"
                    value={editData.scheduledAt ? format(new Date(editData.scheduledAt), "yyyy-MM-dd'T'HH:mm") : ''}
                    onChange={(e) => setEditData({ ...editData, scheduledAt: e.target.value ? new Date(e.target.value) : undefined })}
                    className="text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground-muted mb-1">Location</label>
                  <Input
                    type="text"
                    value={editData.location || ''}
                    onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                    placeholder="e.g., Zoom, Office"
                    className="text-sm"
                  />
                </div>
              </div>

              {/* Interviewers */}
              {contacts.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-foreground-muted mb-1">Interviewers</label>
                  <div className="flex flex-wrap gap-2">
                    {contacts.map((contact) => {
                      const isSelected = editData.interviewerIds?.includes(contact.id);
                      return (
                        <button
                          key={contact.id}
                          type="button"
                          onClick={() => {
                            const current = editData.interviewerIds || [];
                            setEditData({
                              ...editData,
                              interviewerIds: isSelected
                                ? current.filter((id) => id !== contact.id)
                                : [...current, contact.id],
                            });
                          }}
                          className={cn(
                            'px-2 py-1 text-xs rounded-full border transition-colors',
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

              <div>
                <label className="block text-xs font-medium text-foreground-muted mb-1">Notes</label>
                <Textarea
                  value={editData.notes || ''}
                  onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                  placeholder="Interview prep, questions to ask, topics covered..."
                  rows={2}
                  className="text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground-muted mb-1">Feedback</label>
                <Textarea
                  value={editData.feedback || ''}
                  onChange={(e) => setEditData({ ...editData, feedback: e.target.value })}
                  placeholder="Feedback received, how it went..."
                  rows={2}
                  className="text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={handleCancel}>
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave}>
                  <Check className="w-4 h-4 mr-1" />
                  Save
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* View mode */}
              {round.location && (
                <div className="flex items-center gap-2 text-sm text-foreground-muted">
                  <MapPin className="w-4 h-4" />
                  {round.location}
                </div>
              )}

              {interviewers.length > 0 && (
                <div className="flex items-start gap-2 text-sm">
                  <Users className="w-4 h-4 text-foreground-muted mt-0.5" />
                  <div>
                    <span className="text-foreground-muted">Interviewers: </span>
                    <span className="text-foreground">
                      {interviewers.map((c) => c.name).join(', ')}
                    </span>
                  </div>
                </div>
              )}

              {round.notes && (
                <div>
                  <div className="text-xs font-medium text-foreground-muted mb-1">Notes</div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{round.notes}</p>
                </div>
              )}

              {round.feedback && (
                <div>
                  <div className="text-xs font-medium text-foreground-muted mb-1">Feedback</div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{round.feedback}</p>
                </div>
              )}

              {!round.location && !round.notes && !round.feedback && interviewers.length === 0 && (
                <p className="text-sm text-foreground-muted italic">No additional details</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
