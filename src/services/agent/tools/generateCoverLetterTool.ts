import { useAppStore } from '../../../stores/appStore';
import { generateCoverLetter } from '../../ai';
import type { ToolDefinition, ToolResult } from '../../../types/agent';
import { generateCoverLetterSchema, type GenerateCoverLetterInput } from './schemas';

interface GenerateCoverLetterResult {
  jobId: string;
  company: string;
  title: string;
  coverLetterPreview: string;
}

export const generateCoverLetterTool: ToolDefinition<GenerateCoverLetterInput, GenerateCoverLetterResult> = {
  name: 'generate_cover_letter',
  description: 'Generate a new cover letter for a job using AI. This triggers an API call and saves the cover letter to the job. Requires a resume to be uploaded.',
  category: 'write',
  inputSchema: generateCoverLetterSchema,
  requiresConfirmation: true, // Triggers API call

  confirmationMessage(input) {
    const { jobs } = useAppStore.getState();
    const job = jobs.find((j) => j.id === input.jobId);
    if (job) {
      return `Generate a cover letter for "${job.company} - ${job.title}"? This will use AI credits.`;
    }
    return `Generate a cover letter? This will use AI credits.`;
  },

  async execute(input): Promise<ToolResult<GenerateCoverLetterResult>> {
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
      const coverLetter = await generateCoverLetter(job.jdText, resumeText);

      // Save to job
      await updateJob(input.jobId, {
        coverLetter,
        coverLetterHistory: [
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: 'Generated initial cover letter.',
            letterSnapshot: coverLetter,
            timestamp: new Date(),
          },
        ],
      });

      // Return preview (first 500 chars)
      const preview = coverLetter.length > 500
        ? coverLetter.substring(0, 500) + '...'
        : coverLetter;

      return {
        success: true,
        data: {
          jobId: job.id,
          company: job.company,
          title: job.title,
          coverLetterPreview: preview,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate cover letter',
      };
    }
  },
};
