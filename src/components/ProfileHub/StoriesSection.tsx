import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button, Input } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { StoryCard } from './StoryCard';

interface StoriesSectionProps {
  onAddStory: () => void;
  onEditStory: (storyId: string) => void;
}

export function StoriesSection({ onAddStory, onEditStory }: StoriesSectionProps): JSX.Element {
  const { settings } = useAppStore();
  const stories = settings.savedStories || [];
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSkill, setFilterSkill] = useState<string | null>(null);

  // Get unique skills for filter
  const allSkills = Array.from(
    new Set(stories.flatMap((s) => s.skills || []))
  ).sort();

  // Filter stories
  const filteredStories = stories.filter((story) => {
    const matchesSearch =
      !searchQuery ||
      story.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      story.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      story.company?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSkill =
      !filterSkill || (story.skills && story.skills.includes(filterSkill));

    return matchesSearch && matchesSkill;
  });

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setSearchQuery(e.target.value);
  }

  function handleSkillFilterChange(e: React.ChangeEvent<HTMLSelectElement>): void {
    setFilterSkill(e.target.value || null);
  }

  if (stories.length === 0) {
    return (
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
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
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

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-subtle" />
          <Input
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search stories..."
            className="pl-9"
          />
        </div>

        {allSkills.length > 0 && (
          <select
            value={filterSkill || ''}
            onChange={handleSkillFilterChange}
            className="px-3 py-2 text-sm border border-border rounded-lg bg-surface text-foreground"
          >
            <option value="">All skills</option>
            {allSkills.map((skill) => (
              <option key={skill} value={skill}>
                {skill}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Story Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredStories.map((story) => (
          <StoryCard
            key={story.id}
            story={story}
            onClick={() => onEditStory(story.id)}
          />
        ))}
      </div>

      {filteredStories.length === 0 && stories.length > 0 && (
        <div className="text-center py-8 text-foreground-muted">
          No stories match your search
        </div>
      )}
    </div>
  );
}
