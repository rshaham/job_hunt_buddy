/**
 * Job Search Service
 *
 * Two modes:
 * 1. Direct mode: User provides their own SerApi key (stored in settings)
 *    - Calls SerApi directly from browser
 *    - No server proxy, no rate limiting
 *    - Truly local: searches never touch our servers
 *
 * 2. Proxy mode: Uses server-side proxy (/api/search/jobs)
 *    - API key is server-side only
 *    - Rate limited via Upstash Redis
 */

import type { Job, TimelineEvent } from '../../types';
import type {
  SearchResultJob,
  JobSearchCriteria,
  JobSearchResponse,
  EnrichedSearchResult,
  JobSearchErrorCode,
} from '../../types/jobSearch';
import { generateId, decodeApiKey } from '../../utils/helpers';
import { useAppStore } from '../../stores/appStore';

/**
 * Custom error class for job search failures.
 * Follows the pattern from webSearch.ts
 */
export class JobSearchError extends Error {
  constructor(
    message: string,
    public readonly code: JobSearchErrorCode
  ) {
    super(message);
    this.name = 'JobSearchError';
  }
}

/**
 * Search for jobs via the server proxy.
 *
 * Note: SerApi doesn't support CORS, so we can't call it directly from the browser.
 * Even with a user-provided API key, we must go through the proxy.
 * However, if the user provides their own key, we send it to the proxy which
 * will use it instead of the server's key (and skip rate limiting).
 *
 * @param criteria - Search parameters (query, location, remoteOnly)
 * @returns Array of job results
 * @throws JobSearchError on failure
 */
export async function searchJobs(
  criteria: JobSearchCriteria
): Promise<SearchResultJob[]> {
  // Validate input
  if (!criteria.query?.trim()) {
    throw new JobSearchError('Please enter a search query', 'INVALID_QUERY');
  }

  // Check if user has their own API key
  const { settings } = useAppStore.getState();
  const userApiKey = settings.externalServicesConsent?.serpApiKey;

  return searchJobsViaProxy(criteria, userApiKey ? decodeApiKey(userApiKey) : undefined);
}

/**
 * Proxy search - uses server-side proxy.
 * If userApiKey is provided, proxy uses it and skips rate limiting.
 */
async function searchJobsViaProxy(
  criteria: JobSearchCriteria,
  userApiKey?: string
): Promise<SearchResultJob[]> {
  try {
    const response = await fetch('/api/search/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: criteria.query.trim(),
        location: criteria.location?.trim() || undefined,
        // If user provided their own API key, send it to proxy (skips rate limiting)
        userApiKey: userApiKey || undefined,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 429) {
        throw new JobSearchError(
          data.error || 'Rate limit exceeded. Please try again later.',
          data.code === 'DAILY_CAP' ? 'DAILY_CAP' : 'RATE_LIMITED'
        );
      }
      if (response.status === 500 && data.code === 'NOT_CONFIGURED') {
        throw new JobSearchError(
          'Job search service is not configured.',
          'NOT_CONFIGURED'
        );
      }
      throw new JobSearchError(
        data.error || `Search failed: ${response.status}`,
        'API_ERROR'
      );
    }

    const searchResponse = data as JobSearchResponse;
    return searchResponse.results || [];
  } catch (error) {
    if (error instanceof JobSearchError) throw error;
    throw new JobSearchError(
      `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'NETWORK_ERROR'
    );
  }
}

/**
 * Check if a job already exists in the database by matching the job link.
 *
 * @param link - URL of the job posting
 * @param existingJobs - Current jobs from the app store
 * @returns true if a job with the same link exists
 */
export function isJobAlreadyImported(link: string, existingJobs: Job[]): boolean {
  if (!link) return false;
  return existingJobs.some((job) => job.jdLink === link);
}

/**
 * Convert a match score (0-100) to a letter grade.
 *
 * @param score - Match percentage (0-100)
 * @returns Letter grade (A+, A, A-, B+, B, B-, C+, C, C-, D, F)
 */
export function scoreToGrade(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 80) return 'A-';
  if (score >= 75) return 'B+';
  if (score >= 70) return 'B';
  if (score >= 65) return 'B-';
  if (score >= 60) return 'C+';
  if (score >= 55) return 'C';
  if (score >= 50) return 'C-';
  if (score >= 40) return 'D';
  return 'F';
}

/**
 * Transform a search result into a Job entity for database storage.
 *
 * @param result - The enriched search result to convert
 * @param defaultStatus - Initial status for the job (e.g., "Interested")
 * @returns Job data ready for addJob() (without id, dateAdded, lastUpdated)
 */
export function transformSearchResultToJob(
  result: EnrichedSearchResult,
  defaultStatus: string
): Omit<Job, 'id' | 'dateAdded' | 'lastUpdated'> {
  // Create timeline event for import
  const importEvent: TimelineEvent = {
    id: generateId(),
    type: 'Imported',
    description: `Imported from Job Finder${result.source ? ` (${result.source})` : ''}${result.postedAt ? ` - Posted ${result.postedAt}` : ''}`,
    date: new Date(),
  };

  return {
    company: result.company,
    title: result.title,
    jdLink: result.link || '',
    jdText: result.description || '',
    status: defaultStatus,

    // Pre-populate resume analysis if we have match data
    resumeAnalysis: result.matchScore !== undefined ? {
      grade: result.matchGrade || scoreToGrade(result.matchScore),
      matchPercentage: result.matchScore,
      strengths: [],     // Will be filled by full AI analysis later
      gaps: [],
      suggestions: [],
    } : null,

    // AI will generate these on demand
    summary: null,
    coverLetter: null,

    // Tracking
    contacts: [],
    notes: [],
    timeline: [importEvent],
    prepMaterials: [],
    qaHistory: [],
    learningTasks: [],
  };
}

/**
 * Enrich raw search results with initial UI state.
 *
 * @param results - Raw search results from API
 * @param existingJobs - Current jobs to check for duplicates
 * @returns Enriched results with selection and import state
 */
export function enrichSearchResults(
  results: SearchResultJob[],
  existingJobs: Job[]
): EnrichedSearchResult[] {
  return results.map((result) => ({
    ...result,
    isSelected: false,
    isImported: isJobAlreadyImported(result.link, existingJobs),
    scoreStatus: 'pending' as const,
  }));
}
