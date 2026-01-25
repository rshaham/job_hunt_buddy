import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/helpers';

interface AILoadingIndicatorProps {
  /** Whether the loading indicator should be visible */
  isLoading: boolean;
  /** Optional label to display next to the spinner */
  label?: string;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Additional CSS classes */
  className?: string;
}

/**
 * Inline loading indicator for AI operations.
 * Use for buttons and compact spaces where you need a subtle loading state.
 *
 * @example
 * ```tsx
 * <AILoadingIndicator isLoading={isAnalyzing} label="Analyzing..." />
 * ```
 */
export function AILoadingIndicator({
  isLoading,
  label,
  size = 'md',
  className,
}: AILoadingIndicatorProps): JSX.Element | null {
  if (!isLoading) return null;

  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-foreground-muted', className)}>
      <Loader2 className={cn(iconSize, 'animate-spin')} />
      {label && <span className={textSize}>{label}</span>}
    </span>
  );
}
