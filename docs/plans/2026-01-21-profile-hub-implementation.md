# Profile Hub Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a dedicated Profile Hub screen for managing stories, resume, documents, and AI context with enriched story structure and AI quiz features.

**Architecture:** Full-screen SlideOverPanel accessed from left sidebar, with internal sidebar navigation for 6 sections. Enriches existing `SavedStory` type with metadata fields. Data stays in `AppSettings` (backward compatible).

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Zustand, Dexie.js (IndexedDB), Claude API

---

## Phase 1: Foundation (Types & Store)

### Task 1.1: Extend SavedStory Type

**Files:**
- Modify: `src/types/index.ts:341-347`

**Step 1: Update the SavedStory interface with new optional fields**

Find the existing `SavedStory` interface and extend it:

```typescript
export interface SavedStory {
  id: string;
  question: string;  // The topic/question this story answers
  answer: string;    // The user's experience/story
  category?: string; // Optional: "leadership", "technical", "conflict", etc.
  createdAt: Date;

  // NEW: Time & Place
  company?: string;
  role?: string;
  projectName?: string;
  timeframe?: string;

  // NEW: Impact
  outcome?: string;
  lessonsLearned?: string;

  // NEW: Classification
  skills?: string[];

  // NEW: Metadata
  source?: 'manual' | 'chat' | 'import';
  sourceJobId?: string;
  updatedAt?: Date;
}
```

**Step 2: Add skill category type for story skills**

Add after the SavedStory interface:

```typescript
export type StorySkillCategory = 'technical' | 'soft' | 'domain';

export const STORY_SKILL_CATEGORIES: Record<StorySkillCategory, { label: string; color: string }> = {
  technical: { label: 'Technical', color: 'bg-primary-subtle text-primary' },
  soft: { label: 'Soft Skills', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  domain: { label: 'Domain', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
};
```

**Step 3: Run type check**

Run: `npm run build`
Expected: PASS (new fields are optional, backward compatible)

**Step 4: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(types): extend SavedStory with enriched metadata fields"
```

---

### Task 1.2: Add Profile Hub State to AppStore

**Files:**
- Modify: `src/stores/appStore.ts:69-80` (UI State section)
- Modify: `src/stores/appStore.ts:130-150` (UI actions section)

**Step 1: Add isProfileHubOpen to UI state**

In the `AppState` interface, add after `isOfferModalOpen`:

```typescript
isProfileHubOpen: boolean;
```

**Step 2: Add open/close actions to interface**

In the actions section, add after `closeOfferModal`:

```typescript
openProfileHub: () => void;
closeProfileHub: () => void;
```

**Step 3: Add initial state**

In the create function, add:

```typescript
isProfileHubOpen: false,
```

**Step 4: Add action implementations**

Add the action implementations:

```typescript
openProfileHub: () => set({ isProfileHubOpen: true }),
closeProfileHub: () => set({ isProfileHubOpen: false }),
```

**Step 5: Run type check**

Run: `npm run build`
Expected: PASS

**Step 6: Commit**

```bash
git add src/stores/appStore.ts
git commit -m "feat(store): add Profile Hub open/close state"
```

---

### Task 1.3: Add Story CRUD Actions to AppStore

**Files:**
- Modify: `src/stores/appStore.ts`

**Step 1: Add addSavedStory and deleteSavedStory to interface**

In the actions section near `updateSavedStory`:

```typescript
addSavedStory: (story: Omit<SavedStory, 'id' | 'createdAt'>) => Promise<SavedStory>;
deleteSavedStory: (id: string) => Promise<void>;
```

**Step 2: Implement addSavedStory**

```typescript
addSavedStory: async (storyData) => {
  const newStory: SavedStory = {
    ...storyData,
    id: generateId(),
    createdAt: new Date(),
    updatedAt: new Date(),
    source: storyData.source || 'manual',
  };
  const newStories = [...(get().settings.savedStories || []), newStory];
  await get().updateSettings({ savedStories: newStories });
  triggerStoryEmbedding(newStory);
  return newStory;
},
```

**Step 3: Implement deleteSavedStory**

```typescript
deleteSavedStory: async (id) => {
  const newStories = (get().settings.savedStories || []).filter((s) => s.id !== id);
  await get().updateSettings({ savedStories: newStories });
  // Remove embedding
  setTimeout(() => {
    useEmbeddingStore.getState().removeEmbedding(`story:${id}`).catch(console.warn);
  }, 0);
},
```

**Step 4: Run type check**

Run: `npm run build`
Expected: PASS

**Step 5: Commit**

```bash
git add src/stores/appStore.ts
git commit -m "feat(store): add story CRUD actions (add, delete)"
```

---

## Phase 2: Profile Hub Shell

### Task 2.1: Create ProfileHub Component Shell

**Files:**
- Create: `src/components/ProfileHub/ProfileHub.tsx`
- Create: `src/components/ProfileHub/index.ts`

**Step 1: Create the directory and index file**

```typescript
// src/components/ProfileHub/index.ts
export { ProfileHub } from './ProfileHub';
```

**Step 2: Create ProfileHub.tsx shell**

```typescript
// src/components/ProfileHub/ProfileHub.tsx
import { useState } from 'react';
import { FileText, BookOpen, Paperclip, User, Target, FlaskConical, X } from 'lucide-react';
import { SlideOverPanel } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { cn } from '../../utils/helpers';

type ProfileSection = 'resume' | 'stories' | 'documents' | 'about' | 'skills' | 'quiz';

interface NavItem {
  id: ProfileSection;
  icon: React.ElementType;
  label: string;
}

const contentSections: NavItem[] = [
  { id: 'resume', icon: FileText, label: 'Resume' },
  { id: 'stories', icon: BookOpen, label: 'Stories' },
  { id: 'documents', icon: Paperclip, label: 'Documents' },
  { id: 'about', icon: User, label: 'About Me' },
];

const insightSections: NavItem[] = [
  { id: 'skills', icon: Target, label: 'Skills' },
  { id: 'quiz', icon: FlaskConical, label: 'AI Quiz' },
];

export function ProfileHub() {
  const { isProfileHubOpen, closeProfileHub } = useAppStore();
  const [activeSection, setActiveSection] = useState<ProfileSection>('resume');

  return (
    <SlideOverPanel isOpen={isProfileHubOpen} onClose={closeProfileHub} size="full">
      <div className="flex h-full">
        {/* Internal Sidebar */}
        <nav className="w-[180px] bg-surface-raised border-r border-border flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-border">
            <h2 className="font-display text-heading text-foreground">My Profile</h2>
          </div>

          {/* Content Sections */}
          <div className="flex-1 py-2">
            {contentSections.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 text-sm font-body',
                  'transition-colors duration-fast relative',
                  activeSection === item.id
                    ? 'bg-surface text-foreground'
                    : 'text-foreground-muted hover:bg-surface hover:text-foreground'
                )}
              >
                {activeSection === item.id && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r" />
                )}
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}

            {/* Divider */}
            <div className="mx-4 my-3 border-t border-border" />

            {/* Insight Sections */}
            {insightSections.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 text-sm font-body',
                  'transition-colors duration-fast relative',
                  activeSection === item.id
                    ? 'bg-surface text-foreground'
                    : 'text-foreground-muted hover:bg-surface hover:text-foreground'
                )}
              >
                {activeSection === item.id && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r" />
                )}
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Header with close button */}
          <div className="flex items-center justify-end px-6 py-4 border-b border-border">
            <button
              onClick={closeProfileHub}
              className="p-2 rounded-lg text-foreground-muted hover:bg-surface-raised hover:text-foreground transition-colors duration-fast"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Section Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeSection === 'resume' && <div>Resume Section (TODO)</div>}
            {activeSection === 'stories' && <div>Stories Section (TODO)</div>}
            {activeSection === 'documents' && <div>Documents Section (TODO)</div>}
            {activeSection === 'about' && <div>About Me Section (TODO)</div>}
            {activeSection === 'skills' && <div>Skills Section (TODO)</div>}
            {activeSection === 'quiz' && <div>AI Quiz Section (TODO)</div>}
          </div>
        </div>
      </div>
    </SlideOverPanel>
  );
}
```

**Step 3: Run lint and type check**

Run: `npm run lint && npm run build`
Expected: PASS

**Step 4: Commit**

```bash
git add src/components/ProfileHub/
git commit -m "feat(ui): create ProfileHub component shell with sidebar navigation"
```

---

### Task 2.2: Add ProfileHub to App and Sidebar

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Sidebar/Sidebar.tsx`

**Step 1: Import and render ProfileHub in App.tsx**

Add import:
```typescript
import { ProfileHub } from './components/ProfileHub';
```

Add component in render (after `<OfferModal />`):
```typescript
<ProfileHub />
```

**Step 2: Add Profile nav item to Sidebar**

Import User icon (already imported, verify):
```typescript
import { LayoutGrid, Compass, Sparkles, Settings, Sun, Moon, HelpCircle, User } from 'lucide-react';
```

Add `openProfileHub` to destructured store:
```typescript
const {
  settings,
  updateSettings,
  openJobFinderModal,
  openCareerCoachModal,
  openSettingsModal,
  openGettingStartedModal,
  openFeatureGuideModal,
  openPrivacyModal,
  openProfileHub,
} = useAppStore();
```

Update mainItems array (insert Profile between Coach and Settings):
```typescript
const mainItems: SidebarItem[] = [
  { id: 'board', icon: LayoutGrid, label: 'Jobs', onClick: () => {} },
  { id: 'find', icon: Compass, label: 'Find Jobs', onClick: openJobFinderModal },
  { id: 'coach', icon: Sparkles, label: 'Coach', onClick: openCareerCoachModal },
  { id: 'profile', icon: User, label: 'My Profile', onClick: openProfileHub },
  { id: 'settings', icon: Settings, label: 'Settings', onClick: openSettingsModal },
];
```

**Step 3: Run dev server and verify**

Run: `npm run dev`
Expected: Click "My Profile" in sidebar opens the Profile Hub panel

**Step 4: Run lint**

Run: `npm run lint`
Expected: PASS

**Step 5: Commit**

```bash
git add src/App.tsx src/components/Sidebar/Sidebar.tsx
git commit -m "feat(nav): add My Profile to sidebar, wire up ProfileHub"
```

---

## Phase 3: Stories Section (Core Feature)

### Task 3.1: Create StoryCard Component

**Files:**
- Create: `src/components/ProfileHub/StoryCard.tsx`

**Step 1: Create StoryCard component**

```typescript
// src/components/ProfileHub/StoryCard.tsx
import { MessageSquare } from 'lucide-react';
import { Badge } from '../ui';
import { cn } from '../../utils/helpers';
import type { SavedStory } from '../../types';

interface StoryCardProps {
  story: SavedStory;
  onClick: () => void;
}

export function StoryCard({ story, onClick }: StoryCardProps) {
  const contextParts = [story.company, story.role, story.timeframe].filter(Boolean);
  const contextLine = contextParts.join(' · ');

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-surface rounded-card border border-border p-4',
        'hover:shadow-card-hover hover:border-primary/30',
        'transition-all duration-fast ease-out cursor-pointer'
      )}
    >
      {/* Question */}
      <p className="font-display text-heading text-foreground line-clamp-2 mb-2">
        "{story.question}"
      </p>

      {/* Context line */}
      {contextLine && (
        <p className="text-sm text-foreground-muted mb-3">{contextLine}</p>
      )}

      {/* Skills */}
      {story.skills && story.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {story.skills.slice(0, 4).map((skill) => (
            <Badge
              key={skill}
              className="text-xs bg-primary-subtle text-primary"
            >
              {skill}
            </Badge>
          ))}
          {story.skills.length > 4 && (
            <Badge className="text-xs bg-surface-raised text-foreground-muted">
              +{story.skills.length - 4}
            </Badge>
          )}
        </div>
      )}

      {/* Outcome */}
      {story.outcome && (
        <p className="text-sm text-foreground-muted line-clamp-1">
          <span className="font-medium">Outcome:</span> {story.outcome}
        </p>
      )}

      {/* Source indicator */}
      {story.source === 'chat' && story.sourceJobId && (
        <div className="flex items-center gap-1 mt-3 text-xs text-foreground-subtle">
          <MessageSquare className="w-3 h-3" />
          <span>Saved from prep chat</span>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Run lint**

Run: `npm run lint`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/ProfileHub/StoryCard.tsx
git commit -m "feat(ui): create StoryCard component with metadata display"
```

---

### Task 3.2: Create StoriesSection Component

**Files:**
- Create: `src/components/ProfileHub/StoriesSection.tsx`

**Step 1: Create StoriesSection component**

```typescript
// src/components/ProfileHub/StoriesSection.tsx
import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button, Input } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { StoryCard } from './StoryCard';

interface StoriesSectionProps {
  onAddStory: () => void;
  onEditStory: (storyId: string) => void;
}

export function StoriesSection({ onAddStory, onEditStory }: StoriesSectionProps) {
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
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search stories..."
            className="pl-9"
          />
        </div>

        {allSkills.length > 0 && (
          <select
            value={filterSkill || ''}
            onChange={(e) => setFilterSkill(e.target.value || null)}
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
```

**Step 2: Run lint**

Run: `npm run lint`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/ProfileHub/StoriesSection.tsx
git commit -m "feat(ui): create StoriesSection with search and filter"
```

---

### Task 3.3: Create AddStoryModal Component

**Files:**
- Create: `src/components/ProfileHub/AddStoryModal.tsx`

**Step 1: Create AddStoryModal component**

```typescript
// src/components/ProfileHub/AddStoryModal.tsx
import { useState } from 'react';
import { Loader2, Sparkles, X } from 'lucide-react';
import { Modal, Button, Input, Textarea } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { extractStoryMetadata } from '../../services/ai';
import { showToast } from '../../stores/toastStore';
import type { SavedStory } from '../../types';

interface AddStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingStory?: SavedStory | null;
}

export function AddStoryModal({ isOpen, onClose, editingStory }: AddStoryModalProps) {
  const { addSavedStory, updateSavedStory } = useAppStore();

  // Form state
  const [rawText, setRawText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [showForm, setShowForm] = useState(!!editingStory);

  // Extracted/edited fields
  const [question, setQuestion] = useState(editingStory?.question || '');
  const [answer, setAnswer] = useState(editingStory?.answer || '');
  const [company, setCompany] = useState(editingStory?.company || '');
  const [role, setRole] = useState(editingStory?.role || '');
  const [timeframe, setTimeframe] = useState(editingStory?.timeframe || '');
  const [outcome, setOutcome] = useState(editingStory?.outcome || '');
  const [skillsInput, setSkillsInput] = useState(editingStory?.skills?.join(', ') || '');

  const resetForm = () => {
    setRawText('');
    setShowForm(false);
    setQuestion('');
    setAnswer('');
    setCompany('');
    setRole('');
    setTimeframe('');
    setOutcome('');
    setSkillsInput('');
    setIsExtracting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleExtract = async () => {
    if (!rawText.trim()) return;

    setIsExtracting(true);
    try {
      const extracted = await extractStoryMetadata(rawText);
      setQuestion(extracted.question || '');
      setAnswer(extracted.answer || rawText);
      setCompany(extracted.company || '');
      setRole(extracted.role || '');
      setTimeframe(extracted.timeframe || '');
      setOutcome(extracted.outcome || '');
      setSkillsInput(extracted.skills?.join(', ') || '');
      setShowForm(true);
    } catch (error) {
      console.error('Failed to extract story metadata:', error);
      showToast('Failed to extract metadata. You can fill in the form manually.', 'error');
      setShowForm(true);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSave = async () => {
    if (!question.trim() || !answer.trim()) {
      showToast('Question and answer are required', 'error');
      return;
    }

    const skills = skillsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const storyData = {
      question: question.trim(),
      answer: answer.trim(),
      company: company.trim() || undefined,
      role: role.trim() || undefined,
      timeframe: timeframe.trim() || undefined,
      outcome: outcome.trim() || undefined,
      skills: skills.length > 0 ? skills : undefined,
      source: 'manual' as const,
    };

    try {
      if (editingStory) {
        await updateSavedStory(editingStory.id, {
          ...storyData,
          updatedAt: new Date(),
        });
        showToast('Story updated', 'success');
      } else {
        await addSavedStory(storyData);
        showToast('Story added to your bank', 'success');
      }
      handleClose();
    } catch (error) {
      console.error('Failed to save story:', error);
      showToast('Failed to save story', 'error');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={editingStory ? 'Edit Story' : 'Add Story'}>
      <div className="space-y-4">
        {!showForm ? (
          <>
            <p className="text-sm text-foreground-muted">
              Paste your experience or story below. AI will extract the key details.
            </p>
            <Textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Describe an experience, achievement, or story you'd like to save..."
              rows={8}
              className="font-body"
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleExtract} disabled={!rawText.trim() || isExtracting}>
                {isExtracting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-1" />
                    Extract with AI
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Question/Topic *
                </label>
                <Input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="What behavioral question does this answer?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Your Story *
                </label>
                <Textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Your experience in detail..."
                  rows={5}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Company
                  </label>
                  <Input
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Acme Corp"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Role
                  </label>
                  <Input
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="Senior Engineer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Timeframe
                  </label>
                  <Input
                    value={timeframe}
                    onChange={(e) => setTimeframe(e.target.value)}
                    placeholder="Q2 2023"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Skills (comma-separated)
                  </label>
                  <Input
                    value={skillsInput}
                    onChange={(e) => setSkillsInput(e.target.value)}
                    placeholder="leadership, technical"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Outcome
                </label>
                <Input
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                  placeholder="What was the result or impact?"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => editingStory ? handleClose() : setShowForm(false)}>
                {editingStory ? 'Cancel' : 'Back'}
              </Button>
              <Button onClick={handleSave}>
                {editingStory ? 'Save Changes' : 'Add Story'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
```

**Step 2: Run lint**

Run: `npm run lint`
Expected: PASS (will have error for missing extractStoryMetadata - we'll add it next)

**Step 3: Commit**

```bash
git add src/components/ProfileHub/AddStoryModal.tsx
git commit -m "feat(ui): create AddStoryModal with AI extraction support"
```

---

### Task 3.4: Add extractStoryMetadata AI Function

**Files:**
- Modify: `src/services/ai.ts`
- Modify: `src/utils/prompts.ts`

**Step 1: Add prompt to prompts.ts**

Add after `REWRITE_FOR_MEMORY_PROMPT`:

```typescript
export const EXTRACT_STORY_METADATA_PROMPT = `Extract structured metadata from this story/experience for a job application memory bank.

Raw text:
{rawText}

Return ONLY valid JSON with this exact structure:
{
  "question": "A clear behavioral interview question this story answers (e.g., 'Tell me about a time you led a difficult project')",
  "answer": "Clean, first-person narrative of the experience with specific details. Remove conversational filler.",
  "company": "Company name if mentioned, or null",
  "role": "Job title/role if mentioned, or null",
  "timeframe": "When this happened (e.g., 'Q2 2023', '2022-2023'), or null",
  "outcome": "The result or impact of this experience, or null",
  "skills": ["skill1", "skill2"] // Skills demonstrated (e.g., "leadership", "problem-solving", "technical")
}

Guidelines:
- Extract the core experience, not AI responses or conversational filler
- Include specific metrics and outcomes if mentioned
- Skills should be general categories like: leadership, technical, communication, problem-solving, teamwork, conflict-resolution, initiative
- If information isn't clearly stated, use null rather than guessing

Return ONLY valid JSON.`;
```

**Step 2: Add function to ai.ts**

Add the export and function:

```typescript
// Extract story metadata using AI
export async function extractStoryMetadata(rawText: string): Promise<{
  question?: string;
  answer?: string;
  company?: string;
  role?: string;
  timeframe?: string;
  outcome?: string;
  skills?: string[];
}> {
  const prompt = EXTRACT_STORY_METADATA_PROMPT.replace('{rawText}', rawText);

  const response = await callAI([{ role: 'user', content: prompt }]);

  try {
    const cleanedJson = extractJsonFromResponse(response);
    return JSON.parse(cleanedJson);
  } catch (error) {
    console.error('Failed to parse story metadata:', error);
    return { answer: rawText };
  }
}
```

Add import for the new prompt at the top of ai.ts:

```typescript
import { EXTRACT_STORY_METADATA_PROMPT } from '../utils/prompts';
```

**Step 3: Run lint and type check**

Run: `npm run lint && npm run build`
Expected: PASS

**Step 4: Commit**

```bash
git add src/services/ai.ts src/utils/prompts.ts
git commit -m "feat(ai): add extractStoryMetadata function for story parsing"
```

---

### Task 3.5: Wire Up Stories Section in ProfileHub

**Files:**
- Modify: `src/components/ProfileHub/ProfileHub.tsx`
- Modify: `src/components/ProfileHub/index.ts`

**Step 1: Update index.ts exports**

```typescript
export { ProfileHub } from './ProfileHub';
export { StoryCard } from './StoryCard';
export { StoriesSection } from './StoriesSection';
export { AddStoryModal } from './AddStoryModal';
```

**Step 2: Update ProfileHub.tsx to use StoriesSection**

Add imports:
```typescript
import { StoriesSection } from './StoriesSection';
import { AddStoryModal } from './AddStoryModal';
import type { SavedStory } from '../../types';
```

Add state in ProfileHub component:
```typescript
const [isAddStoryModalOpen, setIsAddStoryModalOpen] = useState(false);
const [editingStory, setEditingStory] = useState<SavedStory | null>(null);
const { settings } = useAppStore();
```

Add handlers:
```typescript
const handleAddStory = () => {
  setEditingStory(null);
  setIsAddStoryModalOpen(true);
};

const handleEditStory = (storyId: string) => {
  const story = settings.savedStories?.find((s) => s.id === storyId);
  if (story) {
    setEditingStory(story);
    setIsAddStoryModalOpen(true);
  }
};
```

Replace the stories placeholder in the content area:
```typescript
{activeSection === 'stories' && (
  <StoriesSection
    onAddStory={handleAddStory}
    onEditStory={handleEditStory}
  />
)}
```

Add modal at the end (inside the SlideOverPanel):
```typescript
<AddStoryModal
  isOpen={isAddStoryModalOpen}
  onClose={() => {
    setIsAddStoryModalOpen(false);
    setEditingStory(null);
  }}
  editingStory={editingStory}
/>
```

**Step 3: Test manually**

Run: `npm run dev`
Expected: Can add and edit stories in Profile Hub

**Step 4: Run lint**

Run: `npm run lint`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/ProfileHub/
git commit -m "feat(ui): wire up Stories section with add/edit functionality"
```

---

## Phase 4: Resume Section

### Task 4.1: Create ResumeSection Component

**Files:**
- Create: `src/components/ProfileHub/ResumeSection.tsx`

**Step 1: Create ResumeSection component**

```typescript
// src/components/ProfileHub/ResumeSection.tsx
import { useState, useRef } from 'react';
import { Upload, FileText, Trash2, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button, ConfirmModal } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { extractTextFromPDF } from '../../services/pdfParser';
import { convertResumeToMarkdown } from '../../services/ai';
import { showToast } from '../../stores/toastStore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function ResumeSection() {
  const { settings, updateSettings } = useAppStore();
  const [isUploading, setIsUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasResume = !!settings.defaultResumeText;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      let text: string;

      if (file.type === 'application/pdf') {
        text = await extractTextFromPDF(file);
        // Convert to markdown
        text = await convertResumeToMarkdown(text);
      } else {
        text = await file.text();
      }

      await updateSettings({
        defaultResumeText: text,
        defaultResumeName: file.name,
      });
      showToast('Resume uploaded successfully', 'success');
    } catch (error) {
      console.error('Failed to upload resume:', error);
      showToast('Failed to upload resume', 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClearResume = async () => {
    await updateSettings({
      defaultResumeText: '',
      defaultResumeName: '',
    });
    setShowClearConfirm(false);
    showToast('Resume cleared', 'success');
  };

  if (!hasResume) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-surface-raised rounded-full flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-foreground-subtle" />
        </div>
        <h3 className="font-display text-heading-lg text-foreground mb-2">
          No resume uploaded
        </h3>
        <p className="text-foreground-muted max-w-md mb-6">
          Upload your resume so the AI can tailor cover letters and analyze job fit.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md"
          onChange={handleFileUpload}
          className="hidden"
        />
        <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-1" />
              Upload Resume
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-heading-lg text-foreground">Resume</h3>
          {settings.defaultResumeName && (
            <p className="text-sm text-foreground-muted">{settings.defaultResumeName}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? (
              <>
                <EyeOff className="w-4 h-4 mr-1" />
                Hide
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-1" />
                Show
              </>
            )}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.md"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Upload className="w-4 h-4 mr-1" />
                Replace
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowClearConfirm(true)}
            className="text-danger"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Resume Preview */}
      {showPreview && (
        <div className="bg-surface-raised rounded-lg border border-border p-6 max-h-[600px] overflow-y-auto">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {settings.defaultResumeText}
            </ReactMarkdown>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearResume}
        title="Clear Resume"
        message="Are you sure you want to remove your resume? This cannot be undone."
        confirmText="Clear"
        variant="danger"
      />
    </div>
  );
}
```

**Step 2: Wire up in ProfileHub**

Add import and use in ProfileHub.tsx:

```typescript
import { ResumeSection } from './ResumeSection';
```

Replace placeholder:
```typescript
{activeSection === 'resume' && <ResumeSection />}
```

**Step 3: Update index.ts**

```typescript
export { ResumeSection } from './ResumeSection';
```

**Step 4: Run lint**

Run: `npm run lint`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/ProfileHub/
git commit -m "feat(ui): create ResumeSection with upload and preview"
```

---

## Phase 5: Documents & About Me Sections

### Task 5.1: Create DocumentsSection Component

**Files:**
- Create: `src/components/ProfileHub/DocumentsSection.tsx`

This will relocate functionality from SettingsModal. Create a simplified version that manages context documents.

**Step 1: Create the component**

```typescript
// src/components/ProfileHub/DocumentsSection.tsx
import { useState, useRef } from 'react';
import { Plus, FileText, Trash2, Loader2, Eye, Sparkles } from 'lucide-react';
import { Button, ConfirmModal, Modal } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { extractTextFromPDF } from '../../services/pdfParser';
import { summarizeDocument } from '../../services/ai';
import { showToast } from '../../stores/toastStore';
import type { ContextDocument } from '../../types';

export function DocumentsSection() {
  const { settings, addContextDocument, updateContextDocument, deleteContextDocument } = useAppStore();
  const documents = settings.contextDocuments || [];

  const [isUploading, setIsUploading] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState<string | null>(null);
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc] = useState<ContextDocument | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const text = await extractTextFromPDF(file);
      const wordCount = text.split(/\s+/).length;

      await addContextDocument({
        name: file.name,
        fullText: text,
        wordCount,
        useSummary: false,
      });
      showToast('Document added', 'success');
    } catch (error) {
      console.error('Failed to upload document:', error);
      showToast('Failed to upload document', 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSummarize = async (doc: ContextDocument) => {
    setIsSummarizing(doc.id);
    try {
      const summary = await summarizeDocument(doc.fullText, doc.name);
      await updateContextDocument(doc.id, {
        summary,
        summaryWordCount: summary.split(/\s+/).length,
        useSummary: true,
      });
      showToast('Summary generated', 'success');
    } catch (error) {
      console.error('Failed to summarize:', error);
      showToast('Failed to generate summary', 'error');
    } finally {
      setIsSummarizing(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteDocId) return;
    await deleteContextDocument(deleteDocId);
    setDeleteDocId(null);
    showToast('Document removed', 'success');
  };

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-surface-raised rounded-full flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-foreground-subtle" />
        </div>
        <h3 className="font-display text-heading-lg text-foreground mb-2">
          No documents uploaded
        </h3>
        <p className="text-foreground-muted max-w-md mb-6">
          Upload PDFs like performance reviews or project docs for the AI to reference.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleUpload}
          className="hidden"
        />
        <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
          {isUploading ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Plus className="w-4 h-4 mr-1" />
          )}
          Upload Document
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-heading-lg text-foreground">Context Documents</h3>
          <p className="text-sm text-foreground-muted">{documents.length} documents</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleUpload}
          className="hidden"
        />
        <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
          {isUploading ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Plus className="w-4 h-4 mr-1" />
          )}
          Add Document
        </Button>
      </div>

      <div className="space-y-3">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center justify-between p-4 bg-surface rounded-lg border border-border"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-foreground-muted" />
              <div>
                <p className="font-medium text-foreground">{doc.name}</p>
                <p className="text-xs text-foreground-muted">
                  {doc.wordCount.toLocaleString()} words
                  {doc.summary && ` · Summary: ${doc.summaryWordCount?.toLocaleString()} words`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {doc.summary ? (
                <label className="flex items-center gap-2 text-sm text-foreground-muted">
                  <input
                    type="checkbox"
                    checked={doc.useSummary}
                    onChange={(e) => updateContextDocument(doc.id, { useSummary: e.target.checked })}
                    className="rounded border-border"
                  />
                  Use summary
                </label>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSummarize(doc)}
                  disabled={isSummarizing === doc.id}
                >
                  {isSummarizing === doc.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-1" />
                      Summarize
                    </>
                  )}
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setViewingDoc(doc)}>
                <Eye className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteDocId(doc.id)}
                className="text-danger"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmModal
        isOpen={!!deleteDocId}
        onClose={() => setDeleteDocId(null)}
        onConfirm={handleDelete}
        title="Delete Document"
        message="Remove this document from your context bank?"
        confirmText="Delete"
        variant="danger"
      />

      <Modal
        isOpen={!!viewingDoc}
        onClose={() => setViewingDoc(null)}
        title={viewingDoc?.name || 'Document'}
      >
        <div className="max-h-[60vh] overflow-y-auto">
          <pre className="whitespace-pre-wrap text-sm text-foreground-muted font-body">
            {viewingDoc?.useSummary && viewingDoc?.summary
              ? viewingDoc.summary
              : viewingDoc?.fullText}
          </pre>
        </div>
      </Modal>
    </div>
  );
}
```

**Step 2: Wire up and commit**

Add to ProfileHub.tsx and index.ts, then:

```bash
git add src/components/ProfileHub/
git commit -m "feat(ui): create DocumentsSection for context document management"
```

---

### Task 5.2: Create AboutMeSection Component

**Files:**
- Create: `src/components/ProfileHub/AboutMeSection.tsx`

**Step 1: Create the component**

```typescript
// src/components/ProfileHub/AboutMeSection.tsx
import { useState, useEffect, useCallback } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { Textarea, Button } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { showToast } from '../../stores/toastStore';

export function AboutMeSection() {
  const { settings, updateSettings } = useAppStore();
  const [content, setContent] = useState(settings.additionalContext || '');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setContent(settings.additionalContext || '');
  }, [settings.additionalContext]);

  useEffect(() => {
    setHasChanges(content !== (settings.additionalContext || ''));
  }, [content, settings.additionalContext]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await updateSettings({ additionalContext: content });
      showToast('Saved', 'success');
    } catch (error) {
      console.error('Failed to save:', error);
      showToast('Failed to save', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [content, updateSettings]);

  // Auto-save on blur with debounce
  const handleBlur = useCallback(() => {
    if (hasChanges) {
      handleSave();
    }
  }, [hasChanges, handleSave]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-heading-lg text-foreground">About Me</h3>
          <p className="text-sm text-foreground-muted">
            Additional context for the AI beyond your resume
          </p>
        </div>
        {hasChanges && (
          <Button onClick={handleSave} disabled={isSaving} size="sm">
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4 mr-1" />
                Save
              </>
            )}
          </Button>
        )}
      </div>

      <div className="bg-surface-raised rounded-lg border border-border p-1">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={handleBlur}
          placeholder="Add context the AI should know about you that's not in your resume:

• Career goals and what you're looking for
• Work style preferences (remote, team size, culture)
• Unique background or perspectives
• Skills you're developing or interested in
• Anything else relevant to your job search..."
          rows={15}
          className="border-0 bg-transparent focus:ring-0"
        />
      </div>

      <p className="text-xs text-foreground-subtle">
        {content.length > 0
          ? `${content.split(/\s+/).filter(Boolean).length} words`
          : 'No content yet'}
      </p>
    </div>
  );
}
```

**Step 2: Wire up and commit**

```bash
git add src/components/ProfileHub/
git commit -m "feat(ui): create AboutMeSection with auto-save"
```

---

## Phase 6: Skills & Quiz Sections

### Task 6.1: Create SkillsSection Component

**Files:**
- Create: `src/components/ProfileHub/SkillsSection.tsx`

**Step 1: Create the component**

```typescript
// src/components/ProfileHub/SkillsSection.tsx
import { useMemo } from 'react';
import { Target, RefreshCw } from 'lucide-react';
import { Badge, Button } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { cn } from '../../utils/helpers';

export function SkillsSection() {
  const { settings } = useAppStore();
  const skillProfile = settings.careerCoachState?.skillProfile;
  const stories = settings.savedStories || [];

  // Aggregate skills from stories
  const storySkills = useMemo(() => {
    const skillMap = new Map<string, { count: number; stories: string[] }>();
    stories.forEach((story) => {
      story.skills?.forEach((skill) => {
        const existing = skillMap.get(skill) || { count: 0, stories: [] };
        existing.count++;
        existing.stories.push(story.question);
        skillMap.set(skill, existing);
      });
    });
    return skillMap;
  }, [stories]);

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

  const categoryColors = {
    technical: 'bg-primary-subtle text-primary',
    soft: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    domain: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  };

  const categoryLabels = {
    technical: 'Technical Skills',
    soft: 'Soft Skills',
    domain: 'Domain Knowledge',
  };

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
                <Badge
                  key={skill}
                  className={cn(categoryColors[category], 'text-sm')}
                  title={`Sources: ${sources.join(', ')}`}
                >
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

**Step 2: Wire up and commit**

```bash
git add src/components/ProfileHub/
git commit -m "feat(ui): create SkillsSection with aggregated skill display"
```

---

### Task 6.2: Create QuizSection Component (Placeholder)

**Files:**
- Create: `src/components/ProfileHub/QuizSection.tsx`

**Step 1: Create placeholder component**

```typescript
// src/components/ProfileHub/QuizSection.tsx
import { useState } from 'react';
import { FlaskConical, Brain, Search } from 'lucide-react';
import { Button } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { cn } from '../../utils/helpers';

type QuizMode = 'confidence' | 'gaps';

export function QuizSection() {
  const { settings } = useAppStore();
  const stories = settings.savedStories || [];
  const [mode, setMode] = useState<QuizMode>('confidence');

  if (stories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-surface-raised rounded-full flex items-center justify-center mb-4">
          <FlaskConical className="w-8 h-8 text-foreground-subtle" />
        </div>
        <h3 className="font-display text-heading-lg text-foreground mb-2">
          Add stories first
        </h3>
        <p className="text-foreground-muted max-w-md">
          You need at least a few stories in your bank before you can quiz the AI.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-heading-lg text-foreground mb-2">AI Quiz</h3>
        <p className="text-sm text-foreground-muted">
          Test how well the AI knows your stories and find gaps in your coverage.
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2 p-1 bg-surface-raised rounded-lg w-fit">
        <button
          onClick={() => setMode('confidence')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
            mode === 'confidence'
              ? 'bg-surface text-foreground shadow-sm'
              : 'text-foreground-muted hover:text-foreground'
          )}
        >
          <Brain className="w-4 h-4" />
          Confidence Check
        </button>
        <button
          onClick={() => setMode('gaps')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
            mode === 'gaps'
              ? 'bg-surface text-foreground shadow-sm'
              : 'text-foreground-muted hover:text-foreground'
          )}
        >
          <Search className="w-4 h-4" />
          Gap Finder
        </button>
      </div>

      {/* Content */}
      <div className="bg-surface-raised rounded-lg border border-border p-8 text-center">
        {mode === 'confidence' ? (
          <>
            <Brain className="w-12 h-12 text-foreground-subtle mx-auto mb-4" />
            <h4 className="font-display text-heading text-foreground mb-2">
              Confidence Check
            </h4>
            <p className="text-foreground-muted mb-4 max-w-md mx-auto">
              Test if the AI can accurately recall your stories. Select a story and see if the AI remembers the details.
            </p>
            <Button disabled>
              Coming Soon
            </Button>
          </>
        ) : (
          <>
            <Search className="w-12 h-12 text-foreground-subtle mx-auto mb-4" />
            <h4 className="font-display text-heading text-foreground mb-2">
              Gap Finder
            </h4>
            <p className="text-foreground-muted mb-4 max-w-md mx-auto">
              Find behavioral interview categories where you don't have stories yet.
            </p>
            <Button disabled>
              Coming Soon
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Wire up all remaining sections and commit**

Update ProfileHub.tsx to import and use all sections:

```typescript
import { ResumeSection } from './ResumeSection';
import { StoriesSection } from './StoriesSection';
import { DocumentsSection } from './DocumentsSection';
import { AboutMeSection } from './AboutMeSection';
import { SkillsSection } from './SkillsSection';
import { QuizSection } from './QuizSection';
```

Replace all placeholders in the content area.

Update index.ts with all exports.

```bash
git add src/components/ProfileHub/
git commit -m "feat(ui): add all Profile Hub sections (Skills, Quiz, Documents, About)"
```

---

## Phase 7: Enhanced Save-from-Chat Flow

### Task 7.1: Update REWRITE_FOR_MEMORY_PROMPT

**Files:**
- Modify: `src/utils/prompts.ts`

**Step 1: Update the prompt to return enriched structure**

Find `REWRITE_FOR_MEMORY_PROMPT` and update it:

```typescript
export const REWRITE_FOR_MEMORY_PROMPT = `Rewrite this Q&A into a clear, standalone memory that can be used for future resume tailoring and interview prep.

Original question/context: {question}

Original answer/response: {answer}

Job context (if available): {jobContext}

Return ONLY valid JSON with this exact structure:
{
  "question": "Clear, concise topic/title (e.g., 'Leadership experience at startup', 'Handling cross-team conflicts')",
  "answer": "Clean, factual summary of the experience with specific details, metrics, and outcomes. Written in first person. Remove any conversational filler, AI responses, or back-and-forth. Focus on the candidate's actual experience and achievements.",
  "company": "Company name if mentioned in the context, or null",
  "role": "Job title if mentioned, or null",
  "timeframe": "When this happened if mentioned (e.g., 'Q2 2023'), or null",
  "outcome": "The measurable result or impact, or null",
  "skills": ["skill1", "skill2"] // Skills demonstrated (e.g., "leadership", "problem-solving")
}

Guidelines:
- Extract the core experience or story from the conversation
- Include specific metrics, outcomes, and details mentioned
- Write in a reusable format that provides context for any AI reading it later
- Keep it concise but complete
- If the original has multiple experiences, focus on the most substantial one
- Skills should be general categories: leadership, technical, communication, problem-solving, teamwork, conflict-resolution, initiative

Return ONLY valid JSON.`;
```

**Step 2: Update the rewriteForMemory function in ai.ts**

Find the function and update to pass job context and parse enriched response:

```typescript
export async function rewriteForMemory(
  question: string,
  answer: string,
  jobContext?: { company?: string; title?: string }
): Promise<{
  question: string;
  answer: string;
  company?: string;
  role?: string;
  timeframe?: string;
  outcome?: string;
  skills?: string[];
}> {
  const jobContextStr = jobContext
    ? `Company: ${jobContext.company || 'Unknown'}, Role: ${jobContext.title || 'Unknown'}`
    : 'None';

  const prompt = REWRITE_FOR_MEMORY_PROMPT
    .replace('{question}', question)
    .replace('{answer}', answer)
    .replace('{jobContext}', jobContextStr);

  const response = await callAI([{ role: 'user', content: prompt }]);

  try {
    const cleanedJson = extractJsonFromResponse(response);
    return JSON.parse(cleanedJson);
  } catch (error) {
    console.error('Failed to parse memory rewrite:', error);
    return { question, answer };
  }
}
```

**Step 3: Run lint and type check**

Run: `npm run lint && npm run build`
Expected: PASS

**Step 4: Commit**

```bash
git add src/utils/prompts.ts src/services/ai.ts
git commit -m "feat(ai): enhance REWRITE_FOR_MEMORY_PROMPT with enriched metadata extraction"
```

---

## Phase 8: Final Integration & Cleanup

### Task 8.1: Update Export in index.ts

**Files:**
- Modify: `src/components/ProfileHub/index.ts`

Ensure all components are exported:

```typescript
export { ProfileHub } from './ProfileHub';
export { ResumeSection } from './ResumeSection';
export { StoriesSection } from './StoriesSection';
export { StoryCard } from './StoryCard';
export { AddStoryModal } from './AddStoryModal';
export { DocumentsSection } from './DocumentsSection';
export { AboutMeSection } from './AboutMeSection';
export { SkillsSection } from './SkillsSection';
export { QuizSection } from './QuizSection';
```

### Task 8.2: Run Full Build and Lint

**Step 1: Run all checks**

Run: `npm run lint && npm run build`
Expected: PASS with no errors

**Step 2: Manual testing checklist**

- [ ] Click "My Profile" in sidebar opens Profile Hub
- [ ] Can navigate between all 6 sections
- [ ] Can upload and view resume
- [ ] Can add story with AI extraction
- [ ] Can edit existing story
- [ ] Can delete story
- [ ] Can upload and manage context documents
- [ ] Can edit and save About Me content
- [ ] Skills section shows aggregated skills
- [ ] Quiz section shows placeholder UI
- [ ] Close button works
- [ ] Dark mode works correctly

### Task 8.3: Final Commit

```bash
git add .
git commit -m "feat: complete Profile Hub MVP with all sections"
```

---

## Summary

**Total Tasks:** 18 tasks across 8 phases

**Phase 1:** Foundation (Types & Store) - 3 tasks
**Phase 2:** Profile Hub Shell - 2 tasks
**Phase 3:** Stories Section - 5 tasks
**Phase 4:** Resume Section - 1 task
**Phase 5:** Documents & About Me - 2 tasks
**Phase 6:** Skills & Quiz - 2 tasks
**Phase 7:** Enhanced Save-from-Chat - 1 task
**Phase 8:** Final Integration - 2 tasks

**Key Files Created:**
- `src/components/ProfileHub/ProfileHub.tsx`
- `src/components/ProfileHub/ResumeSection.tsx`
- `src/components/ProfileHub/StoriesSection.tsx`
- `src/components/ProfileHub/StoryCard.tsx`
- `src/components/ProfileHub/AddStoryModal.tsx`
- `src/components/ProfileHub/DocumentsSection.tsx`
- `src/components/ProfileHub/AboutMeSection.tsx`
- `src/components/ProfileHub/SkillsSection.tsx`
- `src/components/ProfileHub/QuizSection.tsx`

**Key Files Modified:**
- `src/types/index.ts` - Extended SavedStory interface
- `src/stores/appStore.ts` - Added Profile Hub state and story CRUD
- `src/components/Sidebar/Sidebar.tsx` - Added Profile nav item
- `src/App.tsx` - Added ProfileHub component
- `src/services/ai.ts` - Added extractStoryMetadata function
- `src/utils/prompts.ts` - Added/updated prompts

**Deferred to Future:**
- AI Quiz implementation (Confidence Check, Gap Finder)
- Smarter context retrieval with metadata boosting
- Profile completeness indicator
