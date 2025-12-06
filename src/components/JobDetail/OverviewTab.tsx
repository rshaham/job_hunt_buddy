import { useState } from 'react';
import { ExternalLink, Calendar, MapPin, Briefcase, DollarSign, Pencil, Check, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Job } from '../../types';
import { Badge, Button } from '../ui';
import { format } from 'date-fns';
import { htmlToMarkdown } from '../../utils/helpers';
import { useAppStore } from '../../stores/appStore';

interface OverviewTabProps {
  job: Job;
}

export function OverviewTab({ job }: OverviewTabProps) {
  const { summary } = job;
  const updateJob = useAppStore((state) => state.updateJob);

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editCompany, setEditCompany] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editLink, setEditLink] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleStartEdit = () => {
    setEditCompany(job.company);
    setEditTitle(job.title);
    setEditLink(job.jdLink);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editCompany.trim() || !editTitle.trim()) return;

    setIsSaving(true);
    try {
      await updateJob(job.id, {
        company: editCompany.trim(),
        title: editTitle.trim(),
        jdLink: editLink.trim(),
      });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <div className="space-y-4">
      {/* Job Details - Editable */}
      {isEditing ? (
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-3">
          <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Company</label>
            <input
              type="text"
              value={editCompany}
              onChange={(e) => setEditCompany(e.target.value)}
              onKeyDown={handleKeyDown}
              className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Company name"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Title</label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Job title"
            />
          </div>
          <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Link</label>
            <input
              type="url"
              value={editLink}
              onChange={(e) => setEditLink(e.target.value)}
              onKeyDown={handleKeyDown}
              className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="https://..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelEdit}
              disabled={isSaving}
            >
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveEdit}
              disabled={isSaving || !editCompany.trim() || !editTitle.trim()}
            >
              <Check className="w-4 h-4 mr-1" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <button
            type="button"
            onClick={handleStartEdit}
            className="flex items-center gap-1 text-slate-500 hover:text-primary transition-colors"
            title="Edit job details"
          >
            <Pencil className="w-4 h-4" />
            Edit
          </button>
          {job.jdLink && (
            <a
              href={job.jdLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              View Job Posting
            </a>
          )}
          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
            <Calendar className="w-4 h-4" />
            Added {format(new Date(job.dateAdded), 'MMM d, yyyy')}
          </div>
        </div>
      )}

      {/* Summary Card */}
      {summary && (
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-4">
          {/* Quick Info */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span className="text-sm capitalize">{summary.jobType}</span>
            </div>
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-slate-400" />
              <span className="text-sm">{summary.level}</span>
            </div>
            {summary.salary && (
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-slate-400" />
                <span className="text-sm">{summary.salary}</span>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <h4 className="text-xs font-medium text-slate-500 uppercase mb-2">Summary</h4>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {summary.shortDescription}
            </p>
          </div>

          {/* Key Skills */}
          <div>
            <h4 className="text-xs font-medium text-slate-500 uppercase mb-2">Key Skills</h4>
            <div className="flex flex-wrap gap-1.5">
              {summary.keySkills.map((skill, i) => (
                <Badge key={i} color="#6366f1">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>

          {/* Requirements */}
          <div>
            <h4 className="text-xs font-medium text-slate-500 uppercase mb-2">Requirements</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-slate-700 dark:text-slate-300">
              {summary.requirements.map((req, i) => (
                <li key={i}>{req}</li>
              ))}
            </ul>
          </div>

          {/* Nice to Haves */}
          {summary.niceToHaves.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-slate-500 uppercase mb-2">Nice to Have</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-600 dark:text-slate-400">
                {summary.niceToHaves.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Raw JD */}
      <div>
        <h4 className="text-xs font-medium text-slate-500 uppercase mb-2">Full Job Description</h4>
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg max-h-64 overflow-y-auto prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {htmlToMarkdown(job.jdText) || 'No job description available'}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
