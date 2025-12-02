import { useAppStore } from '../../../stores/appStore';
import type { ToolDefinition, ToolResult } from '../../../types/agent';
import { getStaleJobsSchema, type GetStaleJobsInput } from './schemas';
import { differenceInDays } from 'date-fns';

interface StaleJob {
  jobId: string;
  company: string;
  title: string;
  status: string;
  daysSinceActivity: number;
  daysSinceAdded: number;
  lastActivity: {
    type: string;
    date: string;
  } | null;
  hasContacts: boolean;
  hasNotes: boolean;
}

interface GetStaleJobsResult {
  jobs: StaleJob[];
  totalStale: number;
  suggestion: string;
}

export const getStaleJobsTool: ToolDefinition<GetStaleJobsInput, GetStaleJobsResult> = {
  name: 'get_stale_jobs',
  description: 'Find jobs with no activity in X days. Useful for identifying applications that may need cleanup (archive or follow-up). Can exclude certain statuses like "Rejected" or "Offer".',
  category: 'read',
  inputSchema: getStaleJobsSchema,
  requiresConfirmation: false,

  async execute(input): Promise<ToolResult<GetStaleJobsResult>> {
    const { jobs } = useAppStore.getState();
    const now = new Date();
    const daysThreshold = input.daysInactive || 14;

    // Default exclusions for terminal statuses
    const defaultExclusions = ['Rejected', 'Offer', 'Accepted', 'Declined', 'Withdrawn'];
    const excludeStatuses = input.excludeStatuses || defaultExclusions;

    const staleJobs: StaleJob[] = [];

    for (const job of jobs) {
      // Skip excluded statuses
      if (excludeStatuses.some((s) => job.status.toLowerCase() === s.toLowerCase())) {
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
      const daysSinceAdded = differenceInDays(now, new Date(job.dateAdded));

      // Only include if inactive beyond threshold
      if (daysSinceActivity >= daysThreshold) {
        staleJobs.push({
          jobId: job.id,
          company: job.company,
          title: job.title,
          status: job.status,
          daysSinceActivity,
          daysSinceAdded,
          lastActivity: lastEvent
            ? {
                type: lastEvent.type,
                date: new Date(lastEvent.date).toISOString(),
              }
            : null,
          hasContacts: (job.contacts || []).length > 0,
          hasNotes: (job.notes || []).length > 0,
        });
      }
    }

    // Sort by days since activity (most stale first)
    staleJobs.sort((a, b) => b.daysSinceActivity - a.daysSinceActivity);

    // Generate suggestion
    let suggestion = '';
    if (staleJobs.length === 0) {
      suggestion = 'No stale jobs found. Your job tracking is up to date!';
    } else if (staleJobs.length <= 3) {
      suggestion = `Consider following up on these ${staleJobs.length} applications or marking them as rejected if no longer pursuing.`;
    } else {
      suggestion = `You have ${staleJobs.length} stale applications. Consider bulk updating old ones to "Rejected" or sending follow-up messages.`;
    }

    return {
      success: true,
      data: {
        jobs: staleJobs,
        totalStale: staleJobs.length,
        suggestion,
      },
    };
  },
};
