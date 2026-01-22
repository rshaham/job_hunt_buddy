import { useMemo } from 'react';
import { Target } from 'lucide-react';
import { Badge } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { cn } from '../../utils/helpers';

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
  const { settings, careerCoachState } = useAppStore();
  const skillProfile = careerCoachState?.skillProfile;
  const savedStories = settings.savedStories;

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
        <p className="text-foreground-muted max-w-md mb-6">
          Upload a resume or add stories to build your skill profile.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-heading-lg text-foreground">Skills Profile</h3>
          <p className="text-sm text-foreground-muted">
            {allSkills.size} skills from resume and stories
          </p>
        </div>
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
                <span key={skill} title={`Sources: ${sources.join(', ')}`}>
                  <Badge className={cn(categoryColors[category], 'text-sm')}>
                    {skill}
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
