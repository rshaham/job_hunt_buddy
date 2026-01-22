import { useState } from 'react';
import { FlaskConical, Brain, Search } from 'lucide-react';
import { Button } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { cn } from '../../utils/helpers';

type QuizMode = 'confidence' | 'gaps';

export function QuizSection(): JSX.Element {
  const { settings } = useAppStore();
  const stories = settings.savedStories || [];
  const [mode, setMode] = useState<QuizMode>('confidence');

  function handleModeChange(newMode: QuizMode): void {
    setMode(newMode);
  }

  if (stories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-surface-raised rounded-full flex items-center justify-center mb-4">
          <FlaskConical className="w-8 h-8 text-foreground-subtle" />
        </div>
        <h3 className="font-display text-heading-lg text-foreground mb-2">
          Add stories first
        </h3>
        <p className="text-foreground-muted max-w-md">
          You need at least a few stories in your bank before you can quiz the AI.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-heading-lg text-foreground mb-2">AI Quiz</h3>
        <p className="text-sm text-foreground-muted">
          Test how well the AI knows your stories and find gaps in your coverage.
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2 p-1 bg-surface-raised rounded-lg w-fit">
        <button
          onClick={() => handleModeChange('confidence')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
            mode === 'confidence'
              ? 'bg-surface text-foreground shadow-sm'
              : 'text-foreground-muted hover:text-foreground'
          )}
        >
          <Brain className="w-4 h-4" />
          Confidence Check
        </button>
        <button
          onClick={() => handleModeChange('gaps')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
            mode === 'gaps'
              ? 'bg-surface text-foreground shadow-sm'
              : 'text-foreground-muted hover:text-foreground'
          )}
        >
          <Search className="w-4 h-4" />
          Gap Finder
        </button>
      </div>

      {/* Content */}
      <div className="bg-surface-raised rounded-lg border border-border p-8 text-center">
        {mode === 'confidence' ? (
          <>
            <Brain className="w-12 h-12 text-foreground-subtle mx-auto mb-4" />
            <h4 className="font-display text-heading text-foreground mb-2">
              Confidence Check
            </h4>
            <p className="text-foreground-muted mb-4 max-w-md mx-auto">
              Test if the AI can accurately recall your stories. Select a story and see if
              the AI remembers the details.
            </p>
            <Button disabled>Coming Soon</Button>
          </>
        ) : (
          <>
            <Search className="w-12 h-12 text-foreground-subtle mx-auto mb-4" />
            <h4 className="font-display text-heading text-foreground mb-2">Gap Finder</h4>
            <p className="text-foreground-muted mb-4 max-w-md mx-auto">
              Find behavioral interview categories where you don't have stories yet.
            </p>
            <Button disabled>Coming Soon</Button>
          </>
        )}
      </div>
    </div>
  );
}
