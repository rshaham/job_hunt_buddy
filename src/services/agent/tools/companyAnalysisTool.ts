import { useAppStore } from '../../../stores/appStore';
import { analyzeCompanyAsEmployer } from '../../ai';
import type { ToolDefinition, ToolResult } from '../../../types/agent';
import type { PrepMaterial } from '../../../types';
import { companyAnalysisSchema, type CompanyAnalysisInput } from './schemas';

interface CompanyAnalysisResult {
  jobId: string;
  company: string;
  title: string;
  analysisPreview: string;
  savedAsPrepMaterial: boolean;
}

export const companyAnalysisTool: ToolDefinition<CompanyAnalysisInput, CompanyAnalysisResult> = {
  name: 'company_analysis',
  description: 'Analyze a company as a potential employer based on their job posting. Provides insights on culture, work environment, role expectations, and fit assessment. Saves analysis as prep material.',
  category: 'write',
  inputSchema: companyAnalysisSchema,
  requiresConfirmation: true,

  confirmationMessage(input) {
    const { jobs } = useAppStore.getState();
    const job = jobs.find((j) => j.id === input.jobId);
    if (job) {
      return `Analyze "${job.company}" as a potential employer? This will use AI credits.`;
    }
    return `Analyze this company as a potential employer? This will use AI credits.`;
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

    try {
      const analysis = await analyzeCompanyAsEmployer(
        job.company,
        job.title,
        job.jdText,
        input.focusAreas,
        resumeText
      );

      // Save as prep material
      const prepMaterial: PrepMaterial = {
        id: Date.now().toString(),
        title: `Company Analysis: ${job.company}`,
        content: analysis,
        type: 'research',
      };

      const updatedPrepMaterials = [...(job.prepMaterials || []), prepMaterial];
      await updateJob(input.jobId, { prepMaterials: updatedPrepMaterials });

      // Return preview
      const preview = analysis.length > 800
        ? analysis.substring(0, 800) + '...'
        : analysis;

      return {
        success: true,
        data: {
          jobId: job.id,
          company: job.company,
          title: job.title,
          analysisPreview: preview,
          savedAsPrepMaterial: true,
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
