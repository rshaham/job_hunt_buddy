/**
 * Job Matching Service
 *
 * Calculates semantic similarity between job descriptions and the user's
 * candidate profile (resume + stories + context documents).
 *
 * Uses the existing embedding infrastructure (all-MiniLM-L6-v2) for
 * vector-based semantic matching.
 */

import type { AppSettings } from '../../types';
import type { EnrichedSearchResult } from '../../types/jobSearch';
import { embedText, cosineSimilarity } from '../embeddings';
import { scoreToGrade } from './jobSearchService';

// ============================================================================
// Candidate Profile
// ============================================================================

/**
 * Build a candidate profile string from resume, stories, and context documents.
 *
 * The profile combines all user content to create a rich representation
 * of the candidate's skills, experience, and achievements.
 *
 * @param settings - App settings containing resume, stories, and documents
 * @returns Combined profile text
 */
export function buildCandidateProfile(settings: AppSettings): string {
  const parts: string[] = [];

  // 1. Resume (required)
  if (settings.defaultResumeText) {
    parts.push(settings.defaultResumeText);
  }

  // 2. Additional context (free-form text about the user)
  if (settings.additionalContext) {
    parts.push(settings.additionalContext);
  }

  // 3. Stories (STAR format experiences)
  if (settings.savedStories?.length) {
    const storiesText = settings.savedStories
      .map((s) => `${s.question}\n${s.answer}`)
      .join('\n\n');
    parts.push(storiesText);
  }

  // 4. Context documents
  if (settings.contextDocuments?.length) {
    const docsText = settings.contextDocuments
      .map((d) => d.useSummary && d.summary ? d.summary : d.fullText)
      .join('\n\n');
    parts.push(docsText);
  }

  return parts.join('\n\n---\n\n');
}

/**
 * Check if a valid candidate profile can be built.
 * Resume is required.
 *
 * @param settings - App settings
 * @returns true if resume is available
 */
export function hasValidCandidateProfile(settings: AppSettings): boolean {
  return Boolean(settings.defaultResumeText?.trim());
}

// ============================================================================
// Embedding & Matching
// ============================================================================

/** Cached candidate profile embedding */
let cachedProfileEmbedding: number[] | null = null;
let cachedProfileHash: string | null = null;

/**
 * Generate a simple hash of the profile content for cache invalidation.
 */
function hashProfile(profile: string): string {
  // Simple hash - just use length and first/last chars
  return `${profile.length}-${profile.slice(0, 50)}-${profile.slice(-50)}`;
}

/**
 * Get or generate the candidate profile embedding.
 * Caches the result to avoid re-embedding on every search.
 *
 * @param settings - App settings
 * @returns Profile embedding vector (384 dimensions)
 * @throws Error if no resume is available
 */
export async function getCandidateProfileEmbedding(
  settings: AppSettings
): Promise<number[]> {
  if (!hasValidCandidateProfile(settings)) {
    throw new Error('Resume is required for job matching');
  }

  const profile = buildCandidateProfile(settings);
  const profileHash = hashProfile(profile);

  // Return cached embedding if profile hasn't changed
  if (cachedProfileEmbedding && cachedProfileHash === profileHash) {
    return cachedProfileEmbedding;
  }

  // Generate new embedding
  console.log('[JobMatching] Generating candidate profile embedding...');
  cachedProfileEmbedding = await embedText(profile);
  cachedProfileHash = profileHash;

  return cachedProfileEmbedding;
}

/**
 * Invalidate the cached profile embedding.
 * Call this when settings change.
 */
export function invalidateProfileCache(): void {
  cachedProfileEmbedding = null;
  cachedProfileHash = null;
}

/**
 * Normalize a cosine similarity score to a more intuitive 0-100 scale.
 *
 * Cosine similarity for job matching typically ranges 0.3-0.65.
 * We map this to 40-95% for more meaningful, actionable scores.
 *
 * @param cosineSim - Raw cosine similarity (-1 to 1)
 * @returns Normalized score (40-95)
 */
function normalizeScore(cosineSim: number): number {
  const MIN_SIM = 0.30;  // Below this = 40%
  const MAX_SIM = 0.65;  // Above this = 95%

  if (cosineSim <= MIN_SIM) return 40;
  if (cosineSim >= MAX_SIM) return 95;

  // Linear interpolation between 40-95%
  return Math.round(40 + ((cosineSim - MIN_SIM) / (MAX_SIM - MIN_SIM)) * 55);
}

/**
 * Extract the requirements/qualifications section from a job description.
 * These sections typically contain the most relevant matching criteria.
 *
 * @param text - Full job description text
 * @returns Extracted requirements section, or null if not found
 */
function extractRequirements(text: string): string | null {
  // Common patterns for requirements sections
  const patterns = [
    /(?:requirements?|qualifications?|what you.ll bring|must have|skills required)[\s:]+(.{200,1000}?)(?=\n\n|responsibilities|about (?:us|the)|benefits|perks|what we offer|$)/i,
    /(?:you (?:have|will have|should have|bring))[\s:]+(.{200,800}?)(?=\n\n|responsibilities|about|benefits|$)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
}

/**
 * Calculate the match score for a single job against the candidate profile.
 * Uses weighted scoring: 60% requirements match + 40% full description match.
 *
 * @param jobDescription - Job description text
 * @param profileEmbedding - Pre-computed profile embedding
 * @returns Match score (40-95)
 */
export async function calculateMatchScore(
  jobDescription: string,
  profileEmbedding: number[]
): Promise<number> {
  // Generate embedding for the full job description
  const fullEmbed = await embedText(jobDescription);
  const fullScore = cosineSimilarity(profileEmbedding, fullEmbed);

  // Try to extract and weight requirements section more heavily
  const requirementsSection = extractRequirements(jobDescription);

  if (requirementsSection && requirementsSection.length >= 100) {
    try {
      const reqEmbed = await embedText(requirementsSection);
      const reqScore = cosineSimilarity(profileEmbedding, reqEmbed);

      // Weight: 60% requirements, 40% full description
      const weightedScore = reqScore * 0.6 + fullScore * 0.4;
      return normalizeScore(weightedScore);
    } catch (error) {
      // Fall back to full description only
      console.warn('[JobMatching] Failed to embed requirements section:', error);
    }
  }

  return normalizeScore(fullScore);
}

/**
 * Progress callback for batch scoring
 */
export type MatchProgressCallback = (completed: number, total: number) => void;

/**
 * Calculate match scores for multiple jobs in batch.
 *
 * Processes jobs sequentially to avoid overwhelming the embedding worker.
 * Calls onProgress after each job is scored.
 *
 * @param jobs - Array of search results
 * @param profileEmbedding - Pre-computed profile embedding
 * @param onProgress - Optional progress callback
 * @returns Enriched results with match scores
 */
export async function calculateMatchScoresBatch(
  jobs: EnrichedSearchResult[],
  profileEmbedding: number[],
  onProgress?: MatchProgressCallback
): Promise<EnrichedSearchResult[]> {
  const results: EnrichedSearchResult[] = [];
  const total = jobs.length;

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];

    try {
      // Build a richer text representation for matching
      const jobText = [
        job.title,
        `at ${job.company}`,
        job.description,
      ].filter(Boolean).join('\n\n');

      const matchScore = await calculateMatchScore(jobText, profileEmbedding);
      const matchGrade = scoreToGrade(matchScore);

      results.push({
        ...job,
        matchScore,
        matchGrade,
        scoreStatus: 'complete',
      });
    } catch (error) {
      console.warn(`[JobMatching] Failed to score job ${job.jobId}:`, error);
      results.push({
        ...job,
        scoreStatus: 'error',
      });
    }

    // Report progress
    onProgress?.(i + 1, total);
  }

  // Sort by match score (highest first)
  results.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));

  return results;
}

/**
 * Score a single job and return the updated result.
 * Used for progressive scoring where we update one job at a time.
 *
 * @param job - The job to score
 * @param profileEmbedding - Pre-computed profile embedding
 * @returns Updated job with score, or with error status
 */
export async function scoreJob(
  job: EnrichedSearchResult,
  profileEmbedding: number[]
): Promise<EnrichedSearchResult> {
  try {
    const jobText = [
      job.title,
      `at ${job.company}`,
      job.description,
    ].filter(Boolean).join('\n\n');

    const matchScore = await calculateMatchScore(jobText, profileEmbedding);
    const matchGrade = scoreToGrade(matchScore);

    return {
      ...job,
      matchScore,
      matchGrade,
      scoreStatus: 'complete',
    };
  } catch (error) {
    console.warn(`[JobMatching] Failed to score job ${job.jobId}:`, error);
    return {
      ...job,
      scoreStatus: 'error',
    };
  }
}
