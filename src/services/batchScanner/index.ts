/**
 * Batch Scanner Service
 *
 * Provides functionality to scan multiple company career pages,
 * extract job listings, and score them against the user's profile.
 */

// ATS Detection
export {
  detectATS,
  detectATSFromUrl,
  detectATSFromHtml,
  getATSApiUrl,
  hasJsonApi,
} from './atsDetector';

// Job Extraction
export {
  fetchCareerPage,
  extractJobsFromPage,
  fetchAndExtractJobs,
  extractCareerKeywords,
  isJobTitleRelevant,
  fetchJobFullDescription,
} from './jobExtractor';

// Dual Scoring
export {
  buildResumeProfile,
  buildTrajectoryProfile,
  hasValidResumeProfile,
  hasValidTrajectoryProfile,
  getResumeProfileEmbedding,
  getTrajectoryProfileEmbedding,
  invalidateProfileCaches,
  calculateDualScore,
  scoreBatch,
  scoreJob,
  canScore,
} from './dualScoringService';
export type { DualScoreProgressCallback } from './dualScoringService';
