import { useState } from 'react';
import {
  BookOpen,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  Edit2,
  Save,
  X,
} from 'lucide-react';
import { Button, ConfirmModal } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { formatDateOnly } from '../../utils/helpers';
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
  onUpdate,
}: {
  task: LearningTask;
  onStatusChange: (newStatus: LearningTask['status']) => void;
  onDelete: () => void;
  onUpdate: (updates: Partial<LearningTask>) => void;
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editSkill, setEditSkill] = useState(task.skill);
  const [editDescription, setEditDescription] = useState(task.description);
  const [editPriority, setEditPriority] = useState(task.priority);
  const [editDueDate, setEditDueDate] = useState(
    task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : ''
  );
  const [editResourceUrl, setEditResourceUrl] = useState(task.resourceUrl || '');

  const status = statusConfig[task.status];
  const priority = priorityConfig[task.priority];
  const StatusIcon = status.icon;

  const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== 'completed';
  const isDueToday = task.dueDate && isToday(new Date(task.dueDate));

  const handleStartEdit = () => {
    setEditSkill(task.skill);
    setEditDescription(task.description);
    setEditPriority(task.priority);
    setEditDueDate(task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '');
    setEditResourceUrl(task.resourceUrl || '');
    setIsEditing(true);
  };

  const handleSave = () => {
    onUpdate({
      skill: editSkill,
      description: editDescription,
      priority: editPriority,
      dueDate: editDueDate ? new Date(editDueDate) : undefined,
      resourceUrl: editResourceUrl || undefined,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

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
        {isEditing ? (
          /* Edit Form */
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Skill
                </label>
                <input
                  type="text"
                  value={editSkill}
                  onChange={(e) => setEditSkill(e.target.value)}
                  placeholder="Skill name"
                  className="w-full px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Priority
                </label>
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value as LearningTask['priority'])}
                  title="Priority"
                  className="w-full px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Description
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={2}
                placeholder="Task description"
                className="w-full px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  title="Due date"
                  className="w-full px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Resource URL
                </label>
                <input
                  type="url"
                  value={editResourceUrl}
                  onChange={(e) => setEditResourceUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleSave}>
                <Save className="w-3 h-3 mr-1" />
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancel}>
                <X className="w-3 h-3 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          /* Display Mode */
          <div className="flex items-start gap-3">
            {/* Status toggle */}
            <button
              type="button"
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
                    {formatDateOnly(task.dueDate)}
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

            {/* Edit button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleStartEdit}
              className="text-slate-400 hover:text-primary"
            >
              <Edit2 className="w-4 h-4" />
            </Button>

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
        )}
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

  const handleUpdate = async (taskId: string, updates: Partial<LearningTask>) => {
    await updateLearningTask(job.id, taskId, updates);
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
              onUpdate={(updates) => handleUpdate(task.id, updates)}
              onDelete={() => handleDelete(task.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
