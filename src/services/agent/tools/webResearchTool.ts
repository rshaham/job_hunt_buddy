import { useAppStore } from '../../../stores/appStore';
import { researchCompany } from '../../ai';
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
}

export const webResearchTool: ToolDefinition<WebResearchInput, WebResearchResult> = {
  name: 'web_research',
  description: 'Research a company or role based on the job description. Analyzes the JD to extract insights about company culture, tech stack, growth, and more. Saves findings as prep material.',
  category: 'write',
  inputSchema: webResearchSchema,
  requiresConfirmation: true,

  confirmationMessage(input) {
    const { jobs } = useAppStore.getState();
    const job = jobs.find((j) => j.id === input.jobId);
    if (job) {
      return `Research "${input.topics}" for "${job.company}"? This will use AI credits.`;
    }
    return `Research "${input.topics}"? This will use AI credits.`;
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

    try {
      const research = await researchCompany(
        job.company,
        job.title,
        job.jdText,
        input.topics,
        resumeText
      );

      // Save as prep material
      const prepMaterial: PrepMaterial = {
        id: Date.now().toString(),
        title: `Research: ${input.topics}`,
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
