import { ExternalLink, Calendar, MapPin, Briefcase, DollarSign } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Job } from '../../types';
import { Badge } from '../ui';
import { format } from 'date-fns';
import { htmlToMarkdown } from '../../utils/helpers';

interface OverviewTabProps {
  job: Job;
}

export function OverviewTab({ job }: OverviewTabProps) {
  const { summary } = job;

  return (
    <div className="space-y-4">
      {/* Metadata */}
      <div className="flex flex-wrap gap-4 text-sm">
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
