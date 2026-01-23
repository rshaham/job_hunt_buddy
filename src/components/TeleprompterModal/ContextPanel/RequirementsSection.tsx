import { ClipboardList } from 'lucide-react';
import { cn } from '../../../utils/helpers';
import type { JobSummary } from '../../../types';
import { ContextSection } from './ContextSection';

interface RequirementsSectionProps {
  summary: JobSummary;
  addedKeywords: Set<string>;
  onAddKeyword: (text: string) => void;
}

/**
 * Shows job requirements and key skills as clickable chips.
 * Click to add as a keyword in the teleprompter staging area.
 */
export function RequirementsSection({
  summary,
  addedKeywords,
  onAddKeyword,
}: RequirementsSectionProps) {
  const requirements = summary.requirements || [];
  const keySkills = summary.keySkills || [];

  // No content to show
  if (requirements.length === 0 && keySkills.length === 0) {
    return null;
  }

  return (
    <ContextSection
      title="Requirements & Skills"
      icon={<ClipboardList className="w-4 h-4" />}
      defaultExpanded={true}
    >
      <div className="space-y-3">
        {/* Key Skills */}
        {keySkills.length > 0 && (
          <div>
            <p className="text-xs text-foreground-muted mb-1.5">Key Skills</p>
            <div className="flex flex-wrap gap-1.5">
              {keySkills.slice(0, 6).map((skill, idx) => {
                const isAdded = addedKeywords.has(skill.toLowerCase());
                return (
                  <button
                    key={`skill-${idx}`}
                    onClick={() => !isAdded && onAddKeyword(skill)}
                    disabled={isAdded}
                    className={cn(
                      'px-2 py-1 text-xs rounded transition-colors',
                      isAdded
                        ? 'bg-blue-100/50 dark:bg-blue-900/20 text-blue-400 dark:text-blue-600 cursor-default'
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                    )}
                  >
                    {skill}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Requirements */}
        {requirements.length > 0 && (
          <div>
            <p className="text-xs text-foreground-muted mb-1.5">Requirements</p>
            <div className="flex flex-wrap gap-1.5">
              {requirements.slice(0, 5).map((req, idx) => {
                // Truncate long requirements for chip display
                const displayText = req.length > 40 ? req.slice(0, 40) + '...' : req;
                const isAdded = addedKeywords.has(req.toLowerCase());
                return (
                  <button
                    key={`req-${idx}`}
                    onClick={() => !isAdded && onAddKeyword(req)}
                    disabled={isAdded}
                    title={req}
                    className={cn(
                      'px-2 py-1 text-xs rounded transition-colors',
                      isAdded
                        ? 'bg-blue-100/50 dark:bg-blue-900/20 text-blue-400 dark:text-blue-600 cursor-default'
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                    )}
                  >
                    {displayText}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </ContextSection>
  );
}
