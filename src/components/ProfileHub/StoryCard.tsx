import { MessageSquare, Star } from 'lucide-react';
import { Badge } from '../ui';
import { cn } from '../../utils/helpers';
import type { SavedStory } from '../../types';
import { STORY_THEMES } from '../../types';

interface StoryCardProps {
  story: SavedStory;
  onClick: () => void;
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

export function StoryCard({ story, onClick }: StoryCardProps) {
  const contextParts = [story.company, story.role, story.timeframe].filter(Boolean);
  const contextLine = contextParts.join(' · ');

  // Check if story has STAR content
  const hasStarContent = story.situation || story.task || story.action || story.result;

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-surface rounded-card border border-border p-5',
        'hover:shadow-card-hover hover:border-primary/30 hover:-translate-y-0.5',
        'transition-all duration-fast ease-out cursor-pointer'
      )}
    >
      {/* Header row: Strength rating + STAR badge */}
      <div className="flex items-center justify-between mb-2">
        {/* Strength stars */}
        {story.strengthRank && (
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className={cn(
                  'w-3.5 h-3.5',
                  n <= story.strengthRank!
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-gray-300 dark:text-gray-600'
                )}
              />
            ))}
          </div>
        )}

        {/* STAR badge */}
        {hasStarContent && (
          <Badge className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-0">
            STAR
          </Badge>
        )}
      </div>

      {/* Question */}
      <p className="font-display text-heading text-foreground line-clamp-2 leading-snug mb-2">
        "{story.question}"
      </p>

      {/* Context line */}
      {contextLine && (
        <p className="text-sm text-foreground-muted mb-3">{contextLine}</p>
      )}

      {/* Themes */}
      {story.themes && story.themes.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {story.themes.slice(0, 3).map((theme) => {
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
          {story.themes.length > 3 && (
            <Badge className="text-xs bg-surface-raised text-foreground-muted border border-border">
              +{story.themes.length - 3}
            </Badge>
          )}
        </div>
      )}

      {/* Skills (fallback if no themes) */}
      {(!story.themes || story.themes.length === 0) && story.skills && story.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {story.skills.slice(0, 4).map((skill) => (
            <Badge
              key={skill}
              className="text-xs bg-primary/10 text-primary border border-primary/20"
            >
              {skill}
            </Badge>
          ))}
          {story.skills.length > 4 && (
            <Badge className="text-xs bg-surface-raised text-foreground-muted border border-border">
              +{story.skills.length - 4}
            </Badge>
          )}
        </div>
      )}

      {/* Outcome */}
      {story.outcome && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <p className="text-sm text-foreground-muted line-clamp-1">
            <span className="font-medium">Outcome:</span> {story.outcome}
          </p>
        </div>
      )}

      {/* Source indicator */}
      {story.source === 'chat' && story.sourceJobId && (
        <div className="flex items-center gap-1 mt-3 text-xs text-foreground-subtle">
          <MessageSquare className="w-3 h-3" />
          <span>Saved from prep chat</span>
        </div>
      )}
    </div>
  );
}
