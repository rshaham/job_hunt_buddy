import { useState, useRef, useEffect } from 'react';
import { Send, Trash2, Sparkles, AlertCircle, Bookmark, RefreshCw, Clock, BarChart3, Copy, Check, X, Plus, FileText, StickyNote, Paperclip, Hand, ChevronDown, ChevronRight } from 'lucide-react';
import { Modal, Button, ConfirmModal, ThinkingBubble, MarkdownContent, AILoadingIndicator } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { extractUserSkills, analyzeCareer, chatAboutCareer } from '../../services/ai';
import { isAIConfigured, generateId } from '../../utils/helpers';
import { showToast } from '../../stores/toastStore';
import { useAIOperation } from '../../hooks/useAIOperation';
import type { UserSkillProfile } from '../../types';
import { format, formatDistanceToNow } from 'date-fns';
import type { SavedStory, SkillCategory, SkillEntry } from '../../types';
import { ProjectsTab } from './ProjectsTab';
import { Lightbulb } from 'lucide-react';

// Parse project suggestions from AI response (```project {...}```)
interface ParsedProjectSuggestion {
  title: string;
  description: string;
  details?: string;
  skills: string[];
}

function parseProjectSuggestions(content: string): { cleanContent: string; projects: ParsedProjectSuggestion[] } {
  const projectRegex = /```project\s*\n?([\s\S]*?)```/g;
  const projects: ParsedProjectSuggestion[] = [];

  const cleanContent = content.replace(projectRegex, (_, jsonStr) => {
    try {
      const parsed = JSON.parse(jsonStr.trim());
      if (parsed.title && parsed.description && Array.isArray(parsed.skills)) {
        projects.push({
          title: parsed.title,
          description: parsed.description,
          details: parsed.details,
          skills: parsed.skills,
        });
      }
    } catch {
      // If JSON parsing fails, leave the content as is
      return `\`\`\`project\n${jsonStr}\`\`\``;
    }
    return ''; // Remove the parsed project block from content
  });

  return { cleanContent: cleanContent.trim(), projects };
}

export function CareerCoachModal() {
  const {
    isCareerCoachModalOpen,
    closeCareerCoachModal,
    careerCoachState,
    addCareerCoachEntry,
    clearCareerCoachHistory,
    updateSkillProfile,
    updateSettings,
    addSkill,
    removeSkill,
    addCareerProject,
    jobs,
    settings,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'coach' | 'skills' | 'projects'>('coach');
  const [question, setQuestion] = useState('');
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  // AI operation hooks
  const chatOp = useAIOperation<string>('career-chat');
  const analyzeOp = useAIOperation<string>('career-analyze');
  const extractSkillsOp = useAIOperation<UserSkillProfile>('extract-skills');
  const [isReanalyzeModalOpen, setIsReanalyzeModalOpen] = useState(false);
  const [includeAllJobs, setIncludeAllJobs] = useState(false);
  const [pendingMessageId, setPendingMessageId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [addedProjectTitles, setAddedProjectTitles] = useState<Set<string>>(new Set());

  // Skills tab state
  const [expandedCategories, setExpandedCategories] = useState<Record<SkillCategory, boolean>>({
    technical: true,
    soft: true,
    domain: true,
  });
  const [addingToCategory, setAddingToCategory] = useState<SkillCategory | null>(null);
  const [newSkillInput, setNewSkillInput] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasAIConfigured = isAIConfigured(settings);
  const { history, skillProfile } = careerCoachState;

  // Count jobs in selected time window
  const sixMonthsAgo = Date.now() - (6 * 30 * 24 * 60 * 60 * 1000);
  const recentJobCount = jobs.filter(j => new Date(j.dateAdded).getTime() > sixMonthsAgo).length;
  const totalJobCount = jobs.length;
  const analyzedJobCount = includeAllJobs ? totalJobCount : recentJobCount;

  // Jobs with summaries for accurate analysis count
  const jobsWithSummaries = jobs.filter(j => j.summary).length;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  };

  const handleExtractSkills = async () => {
    if (!hasAIConfigured) {
      return;
    }

    // Pass existing skills for merge behavior
    const existingSkills = skillProfile?.skills || [];
    const profile = await extractSkillsOp.execute(async () => {
      return await extractUserSkills(existingSkills);
    });

    if (profile) {
      updateSkillProfile(profile);
      const newCount = profile.skills.length - existingSkills.filter(s => s.source === 'manual').length;
      showToast(`Found ${newCount} skills (${profile.skills.length} total)`, 'success');
    }
    setIsReanalyzeModalOpen(false);
  };

  // Skills tab handlers
  const handleAddSkill = (category: SkillCategory) => {
    if (!newSkillInput.trim()) return;

    // Check for duplicate
    const isDuplicate = skillProfile?.skills?.some(
      s => s.skill.toLowerCase() === newSkillInput.trim().toLowerCase()
    );

    if (isDuplicate) {
      showToast('This skill already exists', 'error');
      return;
    }

    addSkill(newSkillInput.trim(), category);
    setNewSkillInput('');
    setAddingToCategory(null);
    showToast('Skill added', 'success');
  };

  const handleRemoveSkill = (skillName: string) => {
    removeSkill(skillName);
    showToast('Skill removed', 'success');
  };

  const toggleCategory = (category: SkillCategory) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  // Get skills by category
  const getSkillsByCategory = (category: SkillCategory): SkillEntry[] => {
    return (skillProfile?.skills || []).filter(s => s.category === category);
  };

  // Get source icon for skill chip
  const getSourceIcon = (source: string) => {
    if (source === 'resume') return <FileText className="w-3 h-3" />;
    if (source === 'additionalContext') return <StickyNote className="w-3 h-3" />;
    if (source.startsWith('contextDoc:')) return <Paperclip className="w-3 h-3" />;
    return <Hand className="w-3 h-3" />; // manual
  };

  const getSourceLabel = (source: string) => {
    if (source === 'resume') return 'From Resume';
    if (source === 'additionalContext') return 'From Additional Context';
    if (source.startsWith('contextDoc:')) return `From ${source.replace('contextDoc:', '')}`;
    return 'Manually Added';
  };

  const handleAnalyze = async () => {
    if (!hasAIConfigured) {
      return;
    }

    // Add pending assistant message
    const pendingId = generateId();
    setPendingMessageId(pendingId);

    const analysis = await analyzeOp.execute(async () => {
      return await analyzeCareer(jobs, skillProfile, includeAllJobs);
    });

    if (analysis) {
      addCareerCoachEntry({ role: 'assistant', content: analysis });
    }
    setPendingMessageId(null);
  };

  const handleSend = async () => {
    if (!question.trim()) return;

    if (!hasAIConfigured) {
      return;
    }

    const userQuestion = question.trim();
    setQuestion('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Add user message
    addCareerCoachEntry({ role: 'user', content: userQuestion });

    // Add pending assistant message
    const pendingId = generateId();
    setPendingMessageId(pendingId);

    const response = await chatOp.execute(async () => {
      return await chatAboutCareer(
        jobs,
        skillProfile,
        history,
        userQuestion,
        includeAllJobs
      );
    });

    if (response) {
      addCareerCoachEntry({ role: 'assistant', content: response });
    }
    setPendingMessageId(null);
  };

  const handleClearHistory = () => {
    clearCareerCoachHistory();
    setIsClearModalOpen(false);
    showToast('Career coach history cleared', 'success');
  };

  const handleCopyToClipboard = async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      showToast('Copied to clipboard', 'success');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      showToast('Failed to copy', 'error');
    }
  };

  const handleSaveToMemory = async (content: string) => {
    try {
      const newStory: SavedStory = {
        id: generateId(),
        question: 'Career Coach Insight',
        answer: content.slice(0, 2000), // Limit to 2000 chars
        category: 'career-coach',
        createdAt: new Date(),
      };
      await updateSettings({
        savedStories: [...(settings.savedStories || []), newStory],
      });
      showToast('Saved to profile', 'success');
    } catch {
      showToast('Failed to save', 'error');
    }
  };

  const handleAddSuggestedProject = async (project: ParsedProjectSuggestion) => {
    try {
      await addCareerProject({
        title: project.title,
        description: project.description,
        details: project.details,
        skills: project.skills,
        status: 'idea',
        source: { type: 'career_coach' },
      });
      setAddedProjectTitles(prev => new Set(prev).add(project.title));
      showToast('Project added', 'success');
    } catch {
      showToast('Failed to add project', 'error');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedQuestions = [
    'What skills should I focus on developing?',
    'What side projects would help my job search?',
    'Am I targeting the right level of roles?',
    'What patterns do you see in my applications?',
    'What can I do this weekend to improve my chances?',
  ];

  // Category labels for display
  const categoryLabels: Record<SkillCategory, string> = {
    technical: 'Technical',
    soft: 'Soft Skills',
    domain: 'Domain',
  };

  // Render a skill category section
  const renderSkillCategory = (category: SkillCategory) => {
    const skills = getSkillsByCategory(category);
    const isExpanded = expandedCategories[category];

    return (
      <div key={category} className="border border-border rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => toggleCategory(category)}
          className="w-full flex items-center justify-between p-3 bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
            <span className="font-medium text-foreground">
              {categoryLabels[category]}
            </span>
            <span className="text-xs text-slate-400">({skills.length})</span>
          </div>
        </button>

        {isExpanded && (
          <div className="p-3 space-y-3">
            {/* Skill chips */}
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <div
                  key={skill.skill}
                  className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm transition-colors ${
                    skill.source === 'manual'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  }`}
                  title={getSourceLabel(skill.source)}
                >
                  <span className="opacity-60">{getSourceIcon(skill.source)}</span>
                  <span>{skill.skill}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill.skill)}
                    className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"
                    title={`Remove ${skill.skill}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {skills.length === 0 && (
                <p className="text-sm text-slate-400 italic">No {categoryLabels[category].toLowerCase()} skills</p>
              )}
            </div>

            {/* Add skill input */}
            {addingToCategory === category ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newSkillInput}
                  onChange={(e) => setNewSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSkill(category);
                    } else if (e.key === 'Escape') {
                      setAddingToCategory(null);
                      setNewSkillInput('');
                    }
                  }}
                  placeholder={`Add ${categoryLabels[category].toLowerCase()} skill...`}
                  className="flex-1 px-3 py-1.5 text-sm border border-border-muted rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
                  autoFocus
                />
                <Button size="sm" onClick={() => handleAddSkill(category)}>
                  <Plus className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setAddingToCategory(null);
                    setNewSkillInput('');
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingToCategory(category)}
                className="flex items-center gap-1 text-sm text-slate-500 hover:text-primary transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add skill
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Modal
      isOpen={isCareerCoachModalOpen}
      onClose={closeCareerCoachModal}
      title="Career Coach"
      size="full"
      className="!max-w-[75vw]"
    >
      <div className="flex flex-col h-full">
        {/* Tab Navigation */}
        <div className="flex border-b border-border px-4">
          <button
            type="button"
            onClick={() => setActiveTab('coach')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'coach'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Coach
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('skills')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'skills'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Skills {skillProfile?.skills?.length ? `(${skillProfile.skills.length})` : ''}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('projects')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'projects'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Projects {settings.careerProjects?.length ? `(${settings.careerProjects.length})` : ''}
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'coach' ? (
          /* Coach Tab */
          <div className="flex flex-col flex-1 p-4 overflow-hidden">
            {/* Controls */}
            <div className="flex flex-wrap gap-2 mb-3 items-center">
              <Button
                variant="primary"
                size="sm"
                onClick={handleAnalyze}
                disabled={analyzeOp.isLoading || !hasAIConfigured}
              >
                {analyzeOp.isLoading ? (
                  <AILoadingIndicator isLoading label="Analyzing..." />
                ) : (
                  <>
                    <BarChart3 className="w-4 h-4 mr-1" />
                    Analyze My Career
                  </>
                )}
              </Button>
              {history.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setIsClearModalOpen(true)}>
                  <Trash2 className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>

            {/* Time filter and stats */}
            <div className="flex flex-wrap items-center gap-3 mb-3 text-xs text-slate-500">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeAllJobs}
                  onChange={(e) => setIncludeAllJobs(e.target.checked)}
                  className="rounded border-slate-300 text-primary focus:ring-primary"
                />
                <Clock className="w-3.5 h-3.5" />
                Include all jobs (not just last 6 months)
              </label>
              <span className="text-slate-400">|</span>
              <span>
                Based on <strong className="text-foreground">{analyzedJobCount}</strong> jobs
                {jobsWithSummaries < analyzedJobCount && (
                  <span className="text-amber-500"> ({jobsWithSummaries} with summaries)</span>
                )}
              </span>
            </div>

            <ConfirmModal
              isOpen={isClearModalOpen}
              onClose={() => setIsClearModalOpen(false)}
              onConfirm={handleClearHistory}
              title="Clear Career Coach History"
              message="Clear all career coach history? This cannot be undone."
              confirmText="Clear"
              variant="warning"
            />

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-3 p-3 bg-surface rounded-xl">
              {history.length === 0 && !analyzeOp.isLoading ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <Sparkles className="w-8 h-8 text-primary/50 mb-3" />
                  <p className="text-sm text-slate-500 mb-4">
                    Get personalized career insights based on your job applications.
                  </p>
                  {jobs.length === 0 ? (
                    <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
                      Add some jobs to your board first to get career coaching insights.
                    </p>
                  ) : (
                    <>
                      <Button variant="primary" size="sm" onClick={handleAnalyze} disabled={!hasAIConfigured}>
                        <BarChart3 className="w-4 h-4 mr-1" />
                        Start Career Analysis
                      </Button>
                      <div className="mt-6 space-y-2 w-full max-w-md">
                        <p className="text-xs text-slate-400 uppercase tracking-wide">Or ask a question:</p>
                        {suggestedQuestions.slice(0, 3).map((q, i) => (
                          <button
                            type="button"
                            key={i}
                            onClick={() => setQuestion(q)}
                            className="w-full text-left text-sm p-3 bg-surface rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <>
                  {history.map((entry) => (
                    <div key={entry.id} className="space-y-3">
                      {entry.role === 'user' ? (
                        <div className="flex justify-end">
                          <div className="max-w-[85%]">
                            <div className="p-3 bg-primary text-white rounded-2xl rounded-br-sm">
                              <p className="text-sm">{entry.content}</p>
                            </div>
                            <p className="text-xs text-slate-400 mt-1 text-right">
                              {format(new Date(entry.timestamp), 'h:mm a')}
                            </p>
                          </div>
                        </div>
                      ) : (
                        (() => {
                          const { cleanContent, projects } = parseProjectSuggestions(entry.content);
                          return (
                            <div className="flex justify-start">
                              <div className="max-w-[85%]">
                                <div className="p-4 bg-surface rounded-2xl rounded-bl-sm border border-border shadow-sm">
                                  <MarkdownContent content={cleanContent} />
                                  {/* Project Suggestions */}
                                  {projects.length > 0 && (
                                    <div className="mt-4 space-y-2">
                                      {projects.map((project, idx) => {
                                        const isAdded = addedProjectTitles.has(project.title) ||
                                          settings.careerProjects?.some(p => p.title === project.title);
                                        return (
                                          <div
                                            key={idx}
                                            className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg"
                                          >
                                            <div className="flex items-start justify-between gap-2">
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                  <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                                  <span className="font-medium text-sm text-foreground">
                                                    {project.title}
                                                  </span>
                                                </div>
                                                <p className="text-xs text-foreground-muted mb-2">
                                                  {project.description}
                                                </p>
                                                <div className="flex flex-wrap gap-1">
                                                  {project.skills.map(skill => (
                                                    <span
                                                      key={skill}
                                                      className="px-1.5 py-0.5 text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded"
                                                    >
                                                      {skill}
                                                    </span>
                                                  ))}
                                                </div>
                                              </div>
                                              <Button
                                                size="sm"
                                                variant={isAdded ? 'ghost' : 'secondary'}
                                                onClick={() => handleAddSuggestedProject(project)}
                                                disabled={isAdded}
                                                className="shrink-0"
                                              >
                                                {isAdded ? (
                                                  <>
                                                    <Check className="w-3.5 h-3.5 mr-1" />
                                                    Added
                                                  </>
                                                ) : (
                                                  <>
                                                    <Plus className="w-3.5 h-3.5 mr-1" />
                                                    Add
                                                  </>
                                                )}
                                              </Button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 mt-1.5 ml-1">
                                  <button
                                    type="button"
                                    onClick={() => handleCopyToClipboard(entry.id, entry.content)}
                                    className="text-xs text-slate-400 hover:text-primary flex items-center gap-1 transition-colors"
                                  >
                                    {copiedId === entry.id ? (
                                      <>
                                        <Check className="w-3 h-3 text-green-500" />
                                        <span className="text-green-500">Copied</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3" />
                                        Copy
                                      </>
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveToMemory(entry.content)}
                                    className="text-xs text-slate-400 hover:text-primary flex items-center gap-1 transition-colors"
                                  >
                                    <Bookmark className="w-3 h-3" />
                                    Save to Profile
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })()
                      )}
                    </div>
                  ))}
                  {(analyzeOp.isLoading || pendingMessageId) && <ThinkingBubble />}
                  <div ref={chatEndRef} />
                </>
              )}
            </div>

            {(chatOp.error || analyzeOp.error) && (
              <div className="flex items-center gap-2 text-sm text-danger mb-2 px-1">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{chatOp.error || analyzeOp.error}</span>
              </div>
            )}

            {/* Chat Input */}
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={question}
                onChange={(e) => {
                  setQuestion(e.target.value);
                  adjustTextareaHeight();
                }}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your career, skill gaps, or what to focus on..."
                rows={1}
                className="w-full pr-14 py-3 px-4 bg-surface border border-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm placeholder:text-slate-400"
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={chatOp.isLoading || !question.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-primary hover:bg-primary/90 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                title="Send message"
              >
                {chatOp.isLoading ? (
                  <AILoadingIndicator isLoading />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        ) : activeTab === 'skills' ? (
          /* Skills Tab */
          <div className="flex flex-col flex-1 p-4 overflow-hidden">
            {/* Skills Controls */}
            <div className="flex flex-wrap gap-2 mb-4 items-center justify-between">
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsReanalyzeModalOpen(true)}
                  disabled={extractSkillsOp.isLoading || !hasAIConfigured}
                >
                  {extractSkillsOp.isLoading ? (
                    <AILoadingIndicator isLoading label="Extracting..." />
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Re-analyze Skills
                    </>
                  )}
                </Button>
              </div>
              {skillProfile?.lastExtractedAt && (
                <span className="text-xs text-slate-400">
                  Last analyzed: {formatDistanceToNow(new Date(skillProfile.lastExtractedAt), { addSuffix: true })}
                </span>
              )}
            </div>

            {/* Re-analyze Confirmation Modal */}
            <ConfirmModal
              isOpen={isReanalyzeModalOpen}
              onClose={() => setIsReanalyzeModalOpen(false)}
              onConfirm={handleExtractSkills}
              title="Re-analyze Skills?"
              message="This will extract skills from your resume and context documents. New skills will be merged with your existing manually-added ones."
              confirmText="Re-analyze"
              variant="default"
            />

            {/* Skills Content */}
            <div className="flex-1 overflow-y-auto space-y-3">
              {!skillProfile?.skills?.length ? (
                /* Empty State */
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    No skills tracked yet
                  </h3>
                  <p className="text-sm text-slate-500 mb-6 max-w-md">
                    Click "Re-analyze" to extract skills from your resume and context documents, or add them manually.
                  </p>
                  <div className="flex gap-3">
                    <Button
                      variant="primary"
                      onClick={() => setIsReanalyzeModalOpen(true)}
                      disabled={!hasAIConfigured}
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Re-analyze Skills
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setAddingToCategory('technical')}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Manually
                    </Button>
                  </div>
                </div>
              ) : (
                /* Skills by Category */
                <>
                  {(['technical', 'soft', 'domain'] as SkillCategory[]).map(renderSkillCategory)}
                </>
              )}
            </div>

            {extractSkillsOp.error && (
              <div className="flex items-center gap-2 text-sm text-danger mt-2 px-1">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{extractSkillsOp.error}</span>
              </div>
            )}
          </div>
        ) : activeTab === 'projects' ? (
          /* Projects Tab */
          <ProjectsTab />
        ) : null}
      </div>
    </Modal>
  );
}
