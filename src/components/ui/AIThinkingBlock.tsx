import { Sparkles } from 'lucide-react';
import { cn } from '../../utils/helpers';

interface AIThinkingBlockProps {
  /** Whether the thinking block should be visible */
  isLoading: boolean;
  /** Label describing what the AI is doing */
  label?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Card-style placeholder for content areas during AI operations.
 * Uses a bouncing dots animation similar to ThinkingBubble.
 *
 * Use this when:
 * - Waiting for AI to generate content that will replace this block
 * - Need a larger, more prominent loading indicator
 * - Content area loading (not inline button loading)
 *
 * @example
 * ```tsx
 * {isGenerating ? (
 *   <AIThinkingBlock isLoading={isGenerating} label="Generating cover letter..." />
 * ) : (
 *   <div>{coverLetter}</div>
 * )}
 * ```
 */
export function AIThinkingBlock({
  isLoading,
  label = 'AI is thinking...',
  className,
}: AIThinkingBlockProps): JSX.Element | null {
  if (!isLoading) return null;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 bg-surface-raised rounded-lg border border-border',
        className
      )}
    >
      <div className="flex items-center gap-3 mb-3">
        <Sparkles className="w-5 h-5 text-primary animate-pulse" />
        <div className="flex gap-1.5">
          <span
            className="w-2 h-2 bg-primary rounded-full animate-bounce"
            style={{ animationDelay: '0ms', animationDuration: '1s' }}
          />
          <span
            className="w-2 h-2 bg-primary rounded-full animate-bounce"
            style={{ animationDelay: '150ms', animationDuration: '1s' }}
          />
          <span
            className="w-2 h-2 bg-primary rounded-full animate-bounce"
            style={{ animationDelay: '300ms', animationDuration: '1s' }}
          />
        </div>
      </div>
      <p className="text-sm text-foreground-muted">{label}</p>
    </div>
  );
}
