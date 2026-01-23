import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Plus } from 'lucide-react';
import { cn } from '../../utils/helpers';
import { useAppStore } from '../../stores/appStore';
import { DEFAULT_INTERVIEW_TYPES, getInterviewTypeLabel } from '../../types';
import { Button } from './Button';

interface InterviewTypeSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function InterviewTypeSelect({ value, onChange, className, size = 'md' }: InterviewTypeSelectProps) {
  const { settings, addCustomInterviewType, removeCustomInterviewType } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newTypeLabel, setNewTypeLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const customTypes = settings.customInterviewTypes || [];
  const currentLabel = getInterviewTypeLabel(value, customTypes);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsAdding(false);
        setError(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddType = async () => {
    if (!newTypeLabel.trim()) return;
    setError(null);
    try {
      const newType = await addCustomInterviewType(newTypeLabel.trim());
      onChange(newType.key);
      setNewTypeLabel('');
      setIsAdding(false);
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add type');
    }
  };

  const handleRemoveType = async (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setError(null);
    try {
      await removeCustomInterviewType(key);
      // If removed type was selected, switch to 'other'
      if (value === key) {
        onChange('other');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove type');
    }
  };

  const handleSelectType = (key: string) => {
    onChange(key);
    setIsOpen(false);
    setError(null);
  };

  const sizeClasses = size === 'sm'
    ? 'px-2 py-1.5 text-sm'
    : 'px-3 py-2';

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      {/* Trigger button (looks like select) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full text-left border border-border rounded-md bg-surface',
          'text-foreground flex items-center justify-between',
          'focus:outline-none focus:ring-2 focus:ring-primary/50',
          sizeClasses
        )}
      >
        <span>{currentLabel}</span>
        <ChevronDown className={cn('w-4 h-4 text-muted transition-transform', isOpen && 'rotate-180')} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-surface border border-border rounded-md shadow-lg max-h-64 overflow-y-auto">
          {/* Default types */}
          <div className="py-1">
            <div className="px-2 py-1 text-xs text-muted font-medium">Interview Types</div>
            {DEFAULT_INTERVIEW_TYPES.map(type => (
              <button
                key={type.key}
                type="button"
                onClick={() => handleSelectType(type.key)}
                className={cn(
                  'w-full px-3 py-1.5 text-left text-sm',
                  'hover:bg-slate-100 dark:hover:bg-slate-700',
                  value === type.key && 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                )}
              >
                {type.label}
              </button>
            ))}
          </div>

          {/* Custom types (with X button) */}
          {customTypes.length > 0 && (
            <div className="border-t border-border py-1">
              <div className="px-2 py-1 text-xs text-muted font-medium">Custom Types</div>
              {customTypes.map(type => (
                <div
                  key={type.key}
                  className={cn(
                    'flex items-center justify-between px-3 py-1.5',
                    'hover:bg-slate-100 dark:hover:bg-slate-700 group',
                    value === type.key && 'bg-blue-50 dark:bg-blue-900/30'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectType(type.key)}
                    className={cn(
                      'flex-1 text-left text-sm',
                      value === type.key && 'text-blue-600 dark:text-blue-400'
                    )}
                  >
                    {type.label}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleRemoveType(type.key, e)}
                    className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-opacity"
                    title="Remove custom type"
                  >
                    <X className="w-3 h-3 text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="px-3 py-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20">
              {error}
            </div>
          )}

          {/* Add new type */}
          <div className="border-t border-border p-2">
            {isAdding ? (
              <div className="flex gap-1">
                <input
                  autoFocus
                  value={newTypeLabel}
                  onChange={(e) => setNewTypeLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddType();
                    if (e.key === 'Escape') {
                      setIsAdding(false);
                      setError(null);
                    }
                  }}
                  placeholder="Type name..."
                  className="flex-1 px-2 py-1 text-sm border border-border rounded bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <Button size="sm" onClick={handleAddType}>
                  Add
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsAdding(true)}
                className="w-full text-left text-sm text-blue-500 hover:text-blue-600 px-1 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add new type...
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
