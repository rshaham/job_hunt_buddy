# Interview Teleprompter Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a distraction-free, large-text teleprompter modal for live interview support with AI-assisted keyword suggestions.

**Architecture:** Modal-based UI with Zustand state management, IndexedDB persistence for sessions/feedback, and real-time AI assist using the configured provider. Categories are dynamic based on interview type.

**Tech Stack:** React, TypeScript, Tailwind CSS, Zustand, Dexie.js, existing AI service

---

## Task 1: Add TypeScript Types

**Files:**
- Modify: `src/types/index.ts`

**Step 1: Add teleprompter types to types/index.ts**

Add the following types after the existing `SavedStory` interface (around line 347):

```typescript
// ============================================================================
// Interview Teleprompter Types
// ============================================================================

// Interview types for teleprompter (extends existing InterviewType for consistency)
export type TeleprompterInterviewType =
  | 'phone_screen'
  | 'behavioral'
  | 'technical'
  | 'case_study'
  | 'panel'
  | 'hiring_manager'
  | 'culture_fit'
  | 'final_round'
  | 'custom';

export const TELEPROMPTER_INTERVIEW_TYPE_LABELS: Record<TeleprompterInterviewType, string> = {
  phone_screen: 'Phone Screen',
  behavioral: 'Behavioral',
  technical: 'Technical',
  case_study: 'Case Study',
  panel: 'Panel Interview',
  hiring_manager: 'Hiring Manager',
  culture_fit: 'Culture Fit',
  final_round: 'Final Round',
  custom: 'Custom',
};

// Categories vary by interview type
export interface TeleprompterCategory {
  id: string;
  name: string;
  keywords: TeleprompterKeyword[];
  isExpanded: boolean;
}

// Individual keyword/phrase on the teleprompter
export interface TeleprompterKeyword {
  id: string;
  text: string;
  source: 'ai-initial' | 'ai-realtime' | 'user' | 'profile';
  inStaging: boolean;  // true = in staging area, false = on main display
}

// Active teleprompter session
export interface TeleprompterSession {
  id: string;
  jobId: string | null;
  interviewType: TeleprompterInterviewType;
  customInterviewType?: string;  // for 'custom' type
  categories: TeleprompterCategory[];
  stagingKeywords: TeleprompterKeyword[];  // AI suggestions not yet promoted
  dismissedKeywordIds: string[];  // track to avoid re-suggesting
  startedAt: Date;
  isActive: boolean;
}

// Feedback from post-interview roundup
export interface TeleprompterFeedback {
  id: string;
  sessionId: string;
  interviewType: TeleprompterInterviewType;
  keywordText: string;
  helpful: boolean;
  savedToProfile: boolean;
  timestamp: Date;
}

// Saved custom interview type
export interface CustomInterviewType {
  id: string;
  name: string;
  createdAt: Date;
}

// Roundup item for post-interview review
export interface TeleprompterRoundupItem {
  keyword: TeleprompterKeyword;
  categoryName: string;
  helpful?: boolean;
  saveToProfile?: boolean;
}
```

**Step 2: Verify the file compiles**

Run: `npm run build`
Expected: No TypeScript errors related to the new types

**Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(teleprompter): add TypeScript types for interview teleprompter"
```

---

## Task 2: Add Database Tables for Persistence

**Files:**
- Modify: `src/services/db.ts`

**Step 1: Add new Dexie tables**

Add imports at the top of db.ts:

```typescript
import type { Job, AppSettings, EmbeddingRecord, EmbeddableEntityType, ProviderType, ProviderSettings, TeleprompterSession, TeleprompterFeedback, CustomInterviewType } from '../types';
```

Update the class definition to add new tables:

```typescript
export class JobHuntDB extends Dexie {
  jobs!: Table<Job, string>;
  settings!: Table<AppSettings, string>;
  embeddings!: Table<EmbeddingRecord, string>;
  teleprompterSessions!: Table<TeleprompterSession, string>;
  teleprompterFeedback!: Table<TeleprompterFeedback, string>;
  customInterviewTypes!: Table<CustomInterviewType, string>;

  constructor() {
    super('JobHuntBuddy');

    // ... existing versions ...

    // Version 3: Add teleprompter tables
    this.version(3).stores({
      jobs: 'id, company, title, status, dateAdded, lastUpdated',
      settings: 'id',
      embeddings: 'id, [entityType+entityId], entityType, parentJobId, createdAt',
      teleprompterSessions: 'id, jobId, isActive, startedAt',
      teleprompterFeedback: 'id, sessionId, interviewType, timestamp',
      customInterviewTypes: 'id, name, createdAt',
    });
  }
}
```

**Step 2: Add CRUD functions for teleprompter data**

Add after the embeddings section:

```typescript
// ============================================================================
// Teleprompter CRUD Operations
// ============================================================================

// Sessions
export async function getActiveSession(): Promise<TeleprompterSession | undefined> {
  return await db.teleprompterSessions.where('isActive').equals(1).first();
}

export async function saveSession(session: TeleprompterSession): Promise<void> {
  await db.teleprompterSessions.put(session);
}

export async function deleteSession(id: string): Promise<void> {
  await db.teleprompterSessions.delete(id);
}

// Feedback
export async function saveFeedback(feedback: TeleprompterFeedback): Promise<void> {
  await db.teleprompterFeedback.put(feedback);
}

export async function saveFeedbackBatch(feedbackItems: TeleprompterFeedback[]): Promise<void> {
  await db.teleprompterFeedback.bulkPut(feedbackItems);
}

export async function getFeedbackByInterviewType(interviewType: string): Promise<TeleprompterFeedback[]> {
  return await db.teleprompterFeedback.where('interviewType').equals(interviewType).toArray();
}

// Custom Interview Types
export async function getCustomInterviewTypes(): Promise<CustomInterviewType[]> {
  return await db.customInterviewTypes.toArray();
}

export async function saveCustomInterviewType(type: CustomInterviewType): Promise<void> {
  await db.customInterviewTypes.put(type);
}

export async function deleteCustomInterviewType(id: string): Promise<void> {
  await db.customInterviewTypes.delete(id);
}
```

**Step 3: Verify the file compiles**

Run: `npm run build`
Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add src/services/db.ts
git commit -m "feat(teleprompter): add database tables for sessions and feedback"
```

---

## Task 3: Add Zustand Store State and Actions

**Files:**
- Modify: `src/stores/appStore.ts`

**Step 1: Add teleprompter state to the store interface**

Find the state interface and add:

```typescript
// Teleprompter state
isTeleprompterModalOpen: boolean;
teleprompterSession: TeleprompterSession | null;
teleprompterPreSelectedJobId: string | null;
customInterviewTypes: CustomInterviewType[];
```

**Step 2: Add initial state values**

In the initial state object, add:

```typescript
isTeleprompterModalOpen: false,
teleprompterSession: null,
teleprompterPreSelectedJobId: null,
customInterviewTypes: [],
```

**Step 3: Add teleprompter actions to the interface**

```typescript
// Teleprompter actions
openTeleprompterModal: (jobId?: string) => void;
closeTeleprompterModal: () => void;
startTeleprompterSession: (jobId: string | null, interviewType: TeleprompterInterviewType, customType?: string) => Promise<void>;
endTeleprompterSession: () => Promise<TeleprompterRoundupItem[]>;
promoteKeywordFromStaging: (keywordId: string, categoryId: string) => void;
dismissStagingKeyword: (keywordId: string) => void;
dismissDisplayedKeyword: (categoryId: string, keywordId: string) => void;
addKeywordsFromAI: (keywords: Array<{ text: string; categoryId: string }>) => void;
toggleCategory: (categoryId: string) => void;
saveTeleprompterFeedback: (items: TeleprompterRoundupItem[]) => Promise<void>;
loadCustomInterviewTypes: () => Promise<void>;
saveCustomInterviewType: (name: string) => Promise<void>;
```

**Step 4: Implement the actions**

```typescript
openTeleprompterModal: (jobId?: string) => set({
  isTeleprompterModalOpen: true,
  teleprompterPreSelectedJobId: jobId || null,
}),

closeTeleprompterModal: () => set({
  isTeleprompterModalOpen: false,
  teleprompterPreSelectedJobId: null,
}),

startTeleprompterSession: async (jobId, interviewType, customType) => {
  const session: TeleprompterSession = {
    id: crypto.randomUUID(),
    jobId,
    interviewType,
    customInterviewType: customType,
    categories: getCategoriesForInterviewType(interviewType),
    stagingKeywords: [],
    dismissedKeywordIds: [],
    startedAt: new Date(),
    isActive: true,
  };
  await saveSession(session);
  set({ teleprompterSession: session });
},

endTeleprompterSession: async () => {
  const { teleprompterSession } = get();
  if (!teleprompterSession) return [];

  // Collect all displayed keywords for roundup
  const roundupItems: TeleprompterRoundupItem[] = [];
  for (const category of teleprompterSession.categories) {
    for (const keyword of category.keywords.filter(k => !k.inStaging)) {
      roundupItems.push({
        keyword,
        categoryName: category.name,
      });
    }
  }

  // Mark session as inactive
  const updatedSession = { ...teleprompterSession, isActive: false };
  await saveSession(updatedSession);

  return roundupItems;
},

promoteKeywordFromStaging: (keywordId, categoryId) => {
  const { teleprompterSession } = get();
  if (!teleprompterSession) return;

  const keyword = teleprompterSession.stagingKeywords.find(k => k.id === keywordId);
  if (!keyword) return;

  const promotedKeyword = { ...keyword, inStaging: false };
  const updatedCategories = teleprompterSession.categories.map(cat => {
    if (cat.id === categoryId) {
      return { ...cat, keywords: [...cat.keywords, promotedKeyword] };
    }
    return cat;
  });

  const updatedSession = {
    ...teleprompterSession,
    categories: updatedCategories,
    stagingKeywords: teleprompterSession.stagingKeywords.filter(k => k.id !== keywordId),
  };

  set({ teleprompterSession: updatedSession });
  saveSession(updatedSession);
},

dismissStagingKeyword: (keywordId) => {
  const { teleprompterSession } = get();
  if (!teleprompterSession) return;

  const updatedSession = {
    ...teleprompterSession,
    stagingKeywords: teleprompterSession.stagingKeywords.filter(k => k.id !== keywordId),
    dismissedKeywordIds: [...teleprompterSession.dismissedKeywordIds, keywordId],
  };

  set({ teleprompterSession: updatedSession });
  saveSession(updatedSession);
},

dismissDisplayedKeyword: (categoryId, keywordId) => {
  const { teleprompterSession } = get();
  if (!teleprompterSession) return;

  const updatedCategories = teleprompterSession.categories.map(cat => {
    if (cat.id === categoryId) {
      return { ...cat, keywords: cat.keywords.filter(k => k.id !== keywordId) };
    }
    return cat;
  });

  const updatedSession = {
    ...teleprompterSession,
    categories: updatedCategories,
    dismissedKeywordIds: [...teleprompterSession.dismissedKeywordIds, keywordId],
  };

  set({ teleprompterSession: updatedSession });
  saveSession(updatedSession);
},

addKeywordsFromAI: (keywords) => {
  const { teleprompterSession } = get();
  if (!teleprompterSession) return;

  // Add directly to categories (real-time AI assist goes straight to display)
  const updatedCategories = [...teleprompterSession.categories];
  for (const { text, categoryId } of keywords) {
    const catIndex = updatedCategories.findIndex(c => c.id === categoryId);
    if (catIndex >= 0) {
      updatedCategories[catIndex] = {
        ...updatedCategories[catIndex],
        keywords: [
          ...updatedCategories[catIndex].keywords,
          {
            id: crypto.randomUUID(),
            text,
            source: 'ai-realtime',
            inStaging: false,
          },
        ],
      };
    }
  }

  const updatedSession = { ...teleprompterSession, categories: updatedCategories };
  set({ teleprompterSession: updatedSession });
  saveSession(updatedSession);
},

toggleCategory: (categoryId) => {
  const { teleprompterSession } = get();
  if (!teleprompterSession) return;

  const updatedCategories = teleprompterSession.categories.map(cat => {
    if (cat.id === categoryId) {
      return { ...cat, isExpanded: !cat.isExpanded };
    }
    return cat;
  });

  const updatedSession = { ...teleprompterSession, categories: updatedCategories };
  set({ teleprompterSession: updatedSession });
},

saveTeleprompterFeedback: async (items) => {
  const { teleprompterSession, settings } = get();
  if (!teleprompterSession) return;

  const feedbackRecords: TeleprompterFeedback[] = items
    .filter(item => item.helpful !== undefined)
    .map(item => ({
      id: crypto.randomUUID(),
      sessionId: teleprompterSession.id,
      interviewType: teleprompterSession.interviewType,
      keywordText: item.keyword.text,
      helpful: item.helpful!,
      savedToProfile: item.saveToProfile || false,
      timestamp: new Date(),
    }));

  await saveFeedbackBatch(feedbackRecords);

  // Save keywords marked for profile to savedStories
  const storiesToAdd = items
    .filter(item => item.saveToProfile)
    .map(item => ({
      id: crypto.randomUUID(),
      question: item.categoryName,
      answer: item.keyword.text,
      category: teleprompterSession.interviewType,
      createdAt: new Date(),
    }));

  if (storiesToAdd.length > 0) {
    const updatedStories = [...(settings.savedStories || []), ...storiesToAdd];
    await get().updateSettings({ savedStories: updatedStories });
  }

  // Clear session
  set({ teleprompterSession: null });
},

loadCustomInterviewTypes: async () => {
  const types = await getCustomInterviewTypes();
  set({ customInterviewTypes: types });
},

saveCustomInterviewType: async (name) => {
  const newType: CustomInterviewType = {
    id: crypto.randomUUID(),
    name,
    createdAt: new Date(),
  };
  await saveCustomInterviewType(newType);
  const { customInterviewTypes } = get();
  set({ customInterviewTypes: [...customInterviewTypes, newType] });
},
```

**Step 5: Add helper function for interview type categories**

Add this helper function before the store creation:

```typescript
function getCategoriesForInterviewType(interviewType: TeleprompterInterviewType): TeleprompterCategory[] {
  const categoryMap: Record<TeleprompterInterviewType, string[]> = {
    phone_screen: ['Company Research', 'Role Fit', 'Questions to Ask', 'Salary Expectations'],
    behavioral: ['Leadership', 'Problem-Solving', 'Collaboration', 'Conflict Resolution', 'Growth Mindset'],
    technical: ['Architecture', 'Problem-Solving', 'Technical Decisions', 'Trade-offs', 'Metrics'],
    case_study: ['Framework', 'Assumptions', 'Analysis', 'Recommendations'],
    panel: ['Key Stakeholders', 'Department Focus', 'Cross-functional', 'Questions'],
    hiring_manager: ['Team Dynamics', 'Expectations', 'Growth Path', 'Working Style'],
    culture_fit: ['Values', 'Work Environment', 'Team Collaboration', 'Company Mission'],
    final_round: ['Key Differentiators', 'Closing Points', 'Questions', 'Next Steps'],
    custom: ['General', 'Key Points', 'Questions'],
  };

  const categoryNames = categoryMap[interviewType] || categoryMap.custom;
  return categoryNames.map(name => ({
    id: crypto.randomUUID(),
    name,
    keywords: [],
    isExpanded: true,
  }));
}
```

**Step 6: Add imports**

Add necessary imports at top of file:

```typescript
import { saveSession, getCustomInterviewTypes, saveCustomInterviewType, saveFeedbackBatch } from '../services/db';
import type { TeleprompterSession, TeleprompterInterviewType, TeleprompterCategory, TeleprompterRoundupItem, TeleprompterFeedback, CustomInterviewType } from '../types';
```

**Step 7: Verify the file compiles**

Run: `npm run build`
Expected: No TypeScript errors

**Step 8: Commit**

```bash
git add src/stores/appStore.ts
git commit -m "feat(teleprompter): add Zustand store state and actions"
```

---

## Task 4: Add AI Prompt for Keyword Generation

**Files:**
- Modify: `src/utils/prompts.ts`

**Step 1: Add teleprompter prompt**

Add at the end of the file:

```typescript
export const TELEPROMPTER_INITIAL_KEYWORDS_PROMPT = `You are helping someone prepare for a job interview. Generate memory-jogging keywords and short phrases for their interview teleprompter.

INTERVIEW CONTEXT:
Interview Type: {interviewType}
Company: {company}
Job Title: {title}
Job Requirements: {requirements}
User's Key Skills: {userSkills}
User's Stories/Experiences: {userStories}

Generate 3-5 relevant keywords or short phrases (max 6 words each) for EACH of these categories:
{categories}

The keywords should:
- Be memory joggers, NOT full sentences
- Reference specific experiences, metrics, or accomplishments from the user's background
- Be directly relevant to the interview type and job requirements
- Help the candidate recall their best talking points

Return ONLY valid JSON with this exact structure:
{
  "categories": [
    {
      "categoryId": "the-category-id",
      "keywords": ["keyword1", "keyword2", "keyword3"]
    }
  ]
}`;

export const TELEPROMPTER_REALTIME_ASSIST_PROMPT = `You are helping someone DURING a live job interview. They just typed a keyword and need quick memory joggers.

CONTEXT:
Interview Type: {interviewType}
Company: {company}
User typed: {userInput}
Current keywords on display: {currentKeywords}
User's background: {userBackground}

Generate 3-5 SHORT memory-jogging phrases (max 6 words each) related to their input.
- Pull from their actual experience when possible
- Make them scannable at a glance
- Do NOT repeat keywords already on display

Assign each to the most appropriate category from: {categoryIds}

Return ONLY valid JSON:
{
  "keywords": [
    { "text": "phrase here", "categoryId": "category-id" }
  ]
}`;
```

**Step 2: Verify the file compiles**

Run: `npm run build`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add src/utils/prompts.ts
git commit -m "feat(teleprompter): add AI prompts for keyword generation"
```

---

## Task 5: Add AI Service Functions

**Files:**
- Modify: `src/services/ai.ts`

**Step 1: Add teleprompter AI functions**

Add these functions (find appropriate location, likely near end of file):

```typescript
export async function generateTeleprompterKeywords(
  interviewType: string,
  job: Job | null,
  categories: Array<{ id: string; name: string }>,
  userSkills: string[],
  userStories: Array<{ question: string; answer: string }>
): Promise<Array<{ categoryId: string; keywords: string[] }>> {
  const prompt = TELEPROMPTER_INITIAL_KEYWORDS_PROMPT
    .replace('{interviewType}', interviewType)
    .replace('{company}', job?.company || 'Unknown Company')
    .replace('{title}', job?.title || 'Unknown Role')
    .replace('{requirements}', job?.summary?.requirements?.join(', ') || 'Not specified')
    .replace('{userSkills}', userSkills.join(', ') || 'Not provided')
    .replace('{userStories}', userStories.map(s => `${s.question}: ${s.answer}`).join('\n') || 'Not provided')
    .replace('{categories}', categories.map(c => `- ${c.name} (id: ${c.id})`).join('\n'));

  const response = await callAI([{ role: 'user', content: prompt }]);
  const jsonStr = extractJSON(response);
  const parsed = JSON.parse(jsonStr);
  return parsed.categories || [];
}

export async function generateRealtimeTeleprompterKeywords(
  userInput: string,
  interviewType: string,
  company: string,
  currentKeywords: string[],
  userBackground: string,
  categoryIds: string[]
): Promise<Array<{ text: string; categoryId: string }>> {
  const prompt = TELEPROMPTER_REALTIME_ASSIST_PROMPT
    .replace('{interviewType}', interviewType)
    .replace('{company}', company)
    .replace('{userInput}', userInput)
    .replace('{currentKeywords}', currentKeywords.join(', ') || 'None')
    .replace('{userBackground}', userBackground)
    .replace('{categoryIds}', categoryIds.join(', '));

  const response = await callAI([{ role: 'user', content: prompt }]);
  const jsonStr = extractJSON(response);
  const parsed = JSON.parse(jsonStr);
  return parsed.keywords || [];
}
```

**Step 2: Add import for prompts**

```typescript
import { TELEPROMPTER_INITIAL_KEYWORDS_PROMPT, TELEPROMPTER_REALTIME_ASSIST_PROMPT } from '../utils/prompts';
```

**Step 3: Verify the file compiles**

Run: `npm run build`
Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add src/services/ai.ts
git commit -m "feat(teleprompter): add AI service functions for keyword generation"
```

---

## Task 6: Create TeleprompterModal Component - Setup Selection Screen

**Files:**
- Create: `src/components/TeleprompterModal/TeleprompterModal.tsx`
- Create: `src/components/TeleprompterModal/index.ts`

**Step 1: Create index.ts**

```typescript
export { TeleprompterModal } from './TeleprompterModal';
```

**Step 2: Create TeleprompterModal.tsx with setup screen**

Use **@frontend-design:frontend-design** skill to design a clean, large-text setup screen with:
- Job dropdown (or "No job" option)
- Interview type selection (fixed list + custom input)
- "Start Interview" button
- Large, accessible typography

The modal should:
- NOT close on backdrop click (protected)
- NOT close on Escape key during active session
- Use size="full" for maximum space

```typescript
import { useState, useEffect, useCallback } from 'react';
import { X, ChevronDown, Play, Plus } from 'lucide-react';
import { cn } from '../../utils/helpers';
import { useAppStore } from '../../stores/appStore';
import {
  TeleprompterInterviewType,
  TELEPROMPTER_INTERVIEW_TYPE_LABELS
} from '../../types';

interface TeleprompterModalProps {}

type ModalState = 'setup' | 'active' | 'roundup';

export function TeleprompterModal({}: TeleprompterModalProps) {
  const {
    isTeleprompterModalOpen,
    closeTeleprompterModal,
    teleprompterPreSelectedJobId,
    teleprompterSession,
    jobs,
    customInterviewTypes,
    startTeleprompterSession,
    loadCustomInterviewTypes,
  } = useAppStore();

  const [modalState, setModalState] = useState<ModalState>('setup');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedInterviewType, setSelectedInterviewType] = useState<TeleprompterInterviewType>('behavioral');
  const [customTypeName, setCustomTypeName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Initialize with pre-selected job
  useEffect(() => {
    if (isTeleprompterModalOpen) {
      setSelectedJobId(teleprompterPreSelectedJobId);
      loadCustomInterviewTypes();

      // Resume active session if exists
      if (teleprompterSession?.isActive) {
        setModalState('active');
      } else {
        setModalState('setup');
      }
    }
  }, [isTeleprompterModalOpen, teleprompterPreSelectedJobId, teleprompterSession, loadCustomInterviewTypes]);

  const handleStart = useCallback(async () => {
    setIsLoading(true);
    try {
      const customType = selectedInterviewType === 'custom' ? customTypeName : undefined;
      await startTeleprompterSession(selectedJobId, selectedInterviewType, customType);
      setModalState('active');
    } finally {
      setIsLoading(false);
    }
  }, [selectedJobId, selectedInterviewType, customTypeName, startTeleprompterSession]);

  // Protected close - only from explicit action
  const handleClose = useCallback(() => {
    if (modalState === 'active') {
      // Don't allow close during active session - must end interview first
      return;
    }
    closeTeleprompterModal();
    setModalState('setup');
    setSelectedJobId(null);
    setCustomTypeName('');
  }, [modalState, closeTeleprompterModal]);

  if (!isTeleprompterModalOpen) return null;

  const selectedJob = selectedJobId ? jobs.find(j => j.id === selectedJobId) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop - does NOT close on click */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-surface rounded-lg shadow-xl w-full max-w-5xl h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-2xl font-semibold text-foreground">
            Interview Teleprompter
          </h2>
          {modalState !== 'active' && (
            <button
              onClick={handleClose}
              className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="w-6 h-6 text-foreground-muted" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {modalState === 'setup' && (
            <SetupScreen
              jobs={jobs}
              selectedJobId={selectedJobId}
              onJobSelect={setSelectedJobId}
              selectedInterviewType={selectedInterviewType}
              onInterviewTypeSelect={setSelectedInterviewType}
              customTypeName={customTypeName}
              onCustomTypeNameChange={setCustomTypeName}
              customInterviewTypes={customInterviewTypes}
              onStart={handleStart}
              isLoading={isLoading}
            />
          )}

          {modalState === 'active' && (
            <ActiveScreen onEndInterview={() => setModalState('roundup')} />
          )}

          {modalState === 'roundup' && (
            <RoundupScreen onComplete={handleClose} />
          )}
        </div>
      </div>
    </div>
  );
}

// Setup Screen Component
interface SetupScreenProps {
  jobs: Job[];
  selectedJobId: string | null;
  onJobSelect: (id: string | null) => void;
  selectedInterviewType: TeleprompterInterviewType;
  onInterviewTypeSelect: (type: TeleprompterInterviewType) => void;
  customTypeName: string;
  onCustomTypeNameChange: (name: string) => void;
  customInterviewTypes: CustomInterviewType[];
  onStart: () => void;
  isLoading: boolean;
}

function SetupScreen({
  jobs,
  selectedJobId,
  onJobSelect,
  selectedInterviewType,
  onInterviewTypeSelect,
  customTypeName,
  onCustomTypeNameChange,
  customInterviewTypes,
  onStart,
  isLoading,
}: SetupScreenProps) {
  const interviewTypes = Object.entries(TELEPROMPTER_INTERVIEW_TYPE_LABELS) as [TeleprompterInterviewType, string][];

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div className="text-center">
        <h3 className="text-3xl font-bold text-foreground mb-2">
          Get Ready for Your Interview
        </h3>
        <p className="text-lg text-foreground-muted">
          Select your job and interview type to begin
        </p>
      </div>

      {/* Job Selection */}
      <div className="space-y-3">
        <label className="block text-xl font-medium text-foreground">
          Job (optional)
        </label>
        <select
          value={selectedJobId || ''}
          onChange={(e) => onJobSelect(e.target.value || null)}
          className="w-full px-4 py-4 text-xl border border-border rounded-lg bg-surface text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
        >
          <option value="">No job selected</option>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.company} - {job.title}
            </option>
          ))}
        </select>
      </div>

      {/* Interview Type Selection */}
      <div className="space-y-3">
        <label className="block text-xl font-medium text-foreground">
          Interview Type
        </label>
        <div className="grid grid-cols-2 gap-3">
          {interviewTypes.map(([type, label]) => (
            <button
              key={type}
              onClick={() => onInterviewTypeSelect(type)}
              className={cn(
                'px-4 py-4 text-lg font-medium rounded-lg border-2 transition-colors',
                selectedInterviewType === type
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-primary/50 text-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Custom type input */}
        {selectedInterviewType === 'custom' && (
          <input
            type="text"
            value={customTypeName}
            onChange={(e) => onCustomTypeNameChange(e.target.value)}
            placeholder="Enter interview type..."
            className="w-full px-4 py-4 text-xl border border-border rounded-lg bg-surface text-foreground focus:ring-2 focus:ring-primary mt-3"
          />
        )}

        {/* Saved custom types */}
        {customInterviewTypes.length > 0 && (
          <div className="mt-3">
            <p className="text-sm text-foreground-muted mb-2">Saved types:</p>
            <div className="flex flex-wrap gap-2">
              {customInterviewTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => {
                    onInterviewTypeSelect('custom');
                    onCustomTypeNameChange(type.name);
                  }}
                  className="px-3 py-1 text-sm bg-surface-raised rounded-full text-foreground-muted hover:text-foreground"
                >
                  {type.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Start Button */}
      <button
        onClick={onStart}
        disabled={isLoading || (selectedInterviewType === 'custom' && !customTypeName.trim())}
        className={cn(
          'w-full py-5 text-2xl font-bold rounded-lg flex items-center justify-center gap-3',
          'bg-primary text-white hover:bg-primary/90 transition-colors',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        {isLoading ? (
          'Preparing...'
        ) : (
          <>
            <Play className="w-7 h-7" />
            Start Interview
          </>
        )}
      </button>
    </div>
  );
}

// Placeholder components - will be implemented in next tasks
function ActiveScreen({ onEndInterview }: { onEndInterview: () => void }) {
  return <div>Active Screen - Coming in Task 7</div>;
}

function RoundupScreen({ onComplete }: { onComplete: () => void }) {
  return <div>Roundup Screen - Coming in Task 8</div>;
}
```

**Step 3: Add Job type import**

```typescript
import type { Job, TeleprompterInterviewType, CustomInterviewType } from '../../types';
```

**Step 4: Verify the file compiles**

Run: `npm run build`
Expected: No TypeScript errors

**Step 5: Commit**

```bash
git add src/components/TeleprompterModal/
git commit -m "feat(teleprompter): create modal component with setup screen"
```

---

## Task 7: Implement Active Teleprompter Screen

**Files:**
- Modify: `src/components/TeleprompterModal/TeleprompterModal.tsx`

**Step 1: Replace ActiveScreen placeholder**

Use **@frontend-design:frontend-design** skill to create the active teleprompter display:

Requirements:
- **LARGE TEXT** - minimum 24px for keywords, 18px for UI
- Expandable/collapsible categories
- Click-to-dismiss keywords
- Always-visible large text input at bottom
- "End Interview" button (protected with confirmation)
- Staging area for initial AI suggestions (smaller, muted)
- Dark mode support

```typescript
interface ActiveScreenProps {
  onEndInterview: () => void;
}

function ActiveScreen({ onEndInterview }: ActiveScreenProps) {
  const {
    teleprompterSession,
    jobs,
    settings,
    promoteKeywordFromStaging,
    dismissStagingKeyword,
    dismissDisplayedKeyword,
    addKeywordsFromAI,
    toggleCategory,
  } = useAppStore();

  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const job = teleprompterSession?.jobId
    ? jobs.find(j => j.id === teleprompterSession.jobId)
    : null;

  const handleInputSubmit = useCallback(async () => {
    if (!inputValue.trim() || !teleprompterSession || isGenerating) return;

    setIsGenerating(true);
    try {
      const currentKeywords = teleprompterSession.categories
        .flatMap(c => c.keywords.map(k => k.text));

      const categoryIds = teleprompterSession.categories.map(c => c.id);

      const keywords = await generateRealtimeTeleprompterKeywords(
        inputValue,
        TELEPROMPTER_INTERVIEW_TYPE_LABELS[teleprompterSession.interviewType],
        job?.company || 'Unknown',
        currentKeywords,
        settings.additionalContext || settings.defaultResumeText || '',
        categoryIds
      );

      addKeywordsFromAI(keywords);
      setInputValue('');
    } catch (error) {
      console.error('Error generating keywords:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [inputValue, teleprompterSession, job, settings, isGenerating, addKeywordsFromAI]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleInputSubmit();
    }
  }, [handleInputSubmit]);

  if (!teleprompterSession) return null;

  return (
    <div className="h-full flex flex-col">
      {/* Top bar with job info and end button */}
      <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
        <div>
          <h3 className="text-2xl font-bold text-foreground">
            {job ? `${job.company} - ${job.title}` : 'Interview Mode'}
          </h3>
          <p className="text-lg text-foreground-muted">
            {TELEPROMPTER_INTERVIEW_TYPE_LABELS[teleprompterSession.interviewType]}
            {teleprompterSession.customInterviewType && `: ${teleprompterSession.customInterviewType}`}
          </p>
        </div>
        <button
          onClick={() => setShowEndConfirm(true)}
          className="px-6 py-3 text-lg font-semibold bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          End Interview
        </button>
      </div>

      {/* Staging area for initial suggestions */}
      {teleprompterSession.stagingKeywords.length > 0 && (
        <div className="mb-4 p-4 bg-surface-raised rounded-lg border border-border">
          <p className="text-sm text-foreground-muted mb-2">
            AI Suggestions (click to add to display):
          </p>
          <div className="flex flex-wrap gap-2">
            {teleprompterSession.stagingKeywords.map((keyword) => (
              <button
                key={keyword.id}
                onClick={() => {
                  // Find appropriate category (first one for now)
                  const firstCategory = teleprompterSession.categories[0];
                  if (firstCategory) {
                    promoteKeywordFromStaging(keyword.id, firstCategory.id);
                  }
                }}
                className="px-3 py-2 text-base bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors"
              >
                {keyword.text}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissStagingKeyword(keyword.id);
                  }}
                  className="ml-2 text-primary/60 hover:text-primary"
                >
                  ×
                </button>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main keyword display - categories */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {teleprompterSession.categories.map((category) => (
          <div key={category.id} className="border border-border rounded-lg overflow-hidden">
            {/* Category header */}
            <button
              onClick={() => toggleCategory(category.id)}
              className="w-full flex items-center justify-between px-4 py-3 bg-surface-raised hover:bg-surface transition-colors"
            >
              <span className="text-xl font-semibold text-foreground">
                {category.name}
              </span>
              <ChevronDown
                className={cn(
                  'w-6 h-6 text-foreground-muted transition-transform',
                  category.isExpanded && 'rotate-180'
                )}
              />
            </button>

            {/* Keywords */}
            {category.isExpanded && (
              <div className="p-4 flex flex-wrap gap-3">
                {category.keywords.filter(k => !k.inStaging).length === 0 ? (
                  <p className="text-lg text-foreground-muted italic">
                    No keywords yet. Type below to add some.
                  </p>
                ) : (
                  category.keywords
                    .filter(k => !k.inStaging)
                    .map((keyword) => (
                      <button
                        key={keyword.id}
                        onClick={() => dismissDisplayedKeyword(category.id, keyword.id)}
                        className={cn(
                          'px-4 py-3 text-2xl font-medium rounded-lg transition-all',
                          'hover:opacity-70 hover:line-through cursor-pointer',
                          keyword.source === 'profile' && 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200',
                          keyword.source === 'ai-initial' && 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
                          keyword.source === 'ai-realtime' && 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
                          keyword.source === 'user' && 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200'
                        )}
                      >
                        {keyword.text}
                      </button>
                    ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input area - always visible at bottom */}
      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex gap-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a keyword for AI suggestions..."
            disabled={isGenerating}
            className="flex-1 px-4 py-4 text-xl border border-border rounded-lg bg-surface text-foreground focus:ring-2 focus:ring-primary disabled:opacity-50"
          />
          <button
            onClick={handleInputSubmit}
            disabled={!inputValue.trim() || isGenerating}
            className="px-6 py-4 text-xl font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isGenerating ? '...' : 'Add'}
          </button>
        </div>
      </div>

      {/* End confirmation modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50">
          <div className="bg-surface rounded-lg p-6 max-w-md mx-4">
            <h4 className="text-xl font-bold text-foreground mb-2">
              End Interview?
            </h4>
            <p className="text-foreground-muted mb-4">
              You'll be able to review which keywords were helpful before closing.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-surface-raised transition-colors"
              >
                Continue Interview
              </button>
              <button
                onClick={() => {
                  setShowEndConfirm(false);
                  onEndInterview();
                }}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                End Interview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Add necessary imports**

```typescript
import { generateRealtimeTeleprompterKeywords } from '../../services/ai';
```

**Step 3: Verify the file compiles**

Run: `npm run build`
Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add src/components/TeleprompterModal/TeleprompterModal.tsx
git commit -m "feat(teleprompter): implement active interview screen with large text display"
```

---

## Task 8: Implement Roundup Screen

**Files:**
- Modify: `src/components/TeleprompterModal/TeleprompterModal.tsx`

**Step 1: Replace RoundupScreen placeholder**

```typescript
interface RoundupScreenProps {
  onComplete: () => void;
}

function RoundupScreen({ onComplete }: RoundupScreenProps) {
  const {
    endTeleprompterSession,
    saveTeleprompterFeedback,
    saveCustomInterviewType,
    teleprompterSession,
  } = useAppStore();

  const [roundupItems, setRoundupItems] = useState<TeleprompterRoundupItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [askSaveCustomType, setAskSaveCustomType] = useState(false);

  // Load roundup items on mount
  useEffect(() => {
    const loadRoundup = async () => {
      const items = await endTeleprompterSession();
      setRoundupItems(items);

      // Check if custom type should be saved
      if (teleprompterSession?.interviewType === 'custom' && teleprompterSession.customInterviewType) {
        setAskSaveCustomType(true);
      }
    };
    loadRoundup();
  }, [endTeleprompterSession, teleprompterSession]);

  const toggleHelpful = useCallback((index: number, helpful: boolean) => {
    setRoundupItems(items => items.map((item, i) =>
      i === index ? { ...item, helpful: item.helpful === helpful ? undefined : helpful } : item
    ));
  }, []);

  const toggleSaveToProfile = useCallback((index: number) => {
    setRoundupItems(items => items.map((item, i) =>
      i === index ? { ...item, saveToProfile: !item.saveToProfile } : item
    ));
  }, []);

  const handleComplete = useCallback(async () => {
    setIsSaving(true);
    try {
      await saveTeleprompterFeedback(roundupItems);
      onComplete();
    } finally {
      setIsSaving(false);
    }
  }, [roundupItems, saveTeleprompterFeedback, onComplete]);

  const handleSaveCustomType = useCallback(async () => {
    if (teleprompterSession?.customInterviewType) {
      await saveCustomInterviewType(teleprompterSession.customInterviewType);
    }
    setAskSaveCustomType(false);
  }, [teleprompterSession, saveCustomInterviewType]);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <h3 className="text-3xl font-bold text-foreground mb-2">
          Interview Complete!
        </h3>
        <p className="text-lg text-foreground-muted">
          Review which keywords helped you. This feedback improves future suggestions.
        </p>
      </div>

      {/* Custom type save prompt */}
      {askSaveCustomType && (
        <div className="mb-6 p-4 bg-primary/10 border border-primary/30 rounded-lg flex items-center justify-between">
          <p className="text-foreground">
            Save "{teleprompterSession?.customInterviewType}" as a custom interview type?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setAskSaveCustomType(false)}
              className="px-3 py-1 text-foreground-muted hover:text-foreground"
            >
              No
            </button>
            <button
              onClick={handleSaveCustomType}
              className="px-3 py-1 bg-primary text-white rounded hover:bg-primary/90"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Roundup items */}
      <div className="space-y-3 mb-6">
        {roundupItems.length === 0 ? (
          <p className="text-center text-foreground-muted py-8">
            No keywords were displayed during this interview.
          </p>
        ) : (
          roundupItems.map((item, index) => (
            <div
              key={item.keyword.id}
              className="flex items-center gap-4 p-4 bg-surface-raised rounded-lg border border-border"
            >
              <div className="flex-1">
                <p className="text-xl font-medium text-foreground">
                  {item.keyword.text}
                </p>
                <p className="text-sm text-foreground-muted">
                  {item.categoryName}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Helpful buttons */}
                <button
                  onClick={() => toggleHelpful(index, true)}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    item.helpful === true
                      ? 'bg-green-500 text-white'
                      : 'bg-surface hover:bg-green-100 dark:hover:bg-green-900/30 text-foreground-muted'
                  )}
                  title="Helpful"
                >
                  <ThumbsUp className="w-5 h-5" />
                </button>
                <button
                  onClick={() => toggleHelpful(index, false)}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    item.helpful === false
                      ? 'bg-red-500 text-white'
                      : 'bg-surface hover:bg-red-100 dark:hover:bg-red-900/30 text-foreground-muted'
                  )}
                  title="Not helpful"
                >
                  <ThumbsDown className="w-5 h-5" />
                </button>

                {/* Save to profile */}
                <button
                  onClick={() => toggleSaveToProfile(index)}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    item.saveToProfile
                      ? 'bg-amber-500 text-white'
                      : 'bg-surface hover:bg-amber-100 dark:hover:bg-amber-900/30 text-foreground-muted'
                  )}
                  title="Save to profile"
                >
                  <Bookmark className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Done button */}
      <button
        onClick={handleComplete}
        disabled={isSaving}
        className="w-full py-4 text-xl font-bold bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {isSaving ? 'Saving...' : 'Done'}
      </button>
    </div>
  );
}
```

**Step 2: Add icon imports**

```typescript
import { X, ChevronDown, Play, Plus, ThumbsUp, ThumbsDown, Bookmark } from 'lucide-react';
```

**Step 3: Add type import**

```typescript
import type { TeleprompterRoundupItem } from '../../types';
```

**Step 4: Verify the file compiles**

Run: `npm run build`
Expected: No TypeScript errors

**Step 5: Commit**

```bash
git add src/components/TeleprompterModal/TeleprompterModal.tsx
git commit -m "feat(teleprompter): implement post-interview roundup screen"
```

---

## Task 9: Add Sidebar Navigation Item

**Files:**
- Modify: `src/components/Sidebar/Sidebar.tsx`

**Step 1: Add Teleprompter to sidebar navigation**

Add import for icon:
```typescript
import { LayoutGrid, Compass, Sparkles, Settings, Sun, Moon, HelpCircle, Radio } from 'lucide-react';
```

Add to store destructuring:
```typescript
openTeleprompterModal,
```

Add to mainItems array (after Coach):
```typescript
const mainItems: SidebarItem[] = [
  { id: 'board', icon: LayoutGrid, label: 'Jobs', onClick: () => {} },
  { id: 'find', icon: Compass, label: 'Find Jobs', onClick: openJobFinderModal },
  { id: 'coach', icon: Sparkles, label: 'Coach', onClick: openCareerCoachModal },
  { id: 'teleprompter', icon: Radio, label: 'Teleprompter', onClick: () => openTeleprompterModal() },
  { id: 'settings', icon: Settings, label: 'Settings', onClick: openSettingsModal },
];
```

**Step 2: Verify the file compiles**

Run: `npm run build`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add src/components/Sidebar/Sidebar.tsx
git commit -m "feat(teleprompter): add teleprompter to sidebar navigation"
```

---

## Task 10: Wire Up Modal in App.tsx

**Files:**
- Modify: `src/App.tsx`

**Step 1: Import TeleprompterModal**

```typescript
import { TeleprompterModal } from './components/TeleprompterModal';
```

**Step 2: Add modal to render**

Find where other modals are rendered (near SettingsModal, CareerCoachModal, etc.) and add:

```typescript
<TeleprompterModal />
```

**Step 3: Verify the file compiles**

Run: `npm run build`
Expected: No TypeScript errors

**Step 4: Test the integration**

Run: `npm run dev`
- Click Teleprompter in sidebar
- Verify modal opens
- Verify setup screen displays
- Test job selection dropdown
- Test interview type selection
- Close modal

**Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat(teleprompter): wire up modal in App.tsx"
```

---

## Task 11: Add "Start Interview" Button to Job Detail

**Files:**
- Modify: `src/components/JobDetail/JobDetailView.tsx` (or appropriate tab)

**Step 1: Add button to launch teleprompter**

Find appropriate location (likely in the header or Interviews tab) and add:

```typescript
const { openTeleprompterModal } = useAppStore();

// In the render, add button:
<button
  onClick={() => openTeleprompterModal(job.id)}
  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
>
  <Radio className="w-4 h-4" />
  Start Interview Mode
</button>
```

**Step 2: Add import**

```typescript
import { Radio } from 'lucide-react';
```

**Step 3: Verify the file compiles**

Run: `npm run build`
Expected: No TypeScript errors

**Step 4: Test the integration**

- Open a job detail view
- Click "Start Interview Mode"
- Verify teleprompter opens with job pre-selected

**Step 5: Commit**

```bash
git add src/components/JobDetail/
git commit -m "feat(teleprompter): add Start Interview button to job detail"
```

---

## Task 12: Generate Initial Keywords on Session Start

**Files:**
- Modify: `src/stores/appStore.ts`

**Step 1: Enhance startTeleprompterSession to generate initial keywords**

Update the `startTeleprompterSession` action to call AI for initial suggestions:

```typescript
startTeleprompterSession: async (jobId, interviewType, customType) => {
  const { jobs, settings } = get();
  const job = jobId ? jobs.find(j => j.id === jobId) : null;

  const categories = getCategoriesForInterviewType(interviewType);

  const session: TeleprompterSession = {
    id: crypto.randomUUID(),
    jobId,
    interviewType,
    customInterviewType: customType,
    categories,
    stagingKeywords: [],
    dismissedKeywordIds: [],
    startedAt: new Date(),
    isActive: true,
  };

  // Save initial session
  await saveSession(session);
  set({ teleprompterSession: session });

  // Generate initial keywords in background
  try {
    const categoryInfo = categories.map(c => ({ id: c.id, name: c.name }));
    const userSkills = settings.additionalContext?.split(',').map(s => s.trim()) || [];
    const userStories = settings.savedStories || [];

    const keywordsByCategory = await generateTeleprompterKeywords(
      TELEPROMPTER_INTERVIEW_TYPE_LABELS[interviewType] + (customType ? `: ${customType}` : ''),
      job,
      categoryInfo,
      userSkills,
      userStories
    );

    // Add to staging area
    const stagingKeywords: TeleprompterKeyword[] = [];
    for (const { categoryId, keywords } of keywordsByCategory) {
      for (const text of keywords) {
        stagingKeywords.push({
          id: crypto.randomUUID(),
          text,
          source: 'ai-initial',
          inStaging: true,
        });
      }
    }

    const updatedSession = { ...session, stagingKeywords };
    await saveSession(updatedSession);
    set({ teleprompterSession: updatedSession });
  } catch (error) {
    console.error('Error generating initial keywords:', error);
    // Continue without initial keywords - user can still type
  }
},
```

**Step 2: Add import**

```typescript
import { generateTeleprompterKeywords } from '../services/ai';
import { TELEPROMPTER_INTERVIEW_TYPE_LABELS } from '../types';
```

**Step 3: Verify the file compiles**

Run: `npm run build`
Expected: No TypeScript errors

**Step 4: Test the feature**

- Start a new teleprompter session
- Verify AI generates initial keyword suggestions
- Verify they appear in staging area
- Test promoting keywords to display

**Step 5: Commit**

```bash
git add src/stores/appStore.ts
git commit -m "feat(teleprompter): generate initial AI keywords on session start"
```

---

## Task 13: Final Integration Testing & Polish

**Files:**
- Various (as needed for fixes)

**Step 1: Full feature walkthrough**

Test complete flow:
1. Open teleprompter from sidebar (no job)
2. Select interview type
3. Start interview
4. Verify initial keywords generate
5. Promote some keywords from staging
6. Type a keyword in input
7. Verify AI generates real-time suggestions
8. Click keywords to dismiss
9. End interview
10. Review roundup screen
11. Mark keywords as helpful/not helpful
12. Save some to profile
13. Complete roundup
14. Verify feedback saved

**Step 2: Test from job detail**

1. Open a job
2. Click "Start Interview Mode"
3. Verify job is pre-selected
4. Complete flow

**Step 3: Test persistence**

1. Start session
2. Close browser (not via End Interview)
3. Reopen app
4. Click teleprompter
5. Verify session resumes

**Step 4: Apply visual polish with frontend-design skill**

Use **@frontend-design:frontend-design** to review and polish:
- Large text consistency (24px+ for keywords)
- Dark mode colors
- Spacing and visual hierarchy
- Accessibility (focus states, contrast)

**Step 5: Run lint and build**

```bash
npm run lint
npm run build
```

Fix any issues.

**Step 6: Final commit**

```bash
git add -A
git commit -m "feat(teleprompter): complete interview teleprompter feature

- Setup screen with job and interview type selection
- Active screen with large-text keyword display
- Real-time AI assist via text input
- Post-interview roundup with feedback
- Sidebar navigation integration
- Job detail launch button
- Session persistence
- Feedback loop for AI improvement"
```

---

## Summary

This plan implements the Interview Teleprompter in 13 tasks:

1. **Types** - TypeScript interfaces
2. **Database** - Dexie tables for persistence
3. **Store** - Zustand state and actions
4. **Prompts** - AI prompt templates
5. **AI Service** - Keyword generation functions
6. **Modal Setup** - Setup screen component
7. **Active Screen** - Main teleprompter display
8. **Roundup Screen** - Post-interview feedback
9. **Sidebar** - Navigation item
10. **App.tsx** - Modal wiring
11. **Job Detail** - Launch button
12. **Initial Keywords** - AI generation on start
13. **Testing & Polish** - Integration and visual refinement

Each task is atomic and can be committed independently. Use **@frontend-design:frontend-design** skill during Tasks 6, 7, 8, and 13 for visual design.
