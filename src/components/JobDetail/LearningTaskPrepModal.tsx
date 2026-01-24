import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, X, Sparkles, AlertCircle, Bookmark, Globe, FileText, ChevronDown, RotateCcw } from 'lucide-react';
import { Button, Modal, ThinkingBubble } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { useAIOperation } from '../../hooks/useAIOperation';
import {
  detectLearningTaskCategory,
  chatAboutLearningTask,
  summarizePrepSession,
} from '../../services/ai';
import { searchInterviewPrepBestPractices, formatSearchResultsForAI } from '../../services/webSearch';
import { isAIConfigured } from '../../utils/helpers';
import { showToast } from '../../stores/toastStore';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Job, LearningTask, LearningTaskCategory, LearningTaskPrepMessage } from '../../types';
import { LEARNING_TASK_CATEGORY_LABELS } from '../../types';

interface LearningTaskPrepModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job;
  task: LearningTask;
}

// Markdown renderer component
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
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 underline"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// Category badge colors
const categoryColors: Record<LearningTaskCategory, string> = {
  behavioral_interview: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  technical_deep_dive: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  system_design: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  cross_functional: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  leadership: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  problem_solving: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  communication: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  general: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
};

export function LearningTaskPrepModal({ isOpen, onClose, job, task }: LearningTaskPrepModalProps) {
  const { settings, startPrepSession, addPrepMessage, savePrepToMaterials, updateLearningTask } = useAppStore();

  // AI operation hooks
  const detectOp = useAIOperation<{ category: LearningTaskCategory }>('category-detection');
  const chatOp = useAIOperation<string>('chat');
  const saveOp = useAIOperation<void>('save-to-prep');
  const searchOp = useAIOperation<string>('web-search');

  // State
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<LearningTaskCategory>(task.inferredCategory || 'general');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<LearningTaskPrepMessage[]>([]);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [customInstructions, setCustomInstructions] = useState(task.customInstructions || '');
  const [showOptions, setShowOptions] = useState(false);
  const [webBestPractices, setWebBestPractices] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasAIConfigured = isAIConfigured(settings);
  const hasWebSearchConsent = settings.externalServicesConsent?.webResearch;

  // Get the most recent prep session for this task
  const existingSession = task.prepSessions?.length
    ? task.prepSessions[task.prepSessions.length - 1]
    : null;

  // Initialize from existing session
  useEffect(() => {
    if (isOpen && existingSession) {
      setSessionId(existingSession.id);
      setMessages(existingSession.messages);
      setCategory(existingSession.category);
      if (existingSession.webSourcesUsed?.length) {
        setWebBestPractices(existingSession.webSourcesUsed.join('\n'));
      }
    } else if (isOpen && !existingSession) {
      setSessionId(null);
      setMessages([]);
      setCategory(task.inferredCategory || 'general');
    }
  }, [isOpen, existingSession, task.inferredCategory]);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  };

  // Detect category
  const handleDetectCategory = async () => {
    if (!hasAIConfigured) {
      showToast('Please configure your AI provider in Settings', 'error');
      return;
    }

    const result = await detectOp.execute(async () => {
      return await detectLearningTaskCategory(task, job);
    });
    if (result) {
      setCategory(result.category);
      showToast(`Category detected: ${LEARNING_TASK_CATEGORY_LABELS[result.category]}`, 'success');
    }
  };

  // Search for best practices
  const handleSearchBestPractices = async () => {
    if (!hasWebSearchConsent) {
      showToast('Web research requires consent in Settings', 'error');
      return;
    }

    const result = await searchOp.execute(async () => {
      const results = await searchInterviewPrepBestPractices(task.skill, category, job.company);
      return formatSearchResultsForAI(results);
    });
    if (result) {
      setWebBestPractices(result);
      showToast('Best practices loaded', 'success');
    } else if (searchOp.error) {
      showToast('Failed to search best practices', 'error');
    }
  };

  // Send message
  const handleSend = async () => {
    if (!message.trim()) return;

    if (!hasAIConfigured) {
      showToast('Please configure your AI provider in Settings', 'error');
      return;
    }

    const userMessage = message.trim();
    setMessage('');
    chatOp.reset();

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Create or use existing session
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      try {
        currentSessionId = await startPrepSession(job.id, task.id, category);
        setSessionId(currentSessionId);
      } catch {
        showToast('Failed to start prep session', 'error');
        return;
      }
    }

    // Add user message optimistically
    const userEntry: LearningTaskPrepMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userEntry]);

    // Show thinking state
    const thinkingEntry: LearningTaskPrepMessage = {
      id: `thinking-${Date.now()}`,
      role: 'assistant',
      content: '__THINKING__',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, thinkingEntry]);

    const response = await chatOp.execute(async () => {
      // Get web best practices if enabled but not yet fetched
      let webContext = webBestPractices;
      if (webSearchEnabled && !webContext && hasWebSearchConsent) {
        try {
          const results = await searchInterviewPrepBestPractices(task.skill, category, job.company);
          webContext = formatSearchResultsForAI(results);
          setWebBestPractices(webContext);
        } catch {
          // Continue without web results
        }
      }

      return await chatAboutLearningTask(
        task,
        job,
        category,
        messages.filter((m) => m.content !== '__THINKING__'),
        userMessage,
        {
          webBestPractices: webContext || undefined,
          customInstructions: customInstructions || undefined,
        }
      );
    });

    if (response) {
      // Replace thinking with actual response
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.content !== '__THINKING__');
        const assistantEntry: LearningTaskPrepMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response,
          timestamp: new Date(),
        };
        return [...filtered, assistantEntry];
      });

      // Save messages to store
      await addPrepMessage(job.id, task.id, currentSessionId, {
        role: 'user',
        content: userMessage,
      });
      await addPrepMessage(job.id, task.id, currentSessionId, {
        role: 'assistant',
        content: response,
      });
    } else {
      // Remove thinking entry on error
      setMessages((prev) => prev.filter((m) => m.content !== '__THINKING__'));
    }
  };

  // Save to prep materials
  const handleSaveToPrep = async () => {
    if (!sessionId || messages.length === 0) return;

    await saveOp.execute(async () => {
      const summary = await summarizePrepSession(task, category, messages);
      await savePrepToMaterials(
        job.id,
        task.id,
        sessionId,
        summary.question,
        summary.answer
      );
      showToast('Saved to Prep Materials', 'success');
    });
    if (saveOp.error) {
      showToast('Failed to save to prep materials', 'error');
    }
  };

  // Start a new session
  const handleNewSession = () => {
    setSessionId(null);
    setMessages([]);
    setWebBestPractices(null);
    detectOp.reset();
    chatOp.reset();
    saveOp.reset();
    searchOp.reset();
  };

  // Save custom instructions
  const handleSaveCustomInstructions = async () => {
    try {
      await updateLearningTask(job.id, task.id, { customInstructions });
      showToast('Custom instructions saved', 'success');
    } catch {
      showToast('Failed to save instructions', 'error');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedStarters = [
    "I'm ready to practice - let's start!",
    "What experiences from my background might be relevant?",
    "Can you suggest a structure for my answer?",
    "What follow-up questions might I get?",
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-primary" />
          <div>
            <div className="font-semibold">Prep: {task.skill}</div>
            <div className="text-sm font-normal text-slate-500">{task.description}</div>
          </div>
        </div>
      }
      size="full"
    >
      <div className="flex flex-col h-full p-4">
        {/* Header with category and options */}
        <div className="flex items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            {/* Category badge */}
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${categoryColors[category]}`}>
              {LEARNING_TASK_CATEGORY_LABELS[category]}
            </span>
            <button
              type="button"
              onClick={handleDetectCategory}
              disabled={detectOp.isLoading}
              className="text-xs text-slate-500 hover:text-primary transition-colors"
            >
              {detectOp.isLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                'Re-detect'
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* New session button */}
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleNewSession}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                New Session
              </button>
            )}

            {/* Web search toggle */}
            {hasWebSearchConsent && (
              <button
                type="button"
                onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors ${
                  webSearchEnabled
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                Web Tips
              </button>
            )}

            {/* Options toggle */}
            <button
              type="button"
              onClick={() => setShowOptions(!showOptions)}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              Options
              <ChevronDown className={`w-3 h-3 transition-transform ${showOptions ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Options panel */}
        {showOptions && (
          <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Custom Instructions (optional)
                </label>
                <textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="Add any specific context or preferences for the AI coach..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
                <div className="flex justify-end mt-1.5">
                  <button
                    type="button"
                    onClick={handleSaveCustomInstructions}
                    className="text-xs text-primary hover:text-primary/80"
                  >
                    Save for this task
                  </button>
                </div>
              </div>

              {hasWebSearchConsent && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    {webBestPractices ? 'Web tips loaded' : 'Fetch interview tips from the web'}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleSearchBestPractices}
                    disabled={searchOp.isLoading}
                  >
                    {searchOp.isLoading ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Globe className="w-3 h-3 mr-1" />
                        {webBestPractices ? 'Refresh' : 'Search'}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4">
              <p className="text-sm text-slate-500 mb-4">
                Start a prep session for <strong>{task.skill}</strong>. The AI coach will help you
                prepare using the {LEARNING_TASK_CATEGORY_LABELS[category].toLowerCase()} approach.
              </p>
              <div className="space-y-2 w-full max-w-md">
                <p className="text-xs text-slate-400 uppercase tracking-wide">Get started:</p>
                {suggestedStarters.map((starter, i) => (
                  <button
                    type="button"
                    key={i}
                    onClick={() => setMessage(starter)}
                    className="w-full text-left text-sm p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-primary/50 hover:bg-primary/5 transition-colors"
                  >
                    {starter}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((entry) => (
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
                  ) : entry.content === '__THINKING__' ? (
                    <ThinkingBubble />
                  ) : (
                    <div className="flex justify-start">
                      <div className="max-w-[85%]">
                        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl rounded-bl-sm border border-slate-200 dark:border-slate-700 shadow-sm">
                          <MarkdownContent content={entry.content} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />
            </>
          )}
        </div>

        {(detectOp.error || chatOp.error || saveOp.error || searchOp.error) && (
          <div className="flex items-center gap-2 text-sm text-danger mb-2 px-1">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{detectOp.error || chatOp.error || saveOp.error || searchOp.error}</span>
          </div>
        )}

        {/* Chat Input */}
        <div className="relative mb-4">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              adjustTextareaHeight();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Share your experience, ask for feedback, or request practice questions..."
            rows={1}
            className="w-full pr-14 py-3 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm placeholder:text-slate-400 min-h-[48px] max-h-[120px]"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={chatOp.isLoading || !message.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-primary hover:bg-primary/90 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            title="Send message"
          >
            {chatOp.isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="text-xs text-slate-500">
            {messages.length > 0 && (
              <span>{messages.filter((m) => m.role === 'user').length} messages in session</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>
              <X className="w-4 h-4 mr-1" />
              Close
            </Button>

            {messages.length >= 2 && (
              <Button
                variant="secondary"
                onClick={handleSaveToPrep}
                disabled={saveOp.isLoading}
              >
                {saveOp.isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Bookmark className="w-4 h-4 mr-1" />
                    Save to Prep
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
