import { useAppStore } from '../../../stores/appStore';
import { gradeResume } from '../../ai';
import type { ToolDefinition, ToolResult } from '../../../types/agent';
import { gradeResumeSchema, type GradeResumeInput } from './schemas';
import type { ResumeAnalysis } from '../../../types';

interface GradeResumeResult {
  jobId: string;
  company: string;
  title: string;
  analysis: ResumeAnalysis;
}

export const gradeResumeTool: ToolDefinition<GradeResumeInput, GradeResumeResult> = {
  name: 'grade_resume',
  description: 'Grade your resume against a job description using AI. Returns a grade (A-F), match percentage, strengths, gaps, and suggestions. Requires a resume to be uploaded.',
  category: 'write',
  inputSchema: gradeResumeSchema,
  requiresConfirmation: true, // Triggers API call

  confirmationMessage(input) {
    const { jobs } = useAppStore.getState();
    const job = jobs.find((j) => j.id === input.jobId);
    if (job) {
      return `Grade your resume against "${job.company} - ${job.title}"? This will use AI credits.`;
    }
    return `Grade your resume? This will use AI credits.`;
  },

  async execute(input): Promise<ToolResult<GradeResumeResult>> {
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
      const analysis = await gradeResume(job.jdText, resumeText, job);

      // Save to job
      await updateJob(input.jobId, {
        resumeAnalysis: analysis,
      });

      return {
        success: true,
        data: {
          jobId: job.id,
          company: job.company,
          title: job.title,
          analysis,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to grade resume',
      };
    }
  },
};
