import { useAppStore } from '../../../stores/appStore';
import type { ToolDefinition, ToolResult } from '../../../types/agent';
import { getJobStatsSchema, type GetJobStatsInput } from './schemas';

interface JobStatsResult {
  totalJobs: number;
  byStatus: Record<string, number>;
  recentActivity: {
    addedThisWeek: number;
    updatedThisWeek: number;
  };
  resumeAnalysis: {
    analyzed: number;
    averageMatchPercentage: number | null;
    gradeDistribution: Record<string, number>;
  };
  preparation: {
    withCoverLetters: number;
    withTailoredResumes: number;
    withNotes: number;
    withContacts: number;
  };
}

export const getJobStatsTool: ToolDefinition<GetJobStatsInput, JobStatsResult> = {
  name: 'get_job_stats',
  description: 'Get aggregate statistics about all saved jobs. Returns counts by status, resume analysis stats, and preparation progress.',
  category: 'read',
  inputSchema: getJobStatsSchema,
  requiresConfirmation: false,

  async execute(): Promise<ToolResult<JobStatsResult>> {
    const { jobs } = useAppStore.getState();

    // Calculate date threshold for "this week"
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Count by status
    const byStatus: Record<string, number> = {};
    for (const job of jobs) {
      byStatus[job.status] = (byStatus[job.status] || 0) + 1;
    }

    // Recent activity
    let addedThisWeek = 0;
    let updatedThisWeek = 0;
    for (const job of jobs) {
      const dateAdded = job.dateAdded instanceof Date ? job.dateAdded : new Date(job.dateAdded);
      const lastUpdated = job.lastUpdated instanceof Date ? job.lastUpdated : new Date(job.lastUpdated);

      if (dateAdded >= oneWeekAgo) addedThisWeek++;
      if (lastUpdated >= oneWeekAgo) updatedThisWeek++;
    }

    // Resume analysis stats
    const analyzedJobs = jobs.filter((j) => j.resumeAnalysis);
    const matchPercentages = analyzedJobs
      .map((j) => j.resumeAnalysis?.matchPercentage)
      .filter((p): p is number => typeof p === 'number');

    const gradeDistribution: Record<string, number> = {};
    for (const job of analyzedJobs) {
      const grade = job.resumeAnalysis?.grade;
      if (grade) {
        gradeDistribution[grade] = (gradeDistribution[grade] || 0) + 1;
      }
    }

    // Preparation stats
    const withCoverLetters = jobs.filter((j) => j.coverLetter).length;
    const withTailoredResumes = jobs.filter((j) => j.tailoredResume).length;
    const withNotes = jobs.filter((j) => j.notes.length > 0).length;
    const withContacts = jobs.filter((j) => j.contacts.length > 0).length;

    return {
      success: true,
      data: {
        totalJobs: jobs.length,
        byStatus,
        recentActivity: {
          addedThisWeek,
          updatedThisWeek,
        },
        resumeAnalysis: {
          analyzed: analyzedJobs.length,
          averageMatchPercentage:
            matchPercentages.length > 0
              ? Math.round(matchPercentages.reduce((a, b) => a + b, 0) / matchPercentages.length)
              : null,
          gradeDistribution,
        },
        preparation: {
          withCoverLetters,
          withTailoredResumes,
          withNotes,
          withContacts,
        },
      },
    };
  },
};
