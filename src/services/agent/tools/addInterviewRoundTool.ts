import { useAppStore } from '../../../stores/appStore';
import { generateId } from '../../../utils/helpers';
import type { ToolDefinition, ToolResult } from '../../../types/agent';
import type { InterviewRound, InterviewStatus, InterviewOutcome } from '../../../types';
import { addInterviewRoundSchema, type AddInterviewRoundInput } from './schemas';

interface AddInterviewRoundResult {
  interviewId: string;
  jobId: string;
  company: string;
  title: string;
  roundNumber: number;
  type: string;
  scheduledAt?: string;
  status: InterviewStatus;
}

export const addInterviewRoundTool: ToolDefinition<AddInterviewRoundInput, AddInterviewRoundResult> = {
  name: 'add_interview_round',
  description: 'Add an interview round to a job. Use this to schedule or record interviews (phone screen, technical, behavioral, onsite, etc.). Returns the created interview with its ID.',
  category: 'write',
  inputSchema: addInterviewRoundSchema,
  requiresConfirmation: false, // Low risk - just adding an interview

  async execute(input): Promise<ToolResult<AddInterviewRoundResult>> {
    const { jobs, updateJob } = useAppStore.getState();
    const job = jobs.find((j) => j.id === input.jobId);

    if (!job) {
      return {
        success: false,
        error: `Job not found with ID: ${input.jobId}`,
      };
    }

    // Validate interviewer IDs if provided
    if (input.interviewerIds && input.interviewerIds.length > 0) {
      const contactIds = new Set(job.contacts.map((c) => c.id));
      const invalidIds = input.interviewerIds.filter((id) => !contactIds.has(id));
      if (invalidIds.length > 0) {
        return {
          success: false,
          error: `Invalid interviewer contact IDs: ${invalidIds.join(', ')}. These contacts don't exist for this job.`,
        };
      }
    }

    const existingInterviews = job.interviews || [];
    const roundNumber = existingInterviews.length + 1;

    const newInterview: InterviewRound = {
      id: generateId(),
      roundNumber,
      type: input.type,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
      duration: input.duration,
      interviewerIds: input.interviewerIds,
      location: input.location,
      status: (input.status || 'scheduled') as InterviewStatus,
      outcome: 'pending' as InterviewOutcome,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      await updateJob(input.jobId, {
        interviews: [...existingInterviews, newInterview],
      });

      return {
        success: true,
        data: {
          interviewId: newInterview.id,
          jobId: job.id,
          company: job.company,
          title: job.title,
          roundNumber: newInterview.roundNumber,
          type: newInterview.type,
          scheduledAt: newInterview.scheduledAt?.toISOString(),
          status: newInterview.status,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add interview round',
      };
    }
  },
};
