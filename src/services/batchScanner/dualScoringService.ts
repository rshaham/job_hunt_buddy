/**
 * Dual Scoring Service
 *
 * Calculates two types of match scores for jobs:
 * 1. Resume Fit Score - How well skills/experience match job requirements
 * 2. Career Trajectory Score - How well the job aligns with career goals and growth path
 *
 * Uses the existing embedding infrastructure (all-MiniLM-L6-v2) for
 * vector-based semantic matching.
 */

import type { AppSettings, CareerCoachState } from '../../types';
import type { ExtractedJob, ScoredJob, DualScore } from '../../types/batchScanner';
import { scoreToGrade } from '../../types/batchScanner';
import { embedText, cosineSimilarity } from '../embeddings';
import { useAppStore } from '../../stores/appStore';

// ============================================================================
// Profile Builders
// ============================================================================

/**
 * Build a resume-focused profile for skills/experience matching.
 * Emphasizes technical skills, experience, and qualifications.
 */
export function buildResumeProfile(settings: AppSettings): string {
  const parts: string[] = [];

  // Primary: Resume text
  if (settings.defaultResumeText) {
    parts.push(settings.defaultResumeText);
  }

  // Additional context about the user
  if (settings.additionalContext) {
    parts.push(settings.additionalContext);
  }

  return parts.join('\n\n---\n\n');
}

/**
 * Build a career trajectory profile for career fit matching.
 * Emphasizes career progression, goals, projects, and growth direction.
 */
export function buildTrajectoryProfile(
  settings: AppSettings,
  careerCoachState: CareerCoachState | null
): string {
  const parts: string[] = [];

  // Career Projects - show progression and interests
  if (settings.careerProjects?.length) {
    parts.push('CAREER PROJECTS:');
    for (const project of settings.careerProjects) {
      parts.push(`- ${project.title}: ${project.description}`);
      if (project.details) {
        // Include first 500 chars of details
        parts.push(`  Details: ${project.details.slice(0, 500)}`);
      }
      if (project.skills?.length) {
        parts.push(`  Skills: ${project.skills.join(', ')}`);
      }
    }
  }

  // Saved Stories - show career experiences and achievements
  if (settings.savedStories?.length) {
    parts.push('\nCAREER EXPERIENCES:');
    for (const story of settings.savedStories) {
      parts.push(`- ${story.question}`);
      // Include answer (STAR story) - truncate if too long
      const answer = story.answer.length > 600 ? story.answer.slice(0, 600) + '...' : story.answer;
      parts.push(`  ${answer}`);
      if (story.category) {
        parts.push(`  Category: ${story.category}`);
      }
    }
  }

  // Context Documents - career goals, target roles, etc.
  if (settings.contextDocuments?.length) {
    parts.push('\nCAREER CONTEXT:');
    for (const doc of settings.contextDocuments) {
      parts.push(`- ${doc.name}:`);
      // Use summary if available, otherwise truncate full text
      const content = (doc.useSummary && doc.summary) ? doc.summary : doc.fullText.slice(0, 800);
      parts.push(`  ${content}`);
    }
  }

  // Skill Profile from Career Coach - strengths and target roles
  if (careerCoachState?.skillProfile) {
    const sp = careerCoachState.skillProfile;
    if (sp.skills?.length) {
      parts.push('\nSKILL PROFILE:');

      // Group skills by category
      const technical = sp.skills.filter(s => s.category === 'technical').map(s => s.skill);
      const soft = sp.skills.filter(s => s.category === 'soft').map(s => s.skill);
      const domain = sp.skills.filter(s => s.category === 'domain').map(s => s.skill);

      if (technical.length) {
        parts.push(`Technical Skills: ${technical.join(', ')}`);
      }
      if (soft.length) {
        parts.push(`Soft Skills: ${soft.join(', ')}`);
      }
      if (domain.length) {
        parts.push(`Domain Expertise: ${domain.join(', ')}`);
      }
    }
  }

  return parts.join('\n');
}

/**
 * Check if a valid resume profile can be built.
 */
export function hasValidResumeProfile(settings: AppSettings): boolean {
  return Boolean(settings.defaultResumeText?.trim());
}

/**
 * Check if a valid trajectory profile can be built.
 */
export function hasValidTrajectoryProfile(
  settings: AppSettings,
  careerCoachState: CareerCoachState | null
): boolean {
  return Boolean(
    settings.careerProjects?.length ||
    settings.savedStories?.length ||
    settings.contextDocuments?.length ||
    careerCoachState?.skillProfile?.skills?.length
  );
}

// ============================================================================
// Embedding Cache
// ============================================================================

/** Cached resume profile embedding */
let cachedResumeEmbedding: number[] | null = null;
let cachedResumeHash: string | null = null;

/** Cached trajectory profile embedding */
let cachedTrajectoryEmbedding: number[] | null = null;
let cachedTrajectoryHash: string | null = null;

/**
 * Generate a simple hash of profile content for cache invalidation.
 */
function hashProfile(profile: string): string {
  return `${profile.length}-${profile.slice(0, 50)}-${profile.slice(-50)}`;
}

/**
 * Get or generate the resume profile embedding.
 */
export async function getResumeProfileEmbedding(settings: AppSettings): Promise<number[] | null> {
  if (!hasValidResumeProfile(settings)) {
    return null;
  }

  const profile = buildResumeProfile(settings);
  const profileHash = hashProfile(profile);

  // Return cached embedding if profile hasn't changed
  if (cachedResumeEmbedding && cachedResumeHash === profileHash) {
    return cachedResumeEmbedding;
  }

  // Generate new embedding
  console.log('[DualScoring] Generating resume profile embedding...');
  cachedResumeEmbedding = await embedText(profile);
  cachedResumeHash = profileHash;

  return cachedResumeEmbedding;
}

/**
 * Get or generate the trajectory profile embedding.
 */
export async function getTrajectoryProfileEmbedding(
  settings: AppSettings,
  careerCoachState: CareerCoachState | null
): Promise<number[] | null> {
  if (!hasValidTrajectoryProfile(settings, careerCoachState)) {
    return null;
  }

  const profile = buildTrajectoryProfile(settings, careerCoachState);
  const profileHash = hashProfile(profile);

  // Return cached embedding if profile hasn't changed
  if (cachedTrajectoryEmbedding && cachedTrajectoryHash === profileHash) {
    return cachedTrajectoryEmbedding;
  }

  // Generate new embedding
  console.log('[DualScoring] Generating trajectory profile embedding...');
  cachedTrajectoryEmbedding = await embedText(profile);
  cachedTrajectoryHash = profileHash;

  return cachedTrajectoryEmbedding;
}

/**
 * Invalidate all cached embeddings.
 * Call this when settings change.
 */
export function invalidateProfileCaches(): void {
  cachedResumeEmbedding = null;
  cachedResumeHash = null;
  cachedTrajectoryEmbedding = null;
  cachedTrajectoryHash = null;
}

// ============================================================================
// Score Calculation
// ============================================================================

/**
 * Normalize a cosine similarity score to a 0-100 scale.
 * Cosine similarity for job matching typically ranges 0.25-0.60.
 */
function normalizeScore(cosineSim: number): number {
  const FLOOR = 0.25;   // Below this = 40%
  const CEILING = 0.60; // Above this = 95%

  if (cosineSim <= FLOOR) return 40;
  if (cosineSim >= CEILING) return 95;

  // Linear interpolation between 40-95%
  return Math.round(40 + ((cosineSim - FLOOR) / (CEILING - FLOOR)) * 55);
}

/**
 * Calculate both resume fit and trajectory fit scores for a job.
 */
export async function calculateDualScore(
  job: ExtractedJob,
  company: string,
  resumeEmbedding: number[] | null,
  trajectoryEmbedding: number[] | null
): Promise<DualScore> {
  // Build job text for embedding
  const jobText = [
    job.title,
    `at ${company}`,
    job.location,
    job.department,
    job.descriptionSnippet,
  ].filter(Boolean).join('\n\n');

  // Generate job embedding
  const jobEmbedding = await embedText(jobText);

  // Calculate resume fit score
  let resumeFitScore = 50; // Default if no resume
  if (resumeEmbedding) {
    const resumeSimilarity = cosineSimilarity(resumeEmbedding, jobEmbedding);
    resumeFitScore = normalizeScore(resumeSimilarity);
  }

  // Calculate trajectory fit score
  let trajectoryFitScore = 50; // Default if no trajectory profile
  if (trajectoryEmbedding) {
    const trajectorySimilarity = cosineSimilarity(trajectoryEmbedding, jobEmbedding);
    trajectoryFitScore = normalizeScore(trajectorySimilarity);
  }

  return {
    resumeFitScore,
    resumeFitGrade: scoreToGrade(resumeFitScore),
    trajectoryFitScore,
    trajectoryFitGrade: scoreToGrade(trajectoryFitScore),
  };
}

// ============================================================================
// Batch Scoring
// ============================================================================

/**
 * Progress callback for batch scoring.
 */
export type DualScoreProgressCallback = (completed: number, total: number) => void;

/**
 * Score multiple jobs and return scored results.
 */
export async function scoreBatch(
  jobs: Array<{ job: ExtractedJob; company: string; sourceUrlId: string }>,
  onProgress?: DualScoreProgressCallback
): Promise<ScoredJob[]> {
  const { settings, careerCoachState } = useAppStore.getState();

  // Get profile embeddings
  const resumeEmbedding = await getResumeProfileEmbedding(settings);
  const trajectoryEmbedding = await getTrajectoryProfileEmbedding(settings, careerCoachState);

  const results: ScoredJob[] = [];
  const total = jobs.length;

  for (let i = 0; i < jobs.length; i++) {
    const { job, company, sourceUrlId } = jobs[i];

    try {
      const dualScore = await calculateDualScore(
        job,
        company,
        resumeEmbedding,
        trajectoryEmbedding
      );

      results.push({
        ...job,
        sourceUrlId,
        company,
        resumeFitScore: dualScore.resumeFitScore,
        resumeFitGrade: dualScore.resumeFitGrade,
        trajectoryFitScore: dualScore.trajectoryFitScore,
        trajectoryFitGrade: dualScore.trajectoryFitGrade,
        scoreStatus: 'complete',
        isSelected: false,
        isImported: false,
      });
    } catch (error) {
      console.warn(`[DualScoring] Failed to score job ${job.id}:`, error);
      results.push({
        ...job,
        sourceUrlId,
        company,
        scoreStatus: 'error',
        isSelected: false,
        isImported: false,
      });
    }

    // Report progress
    onProgress?.(i + 1, total);
  }

  return results;
}

/**
 * Score a single job.
 */
export async function scoreJob(
  job: ExtractedJob,
  company: string,
  sourceUrlId: string
): Promise<ScoredJob> {
  const { settings, careerCoachState } = useAppStore.getState();

  const resumeEmbedding = await getResumeProfileEmbedding(settings);
  const trajectoryEmbedding = await getTrajectoryProfileEmbedding(settings, careerCoachState);

  try {
    const dualScore = await calculateDualScore(
      job,
      company,
      resumeEmbedding,
      trajectoryEmbedding
    );

    return {
      ...job,
      sourceUrlId,
      company,
      ...dualScore,
      scoreStatus: 'complete',
      isSelected: false,
      isImported: false,
    };
  } catch (error) {
    console.warn(`[DualScoring] Failed to score job ${job.id}:`, error);
    return {
      ...job,
      sourceUrlId,
      company,
      scoreStatus: 'error',
      isSelected: false,
      isImported: false,
    };
  }
}

/**
 * Check if scoring is possible (at least resume or trajectory profile available).
 */
export function canScore(): { canScore: boolean; reason?: string } {
  const { settings, careerCoachState } = useAppStore.getState();

  const hasResume = hasValidResumeProfile(settings);
  const hasTrajectory = hasValidTrajectoryProfile(settings, careerCoachState);

  if (!hasResume && !hasTrajectory) {
    return {
      canScore: false,
      reason: 'Add a resume or career context (projects, stories, documents) to enable job scoring.',
    };
  }

  return { canScore: true };
}
