import { useMemo, useState } from 'react';
import { Target, RefreshCw, Plus, X } from 'lucide-react';
import { AILoadingIndicator, Badge, Button, Input } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { extractUserSkills } from '../../services/ai';
import { showToast } from '../../stores/toastStore';
import { cn } from '../../utils/helpers';
import { useAIOperation } from '../../hooks/useAIOperation';
import type { SkillEntry, UserSkillProfile } from '../../types';

const categoryColors: Record<string, string> = {
  technical: 'bg-primary-subtle text-primary',
  soft: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  domain: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
};

const categoryLabels: Record<string, string> = {
  technical: 'Technical Skills',
  soft: 'Soft Skills',
  domain: 'Domain Knowledge',
};

export function SkillsSection(): JSX.Element {
  const { settings, careerCoachState, updateSkillProfile, addSkill, removeSkill } = useAppStore();
  const skillProfile = careerCoachState?.skillProfile;
  const savedStories = settings.savedStories;

  const analyzeOp = useAIOperation<UserSkillProfile>('skill-analysis');
  const [newSkill, setNewSkill] = useState('');
  const [newCategory, setNewCategory] = useState<SkillEntry['category']>('technical');

  async function handleAnalyzeSkills(): Promise<void> {
    const existingSkills = skillProfile?.skills || [];
    const result = await analyzeOp.execute(async () => {
      return await extractUserSkills(existingSkills);
    });
    if (result) {
      updateSkillProfile(result);
      showToast(`Found ${result.skills.length} skills`, 'success');
    } else if (analyzeOp.error) {
      showToast('Failed to analyze skills', 'error');
    }
  }

  function handleAddSkill(): void {
    if (!newSkill.trim()) return;
    addSkill(newSkill.trim(), newCategory);
    setNewSkill('');
    showToast('Skill added', 'success');
  }

  function handleRemoveSkill(skillName: string): void {
    removeSkill(skillName);
  }

  function handleKeyDown(e: React.KeyboardEvent): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSkill();
    }
  }

  // Aggregate skills from stories
  const storySkills = useMemo(() => {
    const skillMap = new Map<string, { count: number; stories: string[] }>();
    const stories = savedStories || [];
    stories.forEach((story) => {
      story.skills?.forEach((skill) => {
        const existing = skillMap.get(skill) || { count: 0, stories: [] };
        existing.count++;
        existing.stories.push(story.question);
        skillMap.set(skill, existing);
      });
    });
    return skillMap;
  }, [savedStories]);

  // Combine with extracted skill profile
  const allSkills = useMemo(() => {
    const combined = new Map<string, { sources: string[]; category?: string }>();

    // From skill profile (resume, etc.)
    skillProfile?.skills?.forEach((entry) => {
      combined.set(entry.skill, {
        sources: [entry.source],
        category: entry.category,
      });
    });

    // From stories
    storySkills.forEach((data, skill) => {
      const existing = combined.get(skill);
      if (existing) {
        existing.sources.push(`${data.count} stories`);
      } else {
        combined.set(skill, { sources: [`${data.count} stories`], category: 'soft' });
      }
    });

    return combined;
  }, [skillProfile, storySkills]);

  const groupedSkills = useMemo(() => {
    const groups: Record<string, Array<{ skill: string; sources: string[] }>> = {
      technical: [],
      soft: [],
      domain: [],
    };

    allSkills.forEach((data, skill) => {
      const category = data.category || 'soft';
      groups[category]?.push({ skill, sources: data.sources });
    });

    return groups;
  }, [allSkills]);

  if (allSkills.size === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-surface-raised rounded-full flex items-center justify-center mb-4">
          <Target className="w-8 h-8 text-foreground-subtle" />
        </div>
        <h3 className="font-display text-heading-lg text-foreground mb-2">
          No skills detected yet
        </h3>
        <p className="text-foreground-muted max-w-md mb-4">
          Analyze your resume and documents to extract skills, or add them manually.
        </p>
        <div className="flex flex-col gap-4 items-center">
          <Button onClick={handleAnalyzeSkills} disabled={analyzeOp.isLoading}>
            {analyzeOp.isLoading ? (
              <AILoadingIndicator isLoading label="Analyzing..." />
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Analyze Skills
              </>
            )}
          </Button>
          {analyzeOp.error && (
            <p className="text-sm text-danger">{analyzeOp.error}</p>
          )}
          <div className="flex gap-2 items-center">
            <Input
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add skill manually..."
              className="w-48"
            />
            <select
              value={newCategory}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewCategory(e.target.value as SkillEntry['category'])}
              className="w-32 px-3 py-2 bg-surface border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="technical">Technical</option>
              <option value="soft">Soft</option>
              <option value="domain">Domain</option>
            </select>
            <Button onClick={handleAddSkill} disabled={!newSkill.trim()} size="sm">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="font-display text-heading-lg text-foreground">Skills Profile</h3>
          <p className="text-sm text-foreground-muted">
            {allSkills.size} skills from resume and stories
          </p>
        </div>
        <Button onClick={handleAnalyzeSkills} disabled={analyzeOp.isLoading} variant="secondary" size="sm">
          {analyzeOp.isLoading ? (
            <AILoadingIndicator isLoading label="Analyzing..." />
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Re-analyze
            </>
          )}
        </Button>
      </div>

      {analyzeOp.error && (
        <p className="text-sm text-danger">{analyzeOp.error}</p>
      )}

      <div className="flex gap-2 items-center">
        <Input
          value={newSkill}
          onChange={(e) => setNewSkill(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add skill..."
          className="flex-1 max-w-xs"
        />
        <select
          value={newCategory}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewCategory(e.target.value as SkillEntry['category'])}
          className="w-32 px-3 py-2 bg-surface border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="technical">Technical</option>
          <option value="soft">Soft</option>
          <option value="domain">Domain</option>
        </select>
        <Button onClick={handleAddSkill} disabled={!newSkill.trim()} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Add
        </Button>
      </div>

      {(['technical', 'soft', 'domain'] as const).map((category) => {
        const skills = groupedSkills[category];
        if (skills.length === 0) return null;

        return (
          <div key={category}>
            <h4 className="font-display text-heading-sm text-foreground mb-3">
              {categoryLabels[category]}
            </h4>
            <div className="flex flex-wrap gap-2">
              {skills.map(({ skill, sources }) => (
                <span
                  key={skill}
                  title={`Sources: ${sources.join(', ')}`}
                  className="group relative"
                >
                  <Badge className={cn(categoryColors[category], 'text-sm pr-6')}>
                    {skill}
                    <button
                      onClick={() => handleRemoveSkill(skill)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove skill"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
