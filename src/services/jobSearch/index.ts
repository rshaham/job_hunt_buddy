/**
 * Job Search Module - Public API
 *
 * Provides job search functionality via SerApi proxy with
 * semantic matching against the user's candidate profile.
 */

// Service exports
export {
  searchJobs,
  isJobAlreadyImported,
  scoreToGrade,
  buildGoogleJobsLink,
  transformSearchResultToJob,
  enrichSearchResults,
  JobSearchError,
} from './jobSearchService';

export {
  buildCandidateProfile,
  hasValidCandidateProfile,
  getCandidateProfileEmbedding,
  invalidateProfileCache,
  calculateMatchScore,
  calculateMatchScoresBatch,
  scoreJob,
} from './jobMatchingService';

export type { MatchProgressCallback } from './jobMatchingService';

// Re-export types for convenience
export type {
  SearchResultJob,
  JobSearchCriteria,
  JobSearchResponse,
  EnrichedSearchResult,
  JobSearchState,
  ScoreStatus,
  JobSearchErrorCode,
} from '../../types/jobSearch';
