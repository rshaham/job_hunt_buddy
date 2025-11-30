import { useEffect, useRef } from 'react';
import { useCommandBarStore } from '../../stores/commandBarStore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Suggested commands for quick access
const SUGGESTED_COMMANDS = [
  { icon: '🔍', text: 'Show all jobs in Interviewing status', command: 'Show me all jobs that are in Interviewing status' },
  { icon: '📊', text: 'Get application statistics', command: 'How many jobs have I applied to? Show me the stats.' },
  { icon: '📝', text: 'Add a note to a job', command: 'Add a note to ' },
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
    close,
    setInput,
    submit,
    confirmAction,
    cancelAction,
    clearHistory,
  } = useCommandBarStore();

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Focus input when opened or after response
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, state]);

  // Scroll to bottom when chat history changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, toolCalls]);

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
        return;
      }

      // Enter to submit (when not processing)
      if (e.key === 'Enter' && state !== 'processing' && inputValue.trim()) {
        e.preventDefault();
        submit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, state, inputValue, close, submit, confirmAction, cancelAction]);

  if (!isOpen) return null;

  const hasHistory = chatHistory.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/50 backdrop-blur-sm"
      onClick={close}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col max-h-[80vh]"
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
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
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
              {toolCalls.map((tool) => (
                <div
                  key={tool.id}
                  className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"
                >
                  {tool.status === 'executing' && (
                    <svg className="animate-spin h-4 w-4 text-indigo-500" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  {tool.status === 'complete' && (
                    <span className="text-green-500">✓</span>
                  )}
                  {tool.status === 'error' && (
                    <span className="text-red-500">✗</span>
                  )}
                  {tool.status === 'declined' && (
                    <span className="text-yellow-500">○</span>
                  )}
                  {tool.status === 'pending' && (
                    <span className="text-gray-400">○</span>
                  )}
                  <span className="font-mono">
                    {tool.name.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
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
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInput(e.target.value)}
            placeholder={hasHistory ? "Continue the conversation..." : "Type a command..."}
            disabled={state === 'processing' || state === 'confirming'}
            className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 outline-none text-lg"
          />
          <kbd className="hidden sm:inline-block px-2 py-1 text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 rounded">
            Esc
          </kbd>
        </div>
      </div>
    </div>
  );
}
