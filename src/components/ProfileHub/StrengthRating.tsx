import { Star } from 'lucide-react';
import { cn } from '../../utils/helpers';
import { STRENGTH_LABELS } from '../../types';

interface StrengthRatingProps {
  value: 1 | 2 | 3 | 4 | 5 | undefined;
  onChange: (value: 1 | 2 | 3 | 4 | 5 | undefined) => void;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function StrengthRating({
  value,
  onChange,
  size = 'md',
  showLabel = true,
  className,
}: StrengthRatingProps): JSX.Element {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const handleClick = (rating: 1 | 2 | 3 | 4 | 5) => {
    // Toggle off if clicking same value
    if (value === rating) {
      onChange(undefined);
    } else {
      onChange(rating);
    }
  };

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center gap-1">
        {([1, 2, 3, 4, 5] as const).map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => handleClick(rating)}
            className={cn(
              'transition-colors cursor-pointer',
              value && rating <= value
                ? 'text-amber-400 hover:text-amber-300'
                : 'text-gray-300 dark:text-gray-600 hover:text-amber-300'
            )}
          >
            <Star
              className={cn(sizeClasses[size], value && rating <= value && 'fill-current')}
            />
          </button>
        ))}
      </div>
      {showLabel && value && (
        <p className="text-sm text-foreground-muted">{STRENGTH_LABELS[value]}</p>
      )}
    </div>
  );
}
