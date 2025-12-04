import { useAppStore } from '../../../stores/appStore';
import type { ToolDefinition, ToolResult } from '../../../types/agent';
import { updateTimelineEventSchema, type UpdateTimelineEventInput } from './schemas';

interface UpdateTimelineEventResult {
  eventId: string;
  jobId: string;
  company: string;
  eventType: string;
  updatedFields: string[];
}

export const updateTimelineEventTool: ToolDefinition<UpdateTimelineEventInput, UpdateTimelineEventResult> = {
  name: 'update_timeline_event',
  description: 'Update a timeline event (change type, description, or date)',
  category: 'write',
  inputSchema: updateTimelineEventSchema,
  requiresConfirmation: false, // Non-destructive update

  async execute(input): Promise<ToolResult<UpdateTimelineEventResult>> {
    const { jobs, updateJob } = useAppStore.getState();
    const job = jobs.find((j) => j.id === input.jobId);

    if (!job) {
      return {
        success: false,
        error: `Job not found with ID: ${input.jobId}`,
      };
    }

    const eventIndex = job.timeline.findIndex((e) => e.id === input.eventId);
    if (eventIndex === -1) {
      return {
        success: false,
        error: `Timeline event not found with ID: ${input.eventId}`,
      };
    }

    const event = job.timeline[eventIndex];
    const updatedFields: string[] = [];

    // Build updated event
    const updatedEvent = { ...event };

    if (input.updates.type !== undefined) {
      updatedEvent.type = input.updates.type;
      updatedFields.push('type');
    }
    if (input.updates.description !== undefined) {
      updatedEvent.description = input.updates.description;
      updatedFields.push('description');
    }
    if (input.updates.date !== undefined) {
      updatedEvent.date = new Date(input.updates.date);
      updatedFields.push('date');
    }

    if (updatedFields.length === 0) {
      return {
        success: false,
        error: 'No fields provided to update',
      };
    }

    const updatedTimeline = [...job.timeline];
    updatedTimeline[eventIndex] = updatedEvent;

    try {
      await updateJob(input.jobId, { timeline: updatedTimeline });

      return {
        success: true,
        data: {
          eventId: input.eventId,
          jobId: job.id,
          company: job.company,
          eventType: updatedEvent.type,
          updatedFields,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update timeline event',
      };
    }
  },
};
