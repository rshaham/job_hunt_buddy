import { useAppStore } from '../../../stores/appStore';
import type { ToolDefinition, ToolResult } from '../../../types/agent';
import { getApplicationSummarySchema, type GetApplicationSummaryInput } from './schemas';
import { differenceInDays, isPast, subDays } from 'date-fns';

interface StatusCount {
  status: string;
  count: number;
}

interface RecentActivity {
  jobId: string;
  company: string;
  title: string;
  activity: string;
  date: string;
  daysAgo: number;
}

interface GetApplicationSummaryResult {
  totalJobs: number;
  byStatus: StatusCount[];
  recentActivity: RecentActivity[];
  pendingTasks: {
    learningTasks: number;
    overdueTasks: number;
    jobsNeedingFollowUp: number;
    jobsWithoutResume: number;
  };
  weekStats: {
    jobsAdded: number;
    statusChanges: number;
  };
}

export const getApplicationSummaryTool: ToolDefinition<GetApplicationSummaryInput, GetApplicationSummaryResult> = {
  name: 'get_application_summary',
  description: 'Get a high-level overview of your job search. Shows jobs by status, recent activity, and pending tasks that need attention.',
  category: 'read',
  inputSchema: getApplicationSummarySchema,
  requiresConfirmation: false,

  async execute(): Promise<ToolResult<GetApplicationSummaryResult>> {
    const { jobs, settings } = useAppStore.getState();
    const now = new Date();
    const oneWeekAgo = subDays(now, 7);

    // Count by status
    const statusCounts = new Map<string, number>();
    for (const status of settings.statuses) {
      statusCounts.set(status.name, 0);
    }
    for (const job of jobs) {
      const current = statusCounts.get(job.status) || 0;
      statusCounts.set(job.status, current + 1);
    }
    const byStatus: StatusCount[] = Array.from(statusCounts.entries())
      .map(([status, count]) => ({ status, count }))
      .filter((s) => s.count > 0)
      .sort((a, b) => b.count - a.count);

    // Recent activity (last 7 days)
    const recentActivity: RecentActivity[] = [];
    for (const job of jobs) {
      // Check job creation
      const addedDate = new Date(job.dateAdded);
      if (addedDate >= oneWeekAgo) {
        recentActivity.push({
          jobId: job.id,
          company: job.company,
          title: job.title,
          activity: 'Added job',
          date: addedDate.toISOString(),
          daysAgo: differenceInDays(now, addedDate),
        });
      }

      // Check timeline events
      for (const event of job.timeline || []) {
        const eventDate = new Date(event.date);
        if (eventDate >= oneWeekAgo && eventDate <= now) {
          recentActivity.push({
            jobId: job.id,
            company: job.company,
            title: job.title,
            activity: `${event.type}: ${event.description}`,
            date: eventDate.toISOString(),
            daysAgo: differenceInDays(now, eventDate),
          });
        }
      }
    }

    // Sort by date (most recent first) and limit
    recentActivity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const limitedActivity = recentActivity.slice(0, 5);

    // Pending tasks
    let learningTasks = 0;
    let overdueTasks = 0;
    let jobsNeedingFollowUp = 0;
    let jobsWithoutResume = 0;

    const activeStatuses = ['Applied', 'Interviewing', 'Phone Screen', 'Technical Interview'];

    for (const job of jobs) {
      // Count learning tasks
      const pendingLearning = (job.learningTasks || []).filter((t) => t.status !== 'completed');
      learningTasks += pendingLearning.length;

      // Count overdue
      overdueTasks += pendingLearning.filter(
        (t) => t.dueDate && isPast(new Date(t.dueDate))
      ).length;

      // Check for follow-up needed
      if (activeStatuses.some((s) => job.status.toLowerCase().includes(s.toLowerCase()))) {
        const timeline = job.timeline || [];
        const lastEvent = timeline.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        )[0];
        const lastActivityDate = lastEvent ? new Date(lastEvent.date) : new Date(job.dateAdded);
        if (differenceInDays(now, lastActivityDate) >= 7) {
          jobsNeedingFollowUp++;
        }
      }

      // Jobs without resume analysis
      if (!job.resumeAnalysis) {
        jobsWithoutResume++;
      }
    }

    // Week stats
    const jobsAddedThisWeek = jobs.filter((j) => new Date(j.dateAdded) >= oneWeekAgo).length;
    let statusChangesThisWeek = 0;
    for (const job of jobs) {
      const recentStatusEvents = (job.timeline || []).filter((e) => {
        const eventDate = new Date(e.date);
        return eventDate >= oneWeekAgo && e.type.toLowerCase().includes('status');
      });
      statusChangesThisWeek += recentStatusEvents.length;
    }

    return {
      success: true,
      data: {
        totalJobs: jobs.length,
        byStatus,
        recentActivity: limitedActivity,
        pendingTasks: {
          learningTasks,
          overdueTasks,
          jobsNeedingFollowUp,
          jobsWithoutResume,
        },
        weekStats: {
          jobsAdded: jobsAddedThisWeek,
          statusChanges: statusChangesThisWeek,
        },
      },
    };
  },
};
