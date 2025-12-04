import { useAppStore } from '../../../stores/appStore';
import { generateId } from '../../../utils/helpers';
import type { ToolDefinition, ToolResult } from '../../../types/agent';
import type { LearningTask } from '../../../types';
import { addLearningTaskSchema, type AddLearningTaskInput } from './schemas';

interface AddLearningTaskResult {
  taskId: string;
  jobId: string;
  company: string;
  skill: string;
  priority: string;
}

export const addLearningTaskTool: ToolDefinition<AddLearningTaskInput, AddLearningTaskResult> = {
  name: 'add_learning_task',
  description: 'Add a learning task to a job. Use this to track skills you need to learn for specific positions.',
  category: 'write',
  inputSchema: addLearningTaskSchema,
  requiresConfirmation: false, // Low-risk operation

  async execute(input): Promise<ToolResult<AddLearningTaskResult>> {
    const { jobs, updateJob } = useAppStore.getState();
    const job = jobs.find((j) => j.id === input.jobId);

    if (!job) {
      return {
        success: false,
        error: `Job not found with ID: ${input.jobId}`,
      };
    }

    const now = new Date();
    const newTask: LearningTask = {
      id: generateId(),
      skill: input.skill,
      description: input.description,
      status: 'pending',
      priority: input.priority || 'medium',
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      resourceUrl: input.resourceUrl,
      createdAt: now,
      updatedAt: now,
    };

    const existingTasks = job.learningTasks || [];
    await updateJob(input.jobId, {
      learningTasks: [...existingTasks, newTask],
    });

    return {
      success: true,
      data: {
        taskId: newTask.id,
        jobId: job.id,
        company: job.company,
        skill: input.skill,
        priority: input.priority || 'medium',
      },
    };
  },
};
