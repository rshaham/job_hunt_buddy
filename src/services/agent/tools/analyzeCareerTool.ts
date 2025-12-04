import { useAppStore } from '../../../stores/appStore';
import { analyzeCareer } from '../../ai';
import type { ToolDefinition, ToolResult } from '../../../types/agent';
import type { UserSkillProfile } from '../../../types';
import { analyzeCareerSchema, type AnalyzeCareerInput } from './schemas';

interface AnalyzeCareerResult {
  analysisPreview: string;
  jobsAnalyzed: number;
  timeWindow: string;
}

export const analyzeCareerTool: ToolDefinition<AnalyzeCareerInput, AnalyzeCareerResult> = {
  name: 'analyze_career',
  description: 'Get a comprehensive career analysis based on your job applications. Analyzes skill patterns, gaps, and provides personalized recommendations. By default analyzes jobs from the last 6 months.',
  category: 'write',
  inputSchema: analyzeCareerSchema,
  requiresConfirmation: true, // Triggers API call

  confirmationMessage(input) {
    const timeWindow = input.includeAllJobs ? 'all jobs' : 'jobs from last 6 months';
    return `Analyze your career based on ${timeWindow}? This will use AI credits.`;
  },

  async execute(input): Promise<ToolResult<AnalyzeCareerResult>> {
    const { jobs, settings } = useAppStore.getState();

    // Get career coach state from settings if available
    const careerCoachState = (settings as { careerCoachState?: { skillProfile?: UserSkillProfile } }).careerCoachState;
    const skillProfile = careerCoachState?.skillProfile;

    try {
      const analysis = await analyzeCareer(jobs, skillProfile, input.includeAllJobs);

      // Count jobs in time window
      let jobsAnalyzed = jobs.length;
      if (!input.includeAllJobs) {
        const sixMonthsAgo = Date.now() - (6 * 30 * 24 * 60 * 60 * 1000);
        jobsAnalyzed = jobs.filter(j => new Date(j.dateAdded).getTime() > sixMonthsAgo).length;
      }

      // Return preview
      const preview = analysis.length > 800
        ? analysis.substring(0, 800) + '...'
        : analysis;

      return {
        success: true,
        data: {
          analysisPreview: preview,
          jobsAnalyzed,
          timeWindow: input.includeAllJobs ? 'all time' : 'last 6 months',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze career',
      };
    }
  },
};
