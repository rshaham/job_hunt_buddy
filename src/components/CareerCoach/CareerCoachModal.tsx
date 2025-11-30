import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Trash2, Sparkles, AlertCircle, Bookmark, RefreshCw, Clock, BarChart3, Copy, Check } from 'lucide-react';
import { Modal, Button, ConfirmModal, ThinkingBubble } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { extractUserSkills, analyzeCareer, chatAboutCareer } from '../../services/ai';
import { isAIConfigured, generateId } from '../../utils/helpers';
import { showToast } from '../../stores/toastStore';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { SavedStory } from '../../types';

// Markdown renderer component with proper styling
function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="text-sm text-slate-700 dark:text-slate-300">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          h1: ({ children }) => (
            <h1 className="text-lg font-bold mt-4 mb-2 text-slate-800 dark:text-slate-200 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-semibold mt-4 mb-2 text-slate-800 dark:text-slate-200 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-semibold mt-3 mb-1.5 text-slate-700 dark:text-slate-300">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-slate-800 dark:text-slate-200">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          code: ({ children }) => (
            <code className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-xs font-mono">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg overflow-x-auto mb-3 text-xs">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary/50 pl-4 italic my-3 text-slate-600 dark:text-slate-400">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-4 border-slate-200 dark:border-slate-700" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
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
    jobs,
    settings,
  } = useAppStore();

  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExtractingSkills, setIsExtractingSkills] = useState(false);
  const [error, setError] = useState('');
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [includeAllJobs, setIncludeAllJobs] = useState(false);
  const [pendingMessageId, setPendingMessageId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
      setError('Please configure your AI provider in Settings');
      return;
    }

    setIsExtractingSkills(true);
    setError('');

    try {
      const profile = await extractUserSkills();
      updateSkillProfile(profile);
      showToast(`Extracted ${profile.skills.length} skills from your profile`, 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract skills');
    } finally {
      setIsExtractingSkills(false);
    }
  };

  const handleAnalyze = async () => {
    if (!hasAIConfigured) {
      setError('Please configure your AI provider in Settings');
      return;
    }

    setIsAnalyzing(true);
    setError('');

    // Add pending assistant message
    const pendingId = generateId();
    setPendingMessageId(pendingId);

    try {
      const analysis = await analyzeCareer(jobs, skillProfile, includeAllJobs);
      addCareerCoachEntry({ role: 'assistant', content: analysis });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze career');
    } finally {
      setIsAnalyzing(false);
      setPendingMessageId(null);
    }
  };

  const handleSend = async () => {
    if (!question.trim()) return;

    if (!hasAIConfigured) {
      setError('Please configure your AI provider in Settings');
      return;
    }

    const userQuestion = question.trim();
    setQuestion('');
    setError('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Add user message
    addCareerCoachEntry({ role: 'user', content: userQuestion });

    // Add pending assistant message
    const pendingId = generateId();
    setPendingMessageId(pendingId);
    setIsLoading(true);

    try {
      const response = await chatAboutCareer(
        jobs,
        skillProfile,
        history,
        userQuestion,
        includeAllJobs
      );
      addCareerCoachEntry({ role: 'assistant', content: response });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
      setPendingMessageId(null);
    }
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

  return (
    <Modal
      isOpen={isCareerCoachModalOpen}
      onClose={closeCareerCoachModal}
      title="Career Coach"
      size="full"
      className="!max-w-[75vw]"
    >
      <div className="flex flex-col h-full p-4">
        {/* Controls */}
        <div className="flex flex-wrap gap-2 mb-3 items-center">
          <Button
            variant="primary"
            size="sm"
            onClick={handleAnalyze}
            disabled={isAnalyzing || !hasAIConfigured}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <BarChart3 className="w-4 h-4 mr-1" />
                Analyze My Career
              </>
            )}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExtractSkills}
            disabled={isExtractingSkills || !hasAIConfigured}
          >
            {isExtractingSkills ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                Extracting...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-1" />
                Re-analyze Skills
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
            Based on <strong className="text-slate-700 dark:text-slate-300">{analyzedJobCount}</strong> jobs
            {jobsWithSummaries < analyzedJobCount && (
              <span className="text-amber-500"> ({jobsWithSummaries} with summaries)</span>
            )}
          </span>
          {skillProfile?.skills?.length ? (
            <>
              <span className="text-slate-400">|</span>
              <span>
                <strong className="text-slate-700 dark:text-slate-300">{skillProfile.skills.length}</strong> skills tracked
              </span>
            </>
          ) : null}
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
        <div className="flex-1 overflow-y-auto space-y-4 mb-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
          {history.length === 0 && !isAnalyzing ? (
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
                        className="w-full text-left text-sm p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-primary/50 hover:bg-primary/5 transition-colors"
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
                    <div className="flex justify-start">
                      <div className="max-w-[85%]">
                        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl rounded-bl-sm border border-slate-200 dark:border-slate-700 shadow-sm">
                          <MarkdownContent content={entry.content} />
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
                  )}
                </div>
              ))}
              {(isAnalyzing || pendingMessageId) && <ThinkingBubble />}
              <div ref={chatEndRef} />
            </>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-danger mb-2 px-1">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
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
            className="w-full pr-14 py-3 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm placeholder:text-slate-400"
            style={{ minHeight: '48px', maxHeight: '120px' }}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={isLoading || !question.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-primary hover:bg-primary/90 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            title="Send message"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
