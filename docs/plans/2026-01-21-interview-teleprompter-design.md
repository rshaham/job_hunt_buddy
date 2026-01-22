# Interview Teleprompter - Design Document

**Date:** 2026-01-21
**Status:** Draft

## Overview

A distraction-free, large-text display of keywords and memory joggers for use during live interviews. AI-assisted but user-controlled. Designed to reduce cognitive load and help with recall during high-pressure interview situations.

## Entry Points

- **Left sidebar** - New "Teleprompter" nav item, always accessible
- **Job detail view** - "Start Interview" button that opens teleprompter with job pre-selected
- **Standalone** - Can open without a job selected for ad-hoc use

## Opening Flow

1. Select job (if not pre-selected) - dropdown of active jobs, or "No job" for ad-hoc
2. Select interview type:
   - Fixed list: Phone Screen, Behavioral, Technical, Case Study, Panel, Hiring Manager, Culture Fit, Final Round
   - Free-form text input with "Save this type" option for custom types
3. Enter teleprompter view

## Main Display

### Layout

- **Top bar** - Job name, interview type, "End Interview" button
- **Main area** - Categories with keywords (big text, expandable/collapsible)
- **Bottom** - Always-visible large text input for AI assist

### Categories

- Dynamically generated based on interview type
- Examples for Behavioral: Leadership, Problem-Solving, Collaboration, Conflict Resolution, Growth
- Examples for Technical: Architecture, Problem-Solving, Technical Decisions, Trade-offs, Metrics
- Each category is collapsible - tap header to expand/collapse
- Keywords inside are large, scannable (minimum 24px)

### Initial Content (Hybrid Approach)

AI pulls from multiple sources:
- JD keywords, company info, requirements
- Resume fit analysis
- Prep chat history for this job
- User's profile/stories from settings
- Contacts and intel notes

**Staging flow:**
- AI suggestions appear in a "staging" section (smaller, muted)
- User taps items to promote to main display
- Can dismiss staging items they don't want

### During Interview

- Main display shows only user-approved keywords
- New AI suggestions (from text input) go directly to display
- Click any keyword to dismiss it

## Real-Time AI Assist

### Text Input

- Always visible at bottom
- Large input field (matches the big-text theme)
- Placeholder: "Type a keyword or question..."
- Submit with Enter key

### AI Behavior

- Uses configured fast model (respects user's provider settings - Claude/Gemini/Ollama)
- Input: user's keyword/phrase + current interview context (job, type, existing keywords)
- Output: 3-5 relevant keywords/phrases added directly to appropriate category
- Response time goal: under 2 seconds

### Context Provided to AI

- The job's JD, company, requirements
- Selected interview type
- User's profile/stories from settings
- Current keywords already on display
- What was dismissed (to avoid repeating)

### Example Flow

1. Interviewer asks about "system design experience"
2. User types: "system design"
3. AI adds to display: "Scaled payment service 10x", "Redis caching decision", "Microservices migration", "Trade-off: consistency vs availability"
4. User glances, sees "Redis caching decision", remembers their story

## Modal Behavior

- Does **not** close on backdrop click (protected against accidental closure)
- State persists until user clicks "End Interview"
- Large, focused UI - not cluttered

## Post-Interview Roundup

### Triggering

- User clicks "End Interview" button
- Confirmation prompt before ending
- Transitions to roundup view

### Roundup Screen

- Shows all keywords that were on display during the session
- Two actions per item: "Helpful" (thumbs up) or "Not helpful" (thumbs down)
- Option to "Save to profile" (adds to memory bank in settings)
- Optional: free-text field for notes about the interview

### Data Collected

- Which keywords were promoted from staging
- Which were dismissed during interview
- Which were marked helpful/not helpful in roundup
- Which were saved to profile

### Feedback Loop

- AI learns from this over time
- Future suggestions for similar interview types weighted by past helpfulness
- Stored per-user in IndexedDB

### After Roundup

- Option to add interview notes to the job's timeline
- Return to job detail or board

## Data Model

```typescript
// Interview session (persists until ended)
interface TeleprompterSession {
  id: string;
  jobId: string | null;
  interviewType: string;
  startedAt: Date;
  keywords: TeleprompterKeyword[];
  dismissed: string[];  // track for AI to avoid repeating
}

// Individual keyword/phrase
interface TeleprompterKeyword {
  id: string;
  text: string;
  category: string;
  source: 'ai-initial' | 'ai-realtime' | 'user' | 'profile';
  promoted: boolean;  // moved from staging to display
  helpful?: boolean;  // set during roundup
}

// Saved interview type (user-created)
interface CustomInterviewType {
  id: string;
  name: string;
  categories: string[];  // user can customize categories too
}

// Feedback for AI learning
interface TeleprompterFeedback {
  interviewType: string;
  keyword: string;
  helpful: boolean;
  timestamp: Date;
}
```

### Storage

- **Active session:** Zustand store (persists to localStorage)
- **Feedback history:** IndexedDB via Dexie (new table)
- **Custom interview types:** IndexedDB via Dexie (new table)
- **Profile stories:** Existing settings/profile structure

## Scope

### In Scope (v1)

- Modal-based teleprompter with job/interview type selection
- Category-based keyword display with expand/collapse
- Hybrid initial load (AI staging -> user promotes)
- Real-time AI assist via text input
- Click-to-dismiss during interview
- Post-interview roundup with helpful/not helpful marking
- Save keywords to profile
- Feedback loop storage for future AI improvement
- Teleprompter nav item in left sidebar

### Out of Scope (Future)

- Speech-to-text input (noted for later consideration - ethical implications)
- Voice output / read-aloud
- Integration with video call apps
- Sharing teleprompter setups between jobs
- Mind prep games (separate feature)

## Technical Constraints

- Must work offline for display (AI assist requires connection)
- Large text is non-negotiable - minimum 24px for keywords, 18px for UI elements
- Uses user's configured model/provider for AI assist
- No audio recording or processing in v1

## Design Principles

- **Distraction-free:** Minimal UI, maximum glanceability
- **Big text:** Everything readable at a glance during a call
- **Fast:** AI responses under 2 seconds
- **Protected:** No accidental data loss from misclicks
- **Learning:** Gets smarter over time from user feedback
