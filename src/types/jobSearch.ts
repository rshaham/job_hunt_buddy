/**
 * Job Search Types
 *
 * Types for the Job Finder feature that searches for jobs via SerApi
 * and matches them against the user's candidate profile.
 */

/**
 * Raw job result from the /api/search/jobs proxy.
 * Matches the JobResult interface from api/search/jobs.ts
 */
export interface SearchResultJob {
  /** Unique job ID from SerApi */
  jobId: string;
  /** Job title */
  title: string;
  /** Company name */
  company: string;
  /** Job location */
  location: string;
  /** Source platform (e.g., "via LinkedIn", "via Indeed") */
  source: string;
  /** Job description snippet */
  description: string;
  /** When the job was posted (e.g., "2 days ago") */
  postedAt?: string;
  /** Salary information if available */
  salary?: string;
  /** Whether the job is remote */
  remote?: boolean;
  /** URL to the job posting */
  link: string;
}

/**
 * Search form inputs
 */
export interface JobSearchCriteria {
  /** Job title, skills, or keywords (or natural language description for AI search) */
  query: string;
  /** City, state, or region */
  location?: string;
  /** Filter for remote jobs only */
  remoteOnly?: boolean;
  /** Use AI-powered search (multiple queries, ranking, explanations) */
  useAISearch?: boolean;
}

/**
 * API response from /api/search/jobs
 */
export interface JobSearchResponse {
  results: SearchResultJob[];
  query: string;
  location?: string;
}

/**
 * Score calculation status for a job result
 */
export type ScoreStatus = 'pending' | 'calculating' | 'complete' | 'error';

/**
 * Enriched search result with computed match data and UI state
 */
export interface EnrichedSearchResult extends SearchResultJob {
  /** Match score (0-100), undefined if not yet computed */
  matchScore?: number;
  /** Letter grade (A, B+, C, etc.) */
  matchGrade?: string;
  /** Whether this job is selected for import */
  isSelected: boolean;
  /** Whether this job already exists in the database */
  isImported: boolean;
  /** Status of score calculation */
  scoreStatus: ScoreStatus;
}

/**
 * Job search store state
 */
export interface JobSearchState {
  /** Current search criteria */
  criteria: JobSearchCriteria | null;
  /** Search results with enriched data */
  results: EnrichedSearchResult[];
  /** Whether a search is in progress */
  isSearching: boolean;
  /** Error message from last search attempt */
  searchError: string | null;

  /** Progress of score calculations */
  scoringProgress: {
    completed: number;
    total: number;
  };

  /** IDs of selected jobs */
  selectedIds: Set<string>;

  /** Whether batch import is in progress */
  isImporting: boolean;

  /** Cached candidate profile embedding (resume + stories + docs) */
  profileEmbedding: number[] | null;
}

/**
 * Error codes for job search failures
 */
export type JobSearchErrorCode =
  | 'RATE_LIMITED'    // API rate limit hit
  | 'DAILY_CAP'       // Daily search limit exceeded
  | 'API_ERROR'       // Server-side API error
  | 'NETWORK_ERROR'   // Network connectivity issue
  | 'NOT_CONFIGURED'  // Service not available
  | 'INVALID_QUERY';  // Empty or invalid search query
