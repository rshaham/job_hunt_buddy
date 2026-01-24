import { useState } from 'react';
import { AlertTriangle, ChevronDown, Pencil } from 'lucide-react';
import { Textarea } from '../ui';
import { cn } from '../../utils/helpers';

interface StarGap {
  component: string;
  issue: string;
  suggestion: string;
}

interface StarEditorProps {
  situation: string;
  task: string;
  action: string;
  result: string;
  gaps?: StarGap[];
  onSituationChange: (value: string) => void;
  onTaskChange: (value: string) => void;
  onActionChange: (value: string) => void;
  onResultChange: (value: string) => void;
  className?: string;
}

const STAR_SECTIONS = [
  {
    key: 'situation' as const,
    letter: 'S',
    label: 'Situation',
    placeholder: 'Set the scene: What was the context? What company/team were you on? What was the challenge or opportunity?',
    color: {
      border: 'border-l-emerald-400',
      borderCollapsed: 'border-emerald-200 dark:border-emerald-800',
      badge: 'bg-emerald-500',
      bgHover: 'hover:bg-emerald-50 dark:hover:bg-emerald-900/20',
    },
  },
  {
    key: 'task' as const,
    letter: 'T',
    label: 'Task',
    placeholder: 'What was YOUR specific responsibility or goal? What were you asked to do?',
    color: {
      border: 'border-l-blue-400',
      borderCollapsed: 'border-blue-200 dark:border-blue-800',
      badge: 'bg-blue-500',
      bgHover: 'hover:bg-blue-50 dark:hover:bg-blue-900/20',
    },
  },
  {
    key: 'action' as const,
    letter: 'A',
    label: 'Action',
    placeholder: 'What specific steps did YOU take? Be concrete and use "I" not "we". What was your unique contribution?',
    color: {
      border: 'border-l-amber-400',
      borderCollapsed: 'border-amber-200 dark:border-amber-800',
      badge: 'bg-amber-500',
      bgHover: 'hover:bg-amber-50 dark:hover:bg-amber-900/20',
    },
  },
  {
    key: 'result' as const,
    letter: 'R',
    label: 'Result',
    placeholder: 'What was the outcome? Include quantified metrics if possible (%, $, time saved, etc.)',
    color: {
      border: 'border-l-purple-400',
      borderCollapsed: 'border-purple-200 dark:border-purple-800',
      badge: 'bg-purple-500',
      bgHover: 'hover:bg-purple-50 dark:hover:bg-purple-900/20',
    },
  },
];

export function StarEditor({
  situation,
  task,
  action,
  result,
  gaps = [],
  onSituationChange,
  onTaskChange,
  onActionChange,
  onResultChange,
  className,
}: StarEditorProps): JSX.Element {
  const values = { situation, task, action, result };
  const handlers = {
    situation: onSituationChange,
    task: onTaskChange,
    action: onActionChange,
    result: onResultChange,
  };

  // Track expanded sections - start all expanded
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['situation', 'task', 'action', 'result'])
  );

  // Find gap for a specific component
  const getGapForComponent = (component: string): StarGap | undefined => {
    return gaps.find((g) => g.component.toLowerCase() === component.toLowerCase());
  };

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Get preview text for collapsed state
  const getPreview = (text: string, maxLength: number = 60): string => {
    if (!text) return 'Click to expand and add content...';
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + '...';
  };

  return (
    <div className={cn('space-y-3', className)}>
      {STAR_SECTIONS.map((section) => {
        const gap = getGapForComponent(section.key);
        const isExpanded = expandedSections.has(section.key);
        const value = values[section.key];

        return (
          <div
            key={section.key}
            className={cn(
              'relative rounded-lg bg-surface-raised border transition-all',
              isExpanded
                ? cn('border-l-4', section.color.border, 'border-border')
                : cn('border', section.color.borderCollapsed)
            )}
          >
            {/* Clickable header */}
            <button
              type="button"
              onClick={() => toggleSection(section.key)}
              className={cn(
                'w-full flex items-center gap-3 p-3 text-left transition-colors rounded-lg',
                !isExpanded && section.color.bgHover
              )}
            >
              {/* Letter badge */}
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0',
                  section.color.badge
                )}
              >
                {section.letter}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{section.label}</span>
                  {/* Gap indicator in collapsed state */}
                  {!isExpanded && gap && (
                    <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="w-3 h-3" />
                      Needs attention
                    </span>
                  )}
                </div>
                {/* Preview text when collapsed */}
                {!isExpanded && (
                  <p className="text-sm text-foreground-muted truncate mt-0.5">
                    {getPreview(value)}
                  </p>
                )}
              </div>

              {/* Expand/collapse indicator */}
              <ChevronDown
                className={cn(
                  'w-5 h-5 text-foreground-muted transition-transform flex-shrink-0',
                  isExpanded && 'rotate-180'
                )}
              />
            </button>

            {/* Expanded content */}
            {isExpanded && (
              <div className="px-4 pb-4 pt-1">
                {/* Editable textarea with visual indicator */}
                <div className="relative group">
                  <Textarea
                    value={value}
                    onChange={(e) => handlers[section.key](e.target.value)}
                    placeholder={section.placeholder}
                    rows={4}
                    className={cn(
                      'resize-none transition-all',
                      'border-border hover:border-primary/50 focus:border-primary',
                      'bg-surface'
                    )}
                  />
                  {/* Edit hint */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-0 transition-opacity pointer-events-none">
                    <span className="flex items-center gap-1 text-xs text-foreground-muted bg-surface px-1.5 py-0.5 rounded">
                      <Pencil className="w-3 h-3" />
                      Click to edit
                    </span>
                  </div>
                </div>

                {/* Gap warning */}
                {gap && (
                  <div className="flex items-start gap-2 mt-3 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-md">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-700 dark:text-amber-300">
                      <p className="font-medium">{gap.issue}</p>
                      <p className="text-amber-600 dark:text-amber-400 mt-0.5">
                        {gap.suggestion}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
