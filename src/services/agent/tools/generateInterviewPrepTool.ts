import { useAppStore } from '../../../stores/appStore';
import { generateInterviewPrep } from '../../ai';
import { generateId } from '../../../utils/helpers';
import type { ToolDefinition, ToolResult } from '../../../types/agent';
import { generateInterviewPrepSchema, type GenerateInterviewPrepInput } from './schemas';

interface GenerateInterviewPrepResult {
  jobId: string;
  company: string;
  title: string;
  prepMaterialsPreview: string;
}

export const generateInterviewPrepTool: ToolDefinition<GenerateInterviewPrepInput, GenerateInterviewPrepResult> = {
  name: 'generate_interview_prep',
  description: 'Generate interview preparation materials for a job using AI. Includes potential questions, talking points, and company research suggestions. Requires a resume to be uploaded.',
  category: 'write',
  inputSchema: generateInterviewPrepSchema,
  requiresConfirmation: true, // Triggers API call

  confirmationMessage(input) {
    const { jobs } = useAppStore.getState();
    const job = jobs.find((j) => j.id === input.jobId);
    if (job) {
      return `Generate interview prep for "${job.company} - ${job.title}"? This will use AI credits.`;
    }
    return `Generate interview prep? This will use AI credits.`;
  },

  async execute(input): Promise<ToolResult<GenerateInterviewPrepResult>> {
    const { jobs, settings, updateJob } = useAppStore.getState();
    const job = jobs.find((j) => j.id === input.jobId);

    if (!job) {
      return {
        success: false,
        error: `Job not found with ID: ${input.jobId}`,
      };
    }

    // Get resume text (job-specific or default)
    const resumeText = job.resumeText || settings.defaultResumeText;
    if (!resumeText) {
      return {
        success: false,
        error: 'No resume found. Please upload a resume in Settings first.',
      };
    }

    if (!job.jdText) {
      return {
        success: false,
        error: 'No job description found for this job.',
      };
    }

    try {
      // Pass job for smart context retrieval (semantic search for relevant experiences)
      const prepContent = await generateInterviewPrep(job.jdText, resumeText, job);

      // Save as prep material
      const newPrepMaterial = {
        id: generateId(),
        title: 'Interview Prep (AI Generated)',
        content: prepContent,
        type: 'other' as const,
      };

      await updateJob(input.jobId, {
        prepMaterials: [...job.prepMaterials, newPrepMaterial],
      });

      // Return preview (first 500 chars)
      const preview = prepContent.length > 500
        ? prepContent.substring(0, 500) + '...'
        : prepContent;

      return {
        success: true,
        data: {
          jobId: job.id,
          company: job.company,
          title: job.title,
          prepMaterialsPreview: preview,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate interview prep',
      };
    }
  },
};
