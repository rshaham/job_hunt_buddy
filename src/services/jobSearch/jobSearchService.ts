/**
 * Job Search Service
 *
 * Handles API calls to the /api/search/jobs proxy endpoint
 * and provides utilities for transforming search results to Job entities.
 */

import type { Job, TimelineEvent } from '../../types';
import type {
  SearchResultJob,
  JobSearchCriteria,
  JobSearchResponse,
  EnrichedSearchResult,
  JobSearchErrorCode,
} from '../../types/jobSearch';
import { generateId } from '../../utils/helpers';

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
 * Search for jobs via the /api/search/jobs proxy endpoint.
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

  try {
    const response = await fetch('/api/search/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: criteria.query.trim(),
        location: criteria.location?.trim() || undefined,
        // Note: remoteOnly could be added to query or as a separate param
        // For now, we can append "remote" to query if remoteOnly is true
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
