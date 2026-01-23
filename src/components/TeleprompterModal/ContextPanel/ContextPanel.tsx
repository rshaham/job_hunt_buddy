import { useState, useMemo } from 'react';
import { Info, X } from 'lucide-react';
import { cn } from '../../../utils/helpers';
import type { Job } from '../../../types';
import { RequirementsSection } from './RequirementsSection';
import { InterviewersSection } from './InterviewersSection';
import { hasIntelContent, parseInterviewerIntel } from './intelParser';

interface ContextPanelProps {
  job: Job | null;
  addedKeywords: Set<string>;
  onAddKeyword: (text: string) => void;
  className?: string;
}

/**
 * Collapsible side panel showing job context during interview.
 * - Requirements & key skills (from job.summary)
 * - Interviewer intel (from job.contacts with interviewerIntel)
 */
export function ContextPanel({
  job,
  addedKeywords,
  onAddKeyword,
  className,
}: ContextPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Check if we have any content to show
  const hasContent = useMemo(() => {
    if (!job) return false;

    // Check for requirements/skills
    const hasRequirements = job.summary &&
      ((job.summary.requirements?.length || 0) > 0 ||
       (job.summary.keySkills?.length || 0) > 0);

    // Check for interviewer intel
    const hasInterviewerIntel = job.contacts.some(c => {
      if (!c.interviewerIntel) return false;
      const intel = parseInterviewerIntel(c.interviewerIntel);
      return hasIntelContent(intel);
    });

    return hasRequirements || hasInterviewerIntel;
  }, [job]);

  // Don't render anything if no job or no content
  if (!job || !hasContent) {
    return null;
  }

  return (
    <div className={cn('flex-shrink-0', className)}>
      {/* Collapsed state - just an icon button */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="w-12 h-12 flex items-center justify-center bg-surface-raised border border-border rounded-lg hover:bg-surface transition-colors"
          title="Context & Prep"
        >
          <Info className="w-5 h-5 text-foreground-muted" />
        </button>
      )}

      {/* Expanded state - full panel */}
      {isExpanded && (
        <div className="w-72 bg-surface border border-border rounded-lg shadow-lg overflow-hidden flex flex-col max-h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-surface-raised">
            <span className="text-sm font-medium text-foreground">
              Context & Prep
            </span>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 hover:bg-surface rounded transition-colors"
            >
              <X className="w-4 h-4 text-foreground-muted" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">
            {/* Requirements Section */}
            {job.summary && (
              <RequirementsSection
                summary={job.summary}
                addedKeywords={addedKeywords}
                onAddKeyword={onAddKeyword}
              />
            )}

            {/* Interviewers Section */}
            {job.contacts.length > 0 && (
              <InterviewersSection
                contacts={job.contacts}
                addedKeywords={addedKeywords}
                onAddKeyword={onAddKeyword}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
