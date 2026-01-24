import { useState, useMemo } from 'react';
import { Plus, Search, Star, Filter } from 'lucide-react';
import { Button, Input } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { StoryCard } from './StoryCard';
import { MyPitchSection } from './MyPitchSection';
import { STORY_THEMES, type StoryTheme } from '../../types';

interface StoriesSectionProps {
  onAddStory: () => void;
  onEditStory: (storyId: string) => void;
}

export function StoriesSection({ onAddStory, onEditStory }: StoriesSectionProps): JSX.Element {
  const { settings } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTheme, setFilterTheme] = useState<StoryTheme | null>(null);
  const [filterStrength, setFilterStrength] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Memoize stories to avoid recreating on each render
  const stories = useMemo(() => settings.savedStories || [], [settings.savedStories]);

  // Get unique themes from stories
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
        !filterTheme || (story.themes && story.themes.includes(filterTheme));

      // Strength filter
      const matchesStrength =
        filterStrength === null ||
        (filterStrength === 0
          ? !story.strengthRank // Unrated
          : story.strengthRank === filterStrength);

      return matchesSearch && matchesTheme && matchesStrength;
    });
  }, [stories, searchQuery, filterTheme, filterStrength]);

  // Sort: by strength (5 first), then by date
  const sortedStories = useMemo(() => {
    return [...filteredStories].sort((a, b) => {
      // Strength first (5 star = best, unrated = last)
      const strengthA = a.strengthRank || 0;
      const strengthB = b.strengthRank || 0;
      if (strengthB !== strengthA) return strengthB - strengthA;

      // Then by date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [filteredStories]);

  const hasFilters = filterTheme || filterStrength !== null;

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setSearchQuery(e.target.value);
  }

  function clearFilters(): void {
    setFilterTheme(null);
    setFilterStrength(null);
  }

  if (stories.length === 0) {
    return (
      <div className="space-y-8">
        {/* My Pitch Section - always visible */}
        <MyPitchSection />

        {/* Empty state for stories */}
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-surface-raised rounded-full flex items-center justify-center mb-4">
            <Plus className="w-8 h-8 text-foreground-subtle" />
          </div>
          <h3 className="font-display text-heading-lg text-foreground mb-2">
            Your story bank is empty
          </h3>
          <p className="text-foreground-muted max-w-md mb-6">
            Add experiences the AI can reference when writing cover letters and preparing for interviews.
          </p>
          <Button onClick={onAddStory}>
            <Plus className="w-4 h-4 mr-1" />
            Add Story
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* My Pitch Section */}
      <MyPitchSection />

      {/* Stories Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-heading-lg text-foreground">Stories</h3>
          <p className="text-sm text-foreground-muted">
            {stories.length} {stories.length === 1 ? 'story' : 'stories'} in your bank
          </p>
        </div>
        <Button onClick={onAddStory}>
          <Plus className="w-4 h-4 mr-1" />
          Add Story
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-subtle" />
            <Input
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search stories..."
              className="pl-9"
            />
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg transition-colors ${
              showFilters || hasFilters
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'border-border text-foreground-muted hover:border-primary/30 hover:text-foreground'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasFilters && (
              <span className="w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center">
                {(filterTheme ? 1 : 0) + (filterStrength !== null ? 1 : 0)}
              </span>
            )}
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="p-4 bg-surface-raised rounded-lg border border-border space-y-4">
            {/* Theme filter */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Filter by theme
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterTheme(null)}
                  className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                    !filterTheme
                      ? 'bg-primary/10 border-primary/30 text-primary'
                      : 'border-border text-foreground-muted hover:border-primary/30'
                  }`}
                >
                  All
                </button>
                {allThemes.map((theme) => {
                  const themeInfo = STORY_THEMES.find((t) => t.id === theme);
                  return (
                    <button
                      key={theme}
                      onClick={() => setFilterTheme(theme === filterTheme ? null : theme)}
                      className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                        filterTheme === theme
                          ? 'bg-primary/10 border-primary/30 text-primary'
                          : 'border-border text-foreground-muted hover:border-primary/30'
                      }`}
                    >
                      {themeInfo?.label || theme}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Strength filter */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Filter by strength
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterStrength(null)}
                  className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                    filterStrength === null
                      ? 'bg-primary/10 border-primary/30 text-primary'
                      : 'border-border text-foreground-muted hover:border-primary/30'
                  }`}
                >
                  All
                </button>
                {[5, 4, 3, 2, 1].map((strength) => (
                  <button
                    key={strength}
                    onClick={() =>
                      setFilterStrength(strength === filterStrength ? null : strength)
                    }
                    className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-full border transition-colors ${
                      filterStrength === strength
                        ? 'bg-primary/10 border-primary/30 text-primary'
                        : 'border-border text-foreground-muted hover:border-primary/30'
                    }`}
                  >
                    {strength}
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  </button>
                ))}
                <button
                  onClick={() => setFilterStrength(filterStrength === 0 ? null : 0)}
                  className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                    filterStrength === 0
                      ? 'bg-primary/10 border-primary/30 text-primary'
                      : 'border-border text-foreground-muted hover:border-primary/30'
                  }`}
                >
                  Unrated
                </button>
              </div>
            </div>

            {/* Clear filters */}
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-foreground-muted hover:text-foreground"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Story Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedStories.map((story) => (
          <StoryCard
            key={story.id}
            story={story}
            onClick={() => onEditStory(story.id)}
          />
        ))}
      </div>

      {filteredStories.length === 0 && stories.length > 0 && (
          <div className="text-center py-8 text-foreground-muted">
            No stories match your {searchQuery ? 'search' : 'filters'}
          </div>
        )}
      </div>
    </div>
  );
}
