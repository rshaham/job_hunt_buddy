// Core Job entity
export interface Job {
  id: string;
  company: string;
  title: string;
  jdLink: string;
  jdText: string;
  status: string;
  dateAdded: Date;
  lastUpdated: Date;
  resumeText?: string; // Per-job resume override

  // AI-generated summary
  summary: JobSummary | null;

  // Resume analysis
  resumeAnalysis: ResumeAnalysis | null;

  // Cover letter
  coverLetter: string | null;
  coverLetterHistory?: CoverLetterEntry[];

  // Tracking
  contacts: Contact[];
  notes: Note[];
  timeline: TimelineEvent[];
  prepMaterials: PrepMaterial[];
  qaHistory: QAEntry[];

  // Resume tailoring
  tailoredResume?: string;
  tailoredResumeAnalysis?: ResumeAnalysis;
  tailoringHistory?: TailoringEntry[];
}

export interface JobSummary {
  shortDescription: string;
  requirements: string[];
  niceToHaves: string[];
  salary?: string;
  jobType: 'remote' | 'hybrid' | 'onsite' | 'unknown';
  level: string;
  keySkills: string[];
}

export interface ResumeAnalysis {
  grade: string; // A, A-, B+, etc.
  matchPercentage: number;
  strengths: string[];
  gaps: string[];
  suggestions: string[];
}

export interface Contact {
  id: string;
  name: string;
  role: string;
  email?: string;
  linkedin?: string;
  notes?: string;
}

export interface Note {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimelineEvent {
  id: string;
  type: string;
  description: string;
  date: Date;
}

export interface PrepMaterial {
  id: string;
  title: string;
  content: string;
  type: 'question' | 'answer' | 'research' | 'other';
}

export interface QAEntry {
  id: string;
  question: string;
  answer: string | null; // null while waiting for AI response
  timestamp: Date;
}

export interface TailoringEntry {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  resumeSnapshot?: string; // Resume state after this message (for assistant msgs)
  timestamp: Date;
}

export interface CoverLetterEntry {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  letterSnapshot?: string; // Cover letter state after this message
  timestamp: Date;
}

export interface Status {
  id: string;
  name: string;
  color: string;
  order: number;
}

// Common model presets - users can also enter custom model names
export const CLAUDE_MODEL_PRESETS: { id: string; name: string; description: string }[] = [
  { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5', description: 'Best balance of speed and intelligence' },
  { id: 'claude-opus-4-5', name: 'Claude Opus 4.5', description: 'Most capable, best for complex analysis' },
  { id: 'claude-haiku-4-5', name: 'Claude 4.5 Haiku', description: 'Fastest responses, good for quick tasks' },
];

export interface AppSettings {
  apiKey: string;
  model: string; // Model ID - can be preset or custom
  defaultResumeText: string;
  defaultResumeName: string;
  statuses: Status[];
  theme: 'light' | 'dark';
}

export const DEFAULT_STATUSES: Status[] = [
  { id: '1', name: 'Interested', color: '#8b5cf6', order: 0 },
  { id: '2', name: 'Applied', color: '#3b82f6', order: 1 },
  { id: '3', name: 'Screening', color: '#06b6d4', order: 2 },
  { id: '4', name: 'Interviewing', color: '#f59e0b', order: 3 },
  { id: '5', name: 'Offer', color: '#10b981', order: 4 },
  { id: '6', name: 'Rejected', color: '#6b7280', order: 5 },
  { id: '7', name: 'Withdrawn', color: '#9ca3af', order: 6 },
];

export const DEFAULT_SETTINGS: AppSettings = {
  apiKey: '',
  model: 'claude-sonnet-4-5',
  defaultResumeText: '',
  defaultResumeName: '',
  statuses: DEFAULT_STATUSES,
  theme: 'light',
};
