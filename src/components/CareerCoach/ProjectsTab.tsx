import { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, Lightbulb, Rocket, CheckCircle2, Building2, Bot, User, MessageSquare, ChevronDown, ChevronRight } from 'lucide-react';
import { Button, ConfirmModal } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { showToast } from '../../stores/toastStore';
import type { CareerProject, ProjectStatus, CareerProjectSource } from '../../types';
import { PROJECT_STATUS_LABELS } from '../../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Simple markdown renderer for project details
function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="text-sm text-slate-700 dark:text-slate-300 prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          h1: ({ children }) => <h1 className="text-base font-bold mt-3 mb-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-sm font-semibold mt-3 mb-1.5">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-medium mt-2 mb-1">{children}</h3>,
          p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          code: ({ children }) => (
            <code className="bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded text-xs">{children}</code>
          ),
          pre: ({ children }) => (
            <pre className="bg-slate-100 dark:bg-slate-800 p-2 rounded overflow-x-auto mb-2 text-xs">{children}</pre>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// Status badge colors
const statusColors: Record<ProjectStatus, string> = {
  idea: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

// Status icons
const statusIcons: Record<ProjectStatus, React.ReactNode> = {
  idea: <Lightbulb className="w-3.5 h-3.5" />,
  in_progress: <Rocket className="w-3.5 h-3.5" />,
  completed: <CheckCircle2 className="w-3.5 h-3.5" />,
};

// Source icons
function getSourceIcon(source?: CareerProjectSource) {
  if (!source) return <User className="w-3 h-3" />;
  switch (source.type) {
    case 'career_coach':
      return <MessageSquare className="w-3 h-3" />;
    case 'job':
      return <Building2 className="w-3 h-3" />;
    case 'agent':
      return <Bot className="w-3 h-3" />;
    default:
      return <User className="w-3 h-3" />;
  }
}

function getSourceLabel(source?: CareerProjectSource) {
  if (!source) return 'Added manually';
  switch (source.type) {
    case 'career_coach':
      return 'From Career Coach';
    case 'job':
      return source.company ? `From ${source.jobTitle} @ ${source.company}` : 'From job analysis';
    case 'agent':
      return 'AI suggested';
    default:
      return 'Added manually';
  }
}

interface ProjectFormData {
  title: string;
  description: string;
  skills: string;
  status: ProjectStatus;
}

const emptyForm: ProjectFormData = {
  title: '',
  description: '',
  skills: '',
  status: 'idea',
};

export function ProjectsTab() {
  const { settings, addCareerProject, updateCareerProject, deleteCareerProject } = useAppStore();
  const projects = settings.careerProjects || [];

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProjectFormData>(emptyForm);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleStartAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    setFormData(emptyForm);
  };

  const handleStartEdit = (project: CareerProject) => {
    setEditingId(project.id);
    setIsAdding(false);
    setFormData({
      title: project.title,
      description: project.description,
      skills: project.skills.join(', '),
      status: project.status,
    });
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData(emptyForm);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      showToast('Title is required', 'error');
      return;
    }

    const skillsArray = formData.skills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (isAdding) {
      await addCareerProject({
        title: formData.title.trim(),
        description: formData.description.trim(),
        skills: skillsArray,
        status: formData.status,
        source: { type: 'manual' },
      });
      showToast('Project added', 'success');
    } else if (editingId) {
      await updateCareerProject(editingId, {
        title: formData.title.trim(),
        description: formData.description.trim(),
        skills: skillsArray,
        status: formData.status,
      });
      showToast('Project updated', 'success');
    }

    handleCancel();
  };

  const handleDelete = async (id: string) => {
    await deleteCareerProject(id);
    setDeleteConfirmId(null);
    showToast('Project deleted', 'success');
  };

  const handleStatusChange = async (id: string, status: ProjectStatus) => {
    await updateCareerProject(id, { status });
  };

  // Group projects by status
  const projectsByStatus = {
    idea: projects.filter((p) => p.status === 'idea'),
    in_progress: projects.filter((p) => p.status === 'in_progress'),
    completed: projects.filter((p) => p.status === 'completed'),
  };

  const renderForm = () => (
    <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 space-y-3">
      <input
        type="text"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        placeholder="Project title"
        className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/50"
        autoFocus
      />
      <textarea
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        placeholder="Description - what will you build and why?"
        rows={3}
        className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
      />
      <input
        type="text"
        value={formData.skills}
        onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
        placeholder="Skills (comma separated): React, TypeScript, API Design"
        className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/50"
      />
      <div className="flex items-center gap-3">
        <select
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value as ProjectStatus })}
          className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="idea">Idea</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={handleCancel}>
          <X className="w-4 h-4 mr-1" />
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave}>
          <Check className="w-4 h-4 mr-1" />
          Save
        </Button>
      </div>
    </div>
  );

  const renderProject = (project: CareerProject) => {
    if (editingId === project.id) {
      return <div key={project.id}>{renderForm()}</div>;
    }

    const isExpanded = expandedId === project.id;
    const hasDetails = Boolean(project.details?.trim());

    return (
      <div
        key={project.id}
        className="group bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
      >
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-slate-800 dark:text-slate-200 truncate">
                  {project.title}
                </h4>
                <select
                  value={project.status}
                  onChange={(e) => handleStatusChange(project.id, e.target.value as ProjectStatus)}
                  className={`text-xs px-2 py-0.5 rounded-full border-0 cursor-pointer ${statusColors[project.status]}`}
                  title="Change project status"
                >
                  <option value="idea">Idea</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              {project.description && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 line-clamp-2">
                  {project.description}
                </p>
              )}
              {project.skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {project.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-full"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <div className="flex items-center gap-1">
                  {getSourceIcon(project.source)}
                  <span>{getSourceLabel(project.source)}</span>
                </div>
                {hasDetails && (
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : project.id)}
                    className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronDown className="w-3.5 h-3.5" />
                        Hide details
                      </>
                    ) : (
                      <>
                        <ChevronRight className="w-3.5 h-3.5" />
                        Show details
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => handleStartEdit(project)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                title="Edit"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirmId(project.id)}
                className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-slate-400 hover:text-red-500 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        {/* Expandable Details Section */}
        {isExpanded && hasDetails && (
          <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-700">
            <MarkdownContent content={project.details!} />
          </div>
        )}
      </div>
    );
  };

  const renderStatusSection = (status: ProjectStatus) => {
    const statusProjects = projectsByStatus[status];
    if (statusProjects.length === 0 && status !== 'idea') return null;

    return (
      <div key={status} className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
          <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${statusColors[status]}`}>
            {statusIcons[status]}
            {PROJECT_STATUS_LABELS[status]}
          </span>
          <span className="text-slate-400">({statusProjects.length})</span>
        </div>
        <div className="space-y-2">
          {statusProjects.map(renderProject)}
          {status === 'idea' && statusProjects.length === 0 && !isAdding && (
            <p className="text-sm text-slate-400 italic p-4 text-center">
              No project ideas yet. Add one to get started!
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-slate-500">
            Track career development projects suggested by AI or add your own.
          </p>
        </div>
        {!isAdding && !editingId && (
          <Button size="sm" onClick={handleStartAdd}>
            <Plus className="w-4 h-4 mr-1" />
            Add Project
          </Button>
        )}
      </div>

      {/* Add Form */}
      {isAdding && <div className="mb-4">{renderForm()}</div>}

      {/* Projects List */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {projects.length === 0 && !isAdding ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <Lightbulb className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
              No projects yet
            </h3>
            <p className="text-sm text-slate-500 mb-6 max-w-md">
              Add career development projects to track your learning. The AI can also suggest
              projects based on your job search and skill gaps.
            </p>
            <Button onClick={handleStartAdd}>
              <Plus className="w-4 h-4 mr-1" />
              Add Your First Project
            </Button>
          </div>
        ) : (
          <>
            {renderStatusSection('in_progress')}
            {renderStatusSection('idea')}
            {renderStatusSection('completed')}
          </>
        )}
      </div>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => deleteConfirmId && handleDelete(deleteConfirmId)}
        title="Delete Project"
        message="Are you sure you want to delete this project? This cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
