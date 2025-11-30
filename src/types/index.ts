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
  tailoringSuggestions?: string[]; // AI-generated follow-up questions for tailoring

  // Email drafts
  emailDraft?: string;
  emailDraftType?: EmailType;
  emailDraftCustomType?: string; // User-specified custom email type
  emailDraftHistory?: EmailDraftEntry[];
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
  matchedKeywords?: string[];  // Keywords from JD found in resume
  missingKeywords?: string[];  // Keywords from JD NOT found in resume
}

export interface Contact {
  id: string;
  name: string;
  role: string;
  email?: string;
  linkedin?: string;
  notes?: string;
  linkedInBio?: string;       // Raw pasted bio text
  interviewerIntel?: string;  // AI-generated analysis (markdown)
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

export interface EmailDraftEntry {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  emailSnapshot?: string; // Email state after this message
  timestamp: Date;
}

export type EmailType = 'thank-you' | 'follow-up' | 'withdraw' | 'negotiate' | 'custom';

export interface SavedStory {
  id: string;
  question: string;  // The topic/question this story answers
  answer: string;    // The user's experience/story
  category?: string; // Optional: "leadership", "technical", "conflict", etc.
  createdAt: Date;
}

export interface ContextDocument {
  id: string;
  name: string;           // Original filename
  fullText: string;       // Full extracted text from PDF
  summary?: string;       // AI-generated summary (if created)
  wordCount: number;      // Word count of full text
  summaryWordCount?: number; // Word count of summary
  createdAt: Date;
  useSummary: boolean;    // Whether to use summary for AI calls
}

export interface Status {
  id: string;
  name: string;
  color: string;
  order: number;
}

// Provider types for multi-provider AI support
export type ProviderType = 'anthropic' | 'openai-compatible' | 'gemini';

export interface ProviderSettings {
  apiKey: string;
  baseUrl?: string; // Only for openai-compatible
  model: string;
}

// Provider-specific model presets
export const PROVIDER_MODELS: Record<ProviderType, { id: string; name: string; description: string }[]> = {
  anthropic: [
    { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5', description: 'Best balance of speed and intelligence' },
    { id: 'claude-opus-4-5', name: 'Claude Opus 4.5', description: 'Most capable, best for complex analysis' },
    { id: 'claude-haiku-4-5', name: 'Claude 4.5 Haiku', description: 'Fastest responses, good for quick tasks' },
  ],
  'openai-compatible': [
    { id: 'llama3.2', name: 'Llama 3.2', description: "Meta's latest model" },
    { id: 'mistral', name: 'Mistral', description: 'Fast and capable' },
    { id: 'qwen2.5', name: 'Qwen 2.5', description: 'Alibaba model' },
  ],
  gemini: [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Fast, free tier available' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Most capable' },
    { id: 'gemini-3-pro-preview', name: 'Gemini 3.0 Pro Preview', description: 'Flagship model' },
  ],
};

// Legacy - kept for backward compatibility
export const CLAUDE_MODEL_PRESETS = PROVIDER_MODELS.anthropic;

export interface AppSettings {
  // Provider system
  activeProvider: ProviderType;
  providers: Record<ProviderType, ProviderSettings>;

  // DEPRECATED - kept for migration from old format
  apiKey?: string;
  model?: string;

  // Unchanged
  defaultResumeText: string;
  defaultResumeName: string;
  statuses: Status[];
  theme: 'light' | 'dark';
  additionalContext: string; // Free-form text about the user beyond their resume
  savedStories: SavedStory[]; // Saved Q&A experiences for AI to reference
  contextDocuments: ContextDocument[]; // Uploaded PDF documents for context

  // Onboarding
  onboardingCompleted: boolean;
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
  activeProvider: 'anthropic',
  providers: {
    anthropic: { apiKey: '', model: 'claude-sonnet-4-5' },
    'openai-compatible': { apiKey: '', model: 'llama3.2', baseUrl: 'http://localhost:11434/v1' },
    gemini: { apiKey: '', model: 'gemini-1.5-flash' },
  },
  defaultResumeText: '',
  defaultResumeName: '',
  statuses: DEFAULT_STATUSES,
  theme: 'light',
  additionalContext: '',
  savedStories: [],
  contextDocuments: [],
  onboardingCompleted: false,
};
