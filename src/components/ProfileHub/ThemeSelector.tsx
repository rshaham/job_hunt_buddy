import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { cn } from '../../utils/helpers';
import { STORY_THEMES, type StoryTheme } from '../../types';

interface ThemeSelectorProps {
  value: StoryTheme[];
  onChange: (themes: StoryTheme[]) => void;
  className?: string;
}

// Color mapping for theme pills
const THEME_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  leadership: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    border: 'border-emerald-300 dark:border-emerald-700',
    text: 'text-emerald-800 dark:text-emerald-300',
  },
  conflict: {
    bg: 'bg-rose-100 dark:bg-rose-900/30',
    border: 'border-rose-300 dark:border-rose-700',
    text: 'text-rose-800 dark:text-rose-300',
  },
  failure: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    border: 'border-amber-300 dark:border-amber-700',
    text: 'text-amber-800 dark:text-amber-300',
  },
  innovation: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    border: 'border-blue-300 dark:border-blue-700',
    text: 'text-blue-800 dark:text-blue-300',
  },
  teamwork: {
    bg: 'bg-cyan-100 dark:bg-cyan-900/30',
    border: 'border-cyan-300 dark:border-cyan-700',
    text: 'text-cyan-800 dark:text-cyan-300',
  },
  technical: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    border: 'border-purple-300 dark:border-purple-700',
    text: 'text-purple-800 dark:text-purple-300',
  },
  customer: {
    bg: 'bg-pink-100 dark:bg-pink-900/30',
    border: 'border-pink-300 dark:border-pink-700',
    text: 'text-pink-800 dark:text-pink-300',
  },
  deadline: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    border: 'border-orange-300 dark:border-orange-700',
    text: 'text-orange-800 dark:text-orange-300',
  },
  initiative: {
    bg: 'bg-teal-100 dark:bg-teal-900/30',
    border: 'border-teal-300 dark:border-teal-700',
    text: 'text-teal-800 dark:text-teal-300',
  },
};

// Default colors for custom themes
const DEFAULT_COLORS = {
  bg: 'bg-gray-100 dark:bg-gray-800',
  border: 'border-gray-300 dark:border-gray-600',
  text: 'text-gray-800 dark:text-gray-300',
};

function getThemeColors(theme: StoryTheme) {
  return THEME_COLORS[theme] || DEFAULT_COLORS;
}

export function ThemeSelector({ value, onChange, className }: ThemeSelectorProps): JSX.Element {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customTheme, setCustomTheme] = useState('');

  // Get custom themes (themes in value that aren't in STORY_THEMES)
  const predefinedThemeIds = STORY_THEMES.map((t) => t.id);
  const customThemes = value.filter((t) => !predefinedThemeIds.includes(t));

  const toggleTheme = (theme: StoryTheme) => {
    if (value.includes(theme)) {
      onChange(value.filter((t) => t !== theme));
    } else {
      onChange([...value, theme]);
    }
  };

  const addCustomTheme = () => {
    const trimmed = customTheme.trim().toLowerCase();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setCustomTheme('');
      setShowCustomInput(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustomTheme();
    } else if (e.key === 'Escape') {
      setShowCustomInput(false);
      setCustomTheme('');
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      {/* Predefined themes */}
      <div className="flex flex-wrap gap-2">
        {STORY_THEMES.map((theme) => {
          const isSelected = value.includes(theme.id);
          const colors = getThemeColors(theme.id);
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => toggleTheme(theme.id)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium border transition-all',
                isSelected
                  ? cn(colors.bg, colors.border, colors.text)
                  : 'bg-surface border-border text-foreground-muted hover:border-primary/50 hover:text-foreground'
              )}
            >
              {theme.label}
            </button>
          );
        })}
      </div>

      {/* Custom themes */}
      {customThemes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {customThemes.map((theme) => (
            <span
              key={theme}
              className={cn(
                'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium border',
                DEFAULT_COLORS.bg,
                DEFAULT_COLORS.border,
                DEFAULT_COLORS.text
              )}
            >
              {theme}
              <button
                type="button"
                onClick={() => toggleTheme(theme)}
                className="hover:text-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Add custom theme */}
      {showCustomInput ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={customTheme}
            onChange={(e) => setCustomTheme(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter custom theme..."
            autoFocus
            className="flex-1 px-3 py-1.5 text-sm border border-border rounded-full bg-surface text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
          />
          <button
            type="button"
            onClick={addCustomTheme}
            disabled={!customTheme.trim()}
            className="px-3 py-1.5 text-sm font-medium bg-primary text-white rounded-full hover:bg-primary/90 disabled:opacity-50"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => {
              setShowCustomInput(false);
              setCustomTheme('');
            }}
            className="px-3 py-1.5 text-sm text-foreground-muted hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowCustomInput(true)}
          className="inline-flex items-center gap-1 text-sm text-foreground-muted hover:text-foreground"
        >
          <Plus className="w-4 h-4" />
          Add custom theme
        </button>
      )}
    </div>
  );
}
