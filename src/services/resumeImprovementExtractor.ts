/**
 * Resume Improvement Extractor
 *
 * Analyzes tailored resumes to extract reusable improvements
 * (better phrasing, quantifications, skill descriptions) that
 * can be used as context when tailoring other resumes.
 */

import * as Diff from 'diff';
import type { Job } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface ResumeImprovement {
  type: 'phrasing' | 'quantification' | 'skill_description';
  original: string;
  improved: string;
  /** Which job this came from */
  sourceJob: {
    company: string;
    title: string;
  };
}


// ============================================================================
// Extraction Logic
// ============================================================================

/**
 * Extract sentence-level changes between original and tailored resume.
 * Focuses on meaningful changes, not minor formatting differences.
 */
function extractChanges(
  originalResume: string,
  tailoredResume: string
): Array<{ original: string; improved: string }> {
  const changes: Array<{ original: string; improved: string }> = [];

  // Use diff to find word-level changes
  const diff = Diff.diffWords(originalResume, tailoredResume);

  // Track significant changes (additions/modifications)
  let currentOriginal = '';
  let currentImproved = '';
  let hasChange = false;

  for (const part of diff) {
    if (part.removed) {
      currentOriginal += part.value;
      hasChange = true;
    } else if (part.added) {
      currentImproved += part.value;
      hasChange = true;
    } else {
      // Unchanged text - if we have accumulated changes, save them
      if (hasChange && currentOriginal.trim() && currentImproved.trim()) {
        changes.push({
          original: currentOriginal.trim(),
          improved: currentImproved.trim(),
        });
      }
      currentOriginal = '';
      currentImproved = '';
      hasChange = false;
    }
  }

  // Don't forget the last change
  if (hasChange && currentOriginal.trim() && currentImproved.trim()) {
    changes.push({
      original: currentOriginal.trim(),
      improved: currentImproved.trim(),
    });
  }

  return changes;
}

/**
 * Check if improvement is likely job-specific.
 */
function isJobSpecific(
  original: string,
  improved: string,
  job: Job
): boolean {
  const improvedLower = improved.toLowerCase();
  const originalLower = original.toLowerCase();

  // Filter if improved text contains company name but original didn't
  const companyLower = job.company.toLowerCase();
  if (
    improvedLower.includes(companyLower) &&
    !originalLower.includes(companyLower)
  ) {
    return true;
  }

  // Filter common job-specific phrases
  const jobSpecificPatterns = [
    /perfect fit for/i,
    /ideal candidate for/i,
    /aligns with .+ mission/i,
    /passionate about joining/i,
    /excited to contribute to/i,
    /at your company/i,
    /at your organization/i,
  ];

  for (const pattern of jobSpecificPatterns) {
    if (pattern.test(improved) && !pattern.test(original)) {
      return true;
    }
  }

  return false;
}

/**
 * Classify the type of improvement.
 */
function classifyImprovement(
  original: string,
  improved: string
): ResumeImprovement['type'] {
  // Check for quantification (numbers, percentages, metrics)
  const hasNewNumbers = /\d+%|\$[\d,]+|\d+\+?\s*(users|customers|engineers|team|people|projects)/i.test(
    improved
  );
  const hadNumbers = /\d+%|\$[\d,]+|\d+\+?\s*(users|customers|engineers|team|people|projects)/i.test(
    original
  );

  if (hasNewNumbers && !hadNumbers) {
    return 'quantification';
  }

  // Check for skill/technology descriptions
  const techTerms = /API|SDK|AWS|cloud|database|architecture|framework|system|platform/i;
  if (techTerms.test(improved) && improved.length > original.length * 1.2) {
    return 'skill_description';
  }

  // Default to phrasing improvement
  return 'phrasing';
}

/**
 * Check if improvement is substantial enough to be useful.
 */
function isSubstantialImprovement(original: string, improved: string): boolean {
  // Skip very short changes
  if (original.length < 15 || improved.length < 15) {
    return false;
  }

  // Skip if they're too similar (minor word swaps)
  const similarity = calculateSimilarity(original, improved);
  if (similarity > 0.9) {
    return false;
  }

  // Skip if improved is just shorter (deletions aren't improvements)
  if (improved.length < original.length * 0.7) {
    return false;
  }

  return true;
}

/**
 * Simple similarity calculation (Jaccard-like).
 */
function calculateSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));

  const intersection = new Set([...wordsA].filter((x) => wordsB.has(x)));
  const union = new Set([...wordsA, ...wordsB]);

  return intersection.size / union.size;
}

/**
 * Deduplicate similar improvements across jobs.
 */
function deduplicateImprovements(
  improvements: ResumeImprovement[]
): ResumeImprovement[] {
  const unique: ResumeImprovement[] = [];

  for (const imp of improvements) {
    const isDuplicate = unique.some(
      (existing) =>
        calculateSimilarity(existing.improved, imp.improved) > 0.7
    );
    if (!isDuplicate) {
      unique.push(imp);
    }
  }

  return unique;
}

// ============================================================================
// Main Export
// ============================================================================

/**
 * Gather reusable improvements from other jobs' tailored resumes.
 *
 * @param currentJobId - ID of the job being tailored (excluded from analysis)
 * @param jobs - All jobs to analyze
 * @param defaultResume - Default resume text for comparison
 * @param maxImprovements - Maximum improvements to return (default: 10)
 */
export function gatherCrossJobImprovements(
  currentJobId: string,
  jobs: Job[],
  defaultResume: string,
  maxImprovements: number = 10
): ResumeImprovement[] {
  const allImprovements: ResumeImprovement[] = [];

  // Filter to jobs with tailored resumes (excluding current job)
  const jobsWithTailoring = jobs
    .filter((job) => job.id !== currentJobId && job.tailoredResume)
    .sort(
      (a, b) =>
        new Date(b.lastUpdated || b.dateAdded).getTime() -
        new Date(a.lastUpdated || a.dateAdded).getTime()
    )
    .slice(0, 5); // Limit to 5 most recent jobs

  for (const job of jobsWithTailoring) {
    // Get original resume for this job (job-specific or default)
    const originalResume = job.resumeText || defaultResume;

    if (!originalResume || !job.tailoredResume) {
      continue;
    }

    // Extract changes
    const changes = extractChanges(originalResume, job.tailoredResume);

    // Process each change
    for (const change of changes) {
      // Skip job-specific content
      if (isJobSpecific(change.original, change.improved, job)) {
        continue;
      }

      // Skip non-substantial changes
      if (!isSubstantialImprovement(change.original, change.improved)) {
        continue;
      }

      // Classify and add
      const improvement: ResumeImprovement = {
        type: classifyImprovement(change.original, change.improved),
        original: change.original,
        improved: change.improved,
        sourceJob: {
          company: job.company,
          title: job.title,
        },
      };

      allImprovements.push(improvement);
    }
  }

  // Deduplicate and limit
  const deduplicated = deduplicateImprovements(allImprovements);
  return deduplicated.slice(0, maxImprovements);
}

/**
 * Format improvements as context for AI prompts.
 */
export function formatImprovementsContext(
  improvements: ResumeImprovement[]
): string {
  if (improvements.length === 0) {
    return '';
  }

  const byType: Record<ResumeImprovement['type'], ResumeImprovement[]> = {
    quantification: [],
    phrasing: [],
    skill_description: [],
  };

  for (const imp of improvements) {
    byType[imp.type].push(imp);
  }

  const sections: string[] = [];

  if (byType.quantification.length > 0) {
    const items = byType.quantification
      .map((imp) => `- "${imp.original}" → "${imp.improved}"`)
      .join('\n');
    sections.push(`### Achievement Quantification\n${items}`);
  }

  if (byType.phrasing.length > 0) {
    const items = byType.phrasing
      .map((imp) => `- "${imp.original}" → "${imp.improved}"`)
      .join('\n');
    sections.push(`### Phrasing Improvements\n${items}`);
  }

  if (byType.skill_description.length > 0) {
    const items = byType.skill_description
      .map((imp) => `- "${imp.original}" → "${imp.improved}"`)
      .join('\n');
    sections.push(`### Skill Descriptions\n${items}`);
  }

  return `## Learned Improvements from Previous Tailoring

The following phrasings have been effective in previous resume tailoring:

${sections.join('\n\n')}

Use these proven improvements when applicable. Adapt the phrasing to fit naturally.`;
}
