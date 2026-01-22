# Profile Hub Design

## Overview

A dedicated top-level screen for managing everything the AI knows about the user. Consolidates profile-related features currently scattered in Settings into a cohesive "who I am" experience.

**Goals:**
1. Enrich story structure so AI can distinguish similar experiences
2. Move profile management out of Settings into a prominent, dedicated screen
3. Add AI quiz to validate knowledge and find gaps
4. Improve AI context utilization across all features

## Structure

### Navigation
- New header item: "My Profile" (same level as Kanban board)
- Settings modal links to Profile Hub for profile-related items
- Entry points from empty states when profile data is needed

### Tabs (6 total)
1. **Resume** - View/upload default resume, extracted skills
2. **Stories** - Enriched experience bank (core improvement)
3. **Documents** - Context PDFs with summaries
4. **About Me** - Free-text additional context
5. **Skills** - Visualized skill profile from all sources
6. **AI Quiz** - Confidence check and gap finder

## Stories Tab (Core Improvement)

### Current Story Structure
```typescript
interface SavedStory {
  id: string;
  question: string;
  answer: string;
  category?: string;
  createdAt: Date;
}
```

### New Enriched Story Structure
```typescript
interface EnrichedStory {
  id: string;

  // Core content (existing)
  question: string;      // "Tell me about a time you led a difficult project"
  answer: string;        // The full story

  // Time & Place (new)
  company?: string;      // "Acme Corp"
  role?: string;         // "Senior Engineer"
  projectName?: string;  // "Cloud Migration Initiative"
  timeframe?: string;    // "Q2 2023" or "2022-2023"

  // Impact (new)
  outcome?: string;      // "Reduced costs by 40%, promoted afterward"
  lessonsLearned?: string;

  // Classification (new)
  skills: string[];      // ["leadership", "technical", "communication"]
  category?: string;     // Kept for backward compatibility

  // Metadata
  source: 'manual' | 'chat' | 'import';
  sourceJobId?: string;  // If saved from a job's prep chat
  createdAt: Date;
  updatedAt: Date;
}
```

### Story List View
- Cards showing question, company, timeframe, skill tags
- Filter by skill, company, or time period
- Search across all story content

### Story Add/Edit View
- AI-assisted extraction from raw text
- Form with all fields (optional ones clearly marked)
- Preview how AI will see this story

## Adding Stories (Two Paths)

### Path 1: AI-Assisted Manual Entry (New)

1. User clicks "Add Story" → Modal opens
2. Paste raw content into text area
3. Click "Extract with AI"
4. AI returns structured suggestion:
   - Suggested question/topic
   - Cleaned-up answer
   - Extracted: company, role, timeframe, outcome
   - Suggested skill tags
5. User reviews & edits all fields
6. Save to bank

### Path 2: Save from Chat (Enhanced Existing)

**Current flow:** "Save to Memory" → AI rewrites Q&A → Simple story saved

**Enhanced flow:**
- Same trigger ("Save to Memory" button)
- AI extracts full metadata (company from job context, skills, outcome)
- Auto-populates `sourceJobId`
- User sees quick confirmation with extracted fields (can edit or accept)

**CRITICAL:** Do not break existing save-from-chat functionality. Enhancement only.

**Prompt update:** `REWRITE_FOR_MEMORY_PROMPT` returns JSON with all new fields.

## AI Quiz Feature

### Purpose
Validate AI knowledge accuracy and identify coverage gaps.

### Mode 1: Confidence Check
"Can the AI accurately recall my stories?"

- User selects a story (or "random")
- AI shown ONLY the question/topic, not the answer
- AI attempts to reconstruct the story
- Side-by-side comparison: AI recall vs. actual story
- Feedback: "Matched key details" / "Missed outcome" / "Confused with another story"

**Use case:** Before an interview, verify AI won't misrepresent you.

### Mode 2: Gap Finder
"What questions can't the AI answer about me?"

- AI analyzes story bank against common behavioral categories:
  - Leadership, Conflict Resolution, Failure/Learning, Technical Challenge, Teamwork, Initiative, Communication
- Surfaces gaps: "You have 0 stories about handling failure"
- Surfaces imbalances: "All leadership stories are from the same company"
- Suggests questions to add stories for

**UI:** Single "AI Quiz" tab with toggle between modes. Results are actionable - "Add story" button next to each gap.

## Other Tabs

### Resume Tab
- View current default resume (formatted preview)
- Upload new resume
- "Extract Skills" button to refresh skill profile
- Show extracted skills as tags

### Documents Tab
- List of uploaded PDFs: name, word count, date
- Toggle "Use summary" vs "Use full text" per document
- Summarize button for documents without summaries
- Upload/delete functionality
- *Relocated from Settings, minimal changes*

### About Me Tab
- Large markdown editor for free-text context
- Guidance: "Add context not in your resume - career goals, preferences, unique background"
- Auto-save on blur/debounce
- *Relocated from Settings, same functionality*

### Skills Tab
- Visual display grouped by category (Technical, Soft, Domain)
- Source badges: "Resume", "Story", "Document"
- Click skill → see linked stories demonstrating it
- "Re-analyze" button to refresh from all sources

## Better AI Utilization

### 1. Smarter Retrieval with Metadata
Current: Embedding similarity on raw text only

Enhanced:
- If generating for "Acme Corp" → boost stories from Acme Corp
- If job requires "leadership" → prioritize leadership-tagged stories
- Weight newer stories higher when recency matters

### 2. Story Deduplication Awareness
Include distinguishing metadata when similar stories appear:
```
**[Acme Corp, 2023 - Cloud Migration]**
Led team of 5 to migrate...

**[Beta Inc, 2021 - Data Center Migration]**
Managed cross-functional effort to...
```

### 3. Full Context Option
For high-stakes features, option to include ALL stories (with token usage warning).

### 4. Audit Trail
Optionally show which stories AI used: "Context included: Story X, Story Y, Story Z"

## Settings Cleanup

**Stays in Settings:**
- API keys / provider config
- Theme toggle
- Status column configuration
- Agent settings
- Export/Import

**Moves to Profile Hub:**
- Resume management (`defaultResumeText`, `defaultResumeName`)
- Stories (`savedStories`)
- Context documents (`contextDocuments`)
- Additional context (`additionalContext`)
- Skill profile

## Data Migration

- Existing data stays in `AppSettings` - same storage location
- `SavedStory` type extended with new optional fields (backward compatible)
- Existing stories continue to work, just with empty metadata
- No migration script needed - new fields are optional

## Open Questions for Implementation

1. **Tab layout:** Tabs recommended, but consult frontend-designer for final layout decision
2. **Story card design:** How much metadata to show in list view vs. detail view?
3. **Quiz scoring:** How to quantify confidence check results?
4. **Skill linking:** Auto-link skills to stories, or require manual tagging?

## Success Criteria

1. User can manage all profile data from one dedicated screen
2. Stories have rich metadata that helps AI distinguish similar experiences
3. AI quiz gives confidence that stories are accurately represented
4. Gap finder surfaces actionable areas to improve profile
5. Existing save-from-chat flow continues to work (enhanced, not broken)
6. AI features (cover letter, prep, tailoring) produce more accurate, varied outputs
