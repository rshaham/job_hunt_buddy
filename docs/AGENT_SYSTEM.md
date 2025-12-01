# Agent System Documentation

This document describes the agentic architecture in Job Hunt Buddy, including the Command Bar, tool system, and how to extend it with new tools.

## Overview

The agent system transforms Job Hunt Buddy from passive prompting (user asks → AI responds with text) to **agentic workflows** (AI can query data, take actions, and interact with the database).

### Key Features
- **Command Bar** (Ctrl+K / Cmd+K) - Natural language interface for commands
- **Tool System** - Type-safe tools with Zod schemas
- **ReAct Loop** - Reasoning + Acting pattern for multi-step tasks
- **Confirmation Flow** - Configurable safety for write operations

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Command Bar UI                            │
│                     (Ctrl+K Modal Interface)                     │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                       Agent Executor                             │
│              (ReAct Loop - max 7 iterations)                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│  │   Reason    │ → │     Act     │ → │   Observe Result    │  │
│  │  (AI call)  │    │ (tool exec) │    │  (feed back to AI) │  │
│  └─────────────┘    └─────────────┘    └─────────────────────┘  │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                        Tool Registry                             │
│  ┌─────────────────────┐    ┌─────────────────────────────────┐ │
│  │    READ Tools       │    │         WRITE Tools             │ │
│  │  - search_jobs      │    │  - update_job_status ⚠️         │ │
│  │  - get_job_details  │    │  - add_note                     │ │
│  │  - get_job_stats    │    │  - add_contact                  │ │
│  │  - list_contacts    │    │  - add_timeline_event           │ │
│  │  - get_skill_gaps   │    │  - delete_job ⚠️                │ │
│  │  - get_resume_analysis │ │  - update_note                  │ │
│  │  - list_timeline    │    │  - delete_note ⚠️               │ │
│  │                      │    │  - generate_cover_letter 🤖⚠️  │ │
│  │                      │    │  - grade_resume 🤖⚠️           │ │
│  │                      │    │  - generate_interview_prep 🤖⚠️│ │
│  └─────────────────────┘    └─────────────────────────────────┘ │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                    Extended AI Provider                          │
│         (Anthropic with tool calling support)                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
src/
├── types/
│   └── agent.ts              # Type definitions (ToolDefinition, AgentState, etc.)
├── services/
│   └── agent/
│       ├── index.ts          # Main exports
│       ├── registry.ts       # Tool registry class
│       ├── executor.ts       # Agent loop implementation
│       └── tools/
│           ├── index.ts      # Tool exports
│           ├── schemas.ts    # Zod schemas for all tools
│           ├── searchJobs.ts
│           ├── getJobDetails.ts
│           ├── getJobStats.ts
│           ├── listContacts.ts
│           ├── getSkillGaps.ts
│           ├── getResumeAnalysis.ts
│           ├── listTimeline.ts
│           ├── updateJobStatus.ts
│           ├── addNote.ts
│           ├── addContact.ts
│           ├── addTimelineEvent.ts
│           ├── deleteJob.ts
│           ├── updateNote.ts
│           ├── deleteNote.ts
│           ├── generateCoverLetterTool.ts
│           ├── gradeResumeTool.ts
│           └── generateInterviewPrepTool.ts
├── stores/
│   └── commandBarStore.ts    # Command Bar state management
└── components/
    └── CommandBar/
        ├── index.ts
        └── CommandBar.tsx    # UI component
```

---

## Implemented Tools

### READ Tools (No Confirmation Required)

| Tool | Description | Example Command |
|------|-------------|-----------------|
| `search_jobs` | Search jobs by company, title, or status | "Show me all jobs at Google" |
| `get_job_details` | Get full details for a specific job | "Tell me about the Amazon job" |
| `get_job_stats` | Get aggregate statistics | "How many jobs have I applied to?" |
| `list_contacts` | List all contacts, optionally filtered by job or company | "Who are my contacts at Amazon?" |
| `get_skill_gaps` | Analyze missing skills across jobs based on resume analysis | "What skills am I missing?" |
| `get_resume_analysis` | Get resume fit grade, match %, strengths, gaps for a job | "How well does my resume fit Meta?" |
| `list_timeline` | List all timeline events for a job, sorted by date | "What's the history of my Google application?" |

### WRITE Tools (Confirmation Configurable)

| Tool | Description | Confirmation | Example Command |
|------|-------------|--------------|-----------------|
| `update_job_status` | Move job to new status | Yes (destructive) | "Move Google to Rejected" |
| `add_note` | Add a note to a job | No (low risk) | "Add a note to Amazon: Follow up next week" |
| `add_contact` | Add a contact to a job | No (low risk) | "Add recruiter Jane Doe to the Meta job" |
| `add_timeline_event` | Add an event to job timeline | No (low risk) | "Add phone screen scheduled for Monday to Google" |
| `delete_job` | Permanently delete a job | Yes (destructive) | "Delete the old Google application" |
| `update_note` | Edit an existing note | No (low risk) | "Update my note on Amazon" |
| `delete_note` | Delete a note from a job | Yes (destructive) | "Remove the old note from Google" |

### AI Generation Tools (Triggers API Call)

| Tool | Description | Confirmation | Example Command |
|------|-------------|--------------|-----------------|
| `generate_cover_letter` | Generate a cover letter using AI | Yes (uses credits) | "Write a cover letter for Amazon" |
| `grade_resume` | Grade resume against job requirements | Yes (uses credits) | "Grade my resume for the Meta job" |
| `generate_interview_prep` | Generate interview prep materials | Yes (uses credits) | "Help me prepare for Google interview" |

> 🤖 These tools trigger actual AI API calls and will consume credits. They require confirmation.

---

## Tools Not Yet Implemented

### Future / Career Coach Integration

| Tool | Category | Description | Use Case |
|------|----------|-------------|----------|
| `web_research` | READ | Search internet for company, role, or skills info | "Research this company", "What's the tech stack?" |
| `analyze_career_gaps` | READ | Deep skill gap analysis | "Analyze my career trajectory" |
| `suggest_learning_path` | READ | Recommend skills to learn | "What should I learn next?" |
| `add_learning_task` | WRITE | Add learning tasks to jobs | "Add 'Learn TypeScript' to relevant jobs" |
| `draft_outreach` | READ | Draft networking messages | "Draft a message to recruiter at Meta" |
| `bulk_update_status` | WRITE | Update multiple jobs at once | "Mark all old applications as Withdrawn" |

**Notes on `web_research` tool:**
- Could use configurable sources (LinkedIn, Glassdoor, company website, etc.)
- Should summarize findings and suggest insights
- Privacy consideration: user controls what sources are queried
- Could integrate with the Interview Prep flow for research on interviewers

---

## How to Add a New Tool

### 1. Define the Schema (`src/services/agent/tools/schemas.ts`)

```typescript
import { z } from 'zod';

export const myNewToolSchema = z.object({
  requiredField: z.string().describe('Description for the AI'),
  optionalField: z.number().optional().describe('Optional parameter'),
});

export type MyNewToolInput = z.infer<typeof myNewToolSchema>;
```

### 2. Create the Tool Implementation (`src/services/agent/tools/myNewTool.ts`)

```typescript
import { useAppStore } from '../../../stores/appStore';
import type { ToolDefinition, ToolResult } from '../../../types/agent';
import { myNewToolSchema, type MyNewToolInput } from './schemas';

interface MyNewToolResult {
  // Define what the tool returns
}

export const myNewTool: ToolDefinition<MyNewToolInput, MyNewToolResult> = {
  name: 'my_new_tool',
  description: 'Clear description of what this tool does for the AI',
  category: 'read', // or 'write'
  inputSchema: myNewToolSchema,
  requiresConfirmation: false, // true for destructive write operations

  // Optional: Custom confirmation message
  confirmationMessage(input) {
    return `Are you sure you want to do X with ${input.requiredField}?`;
  },

  async execute(input): Promise<ToolResult<MyNewToolResult>> {
    try {
      const { jobs } = useAppStore.getState();

      // Your tool logic here

      return {
        success: true,
        data: { /* result */ },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
};
```

### 3. Register the Tool (`src/services/agent/tools/index.ts`)

```typescript
import { myNewTool } from './myNewTool';

export const allTools: ToolDefinitionBase[] = [
  // ... existing tools
  myNewTool,
];
```

---

## Configuration

### Agent Settings

Settings can be configured in **Settings → Agent** tab, or programmatically via `AppSettings.agentSettings`:

```typescript
interface AgentSettings {
  requireConfirmation: 'all' | 'write-only' | 'destructive-only' | 'never';
  maxIterations: number; // default: 7
}
```

### Confirmation Levels

| Level | Behavior |
|-------|----------|
| `all` | Confirm every tool execution |
| `write-only` | Confirm all write tools |
| `destructive-only` | Only confirm tools marked with `requiresConfirmation: true` |
| `never` | Never ask for confirmation |

---

## Provider Support

Currently, only **Anthropic** supports tool calling. Future work needed for:

### OpenAI-Compatible (Ollama)
- Uses `functions` parameter instead of `tools`
- Different response format: `function_call` field
- Requires adapter layer

### Gemini
- Uses `functionDeclarations` in request
- Returns `functionCall` in response parts
- Similar adaptation needed

### Abstraction Strategy

To add provider support, implement `ToolCallAdapter`:

```typescript
interface ToolCallAdapter {
  formatTools(tools: ToolDefinition[]): unknown;
  parseResponse(response: unknown): ToolUseBlock[];
}
```

---

## Usage Examples

### Command Bar

Press `Ctrl+K` (or `Cmd+K` on Mac) to open the Command Bar.

**Example commands:**
- "Show me all jobs in Interviewing status"
- "How many jobs have I applied to?"
- "Move the Google job to Rejected"
- "Add a note to Amazon: Great culture, interesting team"
- "What's the status of my Meta application?"
- "Who are my contacts at Google?"
- "What skills am I missing across my applications?"
- "Add phone screen scheduled for Monday to the Amazon job"
- "Delete the old Microsoft application"

### Programmatic Usage

```typescript
import { runAgent, AgentExecutor } from './services/agent';

// Simple one-shot
const response = await runAgent("Show me all jobs");

// With configuration
const executor = new AgentExecutor({
  maxIterations: 5,
  confirmationLevel: 'never',
  onStateChange: (state) => console.log('State:', state.status),
  onConfirmationRequest: async (request) => {
    // Custom confirmation UI
    return window.confirm(request.description);
  },
});

const response = await executor.run("Move Google to Interviewing");
```

---

## Troubleshooting

### "Provider does not support tool calling"
Only Anthropic currently supports tool calling. Switch to Anthropic in Settings.

### Tool not found
Ensure the tool is registered in `src/services/agent/tools/index.ts`.

### Max iterations exceeded
The agent tried too many tool calls. Simplify your command or increase `maxIterations`.

### Confirmation dialog not appearing
Check that `agentSettings.requireConfirmation` is set appropriately.

---

## Future: Agent-First Flows

The long-term vision is to make all AI features accessible through the Command Bar agent, providing a unified conversational interface.

### Current vs Agent-First Comparison

| Current Flow | Current Trigger | Agent Trigger (Future) |
|--------------|-----------------|------------------------|
| **JD Analysis** | Click "Analyze with AI" in Add Job modal | "Add a job from this JD: [paste text]" |
| **Resume Grading** | Click "Grade Resume" in Resume Fit tab | "How does my resume fit the Google job?" ✅ |
| **Resume Tailoring** | Click "Start Tailoring" in Resume Fit tab | "Tailor my resume for the Amazon role" |
| **Cover Letter** | Click "Generate" in Cover Letter tab | "Generate a cover letter for Meta" ✅ |
| **Interview Prep** | Chat in Prep tab | "Help me prepare for the Netflix interview" ✅ |
| **Add Note** | Click "Add Note" in Notes tab | "Add note to Amazon: Great call today" ✅ |
| **Add Contact** | Click "Add Contact" in Notes tab | "Add recruiter Jane Doe to the Meta job" ✅ |
| **Analyze Contact** | Click "Analyze" on contact card | "Research interviewer John Smith at Google" |

### Benefits of Agent-First Approach

- **Natural language interface** - Users describe what they want in plain English
- **Conversational flow** - Refine and iterate through dialogue
- **Unified entry point** - One shortcut (Ctrl+K) for all AI features
- **Contextual suggestions** - Agent can proactively suggest actions based on job state
- **Multi-step workflows** - Chain multiple actions in one command

### Implementation Phases

| Phase | Focus | Tools | Status |
|-------|-------|-------|--------|
| **Phase 1** | Basic CRUD + Data Access | search_jobs, get_job_details, get_job_stats, list_contacts, get_skill_gaps, get_resume_analysis, list_timeline, update_job_status, add_note, add_contact, add_timeline_event, delete_job, update_note, delete_note | ✅ Complete |
| **Phase 2** | AI Generation tools | generate_cover_letter, grade_resume, generate_interview_prep | ✅ Complete |
| **Phase 3** | Research tools | web_research, analyze_interviewer, competitor_analysis | Planned |
| **Phase 4** | Full conversational coach | Career guidance, learning paths, networking suggestions | Planned |

### Migration Strategy

1. **Additive approach** - Agent tools complement, don't replace, existing UI
2. **Gradual adoption** - Users discover agent features at their own pace
3. **Fallback to UI** - Complex flows (file upload, multi-step wizards) remain in dedicated UI
4. **Context preservation** - Agent remembers conversation context for follow-up commands

---

## Contributing

When adding new tools:
1. Follow the schema-first approach with Zod
2. Write clear descriptions for AI understanding
3. Mark destructive operations with `requiresConfirmation: true`
4. Update this documentation with new tools
5. Add to the "Not Yet Implemented" section if planning but not implementing
