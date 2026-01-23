import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../../utils/helpers';

interface ContextSectionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  className?: string;
}

/**
 * Reusable collapsible section for the context panel.
 */
export function ContextSection({
  title,
  icon,
  children,
  defaultExpanded = true,
  className,
}: ContextSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={cn('border-b border-border last:border-b-0', className)}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-surface-raised transition-colors"
      >
        {icon && <span className="text-foreground-muted">{icon}</span>}
        <span className="flex-1 text-sm font-medium text-foreground text-left">
          {title}
        </span>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-foreground-muted transition-transform',
            isExpanded && 'rotate-180'
          )}
        />
      </button>
      {isExpanded && (
        <div className="px-3 pb-3">
          {children}
        </div>
      )}
    </div>
  );
}
