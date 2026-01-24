import { AlertTriangle } from 'lucide-react';
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
      badge: 'bg-emerald-500',
    },
  },
  {
    key: 'task' as const,
    letter: 'T',
    label: 'Task',
    placeholder: 'What was YOUR specific responsibility or goal? What were you asked to do?',
    color: {
      border: 'border-l-blue-400',
      badge: 'bg-blue-500',
    },
  },
  {
    key: 'action' as const,
    letter: 'A',
    label: 'Action',
    placeholder: 'What specific steps did YOU take? Be concrete and use "I" not "we". What was your unique contribution?',
    color: {
      border: 'border-l-amber-400',
      badge: 'bg-amber-500',
    },
  },
  {
    key: 'result' as const,
    letter: 'R',
    label: 'Result',
    placeholder: 'What was the outcome? Include quantified metrics if possible (%, $, time saved, etc.)',
    color: {
      border: 'border-l-purple-400',
      badge: 'bg-purple-500',
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

  // Find gap for a specific component
  const getGapForComponent = (component: string): StarGap | undefined => {
    return gaps.find((g) => g.component.toLowerCase() === component.toLowerCase());
  };

  return (
    <div className={cn('space-y-4', className)}>
      {STAR_SECTIONS.map((section) => {
        const gap = getGapForComponent(section.key);
        return (
          <div
            key={section.key}
            className={cn(
              'relative pl-4 border-l-4 rounded-lg bg-surface-raised',
              section.color.border
            )}
          >
            {/* Letter badge */}
            <div
              className={cn(
                'absolute -left-3 top-3 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white',
                section.color.badge
              )}
            >
              {section.letter}
            </div>

            <div className="p-4 pl-6">
              <label className="block text-sm font-medium text-foreground mb-2">
                {section.label}
              </label>
              <Textarea
                value={values[section.key]}
                onChange={(e) => handlers[section.key](e.target.value)}
                placeholder={section.placeholder}
                rows={3}
                className="resize-none"
              />

              {/* Gap warning */}
              {gap && (
                <div className="flex items-start gap-2 mt-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-md">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-700 dark:text-amber-300">
                    <p className="font-medium">{gap.issue}</p>
                    <p className="text-amber-600 dark:text-amber-400">{gap.suggestion}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
