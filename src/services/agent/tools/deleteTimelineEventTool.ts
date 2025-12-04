import { useAppStore } from '../../../stores/appStore';
import type { ToolDefinition, ToolResult } from '../../../types/agent';
import { deleteTimelineEventSchema, type DeleteTimelineEventInput } from './schemas';

interface DeleteTimelineEventResult {
  deletedEventId: string;
  jobId: string;
  company: string;
  deletedEventType: string;
  deletedEventDescription: string;
}

export const deleteTimelineEventTool: ToolDefinition<DeleteTimelineEventInput, DeleteTimelineEventResult> = {
  name: 'delete_timeline_event',
  description: 'Delete a timeline event from a job. This is a destructive operation.',
  category: 'write',
  inputSchema: deleteTimelineEventSchema,
  requiresConfirmation: true, // Destructive operation

  confirmationMessage(input) {
    const { jobs } = useAppStore.getState();
    const job = jobs.find((j) => j.id === input.jobId);
    const event = job?.timeline.find((e) => e.id === input.eventId);

    if (job && event) {
      const preview = event.description.length > 50
        ? event.description.substring(0, 50) + '...'
        : event.description;
      return `Delete "${event.type}" event from "${job.company}"? Description: "${preview}"`;
    }
    return `Delete this timeline event?`;
  },

  async execute(input): Promise<ToolResult<DeleteTimelineEventResult>> {
    const { jobs, updateJob } = useAppStore.getState();
    const job = jobs.find((j) => j.id === input.jobId);

    if (!job) {
      return {
        success: false,
        error: `Job not found with ID: ${input.jobId}`,
      };
    }

    const event = job.timeline.find((e) => e.id === input.eventId);
    if (!event) {
      return {
        success: false,
        error: `Timeline event not found with ID: ${input.eventId}`,
      };
    }

    const deletedEventType = event.type;
    const deletedEventDescription = event.description;
    const updatedTimeline = job.timeline.filter((e) => e.id !== input.eventId);

    try {
      await updateJob(input.jobId, { timeline: updatedTimeline });

      return {
        success: true,
        data: {
          deletedEventId: input.eventId,
          jobId: job.id,
          company: job.company,
          deletedEventType,
          deletedEventDescription,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete timeline event',
      };
    }
  },
};
