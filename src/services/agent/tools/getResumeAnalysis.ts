import { useAppStore } from '../../../stores/appStore';
import type { ToolDefinition, ToolResult } from '../../../types/agent';
import { getResumeAnalysisSchema, type GetResumeAnalysisInput } from './schemas';
import type { ResumeAnalysis } from '../../../types';

interface GetResumeAnalysisResult {
  jobId: string;
  company: string;
  title: string;
  hasAnalysis: boolean;
  analysis: ResumeAnalysis | null;
  hasTailoredResume: boolean;
  tailoredAnalysis: ResumeAnalysis | null;
}

export const getResumeAnalysisTool: ToolDefinition<GetResumeAnalysisInput, GetResumeAnalysisResult> = {
  name: 'get_resume_analysis',
  description: 'Get the resume fit analysis for a specific job. Returns the grade, match percentage, strengths, gaps, and suggestions. Also includes tailored resume analysis if available.',
  category: 'read',
  inputSchema: getResumeAnalysisSchema,
  requiresConfirmation: false,

  async execute(input): Promise<ToolResult<GetResumeAnalysisResult>> {
    const { jobs } = useAppStore.getState();
    const job = jobs.find((j) => j.id === input.jobId);

    if (!job) {
      return {
        success: false,
        error: `Job not found with ID: ${input.jobId}`,
      };
    }

    return {
      success: true,
      data: {
        jobId: job.id,
        company: job.company,
        title: job.title,
        hasAnalysis: job.resumeAnalysis !== null,
        analysis: job.resumeAnalysis,
        hasTailoredResume: !!job.tailoredResume,
        tailoredAnalysis: job.tailoredResumeAnalysis || null,
      },
    };
  },
};
