import { useAppStore } from '../../../stores/appStore';
import type { ToolDefinition, ToolResult } from '../../../types/agent';
import { getSkillGapsSchema, type GetSkillGapsInput } from './schemas';

interface SkillGap {
  skill: string;
  occurrences: number;
  jobs: { id: string; company: string; title: string }[];
}

interface GetSkillGapsResult {
  gaps: SkillGap[];
  totalJobsAnalyzed: number;
  jobsWithResumeAnalysis: number;
}

export const getSkillGapsTool: ToolDefinition<GetSkillGapsInput, GetSkillGapsResult> = {
  name: 'get_skill_gaps',
  description: 'Analyze missing skills across all jobs that have resume analysis. Returns skills that appear in job requirements but are missing from the resume, ranked by frequency.',
  category: 'read',
  inputSchema: getSkillGapsSchema,
  requiresConfirmation: false,

  async execute(input): Promise<ToolResult<GetSkillGapsResult>> {
    const { jobs } = useAppStore.getState();

    // Count skill occurrences across jobs
    const skillMap = new Map<string, { count: number; jobs: { id: string; company: string; title: string }[] }>();

    let jobsWithAnalysis = 0;
    for (const job of jobs) {
      if (job.resumeAnalysis?.missingKeywords && job.resumeAnalysis.missingKeywords.length > 0) {
        jobsWithAnalysis++;
        for (const skill of job.resumeAnalysis.missingKeywords) {
          const skillLower = skill.toLowerCase();
          const existing = skillMap.get(skillLower);
          if (existing) {
            existing.count++;
            existing.jobs.push({ id: job.id, company: job.company, title: job.title });
          } else {
            skillMap.set(skillLower, {
              count: 1,
              jobs: [{ id: job.id, company: job.company, title: job.title }],
            });
          }
        }
      }
    }

    // Convert to array and sort by occurrence count
    const gaps: SkillGap[] = Array.from(skillMap.entries())
      .map(([skill, data]) => ({
        skill,
        occurrences: data.count,
        jobs: data.jobs,
      }))
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, input.limit);

    if (gaps.length === 0 && jobsWithAnalysis === 0) {
      return {
        success: true,
        data: {
          gaps: [],
          totalJobsAnalyzed: jobs.length,
          jobsWithResumeAnalysis: 0,
        },
      };
    }

    return {
      success: true,
      data: {
        gaps,
        totalJobsAnalyzed: jobs.length,
        jobsWithResumeAnalysis: jobsWithAnalysis,
      },
    };
  },
};
