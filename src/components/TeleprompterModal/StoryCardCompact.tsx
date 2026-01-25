import { ChevronDown, Star } from 'lucide-react';
import { Badge } from '../ui';
import { cn } from '../../utils/helpers';
import type { SavedStory } from '../../types';
import { STORY_THEMES } from '../../types';

interface StoryCardCompactProps {
  story: SavedStory;
  isExpanded: boolean;
  onToggle: () => void;
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

export function StoryCardCompact({ story, isExpanded, onToggle }: StoryCardCompactProps) {
  const contextParts = [story.company, story.timeframe].filter(Boolean);
  const contextLine = contextParts.length > 0 ? contextParts.join(' · ') : null;

  return (
    <button
      onClick={onToggle}
      className={cn(
        'w-full text-left p-4 bg-surface rounded-lg border transition-all',
        isExpanded
          ? 'border-primary/30 shadow-sm'
          : 'border-border hover:border-primary/30 hover:shadow-sm'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Header: strength + title */}
          <div className="flex items-center gap-2 mb-1">
            {/* Strength stars */}
            {story.strengthRank && (
              <div className="flex items-center gap-0.5 flex-shrink-0">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={cn(
                      'w-3 h-3',
                      n <= story.strengthRank!
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-gray-300 dark:text-gray-600'
                    )}
                  />
                ))}
              </div>
            )}
            {/* Title/Context */}
            {contextLine && (
              <span className="text-sm font-medium text-foreground truncate">
                {contextLine}
              </span>
            )}
          </div>

          {/* Question/Summary */}
          <p className="text-foreground line-clamp-2 leading-snug">
            "{story.question}"
          </p>

          {/* Themes */}
          {story.themes && story.themes.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {story.themes.slice(0, 2).map((theme) => {
                const themeInfo = STORY_THEMES.find((t) => t.id === theme);
                return (
                  <Badge
                    key={theme}
                    className={cn('text-xs border-0 px-2 py-0.5', getThemeColorClass(theme))}
                  >
                    {themeInfo?.label || theme}
                  </Badge>
                );
              })}
              {story.themes.length > 2 && (
                <Badge className="text-xs bg-surface-raised text-foreground-muted border-0 px-2 py-0.5">
                  +{story.themes.length - 2}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Expand indicator */}
        <ChevronDown
          className={cn(
            'w-5 h-5 text-foreground-muted transition-transform flex-shrink-0',
            isExpanded && 'rotate-180'
          )}
        />
      </div>
    </button>
  );
}
