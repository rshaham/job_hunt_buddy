import { useAppStore } from '../../../stores/appStore';
import type { ToolDefinition, ToolResult } from '../../../types/agent';
import { deleteJobSchema, type DeleteJobInput } from './schemas';

interface DeleteJobResult {
  deletedJobId: string;
  company: string;
  title: string;
  status: string;
}

export const deleteJobTool: ToolDefinition<DeleteJobInput, DeleteJobResult> = {
  name: 'delete_job',
  description: 'Permanently delete a job and all its associated data (notes, contacts, timeline, cover letter, etc.). This is a DESTRUCTIVE operation that cannot be undone.',
  category: 'write',
  inputSchema: deleteJobSchema,
  requiresConfirmation: true, // Destructive operation

  confirmationMessage(input) {
    const { jobs } = useAppStore.getState();
    const job = jobs.find((j) => j.id === input.jobId);
    if (job) {
      return `Permanently delete "${job.company} - ${job.title}" (${job.status})? This will remove all notes, contacts, timeline events, cover letter, and other data. This cannot be undone.`;
    }
    return `Delete this job? This cannot be undone.`;
  },

  async execute(input): Promise<ToolResult<DeleteJobResult>> {
    const { jobs, deleteJob } = useAppStore.getState();
    const job = jobs.find((j) => j.id === input.jobId);

    if (!job) {
      return {
        success: false,
        error: `Job not found with ID: ${input.jobId}`,
      };
    }

    const deletedInfo = {
      deletedJobId: job.id,
      company: job.company,
      title: job.title,
      status: job.status,
    };

    try {
      await deleteJob(input.jobId);

      return {
        success: true,
        data: deletedInfo,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete job',
      };
    }
  },
};
