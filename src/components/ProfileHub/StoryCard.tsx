import { MessageSquare } from 'lucide-react';
import { Badge } from '../ui';
import { cn } from '../../utils/helpers';
import type { SavedStory } from '../../types';

interface StoryCardProps {
  story: SavedStory;
  onClick: () => void;
}

export function StoryCard({ story, onClick }: StoryCardProps) {
  const contextParts = [story.company, story.role, story.timeframe].filter(Boolean);
  const contextLine = contextParts.join(' · ');

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-surface rounded-card border border-border p-5',
        'hover:shadow-card-hover hover:border-primary/30 hover:-translate-y-0.5',
        'transition-all duration-fast ease-out cursor-pointer'
      )}
    >
      {/* Question */}
      <p className="font-display text-heading text-foreground line-clamp-2 leading-snug mb-2">
        "{story.question}"
      </p>

      {/* Context line */}
      {contextLine && (
        <p className="text-sm text-foreground-muted mb-3">{contextLine}</p>
      )}

      {/* Skills */}
      {story.skills && story.skills.length > 0 && (
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
