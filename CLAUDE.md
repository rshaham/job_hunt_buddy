# CLAUDE.md - Job Hunt Buddy

## What is This?

**Job Hunt Buddy** is a local-first job application tracker with AI-powered features. It helps job seekers organize their job search, prepare for interviews, and manage the entire application pipeline.

### Core Features

1. **Kanban Board** - Visual job pipeline with customizable status columns (Interested → Applied → Interviewing → Offer)
2. **JD Analysis** - Paste a job description, AI extracts company, title, requirements, and key skills
3. **Resume Grading** - AI analyzes resume fit against job requirements with match percentage and suggestions
4. **Cover Letter Generation** - AI generates tailored cover letters based on JD and resume
5. **Prep & Q&A Chat** - Chat with AI about the job, get interview coaching, practice responses
6. **Notes & Contacts** - Track notes, contacts (recruiters/hiring managers), and timeline events per job
7. **Dark Mode** - Full dark mode support
8. **Export/Import** - Backup and restore all data as JSON

### Key User Flows

1. **Add Job**: Paste JD URL + text → AI analyzes → Creates job card with summary
2. **Prepare**: Upload resume → Get fit score → Generate cover letter → Chat for prep
3. **Track**: Add notes, contacts, timeline events → Move through pipeline stages

## Architecture Overview

```
src/
├── components/
│   ├── ui/              # Reusable UI primitives (Button, Input, Modal, Tabs, etc.)
│   ├── AddJobModal.tsx  # Job creation flow with JD parsing
│   ├── JobCard.tsx      # Kanban card component
│   ├── KanbanBoard.tsx  # Main board view with status columns
│   ├── SettingsModal.tsx# API key, resume, theme settings
│   └── JobDetail/       # Job detail view tabs
│       ├── OverviewTab.tsx    # Job summary display
│       ├── ResumeFitTab.tsx   # Resume grading
│       ├── CoverLetterTab.tsx # Cover letter generation
│       ├── PrepTab.tsx        # Q&A chat interface
│       └── NotesTab.tsx       # Notes, contacts, timeline
├── services/
│   ├── ai.ts            # Claude API integration
│   └── db.ts            # Dexie.js IndexedDB wrapper
├── stores/
│   └── appStore.ts      # Zustand global state
├── types/
│   └── index.ts         # TypeScript interfaces
└── utils/
    ├── helpers.ts       # Utility functions
    └── prompts.ts       # AI prompt templates
```

## Communication Principles

1. **Say "I don't know" when needed** - It's a valid answer. The human developer can help figure it out or find resources. Don't guess or make assumptions about unfamiliar APIs, libraries, or domain-specific logic.

2. **Ask for clarification** - When specs are unclear, ask more questions. Aim for 10/10 clarity before implementing. It's better to ask upfront than to build the wrong thing.

3. **Fail fast, avoid fallbacks** - Don't silently swallow errors or add defensive fallbacks that hide problems. Let errors surface early so they can be fixed properly.

## Code Quality

1. **Avoid code duplication** - Extract shared logic into reusable functions/components. DRY (Don't Repeat Yourself).

2. **Keep modularity** - Small, focused functions and components. Single responsibility principle.

3. **Don't over-engineer** - Only build what's needed now. Avoid speculative features or abstractions for hypothetical future requirements.

## Quick Commands

- `npm run dev` - Start development server (port 5173)
- `npm run build` - TypeScript check + production build
- `npm run lint` - ESLint with zero-warning policy
- `npm run preview` - Preview production build

## Critical Files

- `src/services/ai.ts` - All Claude API integration (43KB, complex)
- `src/stores/appStore.ts` - Zustand global state
- `src/utils/prompts.ts` - AI prompt templates (31KB)
- `src/services/db.ts` - Dexie.js IndexedDB wrapper
- `src/types/index.ts` - TypeScript interfaces

## Project-Specific Notes

### Tech Stack

- React 18 + Vite + TypeScript
- Tailwind CSS for styling
- Zustand for state management
- Claude API for AI features

### AI Integration

- Use simple model aliases: `claude-sonnet-4-5`, `claude-opus-4-5`, `claude-haiku-4-5`
- Access settings outside React via `useAppStore.getState()`
- API key is base64 encoded in storage
- Prompts are in `src/utils/prompts.ts` - always return JSON format
- API calls go through `callAI()` in `src/services/ai.ts`
- Model selection respects user settings (see `getModel()`)
- Never expose API keys - they're base64 encoded in settings

### Common Patterns

- Use `useAppStore.getState()` outside React components
- IndexedDB operations are async - always await `db.jobs.put()`
- Dark mode: use `dark:` Tailwind prefix, controlled by class strategy
- Use `clsx()` for conditional classes

### UI Components
- `@uiw/react-md-editor` for markdown editing (supports dark mode via `data-color-mode`)
- `react-markdown` for rendering markdown content
- Custom UI components in `src/components/ui/`

### Data Persistence
- IndexedDB via Dexie.js (`src/services/db.ts`)
- Jobs, settings, and all related data stored locally

### Color Scheme
- Notes section: Amber
- Contacts section: Blue
- Timeline section: Purple
- Primary actions: Primary color (indigo)
