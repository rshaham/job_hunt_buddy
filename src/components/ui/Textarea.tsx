import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../utils/helpers';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          className={cn(
            'w-full px-3 py-2 text-sm border rounded-md transition-colors resize-none',
            'border-border-muted',
            'bg-surface',
            'text-foreground',
            'placeholder:text-foreground-subtle',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
            error && 'border-danger focus:ring-danger',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
