// ============================================================================
// Batch Scanner Types
// ============================================================================

/**
 * A career page URL to scan for job listings.
 */
export interface CareerPageUrl {
  id: string;
  url: string;
  companyHint?: string; // User-provided company name hint
}

/**
 * Status of a URL being scanned.
 */
export type UrlScanStatus = 'pending' | 'fetching' | 'extracting' | 'complete' | 'error';

/**
 * A URL that has been or is being scanned.
 */
export interface ScannedUrl {
  id: string;
  original: CareerPageUrl;
  status: UrlScanStatus;
  finalUrl?: string; // URL after following redirects
  extractedJobs: ExtractedJob[];
  extractionResult?: ExtractionResult;
  error?: string;
}

/**
 * A job extracted from a career page.
 */
export interface ExtractedJob {
  id: string;
  title: string;
  url: string;
  description?: string;        // Full description (fetched for relevant jobs)
  descriptionSnippet?: string; // Quick snippet from listing
  location?: string;
  department?: string;
}

/**
 * Score status for a job being scored.
 */
export type ScoreStatus = 'pending' | 'scoring' | 'complete' | 'error';

/**
 * A job with dual scoring (resume fit + career trajectory fit).
 */
export interface ScoredJob extends ExtractedJob {
  sourceUrlId: string;
  company: string;

  // Resume fit scoring
  resumeFitScore?: number;      // 0-100
  resumeFitGrade?: string;      // A+, A, A-, B+, etc.

  // Career trajectory fit scoring
  trajectoryFitScore?: number;  // 0-100
  trajectoryFitGrade?: string;

  scoreStatus: ScoreStatus;
  isSelected: boolean;
  isImported: boolean;
}

/**
 * Known ATS (Applicant Tracking System) platforms.
 */
export type ATSType =
  | 'greenhouse'
  | 'lever'
  | 'ashby'
  | 'workday'
  | 'smartrecruiters'
  | 'unknown';

/**
 * Method used to extract jobs from a career page.
 */
export type ExtractionMethod = 'json-api' | 'structured-data' | 'heuristic' | 'manual';

/**
 * Confidence level in the extraction result.
 */
export type ExtractionConfidence = 'high' | 'medium' | 'low';

/**
 * Result of extracting jobs from a career page.
 */
export interface ExtractionResult {
  company: string;
  jobs: ExtractedJob[];
  extractionMethod: ExtractionMethod;
  atsType?: ATSType;
  confidence: ExtractionConfidence;
}

/**
 * Progress tracking for batch scanning.
 */
export interface BatchScanProgress {
  urlsTotal: number;
  urlsComplete: number;
  currentUrl?: string;
  jobsFound: number;
}

/**
 * Progress tracking for job scoring.
 */
export interface ScoringProgress {
  total: number;
  completed: number;
  currentJob?: string;
}

/**
 * Sort options for scan results.
 */
export type SortField = 'resumeFit' | 'trajectoryFit' | 'company' | 'title';
export type SortDirection = 'asc' | 'desc';

/**
 * Dual score result from scoring service.
 */
export interface DualScore {
  resumeFitScore: number;
  resumeFitGrade: string;
  trajectoryFitScore: number;
  trajectoryFitGrade: string;
}

/**
 * Response from the career page fetch API.
 */
export interface CareerPageFetchResponse {
  success: boolean;
  finalUrl?: string;
  html?: string;
  contentType?: string;
  error?: string;
  errorCode?: 'TIMEOUT' | 'NETWORK_ERROR' | 'BLOCKED' | 'NOT_FOUND' | 'RATE_LIMITED';
  retryAfterSeconds?: number; // From Retry-After header when rate limited
}

/**
 * Grade thresholds for score-to-grade conversion.
 */
export const GRADE_THRESHOLDS: { min: number; grade: string }[] = [
  { min: 95, grade: 'A+' },
  { min: 90, grade: 'A' },
  { min: 85, grade: 'A-' },
  { min: 80, grade: 'B+' },
  { min: 75, grade: 'B' },
  { min: 70, grade: 'B-' },
  { min: 65, grade: 'C+' },
  { min: 60, grade: 'C' },
  { min: 55, grade: 'C-' },
  { min: 50, grade: 'D+' },
  { min: 45, grade: 'D' },
  { min: 0, grade: 'F' },
];

/**
 * Convert a numeric score (0-100) to a letter grade.
 */
export function scoreToGrade(score: number): string {
  for (const threshold of GRADE_THRESHOLDS) {
    if (score >= threshold.min) {
      return threshold.grade;
    }
  }
  return 'F';
}
