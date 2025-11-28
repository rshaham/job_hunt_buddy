# CLAUDE.md - Development Guidelines

## Communication Principles

1. **Say "I don't know" when needed** - It's a valid answer. The human developer can help figure it out or find resources. Don't guess or make assumptions about unfamiliar APIs, libraries, or domain-specific logic.

2. **Ask for clarification** - When specs are unclear, ask more questions. Aim for 10/10 clarity before implementing. It's better to ask upfront than to build the wrong thing.

3. **Fail fast, avoid fallbacks** - Don't silently swallow errors or add defensive fallbacks that hide problems. Let errors surface early so they can be fixed properly.

## Code Quality

1. **Avoid code duplication** - Extract shared logic into reusable functions/components. DRY (Don't Repeat Yourself).

2. **Keep modularity** - Small, focused functions and components. Single responsibility principle.

3. **Don't over-engineer** - Only build what's needed now. Avoid speculative features or abstractions for hypothetical future requirements.

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
