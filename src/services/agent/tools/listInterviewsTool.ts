import { useAppStore } from '../../../stores/appStore';
import type { ToolDefinition, ToolResult } from '../../../types/agent';
import type { InterviewStatus, InterviewOutcome } from '../../../types';
import { listInterviewsSchema, type ListInterviewsInput } from './schemas';

interface InterviewWithContext {
  interviewId: string;
  jobId: string;
  company: string;
  jobTitle: string;
  roundNumber: number;
  type: string;
  scheduledAt?: string;
  duration?: number;
  location?: string;
  status: InterviewStatus;
  outcome: InterviewOutcome;
  interviewerNames: string[];
  notes?: string;
  feedback?: string;
}

interface ListInterviewsResult {
  interviews: InterviewWithContext[];
  summary: {
    total: number;
    byStatus: Record<string, number>;
    byOutcome: Record<string, number>;
  };
}

export const listInterviewsTool: ToolDefinition<ListInterviewsInput, ListInterviewsResult> = {
  name: 'list_interviews',
  description: 'List interview rounds across all jobs or for a specific job. Can filter by status, outcome, or only show upcoming interviews. Useful for answering "What interviews do I have this week?" or "Show all completed interviews".',
  category: 'read',
  inputSchema: listInterviewsSchema,
  requiresConfirmation: false,

  async execute(input): Promise<ToolResult<ListInterviewsResult>> {
    const { jobs } = useAppStore.getState();

    // Get relevant jobs
    const relevantJobs = input.jobId
      ? jobs.filter((j) => j.id === input.jobId)
      : jobs;

    if (input.jobId && relevantJobs.length === 0) {
      return {
        success: false,
        error: `Job not found with ID: ${input.jobId}`,
      };
    }

    // Flatten all interviews with job context
    const allInterviews: InterviewWithContext[] = [];

    for (const job of relevantJobs) {
      const interviews = job.interviews || [];

      for (const interview of interviews) {
        // Apply filters
        if (input.status && interview.status !== input.status) {
          continue;
        }
        if (input.outcome && interview.outcome !== input.outcome) {
          continue;
        }
        if (input.upcoming) {
          // Only include future scheduled interviews
          if (!interview.scheduledAt || new Date(interview.scheduledAt) <= new Date()) {
            continue;
          }
          if (interview.status !== 'scheduled') {
            continue;
          }
        }

        // Get interviewer names
        const interviewerNames = (interview.interviewerIds || [])
          .map((id) => {
            const contact = job.contacts.find((c) => c.id === id);
            return contact?.name;
          })
          .filter((name): name is string => name !== undefined);

        allInterviews.push({
          interviewId: interview.id,
          jobId: job.id,
          company: job.company,
          jobTitle: job.title,
          roundNumber: interview.roundNumber,
          type: interview.type,
          scheduledAt: interview.scheduledAt?.toISOString(),
          duration: interview.duration,
          location: interview.location,
          status: interview.status,
          outcome: interview.outcome,
          interviewerNames,
          notes: interview.notes,
          feedback: interview.feedback,
        });
      }
    }

    // Sort: upcoming interviews by scheduledAt (soonest first), then by createdAt
    allInterviews.sort((a, b) => {
      if (a.scheduledAt && b.scheduledAt) {
        return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
      }
      if (a.scheduledAt) return -1;
      if (b.scheduledAt) return 1;
      return 0;
    });

    // Apply limit
    const limitedInterviews = allInterviews.slice(0, input.limit || 20);

    // Build summary stats
    const byStatus: Record<string, number> = {};
    const byOutcome: Record<string, number> = {};

    for (const interview of allInterviews) {
      byStatus[interview.status] = (byStatus[interview.status] || 0) + 1;
      byOutcome[interview.outcome] = (byOutcome[interview.outcome] || 0) + 1;
    }

    return {
      success: true,
      data: {
        interviews: limitedInterviews,
        summary: {
          total: allInterviews.length,
          byStatus,
          byOutcome,
        },
      },
    };
  },
};
