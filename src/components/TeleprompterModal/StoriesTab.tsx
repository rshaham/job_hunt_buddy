import { useState, useMemo } from 'react';
import { Search, ChevronDown, BookOpen } from 'lucide-react';
import { Input } from '../ui';
import { cn } from '../../utils/helpers';
import { useAppStore } from '../../stores/appStore';
import { StoryCardCompact } from './StoryCardCompact';
import { StoryCardExpanded } from './StoryCardExpanded';
import { STORY_THEMES, type SavedStory, type StoryTheme } from '../../types';

// Get theme color for section header border
function getThemeBorderColor(themeId: string): string {
  const theme = STORY_THEMES.find((t) => t.id === themeId);
  if (!theme) return 'border-l-gray-400';

  const colorMap: Record<string, string> = {
    emerald: 'border-l-emerald-400',
    rose: 'border-l-rose-400',
    amber: 'border-l-amber-400',
    blue: 'border-l-blue-400',
    cyan: 'border-l-cyan-400',
    purple: 'border-l-purple-400',
    pink: 'border-l-pink-400',
    orange: 'border-l-orange-400',
    teal: 'border-l-teal-400',
  };

  return colorMap[theme.color] || 'border-l-gray-400';
}

export function StoriesTab() {
  const { settings } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTheme, setFilterTheme] = useState<StoryTheme | 'all'>('all');
  const [filterStrength, setFilterStrength] = useState<number | 'all'>('all');
  const [expandedThemes, setExpandedThemes] = useState<Set<string>>(new Set(['leadership', 'technical']));
  const [expandedStoryId, setExpandedStoryId] = useState<string | null>(null);

  // Memoize stories to avoid recreating on each render
  const stories = useMemo(() => settings.savedStories || [], [settings.savedStories]);

  // Get all unique themes
  const allThemes = useMemo(() => {
    const themeSet = new Set<StoryTheme>();
    stories.forEach((s) => {
      s.themes?.forEach((t) => themeSet.add(t));
    });
    return Array.from(themeSet);
  }, [stories]);

  // Filter stories
  const filteredStories = useMemo(() => {
    return stories.filter((story) => {
      // Text search
      const matchesSearch =
        !searchQuery ||
        story.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        story.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        story.company?.toLowerCase().includes(searchQuery.toLowerCase());

      // Theme filter
      const matchesTheme =
        filterTheme === 'all' || (story.themes && story.themes.includes(filterTheme));

      // Strength filter
      const matchesStrength =
        filterStrength === 'all' || story.strengthRank === filterStrength;

      return matchesSearch && matchesTheme && matchesStrength;
    });
  }, [stories, searchQuery, filterTheme, filterStrength]);

  // Group stories by theme
  const storiesByTheme = useMemo(() => {
    const grouped: Record<string, SavedStory[]> = {};

    filteredStories.forEach((story) => {
      if (story.themes && story.themes.length > 0) {
        // Add to each theme the story belongs to
        story.themes.forEach((theme) => {
          if (!grouped[theme]) grouped[theme] = [];
          // Avoid duplicates within same theme
          if (!grouped[theme].find((s) => s.id === story.id)) {
            grouped[theme].push(story);
          }
        });
      } else {
        // Stories without themes go to "General"
        if (!grouped['general']) grouped['general'] = [];
        grouped['general'].push(story);
      }
    });

    // Sort stories within each theme by strength (5 first, unrated last)
    Object.keys(grouped).forEach((theme) => {
      grouped[theme].sort((a, b) => {
        const strengthA = a.strengthRank || 0;
        const strengthB = b.strengthRank || 0;
        return strengthB - strengthA;
      });
    });

    return grouped;
  }, [filteredStories]);

  // Get ordered theme list (by number of stories, with General last)
  const orderedThemes = useMemo(() => {
    const themes = Object.keys(storiesByTheme)
      .filter((t) => t !== 'general')
      .sort((a, b) => storiesByTheme[b].length - storiesByTheme[a].length);

    if (storiesByTheme['general']) {
      themes.push('general');
    }

    return themes;
  }, [storiesByTheme]);

  const toggleThemeExpanded = (theme: string) => {
    setExpandedThemes((prev) => {
      const next = new Set(prev);
      if (next.has(theme)) {
        next.delete(theme);
      } else {
        next.add(theme);
      }
      return next;
    });
  };

  const toggleStoryExpanded = (storyId: string) => {
    setExpandedStoryId((prev) => (prev === storyId ? null : storyId));
  };

  if (stories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-surface-raised rounded-full flex items-center justify-center mb-4">
          <BookOpen className="w-8 h-8 text-foreground-subtle" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">
          No stories yet
        </h3>
        <p className="text-foreground-muted max-w-md">
          Add stories in your Profile Hub to reference them during interviews.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-surface-raised rounded-lg">
        {/* Theme filter */}
        <select
          value={filterTheme}
          onChange={(e) => setFilterTheme(e.target.value as StoryTheme | 'all')}
          className="px-3 py-2 text-sm border border-border rounded-lg bg-surface text-foreground"
        >
          <option value="all">All themes</option>
          {allThemes.map((theme) => {
            const themeInfo = STORY_THEMES.find((t) => t.id === theme);
            return (
              <option key={theme} value={theme}>
                {themeInfo?.label || theme}
              </option>
            );
          })}
        </select>

        {/* Strength filter */}
        <select
          value={filterStrength}
          onChange={(e) =>
            setFilterStrength(
              e.target.value === 'all' ? 'all' : Number(e.target.value)
            )
          }
          className="px-3 py-2 text-sm border border-border rounded-lg bg-surface text-foreground"
        >
          <option value="all">All strengths</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} star{n !== 1 ? 's' : ''}
            </option>
          ))}
        </select>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-subtle" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search stories..."
            className="pl-9 text-sm"
          />
        </div>
      </div>

      {/* Stories grouped by theme */}
      <div className="space-y-3">
        {orderedThemes.map((theme) => {
          const themeStories = storiesByTheme[theme];
          const themeInfo = STORY_THEMES.find((t) => t.id === theme);
          const isExpanded = expandedThemes.has(theme);
          const themeBorder = getThemeBorderColor(theme);

          return (
            <div
              key={theme}
              className={cn('border border-border rounded-lg overflow-hidden', 'border-l-4', themeBorder)}
            >
              {/* Theme header */}
              <button
                onClick={() => toggleThemeExpanded(theme)}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-3 bg-surface-raised hover:bg-surface transition-colors',
                  isExpanded && 'border-b border-border'
                )}
              >
                <span className="text-lg font-semibold text-foreground">
                  {theme === 'general' ? 'General' : themeInfo?.label || theme}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-foreground-muted">
                    {themeStories.length} {themeStories.length === 1 ? 'story' : 'stories'}
                  </span>
                  <ChevronDown
                    className={cn(
                      'w-5 h-5 text-foreground-muted transition-transform',
                      !isExpanded && 'rotate-180'
                    )}
                  />
                </div>
              </button>

              {/* Stories */}
              {isExpanded && (
                <div className="p-3 space-y-2 bg-surface">
                  {themeStories.map((story) =>
                    expandedStoryId === story.id ? (
                      <StoryCardExpanded
                        key={story.id}
                        story={story}
                        onCollapse={() => setExpandedStoryId(null)}
                      />
                    ) : (
                      <StoryCardCompact
                        key={story.id}
                        story={story}
                        isExpanded={false}
                        onToggle={() => toggleStoryExpanded(story.id)}
                      />
                    )
                  )}
                </div>
              )}
            </div>
          );
        })}

        {orderedThemes.length === 0 && (
          <div className="text-center py-8 text-foreground-muted">
            No stories match your filters
          </div>
        )}
      </div>
    </div>
  );
}
