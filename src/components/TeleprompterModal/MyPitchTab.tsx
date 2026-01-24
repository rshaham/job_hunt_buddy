import { useState } from 'react';
import { Lightbulb, FileText, List } from 'lucide-react';
import { cn } from '../../utils/helpers';
import { useAppStore } from '../../stores/appStore';

type ViewMode = 'script' | 'outline';

export function MyPitchTab() {
  const { settings } = useAppStore();
  const pitch = settings.savedPitch;
  const [viewMode, setViewMode] = useState<ViewMode>('script');

  if (!pitch) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-surface-raised rounded-full flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-foreground-subtle" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">
          No pitch saved
        </h3>
        <p className="text-foreground-muted max-w-md">
          Create your "Tell Me About Yourself" pitch in the Profile Hub to access it here during interviews.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* View mode toggle */}
      <div className="flex items-center justify-center">
        <div className="inline-flex rounded-lg bg-surface-raised p-1">
          <button
            onClick={() => setViewMode('script')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all',
              viewMode === 'script'
                ? 'bg-surface text-foreground shadow-sm'
                : 'text-foreground-muted hover:text-foreground'
            )}
          >
            <FileText className="w-4 h-4" />
            Script
          </button>
          <button
            onClick={() => setViewMode('outline')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all',
              viewMode === 'outline'
                ? 'bg-surface text-foreground shadow-sm'
                : 'text-foreground-muted hover:text-foreground'
            )}
          >
            <List className="w-4 h-4" />
            Outline
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'script' ? (
        <div className="p-6 bg-surface-raised rounded-lg border border-border">
          <p className="text-lg leading-relaxed text-foreground whitespace-pre-wrap">
            {pitch.script}
          </p>
          {pitch.estimatedDuration && (
            <p className="text-right text-sm text-foreground-muted mt-4">
              ~{pitch.estimatedDuration}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {pitch.outline.map((block, i) => (
            <div
              key={i}
              className="p-4 bg-surface rounded-lg border border-border"
            >
              <h4 className="text-sm font-medium text-foreground-muted uppercase tracking-wide mb-2">
                {block.header}
              </h4>
              <ul className="space-y-1">
                {block.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2 text-foreground">
                    <span className="text-primary mt-1">•</span>
                    {item}
                  </li>
                ))}
              </ul>
              {block.transition && (
                <p className="mt-2 pl-4 text-sm text-foreground-muted italic border-l-2 border-primary/30">
                  → {block.transition}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Contextual tip */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-lg">
        <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800 dark:text-amber-300">
          <p className="font-medium">Tip: Customize for this company</p>
          <p className="text-amber-700 dark:text-amber-400">
            Replace [Company] with the actual company name and mention why you're excited about their specific mission or product.
          </p>
        </div>
      </div>
    </div>
  );
}
