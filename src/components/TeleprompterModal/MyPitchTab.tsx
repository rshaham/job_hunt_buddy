import { useState, useMemo } from 'react';
import { Lightbulb, FileText, List, ChevronDown } from 'lucide-react';
import { cn } from '../../utils/helpers';
import { useAppStore } from '../../stores/appStore';
import type { TellMeAboutYourselfPitch } from '../../types';

type ViewMode = 'script' | 'outline';

export function MyPitchTab() {
  const { settings } = useAppStore();
  const pitches = useMemo(() => settings.savedPitches || [], [settings.savedPitches]);

  // Find the active pitch, or default to the first one
  const activePitch = useMemo(
    () => pitches.find((p) => p.isActive) || pitches[0],
    [pitches]
  );

  const [selectedPitchId, setSelectedPitchId] = useState<string | null>(
    activePitch?.id || null
  );
  const [viewMode, setViewMode] = useState<ViewMode>('script');
  const [isPitchSelectorOpen, setIsPitchSelectorOpen] = useState(false);

  // Get the currently selected pitch
  const selectedPitch: TellMeAboutYourselfPitch | undefined = useMemo(
    () => pitches.find((p) => p.id === selectedPitchId) || activePitch,
    [pitches, selectedPitchId, activePitch]
  );

  if (pitches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-surface-raised rounded-full flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-foreground-subtle" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">
          No pitches saved
        </h3>
        <p className="text-foreground-muted max-w-md">
          Create your "Tell Me About Yourself" pitches in the Profile Hub to access them here during interviews.
        </p>
      </div>
    );
  }

  if (!selectedPitch) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Pitch selector (shown if multiple pitches exist) */}
      {pitches.length > 1 && (
        <div className="flex justify-center">
          <div className="relative">
            <button
              onClick={() => setIsPitchSelectorOpen(!isPitchSelectorOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-surface-raised border border-border rounded-lg hover:border-primary/30 transition-colors"
            >
              <span className="text-sm text-foreground">
                {selectedPitch.name}
                {selectedPitch.isActive && (
                  <span className="ml-2 px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded">
                    Active
                  </span>
                )}
              </span>
              <ChevronDown
                className={cn(
                  'w-4 h-4 text-foreground-muted transition-transform',
                  isPitchSelectorOpen && 'rotate-180'
                )}
              />
            </button>

            {isPitchSelectorOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsPitchSelectorOpen(false)}
                />
                <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-surface border border-border rounded-lg shadow-lg py-1 min-w-[200px]">
                  {pitches.map((pitch) => (
                    <button
                      key={pitch.id}
                      onClick={() => {
                        setSelectedPitchId(pitch.id);
                        setIsPitchSelectorOpen(false);
                      }}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-surface-raised transition-colors',
                        pitch.id === selectedPitch.id
                          ? 'text-primary bg-primary/5'
                          : 'text-foreground'
                      )}
                    >
                      <span className="truncate">{pitch.name}</span>
                      {pitch.isActive && (
                        <span className="ml-2 px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded flex-shrink-0">
                          Active
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

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
            {selectedPitch.script}
          </p>
          {selectedPitch.estimatedDuration && (
            <p className="text-right text-sm text-foreground-muted mt-4">
              ~{selectedPitch.estimatedDuration}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {selectedPitch.outline.map((block, i) => (
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
