/**
 * Find External Jobs Tool
 *
 * AI-powered job search that:
 * 1. Takes a natural language description of desired jobs
 * 2. Generates multiple search queries based on description + user profile
 * 3. Calls SerApi for each query to get broad coverage
 * 4. Deduplicates results by job link/title+company
 * 5. Scores and ranks results against user profile using embeddings
 * 6. Returns curated recommendations with match explanations
 */

import { useAppStore } from '../../../stores/appStore';
import { useCommandBarStore } from '../../../stores/commandBarStore';
import type { ToolDefinition, ToolResult, ToolProgressCallback } from '../../../types/agent';
import type { SearchResultJob } from '../../../types/jobSearch';
import { findExternalJobsSchema, type FindExternalJobsInput } from './schemas';
import {
  searchJobs,
  scoreToGrade,
} from '../../jobSearch/jobSearchService';
import {
  buildCandidateProfile,
  hasValidCandidateProfile,
  getCandidateProfileEmbedding,
  calculateMatchScore,
} from '../../jobSearch/jobMatchingService';
import { callAI, extractJSON } from '../../ai';

interface RankedJobResult {
  title: string;
  company: string;
  location: string;
  description: string;
  source: string;
  link?: string;
  applyLink?: string;
  postedAt?: string;
  salary?: string;
  remote?: boolean;
  matchScore: number;
  matchGrade: string;
  matchExplanation: string;
  /** Pre-formatted markdown links for Preview and View actions */
  actions: string;
  /** Google Jobs ID for building deep links */
  jobId?: string;
}

/**
 * Build pre-formatted action links for a job.
 * Uses jobId for stable linking - the AI agent may reorder results in the table,
 * so we can't rely on array indices.
 */
function buildActionLinks(jobId: string): string {
  return `[Preview](jhb://preview/${encodeURIComponent(jobId)})`;
}

interface FindExternalJobsResult {
  jobs: RankedJobResult[];
  queriesUsed: string[];
  totalFound: number;
  totalAfterDedup: number;
  profileUsed: boolean;
}

/**
 * Generate multiple search queries based on description and user profile
 */
async function generateSearchQueries(
  description: string,
  candidateProfile: string | null,
  location?: string
): Promise<string[]> {
  const profileContext = candidateProfile
    ? `\n\nCandidate background (use to infer relevant skills/terms):\n${candidateProfile.slice(0, 2000)}`
    : '';

  const prompt = `Generate 3-4 different job search queries based on this request:

Request: "${description}"
${location ? `Location: ${location}` : ''}
${profileContext}

Requirements:
- Each query should be 2-5 words, optimized for Google Jobs search
- Try different angles: role titles, skill combinations, industry terms
- Make queries specific enough to find relevant jobs
- Don't include location in the queries (handled separately)

Return ONLY a JSON array of strings, no other text:
["query1", "query2", "query3"]`;

  try {
    const response = await callAI([{ role: 'user', content: prompt }]);
    const queries = JSON.parse(extractJSON(response));

    if (!Array.isArray(queries) || queries.length === 0) {
      // Fall back to using the description directly
      return [description.slice(0, 100)];
    }

    return queries.slice(0, 4); // Cap at 4 queries
  } catch (error) {
    console.warn('[FindExternalJobs] Failed to generate queries, using description:', error);
    return [description.slice(0, 100)];
  }
}

/**
 * Deduplicate jobs by link or title+company combo
 */
function deduplicateJobs(jobs: SearchResultJob[]): SearchResultJob[] {
  const seen = new Set<string>();
  const unique: SearchResultJob[] = [];

  for (const job of jobs) {
    // Primary key: job link
    const linkKey = job.link?.toLowerCase().trim();
    if (linkKey && seen.has(linkKey)) continue;

    // Secondary key: title + company
    const titleCompanyKey = `${job.title.toLowerCase().trim()}|${job.company.toLowerCase().trim()}`;
    if (seen.has(titleCompanyKey)) continue;

    if (linkKey) seen.add(linkKey);
    seen.add(titleCompanyKey);
    unique.push(job);
  }

  return unique;
}

/**
 * Generate a brief explanation for why a job matches the profile.
 * Uses templates instead of AI calls for performance.
 */
function getMatchExplanation(matchScore: number): string {
  if (matchScore >= 85) {
    return 'Excellent match - strong alignment with your skills and experience';
  }
  if (matchScore >= 75) {
    return 'Strong match - good fit with your background';
  }
  if (matchScore >= 65) {
    return 'Good match - relevant experience detected';
  }
  if (matchScore >= 55) {
    return 'Moderate match - some skills align';
  }
  return 'Lower match - may require additional skills or experience';
}

export const findExternalJobsTool: ToolDefinition<FindExternalJobsInput, FindExternalJobsResult> = {
  name: 'find_external_jobs',
  description: `Search for new job opportunities using intelligent multi-query search. Generates multiple search queries, aggregates results, and ranks them against the user's profile.

Use this when someone asks to find jobs, search for positions, or look for opportunities.

When presenting results, format them as follows:
1. First, summarize the search: "I searched using X queries and found Y unique jobs"
2. List the queries used
3. Present the top matches in a markdown table with these columns:
   | # | Job Title | Company | Score | Location | Actions |
   Include the match grade (A, B+, etc.) with the score percentage.
4. IMPORTANT: In the Actions column, use the \`actions\` field value from each job result EXACTLY as provided - it contains pre-formatted clickable links. Do NOT modify or reconstruct these links.
5. Below the table, mention that users can click Preview to see the full job description.`,
  category: 'read',
  inputSchema: findExternalJobsSchema,
  requiresConfirmation: false,

  async execute(input, onProgress?: ToolProgressCallback): Promise<ToolResult<FindExternalJobsResult>> {
    const { settings, jobs: existingJobs } = useAppStore.getState();
    const maxResults = input.maxResults || 15;

    // Check if we have a candidate profile for personalized search
    const hasProfile = hasValidCandidateProfile(settings);
    const candidateProfile = hasProfile ? buildCandidateProfile(settings) : null;

    // 1. Generate search queries
    onProgress?.('Generating search queries...');
    console.log('[FindExternalJobs] Generating search queries...');
    const queries = await generateSearchQueries(
      input.description,
      candidateProfile,
      input.location
    );
    console.log('[FindExternalJobs] Queries:', queries);

    // 2. Execute searches for all queries in parallel
    onProgress?.(`Searching ${queries.length} queries in parallel...`);
    console.log(`[FindExternalJobs] Searching ${queries.length} queries in parallel...`);
    const searchPromises = queries.map(async (query) => {
      try {
        const results = await searchJobs({
          query,
          location: input.location,
        });
        console.log(`[FindExternalJobs] Got ${results.length} results for "${query}"`);
        return { query, results, success: true };
      } catch (error) {
        console.warn(`[FindExternalJobs] Search failed for "${query}":`, error);
        return { query, results: [] as SearchResultJob[], success: false };
      }
    });

    const searchResults = await Promise.all(searchPromises);

    const allResults: SearchResultJob[] = [];
    const queriesUsed: string[] = [];
    for (const { query, results, success } of searchResults) {
      if (success) {
        allResults.push(...results);
        queriesUsed.push(query);
      }
    }

    if (allResults.length === 0) {
      return {
        success: true,
        data: {
          jobs: [],
          queriesUsed,
          totalFound: 0,
          totalAfterDedup: 0,
          profileUsed: hasProfile,
        },
      };
    }

    // 3. Deduplicate results
    onProgress?.(`Found ${allResults.length} jobs, deduplicating...`);
    const uniqueJobs = deduplicateJobs(allResults);
    console.log(`[FindExternalJobs] ${allResults.length} results -> ${uniqueJobs.length} unique`);

    // 4. Filter out already-imported jobs
    const existingLinks = new Set(existingJobs.map(j => j.jdLink?.toLowerCase()).filter(Boolean));
    const newJobs = uniqueJobs.filter(job => !job.link || !existingLinks.has(job.link.toLowerCase()));

    // 5. Score and rank jobs
    let rankedJobs: RankedJobResult[];

    if (hasProfile) {
      onProgress?.(`Scoring ${newJobs.length} jobs against your profile...`);
      console.log('[FindExternalJobs] Scoring jobs against profile...');
      const profileEmbedding = await getCandidateProfileEmbedding(settings);

      // Score each job
      const scoredJobs: Array<{ job: SearchResultJob; score: number }> = [];
      for (const job of newJobs) {
        const jobText = `${job.title}\nat ${job.company}\n${job.description || ''}`;
        const score = await calculateMatchScore(jobText, profileEmbedding);
        scoredJobs.push({ job, score });
      }

      // Sort by score descending
      scoredJobs.sort((a, b) => b.score - a.score);

      onProgress?.(`Ranking top ${Math.min(maxResults, scoredJobs.length)} matches...`);
      // Take top results with template explanations (no AI calls for speed)
      const topJobs = scoredJobs.slice(0, maxResults);
      rankedJobs = topJobs.map(({ job, score }) => ({
        title: job.title,
        company: job.company,
        location: job.location,
        description: job.description || '',
        source: job.source,
        link: job.link,
        applyLink: job.applyLink,
        postedAt: job.postedAt,
        salary: job.salary,
        remote: job.remote,
        matchScore: score,
        matchGrade: scoreToGrade(score),
        matchExplanation: getMatchExplanation(score),
        actions: buildActionLinks(job.jobId),
        jobId: job.jobId,
      }));
    } else {
      // No profile - just return jobs without scoring
      rankedJobs = newJobs.slice(0, maxResults).map((job) => ({
        title: job.title,
        company: job.company,
        location: job.location,
        description: job.description || '',
        source: job.source,
        link: job.link,
        applyLink: job.applyLink,
        postedAt: job.postedAt,
        salary: job.salary,
        remote: job.remote,
        matchScore: 0,
        matchGrade: 'N/A',
        matchExplanation: 'Add your resume to settings to see match scores',
        actions: buildActionLinks(job.jobId),
        jobId: job.jobId,
      }));
    }

    // Store results in commandBarStore for preview links
    useCommandBarStore.getState().setSearchResults(
      rankedJobs.map(job => ({
        title: job.title,
        company: job.company,
        location: job.location,
        description: job.description,
        source: job.source,
        link: job.link,
        applyLink: job.applyLink,
        postedAt: job.postedAt,
        salary: job.salary,
        remote: job.remote,
        matchScore: job.matchScore,
        matchGrade: job.matchGrade,
        matchExplanation: job.matchExplanation,
        jobId: job.jobId,
      }))
    );

    return {
      success: true,
      data: {
        jobs: rankedJobs,
        queriesUsed,
        totalFound: allResults.length,
        totalAfterDedup: uniqueJobs.length,
        profileUsed: hasProfile,
      },
    };
  },
};
