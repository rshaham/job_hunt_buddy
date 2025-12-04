import { useAppStore } from '../../../stores/appStore';
import type { ToolDefinition, ToolResult } from '../../../types/agent';
import { deleteLearningTaskSchema, type DeleteLearningTaskInput } from './schemas';

interface DeleteLearningTaskResult {
  deletedTaskId: string;
  jobId: string;
  company: string;
  deletedSkill: string;
}

export const deleteLearningTaskTool: ToolDefinition<DeleteLearningTaskInput, DeleteLearningTaskResult> = {
  name: 'delete_learning_task',
  description: 'Delete a learning task from a job. This is a destructive operation.',
  category: 'write',
  inputSchema: deleteLearningTaskSchema,
  requiresConfirmation: true, // Destructive operation

  confirmationMessage(input) {
    const { jobs } = useAppStore.getState();
    const job = jobs.find((j) => j.id === input.jobId);
    const task = job?.learningTasks?.find((t) => t.id === input.taskId);

    if (job && task) {
      return `Delete learning task "${task.skill}" from "${job.company}"?`;
    }
    return `Delete this learning task?`;
  },

  async execute(input): Promise<ToolResult<DeleteLearningTaskResult>> {
    const { jobs, deleteLearningTask } = useAppStore.getState();
    const job = jobs.find((j) => j.id === input.jobId);

    if (!job) {
      return {
        success: false,
        error: `Job not found with ID: ${input.jobId}`,
      };
    }

    const task = job.learningTasks?.find((t) => t.id === input.taskId);
    if (!task) {
      return {
        success: false,
        error: `Learning task not found with ID: ${input.taskId}`,
      };
    }

    const deletedSkill = task.skill;

    try {
      await deleteLearningTask(input.jobId, input.taskId);

      return {
        success: true,
        data: {
          deletedTaskId: input.taskId,
          jobId: job.id,
          company: job.company,
          deletedSkill,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete learning task',
      };
    }
  },
};
