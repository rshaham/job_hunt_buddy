import { useAppStore } from '../../../stores/appStore';
import { researchCompany } from '../../ai';
import {
  isWebSearchAvailable,
  searchTopics,
  formatSearchResultsForAI,
  WebSearchError,
} from '../../webSearch';
import type { ToolDefinition, ToolResult } from '../../../types/agent';
import type { PrepMaterial } from '../../../types';
import { webResearchSchema, type WebResearchInput } from './schemas';

interface WebResearchResult {
  jobId: string;
  company: string;
  title: string;
  topics: string;
  researchPreview: string;
  savedAsPrepMaterial: boolean;
  webSearchUsed: boolean;
}

export const webResearchTool: ToolDefinition<WebResearchInput, WebResearchResult> = {
  name: 'web_research',
  description: 'Research a company or role using web search and job description analysis. Searches the web for company info, reviews, tech stack, and more. Saves findings as prep material. Requires VITE_TAVILY_API_KEY to be configured.',
  category: 'write',
  inputSchema: webResearchSchema,
  requiresConfirmation: true,

  confirmationMessage(input) {
    const { jobs } = useAppStore.getState();
    const job = jobs.find((j) => j.id === input.jobId);
    const webAvailable = isWebSearchAvailable();
    const searchNote = webAvailable ? ' (includes web search)' : ' (JD analysis only - no web search API key)';

    if (job) {
      return `Research "${input.topics}" for "${job.company}"?${searchNote} This will use AI credits.`;
    }
    return `Research "${input.topics}"?${searchNote} This will use AI credits.`;
  },

  async execute(input): Promise<ToolResult<WebResearchResult>> {
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

    // Get resume text (job-specific or default) for context
    const resumeText = job.resumeText || settings.defaultResumeText;

    // Check if web search is available and perform search
    let webSearchResults: string | undefined;
    let webSearchUsed = false;

    if (isWebSearchAvailable()) {
      try {
        const results = await searchTopics(job.company, input.topics);
        if (results.length > 0) {
          webSearchResults = formatSearchResultsForAI(results);
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
        error: 'Web search is not configured. Add VITE_TAVILY_API_KEY to your .env file to enable web research.',
      };
    }

    try {
      const research = await researchCompany(
        job.company,
        job.title,
        job.jdText,
        input.topics,
        resumeText,
        webSearchResults
      );

      // Save as prep material
      const prepMaterial: PrepMaterial = {
        id: Date.now().toString(),
        title: `Research: ${input.topics}${webSearchUsed ? ' (with web search)' : ''}`,
        content: research,
        type: 'research',
      };

      const updatedPrepMaterials = [...(job.prepMaterials || []), prepMaterial];
      await updateJob(input.jobId, { prepMaterials: updatedPrepMaterials });

      // Return preview
      const preview = research.length > 800
        ? research.substring(0, 800) + '...'
        : research;

      return {
        success: true,
        data: {
          jobId: job.id,
          company: job.company,
          title: job.title,
          topics: input.topics,
          researchPreview: preview,
          savedAsPrepMaterial: true,
          webSearchUsed,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to research company',
      };
    }
  },
};
