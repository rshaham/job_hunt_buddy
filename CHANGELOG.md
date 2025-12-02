# Changelog

All notable changes to Career Forager will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-11-28

### Added

#### Core Features
- **Kanban Board** - Visual job pipeline with drag-and-drop between status columns
- **Customizable Statuses** - Add, remove, and reorder status columns to match your workflow
- **Job Cards** - Quick view of company, title, and status for each application

#### AI-Powered Features
- **JD Analysis** - Paste a job description and AI extracts company, title, requirements, skills, and salary
- **Resume Fit Grading** - Upload your resume to get a letter grade (A-F) with match percentage
- **Resume Tailoring** - Interactive split-pane chat to refine your resume for specific jobs
- **Cover Letter Generation** - One-click AI-generated cover letters based on JD and resume
- **Interview Prep Q&A** - Chat with AI about the job, get likely interview questions, practice responses

#### Organization & Tracking
- **Notes** - Markdown-enabled notes with templates (Call Notes, Research, Follow-up)
- **Contacts** - Track recruiters and hiring managers with email and LinkedIn links
- **Timeline** - Log events like phone screens, interviews, and offers with dates

#### User Experience
- **Dark Mode** - Full dark theme support
- **Local Storage** - All data stored locally in your browser using IndexedDB
- **Export/Import** - Backup and restore your data as JSON
- **PDF Parsing** - Upload PDF resumes directly

#### Settings
- **API Key Management** - Securely store and test your Claude API key
- **Model Selection** - Choose between Claude Sonnet, Opus, or Haiku models
- **Default Resume** - Set a default resume for all jobs

### Technical

- Built with React 18, TypeScript, and Vite
- Styled with Tailwind CSS
- State management with Zustand
- Local database with Dexie.js (IndexedDB)
- Drag-and-drop with @dnd-kit

---

## Future Releases

See [docs/FUTURE_ENHANCEMENTS.md](docs/FUTURE_ENHANCEMENTS.md) for planned features including:
- Browser extension for one-click job capture
- Analytics dashboard
- Calendar integration
- Additional AI provider support
