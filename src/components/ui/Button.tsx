import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../../utils/helpers';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          // Base styles
          'inline-flex items-center justify-center font-medium font-body rounded-lg',
          'transition-all duration-fast ease-out',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary',
          'disabled:opacity-50 disabled:pointer-events-none',
          // Hover/active micro-interactions
          'hover:scale-[1.02] active:scale-[0.98]',
          {
            // Variants
            'bg-primary text-white hover:bg-primary-hover': variant === 'primary',
            'bg-transparent text-primary border border-primary hover:bg-primary-subtle':
              variant === 'secondary',
            'bg-transparent text-foreground-muted hover:bg-surface-raised hover:text-foreground':
              variant === 'ghost',
            'bg-danger text-white hover:bg-red-600': variant === 'danger',
            // Sizes (updated padding)
            'px-3 py-1.5 text-xs': size === 'sm',
            'px-4 py-2.5 text-sm': size === 'md',
            'px-5 py-3 text-base': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
