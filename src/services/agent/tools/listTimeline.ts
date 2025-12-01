import { useAppStore } from '../../../stores/appStore';
import type { ToolDefinition, ToolResult } from '../../../types/agent';
import { listTimelineSchema, type ListTimelineInput } from './schemas';
import type { TimelineEvent } from '../../../types';

interface ListTimelineResult {
  jobId: string;
  company: string;
  title: string;
  currentStatus: string;
  events: TimelineEvent[];
  totalCount: number;
}

export const listTimelineTool: ToolDefinition<ListTimelineInput, ListTimelineResult> = {
  name: 'list_timeline',
  description: 'List all timeline events for a job, sorted by date. Returns the history of events like applications, phone screens, interviews, offers, etc.',
  category: 'read',
  inputSchema: listTimelineSchema,
  requiresConfirmation: false,

  async execute(input): Promise<ToolResult<ListTimelineResult>> {
    const { jobs } = useAppStore.getState();
    const job = jobs.find((j) => j.id === input.jobId);

    if (!job) {
      return {
        success: false,
        error: `Job not found with ID: ${input.jobId}`,
      };
    }

    // Sort events by date (newest first)
    const sortedEvents = [...job.timeline].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return {
      success: true,
      data: {
        jobId: job.id,
        company: job.company,
        title: job.title,
        currentStatus: job.status,
        events: sortedEvents,
        totalCount: sortedEvents.length,
      },
    };
  },
};
