import type { AgentSettings, AIMessageWithTools } from './agent';

// Re-export agent types for convenience
export type { AgentSettings, ToolCategory, ToolResult, ToolDefinition, ToolDefinitionBase, AgentStatus, AgentExecutionState, ConfirmationRequest, ConfirmationLevel, AIMessageWithTools } from './agent';
export { DEFAULT_AGENT_SETTINGS } from './agent';

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
  savedPrepConversations?: SavedPrepConversation[];
  learningTasks: LearningTask[];

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

  // Workflow tracking
  interviews?: InterviewRound[];
  rejectionDetails?: RejectionDetails;
  offerDetails?: OfferDetails;
  sourceInfo?: SourceInfo;
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
  phone?: string;
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

// Learning task category types for AI-assisted preparation
export type LearningTaskCategory =
  | 'behavioral_interview'
  | 'technical_deep_dive'
  | 'system_design'
  | 'cross_functional'
  | 'leadership'
  | 'problem_solving'
  | 'communication'
  | 'general';

// Human-readable labels for learning task categories
export const LEARNING_TASK_CATEGORY_LABELS: Record<LearningTaskCategory, string> = {
  behavioral_interview: 'Behavioral Interview',
  technical_deep_dive: 'Technical Deep Dive',
  system_design: 'System Design',
  cross_functional: 'Cross-Functional',
  leadership: 'Leadership',
  problem_solving: 'Problem Solving',
  communication: 'Communication',
  general: 'General',
};

// Prep session message in a learning task conversation
export interface LearningTaskPrepMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Prep session for AI-assisted learning task preparation
export interface LearningTaskPrepSession {
  id: string;
  category: LearningTaskCategory;
  messages: LearningTaskPrepMessage[];
  savedToBank?: boolean;
  webSourcesUsed?: string[];
  createdAt: Date;
}

// Agent chat message for CommandBar persistence
export interface AgentChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LearningTask {
  id: string;
  skill: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
  dueDate?: Date;
  resourceUrl?: string;
  createdAt: Date;
  updatedAt: Date;

  // AI-assisted preparation
  inferredCategory?: LearningTaskCategory;
  prepSessions?: LearningTaskPrepSession[];
  customInstructions?: string;
  prepNotes?: string; // Summary notes saved from prep sessions
}

export interface QAEntry {
  id: string;
  question: string;
  answer: string | null; // null while waiting for AI response
  timestamp: Date;
}

export interface SavedPrepConversation {
  id: string;
  name: string;
  entries: QAEntry[];
  savedAt: Date;
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

// Workflow tracking types
export type RejectionReason = 'ghosted' | 'skills_mismatch' | 'culture_fit' | 'salary' | 'position_filled' | 'other';
export type InterviewType = 'phone_screen' | 'recruiter_call' | 'technical' | 'behavioral' | 'system_design' | 'onsite' | 'panel' | 'final' | 'other';
export type InterviewStatus = 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
export type InterviewOutcome = 'passed' | 'failed' | 'pending' | 'unknown';
export type JobSource = 'referral' | 'linkedin' | 'company_site' | 'job_board' | 'recruiter_outreach' | 'networking' | 'other';

export interface RejectionDetails {
  reason?: RejectionReason;
  stageRejectedAt?: string;
  feedbackReceived?: string;
  lessonsLearned?: string;
  rejectedAt?: Date;
}

export interface OfferDetails {
  baseSalary?: number;
  bonus?: number;
  bonusType?: 'percentage' | 'fixed';
  equity?: string;
  benefitsSummary?: string;
  offerDeadline?: Date;
  startDate?: Date;
  negotiationNotes?: string;
  offeredAt?: Date;
}

export interface InterviewRound {
  id: string;
  roundNumber: number;
  type: InterviewType;
  scheduledAt?: Date;
  duration?: number; // in minutes
  interviewerIds?: string[]; // IDs of contacts
  location?: string;
  status: InterviewStatus;
  outcome: InterviewOutcome;
  notes?: string;
  feedback?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SourceInfo {
  source: JobSource;
  referredByContactId?: string;
  sourcePlatform?: string; // e.g., "Indeed", "Glassdoor" for job_board
  sourceNotes?: string;
}

// Human-readable labels for workflow types
export const REJECTION_REASON_LABELS: Record<RejectionReason, string> = {
  ghosted: 'Ghosted',
  skills_mismatch: 'Skills Mismatch',
  culture_fit: 'Culture Fit',
  salary: 'Salary Expectations',
  position_filled: 'Position Filled',
  other: 'Other',
};

export const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
  phone_screen: 'Phone Screen',
  recruiter_call: 'Recruiter Call',
  technical: 'Technical Interview',
  behavioral: 'Behavioral Interview',
  system_design: 'System Design',
  onsite: 'Onsite',
  panel: 'Panel Interview',
  final: 'Final Round',
  other: 'Other',
};

export const INTERVIEW_STATUS_LABELS: Record<InterviewStatus, string> = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rescheduled: 'Rescheduled',
};

export const INTERVIEW_OUTCOME_LABELS: Record<InterviewOutcome, string> = {
  passed: 'Passed',
  failed: 'Failed',
  pending: 'Pending',
  unknown: 'Unknown',
};

export const JOB_SOURCE_LABELS: Record<JobSource, string> = {
  referral: 'Referral',
  linkedin: 'LinkedIn',
  company_site: 'Company Website',
  job_board: 'Job Board',
  recruiter_outreach: 'Recruiter Outreach',
  networking: 'Networking',
  other: 'Other',
};

// Career Coach types
export interface CareerCoachEntry {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Skill categories for grouping
export type SkillCategory = 'technical' | 'soft' | 'domain';

// Individual skill entry with metadata
export interface SkillEntry {
  skill: string;
  category: SkillCategory;
  source: string; // "resume" | "additionalContext" | "contextDoc:filename" | "manual"
  addedAt: Date;
}

export interface UserSkillProfile {
  skills: SkillEntry[];        // Categorized skills with sources
  lastExtractedAt?: Date;
}

export interface CareerCoachState {
  history: CareerCoachEntry[];
  skillProfile?: UserSkillProfile;
  lastAnalyzedAt?: Date;
}

export interface SavedStory {
  id: string;
  question: string;  // The topic/question this story answers
  answer: string;    // The user's experience/story
  category?: string; // Optional: "leadership", "technical", "conflict", etc.
  createdAt: Date;

  // Time & Place
  company?: string;
  role?: string;
  projectName?: string;
  timeframe?: string;

  // Impact
  outcome?: string;
  lessonsLearned?: string;

  // Classification
  skills?: string[];

  // Metadata
  source?: 'manual' | 'chat' | 'import';
  sourceJobId?: string;
  updatedAt?: Date;
}

export type StorySkillCategory = 'technical' | 'soft' | 'domain';

export const STORY_SKILL_CATEGORIES: Record<StorySkillCategory, { label: string; color: string }> = {
  technical: { label: 'Technical', color: 'bg-primary-subtle text-primary' },
  soft: { label: 'Soft Skills', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  domain: { label: 'Domain', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
};

// Career development project types
export type ProjectStatus = 'idea' | 'in_progress' | 'completed';

export interface CareerProjectSource {
  type: 'career_coach' | 'job' | 'agent' | 'manual';
  jobId?: string;
  jobTitle?: string;
  company?: string;
}

export interface CareerProject {
  id: string;
  title: string;
  description: string;
  details?: string;          // Full markdown with architecture, roadmap, etc.
  skills: string[];
  status: ProjectStatus;
  source?: CareerProjectSource;
  createdAt: Date;
  updatedAt: Date;
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  idea: 'Idea',
  in_progress: 'In Progress',
  completed: 'Completed',
};

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
  careerProjects: CareerProject[]; // Career development projects

  // Agent settings
  agentSettings?: AgentSettings;

  // Agent chat persistence (CommandBar)
  agentChatHistory?: AgentChatMessage[];
  agentMessages?: AIMessageWithTools[];

  // Onboarding
  onboardingCompleted: boolean;

  // Privacy consent for external services
  externalServicesConsent?: {
    jobSearch?: boolean;    // SerApi job search consent
    webResearch?: boolean;  // Tavily web research consent
    consentedAt?: Date;
    // User-provided API keys for direct mode (bypasses server proxy)
    tavilyApiKey?: string;  // For web research - base64 encoded
    serpApiKey?: string;    // For job search - base64 encoded
  };
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

// ============================================================================
// Embedding System Types
// ============================================================================

/**
 * Types of content that can be embedded for semantic search.
 * Each type maps to a specific data source in the application.
 *
 * To add a new embeddable type:
 * 1. Add the type here
 * 2. Add extraction logic in embeddingService.ts extractTextForEmbedding()
 * 3. Add indexing trigger in appStore for when this content changes
 */
export type EmbeddableEntityType =
  | 'job'           // Job descriptions (job.jdText)
  | 'story'         // Saved stories (settings.savedStories)
  | 'qa'            // Q&A history entries (job.qaHistory)
  | 'note'          // Job notes (job.notes)
  | 'doc'           // Context documents (settings.contextDocuments)
  | 'coverLetter';  // Generated cover letters (job.coverLetter)

/**
 * A stored embedding record in the database.
 * Used for semantic search and similarity matching.
 */
export interface EmbeddingRecord {
  /** Composite key: entityType:entityId (e.g., "job:abc123") */
  id: string;
  /** Type of content this embedding represents */
  entityType: EmbeddableEntityType;
  /** ID of the source entity (job ID, story ID, etc.) */
  entityId: string;
  /** SHA-256 hash of source text for change detection */
  textHash: string;
  /** 384-dimensional embedding vector from all-MiniLM-L6-v2 */
  embedding: number[];
  /** For chunked documents, which chunk this is (0-indexed) */
  chunkIndex?: number;
  /** Total number of chunks for this entity */
  chunkTotal?: number;
  /** Parent job ID for job-related content (qa, note, coverLetter) */
  parentJobId?: string;
  /** When this embedding was created */
  createdAt: Date;
}

/**
 * Result from a semantic similarity search.
 */
export interface SimilarityResult {
  /** The embedding record that matched */
  record: EmbeddingRecord;
  /** Cosine similarity score (0-1, higher is more similar) */
  score: number;
}

/**
 * Status of the embedding system.
 */
export interface EmbeddingStatus {
  /** Whether the embedding model is loaded and ready */
  isReady: boolean;
  /** Whether the model is currently being downloaded/loaded */
  isLoading: boolean;
  /** Download/load progress (0-100) */
  progress: number;
  /** Current stage of initialization */
  stage: 'idle' | 'download' | 'load' | 'ready' | 'error';
  /** Error message if initialization failed */
  error?: string;
  /** Number of items currently in the embedding index */
  indexedCount: number;
  /** Number of items pending embedding */
  pendingCount: number;
}

/**
 * Options for semantic search queries.
 */
export interface SemanticSearchOptions {
  /** Maximum number of results to return (default: 5) */
  limit?: number;
  /** Minimum similarity score threshold (0-1, default: 0.3) */
  threshold?: number;
  /** Filter by specific entity types */
  entityTypes?: EmbeddableEntityType[];
  /** Filter by specific job ID (for job-scoped searches) */
  jobId?: string;
}

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
  careerProjects: [],
  onboardingCompleted: false,
};
