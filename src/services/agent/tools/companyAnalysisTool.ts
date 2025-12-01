import { useAppStore } from '../../../stores/appStore';
import { analyzeCompanyAsEmployer } from '../../ai';
import {
  isWebSearchAvailable,
  searchCompanyInfo,
  searchInterviewExperiences,
  formatSearchResultsForAI,
  appendSourcesToContent,
  createPreviewWithSources,
  WebSearchError,
  type TavilySearchResult,
} from '../../webSearch';
import type { ToolDefinition, ToolResult } from '../../../types/agent';
import type { PrepMaterial } from '../../../types';
import { companyAnalysisSchema, type CompanyAnalysisInput } from './schemas';

interface CompanyAnalysisResult {
  jobId: string;
  company: string;
  title: string;
  analysisPreview: string;
  savedAsPrepMaterial: boolean;
  webSearchUsed: boolean;
}

export const companyAnalysisTool: ToolDefinition<CompanyAnalysisInput, CompanyAnalysisResult> = {
  name: 'company_analysis',
  description: 'Analyze a company as a potential employer using web search and job posting analysis. Searches for company reviews, culture info, and interview experiences. Provides insights on culture, work environment, role expectations, and fit assessment. Saves analysis as prep material. Requires VITE_TAVILY_API_KEY to be configured.',
  category: 'write',
  inputSchema: companyAnalysisSchema,
  requiresConfirmation: true,

  confirmationMessage(input) {
    const { jobs } = useAppStore.getState();
    const job = jobs.find((j) => j.id === input.jobId);
    const webAvailable = isWebSearchAvailable();
    const searchNote = webAvailable ? ' (includes web search)' : ' (JD analysis only - no web search API key)';

    if (job) {
      return `Analyze "${job.company}" as a potential employer?${searchNote} This will use AI credits.`;
    }
    return `Analyze this company as a potential employer?${searchNote} This will use AI credits.`;
  },

  async execute(input): Promise<ToolResult<CompanyAnalysisResult>> {
    const { jobs, settings, updateJob } = useAppStore.getState();
    const job = jobs.find((j) => j.id === input.jobId);

    if (!job) {
      return {
        success: false,
        error: `Job not found with ID: ${input.jobId}`,
      };
    }

    if (!job.jdText) {
      return {
        success: false,
        error: 'No job description found for this job. Add a job description first.',
      };
    }

    // Get resume text (job-specific or default) for personalized fit assessment
    const resumeText = job.resumeText || settings.defaultResumeText;

    // Check if web search is available and perform searches
    let webSearchResults: string | undefined;
    let webSearchUsed = false;
    let allSearchResults: TavilySearchResult[] = [];

    if (isWebSearchAvailable()) {
      try {
        // Search for company info and interview experiences in parallel
        const [companyResults, interviewResults] = await Promise.all([
          searchCompanyInfo(job.company, ['culture', 'reviews', 'benefits', 'work-life balance']),
          searchInterviewExperiences(job.company, job.title),
        ]);

        allSearchResults = [...companyResults, ...interviewResults];
        if (allSearchResults.length > 0) {
          webSearchResults = formatSearchResultsForAI(allSearchResults);
          webSearchUsed = true;
        }
      } catch (error) {
        if (error instanceof WebSearchError) {
          return {
            success: false,
            error: `Web search failed: ${error.message}`,
          };
        }
        throw error;
      }
    } else {
      return {
        success: false,
        error: 'Web search is not configured. Add VITE_TAVILY_API_KEY to your .env file to enable company analysis.',
      };
    }

    try {
      const analysis = await analyzeCompanyAsEmployer(
        job.company,
        job.title,
        job.jdText,
        input.focusAreas,
        resumeText,
        webSearchResults
      );

      // Append sources directly to the AI response
      const finalContent = appendSourcesToContent(analysis, allSearchResults);

      // Save as prep material
      const prepMaterial: PrepMaterial = {
        id: Date.now().toString(),
        title: `Company Analysis: ${job.company}${webSearchUsed ? ' (with web search)' : ''}`,
        content: finalContent,
        type: 'research',
      };

      const updatedPrepMaterials = [...(job.prepMaterials || []), prepMaterial];
      await updateJob(input.jobId, { prepMaterials: updatedPrepMaterials });

      // Return preview - ensure sources section is always included
      const preview = createPreviewWithSources(finalContent, allSearchResults);

      return {
        success: true,
        data: {
          jobId: job.id,
          company: job.company,
          title: job.title,
          analysisPreview: preview,
          savedAsPrepMaterial: true,
          webSearchUsed,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze company',
      };
    }
  },
};
