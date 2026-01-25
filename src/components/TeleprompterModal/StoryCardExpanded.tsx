import { ChevronUp, Star, Pin } from 'lucide-react';
import { Badge } from '../ui';
import { cn } from '../../utils/helpers';
import type { SavedStory } from '../../types';
import { STORY_THEMES } from '../../types';

interface StoryCardExpandedProps {
  story: SavedStory;
  onCollapse: () => void;
}

// Get theme color class
function getThemeColorClass(themeId: string): string {
  const theme = STORY_THEMES.find((t) => t.id === themeId);
  if (!theme) {
    return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  }

  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    rose: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    cyan: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    pink: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
    orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    teal: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  };

  return colorMap[theme.color] || colorMap.blue;
}

const STAR_CONFIG = [
  { key: 'situation' as const, letter: 'S', label: 'Situation', bgColor: 'bg-emerald-500' },
  { key: 'task' as const, letter: 'T', label: 'Task', bgColor: 'bg-blue-500' },
  { key: 'action' as const, letter: 'A', label: 'Action', bgColor: 'bg-amber-500' },
  { key: 'result' as const, letter: 'R', label: 'Result', bgColor: 'bg-purple-500' },
];

export function StoryCardExpanded({ story, onCollapse }: StoryCardExpandedProps) {
  const hasStarContent = story.situation || story.task || story.action || story.result;
  const contextParts = [story.company, story.timeframe].filter(Boolean);
  const contextLine = contextParts.length > 0 ? contextParts.join(' · ') : null;

  return (
    <div className="p-5 bg-surface rounded-lg border border-primary/30 shadow-md">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          {/* Strength + Context */}
          <div className="flex items-center gap-2 mb-1">
            {story.strengthRank && (
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={cn(
                      'w-4 h-4',
                      n <= story.strengthRank!
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-gray-300 dark:text-gray-600'
                    )}
                  />
                ))}
              </div>
            )}
            {contextLine && (
              <span className="text-lg font-medium text-foreground">
                {contextLine}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onCollapse}
          className="p-1 rounded hover:bg-surface-raised transition-colors"
        >
          <ChevronUp className="w-5 h-5 text-foreground-muted" />
        </button>
      </div>

      {/* STAR breakdown or regular answer */}
      {hasStarContent ? (
        <div className="space-y-3 mb-4">
          {STAR_CONFIG.map(({ key, letter, label, bgColor }) => {
            const content = story[key];
            if (!content) return null;
            return (
              <div
                key={key}
                className="p-4 rounded-lg bg-surface-raised text-sm leading-relaxed"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={cn(
                      'inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold text-white',
                      bgColor
                    )}
                  >
                    {letter}
                  </span>
                  <span className="font-medium text-foreground">{label}</span>
                </div>
                <p className="text-foreground pl-9">{content}</p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mb-4 p-4 rounded-lg bg-surface-raised">
          <p className="text-lg font-medium text-foreground mb-2">
            "{story.question}"
          </p>
          <p className="text-foreground leading-relaxed whitespace-pre-wrap">
            {story.answer}
          </p>
        </div>
      )}

      {/* Suggested questions / Perfect for */}
      {story.suggestedQuestions && story.suggestedQuestions.length > 0 && (
        <div className="pt-4 border-t border-border">
          <div className="flex items-center gap-2 mb-2">
            <Pin className="w-4 h-4 text-foreground-muted" />
            <span className="text-sm font-medium text-foreground-muted">
              Perfect for questions about:
            </span>
          </div>
          <ul className="space-y-1 pl-6">
            {story.suggestedQuestions.map((q, i) => (
              <li key={i} className="text-sm text-foreground list-disc">
                {q}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Themes */}
      {story.themes && story.themes.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-border">
          {story.themes.map((theme) => {
            const themeInfo = STORY_THEMES.find((t) => t.id === theme);
            return (
              <Badge
                key={theme}
                className={cn('text-xs border-0', getThemeColorClass(theme))}
              >
                {themeInfo?.label || theme}
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
