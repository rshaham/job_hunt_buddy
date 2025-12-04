import { useAppStore } from '../../../stores/appStore';
import { generateId } from '../../../utils/helpers';
import type { ToolDefinition, ToolResult } from '../../../types/agent';
import { addTimelineEventSchema, type AddTimelineEventInput } from './schemas';
import type { TimelineEvent } from '../../../types';

interface AddTimelineEventResult {
  eventId: string;
  jobId: string;
  company: string;
  type: string;
  description: string;
  date: string;
}

export const addTimelineEventTool: ToolDefinition<AddTimelineEventInput, AddTimelineEventResult> = {
  name: 'add_timeline_event',
  description: 'Add a timeline event to a job (e.g., phone screen, interview scheduled, offer received). This is a low-risk write operation.',
  category: 'write',
  inputSchema: addTimelineEventSchema,
  requiresConfirmation: false, // Low risk - just adding an event

  async execute(input): Promise<ToolResult<AddTimelineEventResult>> {
    const { jobs, updateJob } = useAppStore.getState();
    const job = jobs.find((j) => j.id === input.jobId);

    if (!job) {
      return {
        success: false,
        error: `Job not found with ID: ${input.jobId}`,
      };
    }

    const eventDate = input.date ? new Date(input.date) : new Date();

    // Validate date
    if (isNaN(eventDate.getTime())) {
      return {
        success: false,
        error: `Invalid date format: ${input.date}. Use ISO format (e.g., 2024-01-15 or 2024-01-15T10:00:00)`,
      };
    }

    const newEvent: TimelineEvent = {
      id: generateId(),
      type: input.type,
      description: input.description,
      date: eventDate,
    };

    try {
      await updateJob(input.jobId, {
        timeline: [...job.timeline, newEvent],
      });

      return {
        success: true,
        data: {
          eventId: newEvent.id,
          jobId: job.id,
          company: job.company,
          type: newEvent.type,
          description: newEvent.description,
          date: eventDate.toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add timeline event',
      };
    }
  },
};
