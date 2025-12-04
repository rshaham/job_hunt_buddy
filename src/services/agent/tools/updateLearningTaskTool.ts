import { useAppStore } from '../../../stores/appStore';
import type { ToolDefinition, ToolResult } from '../../../types/agent';
import { updateLearningTaskSchema, type UpdateLearningTaskInput } from './schemas';

interface UpdateLearningTaskResult {
  taskId: string;
  jobId: string;
  company: string;
  skill: string;
  updatedFields: string[];
}

export const updateLearningTaskTool: ToolDefinition<UpdateLearningTaskInput, UpdateLearningTaskResult> = {
  name: 'update_learning_task',
  description: 'Update a learning task (change status, priority, due date, etc.)',
  category: 'write',
  inputSchema: updateLearningTaskSchema,
  requiresConfirmation: false, // Non-destructive update

  async execute(input): Promise<ToolResult<UpdateLearningTaskResult>> {
    const { jobs, updateLearningTask } = useAppStore.getState();
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

    // Build updates object, handling date conversion
    const updates: Record<string, unknown> = {};
    const updatedFields: string[] = [];

    if (input.updates.skill !== undefined) {
      updates.skill = input.updates.skill;
      updatedFields.push('skill');
    }
    if (input.updates.description !== undefined) {
      updates.description = input.updates.description;
      updatedFields.push('description');
    }
    if (input.updates.status !== undefined) {
      updates.status = input.updates.status;
      updatedFields.push('status');
    }
    if (input.updates.priority !== undefined) {
      updates.priority = input.updates.priority;
      updatedFields.push('priority');
    }
    if (input.updates.dueDate !== undefined) {
      updates.dueDate = input.updates.dueDate ? new Date(input.updates.dueDate) : undefined;
      updatedFields.push('dueDate');
    }
    if (input.updates.resourceUrl !== undefined) {
      updates.resourceUrl = input.updates.resourceUrl || undefined;
      updatedFields.push('resourceUrl');
    }

    if (updatedFields.length === 0) {
      return {
        success: false,
        error: 'No fields provided to update',
      };
    }

    try {
      await updateLearningTask(input.jobId, input.taskId, updates);

      return {
        success: true,
        data: {
          taskId: input.taskId,
          jobId: job.id,
          company: job.company,
          skill: input.updates.skill || task.skill,
          updatedFields,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update learning task',
      };
    }
  },
};
