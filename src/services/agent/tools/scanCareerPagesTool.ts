/**
 * Scan Career Pages Tool
 *
 * AI agent tool that:
 * 1. Takes a list of career page URLs
 * 2. Fetches each page and extracts job listings
 * 3. Scores jobs against user's resume and career trajectory
 * 4. Returns ranked results with dual scores
 */

import type { ToolDefinition, ToolResult, ToolProgressCallback } from '../../../types/agent';
import { scanCareerPagesSchema, type ScanCareerPagesInput } from './schemas';
import {
  fetchAndExtractJobs,
  scoreBatch,
  canScore,
} from '../../batchScanner';
import type { ExtractedJob, ScoredJob } from '../../../types/batchScanner';

interface ScanCareerPagesResult {
  jobs: ScoredJobResult[];
  urlsProcessed: number;
  urlsSuccessful: number;
  urlsFailed: number;
  totalJobsFound: number;
  scoringEnabled: boolean;
  formattedResults?: string;
}

interface ScoredJobResult {
  company: string;
  title: string;
  url: string;
  location?: string;
  department?: string;
  resumeFitScore?: number;
  resumeFitGrade?: string;
  trajectoryFitScore?: number;
  trajectoryFitGrade?: string;
}

/**
 * Execute the batch scanning process
 */
async function executeScan(
  input: ScanCareerPagesInput,
  onProgress?: ToolProgressCallback
): Promise<ScanCareerPagesResult> {
  const { urls, maxJobsPerUrl } = input;

  // Check if scoring is possible
  const scoreCheck = canScore();

  // Collect all extracted jobs
  const allExtractedJobs: Array<{ job: ExtractedJob; company: string; sourceUrlId: string }> = [];
  let urlsSuccessful = 0;
  let urlsFailed = 0;

  // Process each URL
  for (let i = 0; i < urls.length; i++) {
    const { url, companyHint } = urls[i];

    onProgress?.(`Scanning URL ${i + 1}/${urls.length}: ${companyHint || url}`);

    try {
      const result = await fetchAndExtractJobs(url);

      if (result.success && result.result) {
        const { jobs, company } = result.result;
        const finalCompany = companyHint || company;

        // Limit jobs per URL
        const limitedJobs = jobs.slice(0, maxJobsPerUrl);

        for (const job of limitedJobs) {
          allExtractedJobs.push({
            job,
            company: finalCompany,
            sourceUrlId: `url_${i}`,
          });
        }

        urlsSuccessful++;
      } else {
        urlsFailed++;
      }
    } catch (error) {
      console.error(`[ScanCareerPagesTool] Error processing ${url}:`, error);
      urlsFailed++;
    }

    // Small delay between URLs to avoid rate limiting
    if (i < urls.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  // Score jobs if possible
  let scoredJobs: ScoredJob[] = [];
  if (allExtractedJobs.length > 0 && scoreCheck.canScore) {
    onProgress?.(`Scoring ${allExtractedJobs.length} jobs against your profile...`);

    scoredJobs = await scoreBatch(allExtractedJobs, (completed, total) => {
      onProgress?.(`Scoring jobs: ${completed}/${total}`);
    });

    // Sort by resume fit score (descending)
    scoredJobs.sort((a, b) => (b.resumeFitScore ?? 0) - (a.resumeFitScore ?? 0));
  } else if (allExtractedJobs.length > 0) {
    // Convert to scored jobs without scores
    scoredJobs = allExtractedJobs.map(({ job, company, sourceUrlId }) => ({
      ...job,
      sourceUrlId,
      company,
      scoreStatus: 'error' as const,
      isSelected: false,
      isImported: false,
    }));
  }

  // Format results for agent
  const formattedJobs: ScoredJobResult[] = scoredJobs.map(job => ({
    company: job.company,
    title: job.title,
    url: job.url,
    location: job.location,
    department: job.department,
    resumeFitScore: job.resumeFitScore,
    resumeFitGrade: job.resumeFitGrade,
    trajectoryFitScore: job.trajectoryFitScore,
    trajectoryFitGrade: job.trajectoryFitGrade,
  }));

  return {
    jobs: formattedJobs,
    urlsProcessed: urls.length,
    urlsSuccessful,
    urlsFailed,
    totalJobsFound: allExtractedJobs.length,
    scoringEnabled: scoreCheck.canScore,
  };
}

/**
 * Format results as markdown for the agent
 */
function formatResults(result: ScanCareerPagesResult): string {
  const lines: string[] = [];

  lines.push(`## Batch Scan Results\n`);
  lines.push(`- **URLs Processed:** ${result.urlsProcessed} (${result.urlsSuccessful} successful, ${result.urlsFailed} failed)`);
  lines.push(`- **Total Jobs Found:** ${result.totalJobsFound}`);
  lines.push(`- **Scoring:** ${result.scoringEnabled ? 'Enabled' : 'Disabled (add resume/career context to enable)'}\n`);

  if (result.jobs.length === 0) {
    lines.push('No jobs were extracted from the provided URLs. This may happen if:');
    lines.push('- The career pages require JavaScript to render');
    lines.push('- The pages have changed their structure');
    lines.push('- The URLs were blocked or returned errors\n');
    return lines.join('\n');
  }

  // Show top 20 jobs in a table
  const topJobs = result.jobs.slice(0, 20);

  lines.push('### Top Job Matches\n');

  if (result.scoringEnabled) {
    lines.push('| Company | Title | Resume Fit | Career Fit | Location |');
    lines.push('|---------|-------|------------|------------|----------|');

    for (const job of topJobs) {
      const resumeScore = job.resumeFitScore ? `${job.resumeFitScore}% (${job.resumeFitGrade})` : '-';
      const trajectoryScore = job.trajectoryFitScore ? `${job.trajectoryFitScore}% (${job.trajectoryFitGrade})` : '-';
      const location = job.location || '-';

      lines.push(`| ${job.company} | ${job.title} | ${resumeScore} | ${trajectoryScore} | ${location} |`);
    }
  } else {
    lines.push('| Company | Title | Location |');
    lines.push('|---------|-------|----------|');

    for (const job of topJobs) {
      const location = job.location || '-';
      lines.push(`| ${job.company} | ${job.title} | ${location} |`);
    }
  }

  if (result.jobs.length > 20) {
    lines.push(`\n*...and ${result.jobs.length - 20} more jobs. Use the Batch Scanner UI to see all results.*`);
  }

  lines.push('\n**Tip:** Open the Batch Scanner modal (click "Batch Scan" in the header) to select and import these jobs.');

  return lines.join('\n');
}

export const scanCareerPagesTool: ToolDefinition<ScanCareerPagesInput, ScanCareerPagesResult> = {
  name: 'scan_career_pages',
  description: `Scan multiple company career pages to find job listings and score them against your profile.

Use this tool when the user provides a list of URLs to company career pages and wants to:
- Extract all job listings from those pages
- Score jobs against their resume and career goals
- Get a ranked list of the best matches

The tool:
1. Fetches each career page URL
2. Detects the ATS platform (Greenhouse, Lever, Ashby, etc.) for optimized extraction
3. Extracts all job listings with titles, URLs, locations, and descriptions
4. Scores each job against the user's resume (Resume Fit) and career trajectory (Career Fit)
5. Returns a ranked list with dual scores

Supports various URL formats:
- Direct career pages: https://company.com/careers
- ATS platforms: boards.greenhouse.io/company, jobs.lever.co/company
- LinkedIn redirects: https://lnkd.in/xxxxx

Note: Some pages may require JavaScript to render and won't extract successfully.

When presenting results, format them as a summary followed by a markdown table showing the top job matches with their scores.`,
  category: 'read',
  requiresConfirmation: false,
  inputSchema: scanCareerPagesSchema,

  execute: async (input, onProgress): Promise<ToolResult<ScanCareerPagesResult>> => {
    try {
      if (!input.urls || input.urls.length === 0) {
        return {
          success: false,
          error: 'No URLs provided. Please provide at least one career page URL to scan.',
        };
      }

      const result = await executeScan(input, onProgress);

      // Add formatted message to data for agent to present
      const resultWithMessage = {
        ...result,
        formattedResults: formatResults(result),
      };

      return {
        success: true,
        data: resultWithMessage as ScanCareerPagesResult,
      };
    } catch (error) {
      console.error('[ScanCareerPagesTool] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to scan career pages',
      };
    }
  },
};
