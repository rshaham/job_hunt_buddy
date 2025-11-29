# Job Hunt Buddy

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5-purple.svg)](https://vitejs.dev/)

A locally-run React application to help you track job applications with AI-powered features for job description analysis, resume grading, cover letter generation, and interview preparation.

## Features

### AI-Powered Analysis

- **JD Analysis**: Automatically extract company, title, requirements, skills, and salary from job descriptions
- **Resume Fit Grading**: Get a letter grade (A-F) showing how well your resume matches job requirements
- **Interactive Resume Tailoring**: AI tailors your resume to match job requirements with:
  - Split-pane chat interface for refinements
  - Side-by-side comparison view (original vs tailored)
  - Diff view showing exact changes
  - Manual editing mode for direct touch-ups
  - Auto-regrade after tailoring
- **Cover Letter Generation**: AI generates tailored cover letters with iterative chat refinement
- **Interview Prep & Q&A**: Chat with AI about the job, get likely interview questions, and practice responses
- **Model Selection**: Choose between different Claude models (Sonnet, Opus, Haiku)

### Organization & Tracking

- **Kanban Board**: Drag-and-drop jobs across customizable status columns
- **Contacts & Notes**: Track recruiters, hiring managers, and important notes for each application
- **Timeline Tracking**: Log events like phone screens, interviews, and offers
- **Additional Context**: Add personal context and save successful interview stories that AI uses across all jobs

### Data & Privacy

- **PDF Resume Import**: Upload PDF resumes with automatic text extraction and markdown conversion
- **Local Storage**: All data stored locally in your browser using IndexedDB
- **Export/Import**: Backup and restore your data as JSON
- **Dark Mode**: Toggle between light and dark themes

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- A Claude API key from [Anthropic](https://console.anthropic.com/)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/rshaham/job_hunt_buddy.git
   cd job_hunt_buddy
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:5173](http://localhost:5173) in your browser

5. Click the Settings icon (gear) and add your Claude API key

### Adding Your First Job

1. Click "Add Job" in the header
2. Paste the job posting URL (optional) and the full job description text
3. Click "Analyze with AI" to automatically extract job details
4. Review and save the job to your board

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS |
| State | Zustand |
| Storage | Dexie.js (IndexedDB) |
| Drag & Drop | @dnd-kit |
| PDF Parsing | pdfjs-dist |
| AI | Claude API (Anthropic) |
| Icons | Lucide React |

## Project Structure

```
src/
├── components/
│   ├── Board/          # Kanban board components
│   ├── JobDetail/      # Job detail view with tabs
│   ├── AddJob/         # Add job modal
│   ├── Settings/       # Settings modal
│   └── ui/             # Reusable UI components
├── services/
│   ├── ai.ts           # Claude API integration
│   ├── db.ts           # IndexedDB operations
│   └── pdfParser.ts    # PDF text extraction
├── stores/
│   └── appStore.ts     # Zustand state management
├── types/
│   └── index.ts        # TypeScript interfaces
└── utils/
    ├── helpers.ts      # Utility functions
    └── prompts.ts      # AI prompt templates
```

## Configuration

### API Key

Your Claude API key is stored locally in your browser (localStorage) and is never sent to any server except Anthropic's API. To get an API key:

1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Create an account or sign in
3. Navigate to API Keys
4. Create a new key
5. Copy and paste it into Job Hunt Buddy's Settings

### Default Resume

Upload a PDF resume in Settings to use as the default for all jobs. You can also upload job-specific resumes that override the default.

## Usage Tips

1. **Paste Full Job Descriptions**: The AI works best with complete job descriptions including requirements, responsibilities, and qualifications
2. **Keep Your Resume Updated**: Upload your latest resume for accurate fit analysis
3. **Use the Q&A Feature**: Ask the AI about specific aspects of the job or practice interview responses
4. **Track Everything**: Add contacts, notes, and timeline events to keep all information in one place
5. **Export Regularly**: Use the Export feature in Settings to backup your data

## Development

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

## Privacy

- All data is stored locally in your browser using IndexedDB
- Your API key is stored locally and only sent to Anthropic's API
- No data is sent to any third-party servers
- PDF parsing happens entirely in your browser

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
