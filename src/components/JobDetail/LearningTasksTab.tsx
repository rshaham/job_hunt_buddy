import { useState } from 'react';
import {
  BookOpen,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { Button, ConfirmModal } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { format, isPast, isToday } from 'date-fns';
import type { Job, LearningTask } from '../../types';

interface LearningTasksTabProps {
  job: Job;
}

const statusConfig = {
  pending: {
    label: 'Pending',
    icon: Circle,
    color: 'text-slate-500',
    bgColor: 'bg-slate-100 dark:bg-slate-700',
  },
  in_progress: {
    label: 'In Progress',
    icon: Clock,
    color: 'text-blue-500',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle2,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
  },
};

const priorityConfig = {
  high: {
    label: 'High',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    borderColor: 'border-red-200 dark:border-red-800/50',
  },
  medium: {
    label: 'Medium',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    borderColor: 'border-amber-200 dark:border-amber-800/50',
  },
  low: {
    label: 'Low',
    color: 'text-slate-500 dark:text-slate-400',
    bgColor: 'bg-slate-100 dark:bg-slate-700',
    borderColor: 'border-slate-200 dark:border-slate-700',
  },
};

function TaskCard({
  task,
  onStatusChange,
  onDelete,
}: {
  task: LearningTask;
  onStatusChange: (newStatus: LearningTask['status']) => void;
  onDelete: () => void;
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const status = statusConfig[task.status];
  const priority = priorityConfig[task.priority];
  const StatusIcon = status.icon;

  const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== 'completed';
  const isDueToday = task.dueDate && isToday(new Date(task.dueDate));

  const cycleStatus = () => {
    const statusOrder: LearningTask['status'][] = ['pending', 'in_progress', 'completed'];
    const currentIndex = statusOrder.indexOf(task.status);
    const nextIndex = (currentIndex + 1) % statusOrder.length;
    onStatusChange(statusOrder[nextIndex]);
  };

  return (
    <>
      <div
        className={`p-4 rounded-xl border ${priority.borderColor} bg-white dark:bg-slate-800/50 shadow-sm hover:shadow-md transition-shadow`}
      >
        <div className="flex items-start gap-3">
          {/* Status toggle */}
          <button
            onClick={cycleStatus}
            className={`mt-0.5 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${status.color}`}
            title={`Status: ${status.label} (click to change)`}
          >
            <StatusIcon className="w-5 h-5" />
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-slate-800 dark:text-slate-200">{task.skill}</h4>
              <span className={`text-xs px-2 py-0.5 rounded-full ${priority.bgColor} ${priority.color}`}>
                {priority.label}
              </span>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{task.description}</p>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              {/* Due date */}
              {task.dueDate && (
                <span
                  className={`flex items-center gap-1 ${
                    isOverdue
                      ? 'text-red-600 dark:text-red-400'
                      : isDueToday
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {isOverdue && <AlertTriangle className="w-3 h-3" />}
                  <Clock className="w-3 h-3" />
                  {isOverdue ? 'Overdue: ' : isDueToday ? 'Due today: ' : 'Due: '}
                  {format(new Date(task.dueDate), 'MMM d, yyyy')}
                </span>
              )}

              {/* Resource link */}
              {task.resourceUrl && (
                <a
                  href={task.resourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:text-primary/80"
                >
                  <ExternalLink className="w-3 h-3" />
                  Resource
                </a>
              )}

              {/* Created date */}
              <span className="text-slate-400 dark:text-slate-500">
                Added {format(new Date(task.createdAt), 'MMM d')}
              </span>
            </div>
          </div>

          {/* Delete button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            className="text-slate-400 hover:text-red-500"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          onDelete();
          setShowDeleteConfirm(false);
        }}
        title="Delete Learning Task"
        message={`Remove "${task.skill}" from your learning tasks?`}
        confirmText="Delete"
        variant="danger"
      />
    </>
  );
}

export function LearningTasksTab({ job }: LearningTasksTabProps) {
  const { updateLearningTask, deleteLearningTask } = useAppStore();

  const tasks = job.learningTasks || [];

  // Sort: in_progress first, then pending, then completed; within each group, high priority first
  const sortedTasks = [...tasks].sort((a, b) => {
    const statusOrder = { in_progress: 0, pending: 1, completed: 2 };
    const priorityOrder = { high: 0, medium: 1, low: 2 };

    const statusDiff = statusOrder[a.status] - statusOrder[b.status];
    if (statusDiff !== 0) return statusDiff;

    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  const handleStatusChange = async (taskId: string, newStatus: LearningTask['status']) => {
    await updateLearningTask(job.id, taskId, { status: newStatus });
  };

  const handleDelete = async (taskId: string) => {
    await deleteLearningTask(job.id, taskId);
  };

  // Stats
  const pendingCount = tasks.filter((t) => t.status === 'pending').length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
          <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h3 className="font-semibold text-slate-800 dark:text-slate-200">Learning Tasks</h3>
        {tasks.length > 0 && (
          <span className="text-sm text-slate-500 dark:text-slate-400">({tasks.length})</span>
        )}
      </div>

      {/* Stats */}
      {tasks.length > 0 && (
        <div className="flex gap-3 text-sm">
          <span className="flex items-center gap-1.5 text-slate-500">
            <Circle className="w-3.5 h-3.5" />
            {pendingCount} pending
          </span>
          <span className="flex items-center gap-1.5 text-blue-500">
            <Clock className="w-3.5 h-3.5" />
            {inProgressCount} in progress
          </span>
          <span className="flex items-center gap-1.5 text-emerald-500">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {completedCount} completed
          </span>
        </div>
      )}

      {/* Task List */}
      {tasks.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
          <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400 mb-2">No learning tasks yet</p>
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Use the agent (Ctrl+K) to suggest skills to learn based on this job's requirements.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onStatusChange={(newStatus) => handleStatusChange(task.id, newStatus)}
              onDelete={() => handleDelete(task.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
