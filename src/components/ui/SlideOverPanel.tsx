import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/helpers';

interface SlideOverPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
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
          },
          className
        )}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface sticky top-0 z-10">
            <h2 className="font-display text-heading-lg text-foreground">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-foreground-muted hover:bg-surface-raised hover:text-foreground transition-colors duration-fast"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
