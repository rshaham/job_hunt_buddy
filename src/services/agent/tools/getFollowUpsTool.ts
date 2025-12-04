import { useAppStore } from '../../../stores/appStore';
import type { ToolDefinition, ToolResult } from '../../../types/agent';
import { getFollowUpsSchema, type GetFollowUpsInput } from './schemas';
import { differenceInDays } from 'date-fns';

interface FollowUpJob {
  jobId: string;
  company: string;
  title: string;
  status: string;
  daysSinceActivity: number;
  lastActivity: {
    type: string;
    description: string;
    date: string;
  } | null;
  contactCount: number;
}

interface GetFollowUpsResult {
  jobs: FollowUpJob[];
  totalNeedingFollowUp: number;
}

export const getFollowUpsTool: ToolDefinition<GetFollowUpsInput, GetFollowUpsResult> = {
  name: 'get_follow_ups',
  description: 'Find jobs that need follow-up based on inactivity. Returns jobs with no timeline activity in X days, sorted by staleness. Great for identifying applications that may need a nudge.',
  category: 'read',
  inputSchema: getFollowUpsSchema,
  requiresConfirmation: false,

  async execute(input): Promise<ToolResult<GetFollowUpsResult>> {
    const { jobs } = useAppStore.getState();
    const now = new Date();
    const daysThreshold = input.daysInactive || 7;

    // Default statuses to check for follow-ups
    const defaultStatuses = ['Applied', 'Interviewing', 'Phone Screen', 'Technical Interview'];
    const statusFilter = input.statuses || defaultStatuses;

    const followUpJobs: FollowUpJob[] = [];

    for (const job of jobs) {
      // Skip jobs not in target statuses
      if (!statusFilter.some((s) => job.status.toLowerCase().includes(s.toLowerCase()))) {
        continue;
      }

      // Find most recent activity
      const timeline = job.timeline || [];
      const sortedEvents = [...timeline].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      const lastEvent = sortedEvents[0];
      const lastActivityDate = lastEvent ? new Date(lastEvent.date) : new Date(job.dateAdded);
      const daysSinceActivity = differenceInDays(now, lastActivityDate);

      // Only include if inactive beyond threshold
      if (daysSinceActivity >= daysThreshold) {
        followUpJobs.push({
          jobId: job.id,
          company: job.company,
          title: job.title,
          status: job.status,
          daysSinceActivity,
          lastActivity: lastEvent
            ? {
                type: lastEvent.type,
                description: lastEvent.description,
                date: new Date(lastEvent.date).toISOString(),
              }
            : null,
          contactCount: (job.contacts || []).length,
        });
      }
    }

    // Sort by days since activity (most stale first)
    followUpJobs.sort((a, b) => b.daysSinceActivity - a.daysSinceActivity);

    return {
      success: true,
      data: {
        jobs: followUpJobs,
        totalNeedingFollowUp: followUpJobs.length,
      },
    };
  },
};
