import { useAppStore } from '../../../stores/appStore';
import type { ToolDefinition, ToolResult } from '../../../types/agent';
import { updateJobStatusSchema, type UpdateJobStatusInput } from './schemas';

interface UpdateJobStatusResult {
  jobId: string;
  company: string;
  title: string;
  previousStatus: string;
  newStatus: string;
}

export const updateJobStatusTool: ToolDefinition<UpdateJobStatusInput, UpdateJobStatusResult> = {
  name: 'update_job_status',
  description: 'Move a job to a new status in the pipeline (e.g., from "Applied" to "Interviewing"). This is a write operation that modifies the job.',
  category: 'write',
  inputSchema: updateJobStatusSchema,
  requiresConfirmation: true,

  confirmationMessage(input) {
    const { jobs } = useAppStore.getState();
    const job = jobs.find((j) => j.id === input.jobId);
    if (job) {
      return `Move "${job.company} - ${job.title}" from ${job.status} to ${input.newStatus}?`;
    }
    return `Move job to "${input.newStatus}"?`;
  },

  async execute(input): Promise<ToolResult<UpdateJobStatusResult>> {
    const { jobs, settings, moveJob } = useAppStore.getState();
    const job = jobs.find((j) => j.id === input.jobId);

    if (!job) {
      return {
        success: false,
        error: `Job not found with ID: ${input.jobId}`,
      };
    }

    // Validate that the status exists
    const statusExists = settings.statuses.some(
      (s) => s.name.toLowerCase() === input.newStatus.toLowerCase()
    );

    if (!statusExists) {
      const validStatuses = settings.statuses.map((s) => s.name).join(', ');
      return {
        success: false,
        error: `Invalid status "${input.newStatus}". Valid statuses are: ${validStatuses}`,
      };
    }

    // Find the exact status name (case-insensitive match)
    const exactStatus = settings.statuses.find(
      (s) => s.name.toLowerCase() === input.newStatus.toLowerCase()
    );

    const previousStatus = job.status;

    try {
      await moveJob(input.jobId, exactStatus!.name);

      return {
        success: true,
        data: {
          jobId: job.id,
          company: job.company,
          title: job.title,
          previousStatus,
          newStatus: exactStatus!.name,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update job status',
      };
    }
  },
};
