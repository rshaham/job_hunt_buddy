import { useAppStore } from '../../../stores/appStore';
import type { ToolDefinition, ToolResult } from '../../../types/agent';
import type { LearningTask } from '../../../types';
import { listLearningTasksSchema, type ListLearningTasksInput } from './schemas';
import { isPast } from 'date-fns';

interface TaskWithJob extends LearningTask {
  jobId: string;
  company: string;
  jobTitle: string;
}

interface ListLearningTasksResult {
  tasks: TaskWithJob[];
  summary: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
  };
}

export const listLearningTasksTool: ToolDefinition<ListLearningTasksInput, ListLearningTasksResult> = {
  name: 'list_learning_tasks',
  description: 'List all learning tasks across all jobs. Can filter by status and priority. Shows tasks grouped by job with summary statistics.',
  category: 'read',
  inputSchema: listLearningTasksSchema,
  requiresConfirmation: false,

  async execute(input): Promise<ToolResult<ListLearningTasksResult>> {
    const { jobs } = useAppStore.getState();

    // Collect all tasks with job context
    let allTasks: TaskWithJob[] = [];

    for (const job of jobs) {
      const tasks = job.learningTasks || [];
      for (const task of tasks) {
        allTasks.push({
          ...task,
          jobId: job.id,
          company: job.company,
          jobTitle: job.title,
        });
      }
    }

    // Apply filters
    if (input.status && input.status !== 'all') {
      allTasks = allTasks.filter((t) => t.status === input.status);
    }

    if (input.priority && input.priority !== 'all') {
      allTasks = allTasks.filter((t) => t.priority === input.priority);
    }

    // Calculate summary before limiting
    const summary = {
      total: allTasks.length,
      pending: allTasks.filter((t) => t.status === 'pending').length,
      inProgress: allTasks.filter((t) => t.status === 'in_progress').length,
      completed: allTasks.filter((t) => t.status === 'completed').length,
      overdue: allTasks.filter(
        (t) => t.dueDate && isPast(new Date(t.dueDate)) && t.status !== 'completed'
      ).length,
    };

    // Sort: in_progress first, then pending by priority, then completed
    allTasks.sort((a, b) => {
      const statusOrder = { in_progress: 0, pending: 1, completed: 2 };
      const priorityOrder = { high: 0, medium: 1, low: 2 };

      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;

      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // Apply limit
    const limitedTasks = allTasks.slice(0, input.limit || 20);

    return {
      success: true,
      data: {
        tasks: limitedTasks,
        summary,
      },
    };
  },
};
