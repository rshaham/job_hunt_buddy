import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Trash2, Sparkles, AlertCircle } from 'lucide-react';
import { Button, ConfirmModal, ThinkingBubble } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { chatAboutJob, generateInterviewPrep } from '../../services/ai';
import { decodeApiKey, generateId } from '../../utils/helpers';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Job, QAEntry } from '../../types';

interface PrepTabProps {
  job: Job;
}

// Markdown renderer component with proper styling
function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="text-sm text-slate-700 dark:text-slate-300">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
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
        table: ({ children }) => (
          <div className="overflow-x-auto my-3">
            <table className="min-w-full border-collapse border border-slate-300 dark:border-slate-600 text-sm">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-slate-100 dark:bg-slate-700">{children}</thead>
        ),
        tbody: ({ children }) => <tbody>{children}</tbody>,
        tr: ({ children }) => (
          <tr className="border-b border-slate-300 dark:border-slate-600">{children}</tr>
        ),
        th: ({ children }) => (
          <th className="px-3 py-2 text-left font-semibold text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-2 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-600">
            {children}
          </td>
        ),
      }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export function PrepTab({ job }: PrepTabProps) {
  const { settings, updateJob } = useAppStore();
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPrep, setIsGeneratingPrep] = useState(false);
  const [error, setError] = useState('');
  const [prepMaterial, setPrepMaterial] = useState('');
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const apiKey = decodeApiKey(settings.apiKey);
  const resumeText = job.resumeText || settings.defaultResumeText;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [job.qaHistory]);

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  };

  const handleSend = async () => {
    if (!question.trim()) return;

    if (!apiKey) {
      setError('Please configure your Claude API key in Settings');
      return;
    }

    const userQuestion = question.trim();
    setQuestion('');
    setError('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Optimistic update: show user message immediately with null answer
    const pendingEntry: QAEntry = {
      id: generateId(),
      question: userQuestion,
      answer: null,
      timestamp: new Date(),
    };

    await updateJob(job.id, {
      qaHistory: [...job.qaHistory, pendingEntry],
    });

    setIsLoading(true);

    // Store original history for the API call (before pending entry was added)
    const originalHistory = job.qaHistory;

    try {
      const response = await chatAboutJob(
        job.jdText,
        resumeText,
        originalHistory,
        userQuestion
      );

      // Replace pending entry with completed entry (original history + completed entry)
      await updateJob(job.id, {
        qaHistory: [...originalHistory, { ...pendingEntry, answer: response.answer }],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      // Keep the user's question visible with null answer to show error state
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
    await updateJob(job.id, { qaHistory: [] });
    setIsClearModalOpen(false);
  };

  const handleGeneratePrep = async () => {
    if (!apiKey) {
      setError('Please configure your Claude API key in Settings');
      return;
    }

    setIsGeneratingPrep(true);
    setError('');

    try {
      const prep = await generateInterviewPrep(job.jdText, resumeText);
      setPrepMaterial(prep);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate prep materials');
    } finally {
      setIsGeneratingPrep(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedQuestions = [
    'What are the most important skills for this role?',
    'How should I prepare for the interview?',
    'What questions should I ask the interviewer?',
    'What are potential red flags I should address?',
    'Help me craft a response about my experience with...',
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-180px)]">
      {/* Generate Prep Button */}
      <div className="flex gap-2 mb-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleGeneratePrep}
          disabled={isGeneratingPrep || !apiKey}
        >
          {isGeneratingPrep ? (
            <>
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-1" />
              Generate Interview Prep
            </>
          )}
        </Button>
        {job.qaHistory.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setIsClearModalOpen(true)}>
            <Trash2 className="w-4 h-4 mr-1" />
            Clear Chat
          </Button>
        )}
      </div>

      <ConfirmModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={handleClearHistory}
        title="Clear Chat History"
        message="Clear all chat history for this job? This cannot be undone."
        confirmText="Clear"
        variant="warning"
      />

      {/* Prep Material */}
      {prepMaterial && (
        <div className="mb-3 p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20 max-h-64 overflow-y-auto">
          <h4 className="text-xs font-semibold text-primary uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Interview Prep
          </h4>
          <MarkdownContent content={prepMaterial} />
        </div>
      )}

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
        {job.qaHistory.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <p className="text-sm text-slate-500 mb-4">
              Ask questions about this job, get interview coaching, or practice responses.
            </p>
            <div className="space-y-2 w-full max-w-md">
              <p className="text-xs text-slate-400 uppercase tracking-wide">Suggested questions:</p>
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
          </div>
        ) : (
          <>
            {job.qaHistory.map((entry) => (
              <div key={entry.id} className="space-y-3">
                {/* User Question */}
                <div className="flex justify-end">
                  <div className="max-w-[85%]">
                    <div className="p-3 bg-primary text-white rounded-2xl rounded-br-sm">
                      <p className="text-sm">{entry.question}</p>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 text-right">
                      {format(new Date(entry.timestamp), 'h:mm a')}
                    </p>
                  </div>
                </div>
                {/* AI Answer or Thinking Bubble */}
                {entry.answer === null ? (
                  <ThinkingBubble />
                ) : (
                  <div className="flex justify-start">
                    <div className="max-w-[85%]">
                      <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl rounded-bl-sm border border-slate-200 dark:border-slate-700 shadow-sm">
                        <MarkdownContent content={entry.answer} />
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

      {error && (
        <div className="flex items-center gap-2 text-sm text-danger mb-2 px-1">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Chat Input - Unified Design */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={question}
          onChange={(e) => {
            setQuestion(e.target.value);
            adjustTextareaHeight();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Ask about the job, interview prep, or get coaching..."
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
  );
}
