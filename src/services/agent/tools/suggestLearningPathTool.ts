import { useAppStore } from '../../../stores/appStore';
import type { ToolDefinition, ToolResult } from '../../../types/agent';
import { suggestLearningPathSchema, type SuggestLearningPathInput } from './schemas';

interface SkillSuggestion {
  skill: string;
  frequency: number;
  jobs: string[];
  priority: 'high' | 'medium' | 'low';
}

interface SuggestLearningPathResult {
  suggestions: SkillSuggestion[];
  totalJobsAnalyzed: number;
  jobsWithGaps: number;
}

export const suggestLearningPathTool: ToolDefinition<SuggestLearningPathInput, SuggestLearningPathResult> = {
  name: 'suggest_learning_path',
  description: 'Analyze skill gaps across your job applications and suggest skills to learn. Optionally focus on a specific job. Returns skills ranked by frequency and priority.',
  category: 'read',
  inputSchema: suggestLearningPathSchema,
  requiresConfirmation: false,

  async execute(input): Promise<ToolResult<SuggestLearningPathResult>> {
    const { jobs } = useAppStore.getState();

    // Filter to jobs with resume analysis
    let relevantJobs = jobs.filter((j) => j.resumeAnalysis?.missingKeywords?.length);

    // If jobId provided, only analyze that job
    if (input.jobId) {
      const job = jobs.find((j) => j.id === input.jobId);
      if (!job) {
        return {
          success: false,
          error: `Job not found with ID: ${input.jobId}`,
        };
      }
      if (!job.resumeAnalysis?.missingKeywords?.length) {
        return {
          success: false,
          error: `No resume analysis found for this job. Run "Grade Resume" first.`,
        };
      }
      relevantJobs = [job];
    }

    if (relevantJobs.length === 0) {
      return {
        success: false,
        error: 'No jobs with resume analysis found. Grade your resume against some jobs first.',
      };
    }

    // Build skill frequency map
    const skillMap = new Map<string, { count: number; jobs: string[] }>();

    for (const job of relevantJobs) {
      const keywords = job.resumeAnalysis?.missingKeywords || [];
      for (const keyword of keywords) {
        const normalized = keyword.toLowerCase().trim();
        const existing = skillMap.get(normalized) || { count: 0, jobs: [] };
        existing.count++;
        existing.jobs.push(`${job.company} - ${job.title}`);
        skillMap.set(normalized, existing);
      }
    }

    // Convert to array and sort by frequency
    const sortedSkills = Array.from(skillMap.entries())
      .map(([skill, data]) => ({
        skill,
        frequency: data.count,
        jobs: data.jobs,
        priority: (data.count >= 3 ? 'high' : data.count >= 2 ? 'medium' : 'low') as 'high' | 'medium' | 'low',
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, input.limit || 5);

    return {
      success: true,
      data: {
        suggestions: sortedSkills,
        totalJobsAnalyzed: relevantJobs.length,
        jobsWithGaps: relevantJobs.filter((j) => j.resumeAnalysis?.missingKeywords?.length).length,
      },
    };
  },
};
