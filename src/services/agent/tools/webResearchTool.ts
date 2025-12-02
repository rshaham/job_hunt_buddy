import { useAppStore } from '../../../stores/appStore';
import { researchCompany } from '../../ai';
import {
  searchTopics,
  formatSearchResultsForAI,
  appendSourcesToContent,
  createPreviewWithSources,
  WebSearchError,
  type TavilySearchResult,
} from '../../webSearch';
import { isFeatureAvailable } from '../../../utils/featureFlags';
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
  description: 'Research a company or role using web search and job description analysis. Searches the web for company info, reviews, tech stack, and more. Saves findings as prep material.',
  category: 'write',
  inputSchema: webResearchSchema,
  requiresConfirmation: true,

  confirmationMessage(input) {
    const { jobs } = useAppStore.getState();
    const job = jobs.find((j) => j.id === input.jobId);

    if (job) {
      return `Research "${input.topics}" for "${job.company}"? (includes web search) This will use AI credits.`;
    }
    return `Research "${input.topics}"? (includes web search) This will use AI credits.`;
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

    // Check feature availability and consent
    const { available, reason } = isFeatureAvailable('webResearch', settings);
    if (!available) {
      if (reason === 'disabled') {
        return {
          success: false,
          error: 'Web research feature is currently disabled.',
        };
      }
      if (reason === 'no_consent') {
        return {
          success: false,
          error: 'Web research requires consent. Please enable it in Settings → Privacy to allow external web searches.',
        };
      }
    }

    // Get resume text (job-specific or default) for context
    const resumeText = job.resumeText || settings.defaultResumeText;

    // Check if web search is available and perform search
    let webSearchResults: string | undefined;
    let webSearchUsed = false;
    let searchResults: TavilySearchResult[] = [];

    try {
      searchResults = await searchTopics(job.company, input.topics);
      if (searchResults.length > 0) {
        webSearchResults = formatSearchResultsForAI(searchResults);
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

    try {
      const research = await researchCompany(
        job.company,
        job.title,
        job.jdText,
        input.topics,
        resumeText,
        webSearchResults
      );

      // Append sources directly to the AI response
      const finalContent = appendSourcesToContent(research, searchResults);

      // Save as prep material
      const prepMaterial: PrepMaterial = {
        id: Date.now().toString(),
        title: `Research: ${input.topics}${webSearchUsed ? ' (with web search)' : ''}`,
        content: finalContent,
        type: 'research',
      };

      const updatedPrepMaterials = [...(job.prepMaterials || []), prepMaterial];
      await updateJob(input.jobId, { prepMaterials: updatedPrepMaterials });

      // Return preview - ensure sources section is always included
      const preview = createPreviewWithSources(finalContent, searchResults);

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
