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
          'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:pointer-events-none',
          {
            // Variants
            'bg-primary text-white hover:bg-primary-hover': variant === 'primary',
            'bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600':
              variant === 'secondary',
            'hover:bg-slate-100 dark:hover:bg-slate-800': variant === 'ghost',
            'bg-danger text-white hover:bg-red-600': variant === 'danger',
            // Sizes
            'px-2.5 py-1.5 text-xs': size === 'sm',
            'px-3 py-2 text-sm': size === 'md',
            'px-4 py-2.5 text-base': size === 'lg',
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
