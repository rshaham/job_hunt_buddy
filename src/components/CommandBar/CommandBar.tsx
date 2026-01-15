import { useEffect, useRef, useState, useCallback } from 'react';
import { useCommandBarStore, type AgentSearchResult } from '../../stores/commandBarStore';
import { useAppStore } from '../../stores/appStore';
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { JobPreviewModal } from '../JobFinder';
import { buildGoogleJobsLink } from '../../services/jobSearch';
import { analyzeJobDescription } from '../../services/ai';

// Custom URL transform that preserves jhb:// protocol (not in ReactMarkdown's default whitelist)
const customUrlTransform = (url: string) => {
  if (url.startsWith('jhb://')) {
    return url;
  }
  return defaultUrlTransform(url);
};

// Suggested commands for quick access
const SUGGESTED_COMMANDS = [
  { icon: '📋', text: 'Get my job search summary', command: 'Give me an overview of my job search' },
  { icon: '📞', text: 'Which companies should I follow up with?', command: 'Which jobs need follow-up?' },
  { icon: '📚', text: 'Show my learning tasks', command: 'Show all my learning tasks' },
  { icon: '📅', text: 'What events are coming up?', command: 'What upcoming events do I have?' },
  { icon: '🧹', text: 'Find stale applications', command: 'Which jobs are stale and need attention?' },
  { icon: '🛠️', text: 'What can you help me with?', command: 'What tools do you have? List all available commands.' },
];

export function CommandBar() {
  const {
    isOpen,
    state,
    inputValue,
    toolCalls,
    error,
    pendingConfirmation,
    chatHistory,
    agentState,
    searchResults,
    close,
    setInput,
    submit,
    confirmAction,
    cancelAction,
    clearHistory,
  } = useCommandBarStore();

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [previewJob, setPreviewJob] = useState<AgentSearchResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Get addJob from app store
  const { addJob } = useAppStore();

  // Handle preview link clicks (jhb://preview/JOBID)
  const handlePreviewLink = useCallback((href: string) => {
    console.log('[CommandBar] Preview link clicked:', href);
    const match = href.match(/^jhb:\/\/preview\/(.+)$/);
    if (match) {
      const jobId = decodeURIComponent(match[1]);
      console.log('[CommandBar] Looking for jobId:', jobId, 'in', searchResults.length, 'results');
      const job = searchResults.find(r => r.jobId === jobId);
      if (job) {
        setPreviewJob(job);
        return true;
      } else {
        console.warn('[CommandBar] No job found with jobId:', jobId);
      }
    } else {
      console.warn('[CommandBar] Unexpected preview link format:', href);
    }
    return false;
  }, [searchResults]);

  // Handle importing a job from the preview modal
  const handleImportJob = useCallback(async () => {
    if (!previewJob) return;

    setIsImporting(true);
    try {
      // Get the default status from settings (matches importSelectedJobs behavior)
      const { settings } = useAppStore.getState();
      const defaultStatus = settings.statuses[0]?.name || 'Interested';

      // Build job link using shared utility
      const jobLink = buildGoogleJobsLink({
        title: previewJob.title,
        company: previewJob.company,
        link: previewJob.link,
        applyLink: previewJob.applyLink,
        jobId: previewJob.jobId,
      });

      // Prepare base job data
      const jobData: Parameters<typeof addJob>[0] = {
        company: previewJob.company,
        title: previewJob.title,
        jdText: previewJob.description,
        jdLink: jobLink,
        status: defaultStatus,
        summary: null,
        resumeAnalysis: null,
        coverLetter: null,
        contacts: [],
        notes: [],
        timeline: [],
        prepMaterials: [],
        qaHistory: [],
        learningTasks: [],
      };

      // Run AI analysis if we have a description (matches importSelectedJobs behavior)
      if (previewJob.description) {
        try {
          console.log('[CommandBar] Analyzing job description...');
          const analysis = await analyzeJobDescription(previewJob.description);
          if (analysis.company) jobData.company = analysis.company;
          if (analysis.title) jobData.title = analysis.title;
          if (analysis.summary) jobData.summary = analysis.summary;
        } catch (error) {
          console.warn('[CommandBar] AI analysis failed, continuing with basic data:', error);
        }
      }

      await addJob(jobData);
      setPreviewJob(null); // Close modal after successful import
    } catch (error) {
      console.error('[CommandBar] Failed to import job:', error);
    } finally {
      setIsImporting(false);
    }
  }, [previewJob, addJob]);

  // Focus input when opened or after response
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, state]);

  // Scroll to bottom when chat history changes or progress updates
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, toolCalls, agentState?.toolProgress]);

  // Auto-resize textarea as content changes
  useEffect(() => {
    if (inputRef.current) {
      const textarea = inputRef.current;
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  }, [inputValue]);

  // Handle Enter/Shift+Enter in textarea
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter without Shift = submit
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (state !== 'processing' && inputValue.trim()) {
        submit();
      }
    }
    // Shift+Enter = allow default behavior (new line)
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }

      // Y/N for confirmation
      if (state === 'confirming') {
        if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault();
          confirmAction();
        } else if (e.key === 'n' || e.key === 'N') {
          e.preventDefault();
          cancelAction();
        }
      }
      // Note: Enter to submit is handled by the textarea's onKeyDown
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, state, inputValue, close, submit, confirmAction, cancelAction]);

  if (!isOpen) return null;

  const hasHistory = chatHistory.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/50 backdrop-blur-sm"
      onClick={() => {
        // Don't close CommandBar if preview modal is open (prevents both closing at once)
        if (!previewJob) close();
      }}
    >
      <div
        className="w-[60vw] min-w-[400px] max-w-[1200px] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with New Chat button */}
        {hasHistory && (
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Chat ({chatHistory.length} messages)
            </span>
            <button
              type="button"
              onClick={clearHistory}
              className="text-xs px-2 py-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
            >
              New Chat
            </button>
          </div>
        )}

        {/* Content Section */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {/* Suggestions (when empty and no history) */}
          {state === 'empty' && !hasHistory && (
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">
                Suggested
              </div>
              {SUGGESTED_COMMANDS.map((suggestion, index) => (
                <button
                  type="button"
                  key={index}
                  onClick={() => {
                    setInput(suggestion.command);
                    inputRef.current?.focus();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <span>{suggestion.icon}</span>
                  <span>{suggestion.text}</span>
                </button>
              ))}
            </div>
          )}

          {/* Chat History */}
          {hasHistory && (
            <div className="p-4 space-y-4">
              {chatHistory.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-lg px-4 py-2 ${
                      msg.role === 'user'
                        ? 'bg-indigo-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <p>{msg.content}</p>
                    ) : (
                      <div className="prose prose-sm dark:prose-invert max-w-none prose-table:border-collapse prose-th:border prose-th:border-gray-300 prose-th:dark:border-gray-600 prose-th:px-3 prose-th:py-2 prose-th:bg-gray-200 prose-th:dark:bg-gray-600 prose-td:border prose-td:border-gray-300 prose-td:dark:border-gray-600 prose-td:px-3 prose-td:py-2">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          urlTransform={customUrlTransform}
                          components={{
                            a: ({ href, children }) => {
                              // Handle custom jhb:// protocol links
                              if (href?.startsWith('jhb://')) {
                                return (
                                  <button
                                    type="button"
                                    onClick={() => handlePreviewLink(href)}
                                    className="text-indigo-600 dark:text-indigo-400 underline hover:text-indigo-800 dark:hover:text-indigo-300 cursor-pointer"
                                  >
                                    {children}
                                  </button>
                                );
                              }
                              // Regular external links
                              return (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-600 dark:text-indigo-400 underline hover:text-indigo-800 dark:hover:text-indigo-300"
                                >
                                  {children}
                                </a>
                              );
                            },
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tool Execution Log (during processing) */}
          {(state === 'processing' || state === 'confirming') && toolCalls.length > 0 && (
            <div className="px-4 pb-4 space-y-2">
              {/* Group tool calls by name and show count */}
              {(() => {
                const grouped = toolCalls.reduce((acc, tool) => {
                  if (!acc[tool.name]) {
                    acc[tool.name] = { count: 0, statuses: [] as string[] };
                  }
                  acc[tool.name].count++;
                  acc[tool.name].statuses.push(tool.status);
                  return acc;
                }, {} as Record<string, { count: number; statuses: string[] }>);

                return Object.entries(grouped).map(([name, { count, statuses }]) => {
                  const hasExecuting = statuses.includes('executing');
                  const allComplete = statuses.every(s => s === 'complete');
                  const hasError = statuses.includes('error');
                  const hasDeclined = statuses.includes('declined');

                  return (
                    <div
                      key={name}
                      className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"
                    >
                      {hasExecuting && (
                        <svg className="animate-spin h-4 w-4 text-indigo-500" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      )}
                      {!hasExecuting && allComplete && (
                        <span className="text-green-500">✓</span>
                      )}
                      {!hasExecuting && hasError && (
                        <span className="text-red-500">✗</span>
                      )}
                      {!hasExecuting && !allComplete && !hasError && hasDeclined && (
                        <span className="text-yellow-500">○</span>
                      )}
                      {!hasExecuting && !allComplete && !hasError && !hasDeclined && (
                        <span className="text-gray-400">○</span>
                      )}
                      <span className="font-mono">
                        {name.replace(/_/g, ' ')}
                        {count > 1 && (
                          <span className="ml-1 text-xs text-gray-400">(×{count})</span>
                        )}
                      </span>
                    </div>
                  );
                });
              })()}

              {/* Progress message from current tool */}
              {agentState?.toolProgress && (
                <div className="text-sm text-gray-500 dark:text-gray-400 italic pl-6 mt-1">
                  {agentState.toolProgress}
                </div>
              )}
            </div>
          )}

          {/* Confirmation Prompt */}
          {state === 'confirming' && pendingConfirmation && (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-3">
                <span className="text-amber-500 text-xl">⚠️</span>
                <div className="flex-1">
                  <div className="font-medium text-amber-800 dark:text-amber-200 mb-1">
                    Confirm: {pendingConfirmation.toolName.replace(/_/g, ' ')}
                  </div>
                  <div className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                    {pendingConfirmation.description}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={cancelAction}
                      className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                    >
                      Cancel <kbd className="ml-1 opacity-60">N</kbd>
                    </button>
                    <button
                      type="button"
                      onClick={confirmAction}
                      className="px-3 py-1.5 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                    >
                      Confirm <kbd className="ml-1 opacity-60">Y</kbd>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {state === 'error' && error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20">
              <div className="flex items-start gap-3">
                <span className="text-red-500 text-xl">❌</span>
                <div>
                  <div className="font-medium text-red-800 dark:text-red-200 mb-1">
                    Error
                  </div>
                  <div className="text-sm text-red-700 dark:text-red-300">
                    {error}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Section */}
        <div className="flex items-center px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <span className="text-gray-400 mr-3">
            {state === 'processing' ? (
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <span className="text-xl">⌘</span>
            )}
          </span>
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder={hasHistory ? "Continue the conversation..." : "Type a command..."}
            disabled={state === 'processing' || state === 'confirming'}
            rows={1}
            className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 outline-none text-lg resize-none overflow-hidden"
            style={{ minHeight: '28px', maxHeight: '200px' }}
          />
          <kbd className="hidden sm:inline-block px-2 py-1 text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 rounded">
            Esc
          </kbd>
        </div>
      </div>

      {/* Job Preview Modal */}
      <JobPreviewModal
        isOpen={!!previewJob}
        onClose={() => setPreviewJob(null)}
        job={previewJob}
        onImport={handleImportJob}
        isImporting={isImporting}
      />
    </div>
  );
}
