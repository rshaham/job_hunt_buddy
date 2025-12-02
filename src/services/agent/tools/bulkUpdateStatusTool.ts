import { useAppStore } from '../../../stores/appStore';
import type { ToolDefinition, ToolResult } from '../../../types/agent';
import { bulkUpdateStatusSchema, type BulkUpdateStatusInput } from './schemas';

interface BulkUpdateStatusResult {
  updatedCount: number;
  failedCount: number;
  newStatus: string;
  updatedJobs: { id: string; company: string; title: string; previousStatus: string }[];
  failedJobs: { id: string; reason: string }[];
}

export const bulkUpdateStatusTool: ToolDefinition<BulkUpdateStatusInput, BulkUpdateStatusResult> = {
  name: 'bulk_update_status',
  description: 'Update the status of multiple jobs at once. Useful for cleaning up old applications or batch processing.',
  category: 'write',
  inputSchema: bulkUpdateStatusSchema,
  requiresConfirmation: true, // Modifies multiple jobs

  confirmationMessage(input) {
    const { jobs } = useAppStore.getState();
    const validJobs = jobs.filter((j) => input.jobIds.includes(j.id));
    const companies = validJobs.slice(0, 3).map((j) => j.company);
    const moreCount = validJobs.length - 3;

    let jobList = companies.join(', ');
    if (moreCount > 0) {
      jobList += ` and ${moreCount} more`;
    }

    return `Update ${validJobs.length} jobs (${jobList}) to "${input.newStatus}"?`;
  },

  async execute(input): Promise<ToolResult<BulkUpdateStatusResult>> {
    const { jobs, settings, moveJob } = useAppStore.getState();

    // Validate the new status exists
    const validStatuses = settings.statuses.map((s) => s.name);
    if (!validStatuses.includes(input.newStatus)) {
      return {
        success: false,
        error: `Invalid status "${input.newStatus}". Valid statuses are: ${validStatuses.join(', ')}`,
      };
    }

    // Limit bulk operations
    const MAX_BULK_UPDATE = 50;
    if (input.jobIds.length > MAX_BULK_UPDATE) {
      return {
        success: false,
        error: `Cannot update more than ${MAX_BULK_UPDATE} jobs at once. Please split into smaller batches.`,
      };
    }

    const updatedJobs: BulkUpdateStatusResult['updatedJobs'] = [];
    const failedJobs: BulkUpdateStatusResult['failedJobs'] = [];

    for (const jobId of input.jobIds) {
      const job = jobs.find((j) => j.id === jobId);

      if (!job) {
        failedJobs.push({ id: jobId, reason: 'Job not found' });
        continue;
      }

      if (job.status === input.newStatus) {
        failedJobs.push({ id: jobId, reason: `Already in "${input.newStatus}" status` });
        continue;
      }

      try {
        await moveJob(jobId, input.newStatus);
        updatedJobs.push({
          id: job.id,
          company: job.company,
          title: job.title,
          previousStatus: job.status,
        });
      } catch (error) {
        failedJobs.push({
          id: jobId,
          reason: error instanceof Error ? error.message : 'Update failed',
        });
      }
    }

    if (updatedJobs.length === 0 && failedJobs.length > 0) {
      return {
        success: false,
        error: `No jobs were updated. Reasons: ${failedJobs.map((f) => f.reason).join(', ')}`,
      };
    }

    return {
      success: true,
      data: {
        updatedCount: updatedJobs.length,
        failedCount: failedJobs.length,
        newStatus: input.newStatus,
        updatedJobs,
        failedJobs,
      },
    };
  },
};
