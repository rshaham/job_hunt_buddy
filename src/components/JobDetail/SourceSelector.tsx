import { useState } from 'react';
import { Share2, Pencil, Check, X, User } from 'lucide-react';
import { Button, Input } from '../ui';
import { useAppStore } from '../../stores/appStore';
import type { Job, JobSource, SourceInfo } from '../../types';
import { JOB_SOURCE_LABELS } from '../../types';

interface SourceSelectorProps {
  job: Job;
}

export function SourceSelector({ job }: SourceSelectorProps) {
  const { updateJobSource } = useAppStore();
  const [isEditing, setIsEditing] = useState(false);
  const [source, setSource] = useState<JobSource>(job.sourceInfo?.source || 'other');
  const [referredByContactId, setReferredByContactId] = useState(job.sourceInfo?.referredByContactId || '');
  const [sourcePlatform, setSourcePlatform] = useState(job.sourceInfo?.sourcePlatform || '');
  const [sourceNotes, setSourceNotes] = useState(job.sourceInfo?.sourceNotes || '');
  const [isSaving, setIsSaving] = useState(false);

  const contacts = job.contacts || [];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const sourceInfo: SourceInfo = { source };
      if (source === 'referral' && referredByContactId) {
        sourceInfo.referredByContactId = referredByContactId;
      }
      if (sourcePlatform) {
        sourceInfo.sourcePlatform = sourcePlatform;
      }
      if (sourceNotes) {
        sourceInfo.sourceNotes = sourceNotes;
      }
      await updateJobSource(job.id, sourceInfo);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setSource(job.sourceInfo?.source || 'other');
    setReferredByContactId(job.sourceInfo?.referredByContactId || '');
    setSourcePlatform(job.sourceInfo?.sourcePlatform || '');
    setSourceNotes(job.sourceInfo?.sourceNotes || '');
    setIsEditing(false);
  };

  const referrer = referredByContactId
    ? contacts.find((c) => c.id === referredByContactId)
    : null;

  // Display mode
  if (!isEditing) {
    if (!job.sourceInfo) {
      return (
        <div className="flex items-center gap-2">
          <Share2 className="w-4 h-4 text-foreground-muted" />
          <span className="text-sm text-foreground-muted">Source not set</span>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="text-primary text-sm hover:underline"
          >
            Add
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-start gap-2">
        <Share2 className="w-4 h-4 text-foreground-muted mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm text-foreground">
              {JOB_SOURCE_LABELS[job.sourceInfo.source]}
            </span>
            {job.sourceInfo.sourcePlatform && (
              <span className="text-sm text-foreground-muted">
                ({job.sourceInfo.sourcePlatform})
              </span>
            )}
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="p-1 text-foreground-muted hover:text-primary transition-colors"
              title="Edit source"
            >
              <Pencil className="w-3 h-3" />
            </button>
          </div>
          {job.sourceInfo.source === 'referral' && referrer && (
            <div className="flex items-center gap-1 text-sm text-foreground-muted mt-0.5">
              <User className="w-3 h-3" />
              Referred by {referrer.name}
            </div>
          )}
          {job.sourceInfo.sourceNotes && (
            <p className="text-xs text-foreground-muted mt-0.5">{job.sourceInfo.sourceNotes}</p>
          )}
        </div>
      </div>
    );
  }

  // Edit mode
  return (
    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Share2 className="w-4 h-4" />
        Job Source
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-foreground-muted mb-1">Source</label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as JobSource)}
            className="w-full px-2 py-1.5 text-sm border border-border rounded-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {Object.entries(JOB_SOURCE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        {source === 'referral' && contacts.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1">Referred By</label>
            <select
              value={referredByContactId}
              onChange={(e) => setReferredByContactId(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-border rounded-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Select contact...</option>
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>{contact.name}</option>
              ))}
            </select>
          </div>
        )}

        {source === 'job_board' && (
          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1">Platform</label>
            <Input
              type="text"
              value={sourcePlatform}
              onChange={(e) => setSourcePlatform(e.target.value)}
              placeholder="e.g., Indeed, Glassdoor"
              className="text-sm"
            />
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-foreground-muted mb-1">Notes</label>
        <Input
          type="text"
          value={sourceNotes}
          onChange={(e) => setSourceNotes(e.target.value)}
          placeholder="Additional notes about how you found this job..."
          className="text-sm"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isSaving}>
          <X className="w-4 h-4 mr-1" />
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave} disabled={isSaving}>
          <Check className="w-4 h-4 mr-1" />
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
