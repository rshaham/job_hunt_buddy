import { useAppStore } from '../../../stores/appStore';
import type { ToolDefinition, ToolResult } from '../../../types/agent';
import type { InterviewRound, InterviewStatus, InterviewOutcome } from '../../../types';
import { updateInterviewRoundSchema, type UpdateInterviewRoundInput } from './schemas';

interface UpdateInterviewRoundResult {
  interviewId: string;
  jobId: string;
  company: string;
  updatedFields: string[];
  interview: {
    type: string;
    status: InterviewStatus;
    outcome: InterviewOutcome;
    scheduledAt?: string;
  };
}

export const updateInterviewRoundTool: ToolDefinition<UpdateInterviewRoundInput, UpdateInterviewRoundResult> = {
  name: 'update_interview_round',
  description: 'Update an interview round\'s details, status, outcome, notes, or feedback. Use this after an interview to record results or to update scheduling details.',
  category: 'write',
  inputSchema: updateInterviewRoundSchema,
  requiresConfirmation: false, // Low risk - updating existing interview

  async execute(input): Promise<ToolResult<UpdateInterviewRoundResult>> {
    const { jobs, updateJob } = useAppStore.getState();
    const job = jobs.find((j) => j.id === input.jobId);

    if (!job) {
      return {
        success: false,
        error: `Job not found with ID: ${input.jobId}`,
      };
    }

    const interviews = job.interviews || [];
    const interviewIndex = interviews.findIndex((i) => i.id === input.interviewId);

    if (interviewIndex === -1) {
      return {
        success: false,
        error: `Interview not found with ID: ${input.interviewId}`,
      };
    }

    // Validate interviewer IDs if provided
    if (input.interviewerIds && input.interviewerIds.length > 0) {
      const contactIds = new Set((job.contacts || []).map((c) => c.id));
      const invalidIds = input.interviewerIds.filter((id) => !contactIds.has(id));
      if (invalidIds.length > 0) {
        return {
          success: false,
          error: `Invalid interviewer contact IDs: ${invalidIds.join(', ')}. These contacts don't exist for this job.`,
        };
      }
    }

    const existingInterview = interviews[interviewIndex];
    const updatedFields: string[] = [];

    // Build updated interview with only changed fields
    const updatedInterview: InterviewRound = { ...existingInterview };

    if (input.type !== undefined) {
      updatedInterview.type = input.type;
      updatedFields.push('type');
    }
    if (input.scheduledAt !== undefined) {
      updatedInterview.scheduledAt = new Date(input.scheduledAt);
      updatedFields.push('scheduledAt');
    }
    if (input.duration !== undefined) {
      updatedInterview.duration = input.duration;
      updatedFields.push('duration');
    }
    if (input.interviewerIds !== undefined) {
      updatedInterview.interviewerIds = input.interviewerIds;
      updatedFields.push('interviewerIds');
    }
    if (input.location !== undefined) {
      updatedInterview.location = input.location;
      updatedFields.push('location');
    }
    if (input.status !== undefined) {
      updatedInterview.status = input.status as InterviewStatus;
      updatedFields.push('status');
    }
    if (input.outcome !== undefined) {
      updatedInterview.outcome = input.outcome as InterviewOutcome;
      updatedFields.push('outcome');
    }
    if (input.notes !== undefined) {
      updatedInterview.notes = input.notes;
      updatedFields.push('notes');
    }
    if (input.feedback !== undefined) {
      updatedInterview.feedback = input.feedback;
      updatedFields.push('feedback');
    }

    if (updatedFields.length === 0) {
      return {
        success: false,
        error: 'No fields to update. Please provide at least one field to change.',
      };
    }

    updatedInterview.updatedAt = new Date();

    // Update the interviews array
    const updatedInterviews = [...interviews];
    updatedInterviews[interviewIndex] = updatedInterview;

    try {
      await updateJob(input.jobId, { interviews: updatedInterviews });

      return {
        success: true,
        data: {
          interviewId: updatedInterview.id,
          jobId: job.id,
          company: job.company,
          updatedFields,
          interview: {
            type: updatedInterview.type,
            status: updatedInterview.status,
            outcome: updatedInterview.outcome,
            scheduledAt: updatedInterview.scheduledAt?.toISOString(),
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update interview round',
      };
    }
  },
};
