import { useEffect, type ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { cn } from '../../utils/helpers';

interface SlideOverPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export function SlideOverPanel({
  isOpen,
  onClose,
  title,
  children,
  className,
  size = 'md',
}: SlideOverPanelProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* Backdrop - dims but doesn't blur */}
      <div
        className="absolute inset-0 bg-black/40 transition-opacity duration-normal"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          'relative bg-surface shadow-panel h-full flex flex-col',
          'animate-slide-in-right',
          {
            'w-full max-w-sm': size === 'sm',
            'w-full max-w-md': size === 'md',
            'w-full max-w-lg': size === 'lg',
            'w-[60%] max-w-4xl': size === 'xl',
            'w-full': size === 'full',
          },
          className
        )}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center gap-4 px-6 py-4 border-b border-border bg-surface sticky top-0 z-10">
            {/* Back button - left side, matches slide-in direction */}
            <button
              onClick={onClose}
              className="p-2 -ml-2 rounded-lg text-foreground-muted hover:bg-surface-raised hover:text-foreground transition-colors duration-fast group"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" />
              <span className="sr-only">Back</span>
            </button>
            <h2 className="font-display text-heading-lg text-foreground">{title}</h2>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
