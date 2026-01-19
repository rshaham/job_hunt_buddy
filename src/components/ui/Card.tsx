import type { ReactNode } from 'react';
import { cn } from '../../utils/helpers';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className, onClick }: CardProps) {
  return (
    <div
      className={cn(
        'bg-surface rounded-lg border border-border shadow-sm',
        onClick && 'cursor-pointer hover:shadow-md hover:border-primary/50 transition-all',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('px-4 py-3 border-b border-border', className)}>
      {children}
    </div>
  );
}

export function CardContent({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('px-4 py-3', className)}>{children}</div>;
}

export function CardFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('px-4 py-3 border-t border-border', className)}>
      {children}
    </div>
  );
}
