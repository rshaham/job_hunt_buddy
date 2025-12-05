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
import type { ToolDefinition, ToolResult } from '../../../types/agent';
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
  postedAt?: string;
  salary?: string;
  remote?: boolean;
  matchScore: number;
  matchGrade: string;
  matchExplanation: string;
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
 * Generate a brief explanation for why a job matches the profile
 */
async function generateMatchExplanation(
  job: SearchResultJob,
  candidateProfile: string,
  matchScore: number
): Promise<string> {
  // For lower scores or to save API calls, use a simple template
  if (matchScore < 60) {
    return `${matchScore}% match - may require additional skills or experience`;
  }

  const prompt = `In one sentence (max 20 words), explain why this job matches the candidate's profile:

Job: ${job.title} at ${job.company}
Key points from JD: ${job.description?.slice(0, 500) || 'N/A'}

Candidate skills (excerpt): ${candidateProfile.slice(0, 800)}

Focus on the strongest matching skills/experience. Be specific.`;

  try {
    const explanation = await callAI([{ role: 'user', content: prompt }]);
    return explanation.trim().slice(0, 150);
  } catch {
    return matchScore >= 80
      ? 'Strong skills alignment with job requirements'
      : matchScore >= 70
        ? 'Good match with relevant experience'
        : 'Moderate match - some skills align';
  }
}

export const findExternalJobsTool: ToolDefinition<FindExternalJobsInput, FindExternalJobsResult> = {
  name: 'find_external_jobs',
  description: 'Search for new job opportunities using intelligent multi-query search. Generates multiple search queries, aggregates results, and ranks them against your profile. Use this when someone asks to find jobs, search for positions, or look for opportunities. When presenting results, first summarize the search queries used and total results found, then list the top matches with their scores and explanations.',
  category: 'read',
  inputSchema: findExternalJobsSchema,
  requiresConfirmation: false,

  async execute(input): Promise<ToolResult<FindExternalJobsResult>> {
    const { settings, jobs: existingJobs } = useAppStore.getState();
    const maxResults = input.maxResults || 15;

    // Check if we have a candidate profile for personalized search
    const hasProfile = hasValidCandidateProfile(settings);
    const candidateProfile = hasProfile ? buildCandidateProfile(settings) : null;

    // 1. Generate search queries
    console.log('[FindExternalJobs] Generating search queries...');
    const queries = await generateSearchQueries(
      input.description,
      candidateProfile,
      input.location
    );
    console.log('[FindExternalJobs] Queries:', queries);

    // 2. Execute searches for each query
    const allResults: SearchResultJob[] = [];
    const queriesUsed: string[] = [];

    for (const query of queries) {
      try {
        console.log(`[FindExternalJobs] Searching: "${query}"`);
        const results = await searchJobs({
          query,
          location: input.location,
        });

        allResults.push(...results);
        queriesUsed.push(query);
        console.log(`[FindExternalJobs] Got ${results.length} results for "${query}"`);
      } catch (error) {
        console.warn(`[FindExternalJobs] Search failed for "${query}":`, error);
        // Continue with other queries
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
    const uniqueJobs = deduplicateJobs(allResults);
    console.log(`[FindExternalJobs] ${allResults.length} results -> ${uniqueJobs.length} unique`);

    // 4. Filter out already-imported jobs
    const existingLinks = new Set(existingJobs.map(j => j.jdLink?.toLowerCase()).filter(Boolean));
    const newJobs = uniqueJobs.filter(job => !job.link || !existingLinks.has(job.link.toLowerCase()));

    // 5. Score and rank jobs
    let rankedJobs: RankedJobResult[];

    if (hasProfile) {
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

      // Take top results and generate explanations
      const topJobs = scoredJobs.slice(0, maxResults);
      rankedJobs = [];

      for (const { job, score } of topJobs) {
        const explanation = await generateMatchExplanation(job, candidateProfile!, score);
        rankedJobs.push({
          title: job.title,
          company: job.company,
          location: job.location,
          description: job.description || '',
          source: job.source,
          link: job.link,
          postedAt: job.postedAt,
          salary: job.salary,
          remote: job.remote,
          matchScore: score,
          matchGrade: scoreToGrade(score),
          matchExplanation: explanation,
        });
      }
    } else {
      // No profile - just return jobs without scoring
      rankedJobs = newJobs.slice(0, maxResults).map(job => ({
        title: job.title,
        company: job.company,
        location: job.location,
        description: job.description || '',
        source: job.source,
        link: job.link,
        postedAt: job.postedAt,
        salary: job.salary,
        remote: job.remote,
        matchScore: 0,
        matchGrade: 'N/A',
        matchExplanation: 'Add your resume to settings to see match scores',
      }));
    }

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
