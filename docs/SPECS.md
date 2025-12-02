# Career Forager - Technical Specifications

This document provides detailed technical specifications for future development and maintenance of the Career Forager application.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         React App                               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Components Layer                       │  │
│  │  BoardView │ JobDetailView │ AddJobModal │ SettingsModal  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                     State Layer (Zustand)                 │  │
│  │              appStore.ts - Global app state               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Services Layer                         │  │
│  │         ai.ts │ db.ts (Dexie) │ pdfParser.ts             │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Models

### Job Entity

```typescript
interface Job {
  id: string;                    // UUID
  company: string;               // Company name
  title: string;                 // Job title
  jdLink: string;                // URL to job posting
  jdText: string;                // Full job description text
  status: string;                // Current status (matches Status.name)
  dateAdded: Date;               // When job was added
  lastUpdated: Date;             // Last modification time
  resumeText?: string;           // Job-specific resume (overrides default)

  summary: JobSummary | null;    // AI-extracted summary
  resumeAnalysis: ResumeAnalysis | null;  // AI resume grading
  coverLetter: string | null;    // Generated cover letter

  contacts: Contact[];           // Related people
  notes: Note[];                 // User notes
  timeline: TimelineEvent[];     // Event history
  prepMaterials: PrepMaterial[]; // Interview prep materials
  qaHistory: QAEntry[];          // Chat history with AI
}
```

### JobSummary (AI-Generated)

```typescript
interface JobSummary {
  shortDescription: string;      // 1-2 sentence summary
  requirements: string[];        // Must-have requirements
  niceToHaves: string[];         // Nice-to-have qualifications
  salary?: string;               // Salary range if mentioned
  jobType: 'remote' | 'hybrid' | 'onsite' | 'unknown';
  level: string;                 // Entry, Mid, Senior, Lead, etc.
  keySkills: string[];           // Key technical/soft skills
}
```

### ResumeAnalysis (AI-Generated)

```typescript
interface ResumeAnalysis {
  grade: string;                 // A+, A, A-, B+, B, B-, C+, C, C-, D, F
  matchPercentage: number;       // 0-100
  strengths: string[];           // Where resume matches well
  gaps: string[];                // Missing requirements
  suggestions: string[];         // How to improve fit
}
```

### Contact

```typescript
interface Contact {
  id: string;
  name: string;
  role: string;                  // e.g., "Recruiter", "Hiring Manager"
  email?: string;
  linkedin?: string;
  notes?: string;
}
```

### Note

```typescript
interface Note {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### TimelineEvent

```typescript
interface TimelineEvent {
  id: string;
  type: string;                  // e.g., "Applied", "Phone Screen", "Interview"
  description: string;
  date: Date;
}
```

### PrepMaterial

```typescript
interface PrepMaterial {
  id: string;
  title: string;
  content: string;
  type: 'question' | 'answer' | 'research' | 'other';
}
```

### QAEntry (Chat History)

```typescript
interface QAEntry {
  id: string;
  question: string;              // User's question
  answer: string;                // AI's response
  timestamp: Date;
}
```

### Status

```typescript
interface Status {
  id: string;
  name: string;                  // Display name
  color: string;                 // Hex color code
  order: number;                 // Sort order (0-based)
}
```

### AppSettings

```typescript
interface AppSettings {
  apiKey: string;                // Base64 encoded Claude API key
  defaultResumeText: string;     // Extracted text from default resume
  defaultResumeName: string;     // Original filename
  statuses: Status[];            // Customizable status columns
  theme: 'light' | 'dark';
}
```

## Database Schema (Dexie/IndexedDB)

```typescript
// Database: JobHuntBuddy
// Version: 1

// Table: jobs
// Primary Key: id
// Indexes: company, title, status, dateAdded, lastUpdated

// Table: settings
// Primary Key: id (always 'app-settings')
```

## AI Integration

### Claude API Configuration

- **Model**: `claude-sonnet-4-20250514`
- **Max Tokens**: 4096
- **API Endpoint**: `https://api.anthropic.com/v1/messages`
- **Required Headers**:
  - `Content-Type: application/json`
  - `x-api-key: {API_KEY}`
  - `anthropic-version: 2023-06-01`
  - `anthropic-dangerous-direct-browser-access: true`

### AI Prompts

#### JD Analysis Prompt
Located in `src/utils/prompts.ts` as `JD_ANALYSIS_PROMPT`

**Input**: Raw job description text
**Output**: JSON with company, title, summary, requirements, niceToHaves, salary, jobType, level, keySkills

#### Resume Grading Prompt
Located in `src/utils/prompts.ts` as `RESUME_GRADING_PROMPT`

**Input**: Job description + Resume text
**Output**: JSON with grade, matchPercentage, strengths, gaps, suggestions

#### Cover Letter Prompt
Located in `src/utils/prompts.ts` as `COVER_LETTER_PROMPT`

**Input**: Job description + Resume text
**Output**: Plain text cover letter

#### Interview Prep Prompt
Located in `src/utils/prompts.ts` as `INTERVIEW_PREP_PROMPT`

**Input**: Job description + Resume text
**Output**: Formatted text with questions and talking points

#### Q&A System Prompt
Located in `src/utils/prompts.ts` as `QA_SYSTEM_PROMPT`

**Usage**: System prompt for chat context
**Input**: Job description + Resume text + Conversation history

## Component Architecture

### Board Components (`src/components/Board/`)

- **BoardView.tsx**: Main Kanban board with DnD context
- **Column.tsx**: Single status column with droppable area
- **JobCard.tsx**: Draggable job card with sortable functionality

### JobDetail Components (`src/components/JobDetail/`)

- **JobDetailView.tsx**: Full-screen detail view with tabs
- **OverviewTab.tsx**: AI summary, requirements, metadata
- **ResumeFitTab.tsx**: Resume upload and grading
- **CoverLetterTab.tsx**: Cover letter generation and editing
- **PrepTab.tsx**: Q&A chat interface
- **NotesTab.tsx**: Notes, contacts, and timeline

### UI Components (`src/components/ui/`)

- **Button.tsx**: Primary/secondary/ghost/danger variants
- **Badge.tsx**: Colored badges for tags
- **Modal.tsx**: Reusable modal with backdrop
- **Tabs.tsx**: Tab navigation with context
- **Input.tsx**: Text input with label and error
- **Textarea.tsx**: Multi-line text input
- **Card.tsx**: Card container with header/content/footer

## State Management (Zustand)

### Store Structure

```typescript
interface AppState {
  // Data
  jobs: Job[];
  selectedJobId: string | null;
  settings: AppSettings;
  isLoading: boolean;

  // UI State
  isAddJobModalOpen: boolean;
  isSettingsModalOpen: boolean;

  // Actions
  loadData(): Promise<void>;
  addJob(job: Omit<Job, 'id' | 'dateAdded' | 'lastUpdated'>): Promise<Job>;
  updateJob(id: string, updates: Partial<Job>): Promise<void>;
  deleteJob(id: string): Promise<void>;
  moveJob(id: string, newStatus: string): Promise<void>;
  selectJob(id: string | null): void;
  updateSettings(settings: Partial<AppSettings>): Promise<void>;
  // ... more actions
}
```

## Styling System

### Tailwind Configuration

Custom colors defined in `tailwind.config.js`:

```javascript
colors: {
  primary: {
    DEFAULT: '#6366f1',
    hover: '#4f46e5',
    light: '#818cf8',
  },
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  status: {
    interested: '#8b5cf6',
    applied: '#3b82f6',
    screening: '#06b6d4',
    interviewing: '#f59e0b',
    offer: '#10b981',
    rejected: '#6b7280',
    withdrawn: '#9ca3af',
  }
}
```

### Dark Mode

- Implemented using Tailwind's `dark:` variant
- Toggled via `class` strategy on `<html>` element
- Persisted in settings

## PDF Parsing

Using `pdfjs-dist` for client-side PDF text extraction:

```typescript
// Worker loaded from CDN
pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
```

## Security Considerations

1. **API Key Storage**: Base64 encoded in localStorage (not encrypted)
2. **CORS**: Using `anthropic-dangerous-direct-browser-access` header
3. **No Server**: All processing done client-side
4. **Data Privacy**: All data stored locally in IndexedDB

## Future Enhancement Ideas

1. **Browser Extension**: One-click JD capture from job sites
2. **Calendar Integration**: Sync interviews to Google Calendar
3. **Email Templates**: Generate follow-up emails
4. **Analytics Dashboard**: Track application success rates
5. **Multiple Resume Profiles**: Different resumes for different job types
6. **Job Comparison View**: Side-by-side job comparison
7. **Salary Research**: Integrate salary data from external APIs
8. **Application Reminders**: Notifications for follow-ups
9. **LinkedIn Integration**: Import job postings directly
10. **Collaborative Features**: Share job boards with others

## Development Guidelines

### Adding New Features

1. Define types in `src/types/index.ts`
2. Add database operations in `src/services/db.ts`
3. Update store actions in `src/stores/appStore.ts`
4. Create components in appropriate directory
5. Update this documentation

### Code Style

- Use TypeScript strict mode
- Prefer functional components with hooks
- Use Tailwind for styling (no CSS modules)
- Keep components small and focused
- Extract reusable logic into hooks

### Testing

Currently no tests implemented. Recommended additions:
- Unit tests for utility functions
- Integration tests for AI service
- E2E tests for critical user flows
