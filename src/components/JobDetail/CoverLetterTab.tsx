import { useState, useRef, useEffect } from 'react';
import { Loader2, Copy, RefreshCw, Check, AlertCircle, MessageSquare, Send, X, HelpCircle } from 'lucide-react';
import { Button, Textarea, ThinkingBubble } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { generateCoverLetter, refineCoverLetter } from '../../services/ai';
import { isAIConfigured, generateId } from '../../utils/helpers';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Job, CoverLetterEntry } from '../../types';

interface CoverLetterTabProps {
  job: Job;
}

export function CoverLetterTab({ job }: CoverLetterTabProps) {
  const { settings, updateJob } = useAppStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState('');
  const [editedLetter, setEditedLetter] = useState(job.coverLetter || '');
  const [userMessage, setUserMessage] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasAIConfigured = isAIConfigured(settings);
  const resumeText = job.resumeText || settings.defaultResumeText;
  const history = job.coverLetterHistory || [];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  useEffect(() => {
    setEditedLetter(job.coverLetter || '');
  }, [job.coverLetter]);

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  };

  const handleGenerate = async () => {
    if (!resumeText) {
      setError('Please upload a resume in the Resume Fit tab first');
      return;
    }

    if (!hasAIConfigured) {
      setError('Please configure your AI provider in Settings');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const letter = await generateCoverLetter(job.jdText, resumeText);
      setEditedLetter(letter);
      await updateJob(job.id, { coverLetter: letter, coverLetterHistory: [] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate cover letter');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    await updateJob(job.id, { coverLetter: editedLetter });
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(editedLetter);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSendMessage = async () => {
    if (!userMessage.trim() || !hasAIConfigured) return;

    const messageContent = userMessage.trim();
    setUserMessage('');
    setError('');

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const userEntry: CoverLetterEntry = {
      id: generateId(),
      role: 'user',
      content: messageContent,
      timestamp: new Date(),
    };

    // Optimistic update: show user message immediately
    const originalHistory = history;
    await updateJob(job.id, {
      coverLetterHistory: [...history, userEntry],
    });

    setIsSending(true);

    try {
      const { reply, updatedLetter } = await refineCoverLetter(
        job.jdText,
        resumeText,
        editedLetter,
        originalHistory,
        messageContent
      );

      const assistantEntry: CoverLetterEntry = {
        id: generateId(),
        role: 'assistant',
        content: reply,
        letterSnapshot: updatedLetter,
        timestamp: new Date(),
      };

      setEditedLetter(updatedLetter);
      await updateJob(job.id, {
        coverLetter: updatedLetter,
        coverLetterHistory: [...originalHistory, userEntry, assistantEntry],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refine cover letter');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleExitRefine = () => {
    setIsRefining(false);
  };

  const suggestedPrompts = [
    'Make it more concise',
    'Use a more enthusiastic tone',
    'Emphasize my leadership experience',
    'Make the opening paragraph stronger',
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-180px)]">
      {/* Actions */}
      <div className="flex gap-2 mb-3 items-center">
        <Button onClick={handleGenerate} disabled={isGenerating || !hasAIConfigured}>
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              Generating...
            </>
          ) : job.coverLetter ? (
            <>
              <RefreshCw className="w-4 h-4 mr-1" />
              Regenerate
            </>
          ) : (
            'Generate Cover Letter'
          )}
        </Button>

        {editedLetter && !isRefining && (
          <Button variant="secondary" onClick={() => setIsRefining(true)}>
            <MessageSquare className="w-4 h-4 mr-1" />
            Refine with AI
          </Button>
        )}

        {isRefining && (
          <Button variant="ghost" onClick={handleExitRefine}>
            <X className="w-4 h-4 mr-1" />
            Exit Refine
          </Button>
        )}

        {editedLetter && (
          <Button variant="secondary" onClick={handleCopy}>
            {isCopied ? (
              <>
                <Check className="w-4 h-4 mr-1" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-1" />
                Copy
              </>
            )}
          </Button>
        )}
        <span className="group relative ml-1">
          <HelpCircle className="w-4 h-4 text-slate-400 cursor-help" />
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-slate-800 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            Generate, refine through chat, then copy
          </span>
        </span>
      </div>

      {!resumeText && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm text-amber-800 dark:text-amber-200 mb-3">
          <AlertCircle className="w-4 h-4" />
          Upload a resume in the Resume Fit tab to generate a cover letter
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-danger mb-3">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {editedLetter ? (
          <>
            {/* Cover Letter Display/Editor */}
            <div className={`${isRefining ? 'h-1/2' : 'flex-1'} overflow-y-auto mb-3`}>
              {isRefining ? (
                <div className="h-full p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-y-auto">
                  <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap font-serif">
                    {editedLetter}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Textarea
                    value={editedLetter}
                    onChange={(e) => setEditedLetter(e.target.value)}
                    rows={20}
                    className="font-serif text-sm leading-relaxed"
                  />
                  {editedLetter !== job.coverLetter && (
                    <div className="flex justify-end">
                      <Button size="sm" onClick={handleSave}>
                        Save Changes
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Chat Section (only when refining) */}
            {isRefining && (
              <div className="h-1/2 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-800/50 rounded-xl overflow-hidden">
                <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">
                  <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Refine Your Cover Letter
                  </h3>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {history.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                      <p className="text-sm text-slate-500 mb-4">
                        Ask for changes: tone, length, emphasis, specific sections...
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {suggestedPrompts.map((prompt, i) => (
                          <button
                            key={i}
                            onClick={() => setUserMessage(prompt)}
                            className="text-xs px-3 py-1.5 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 hover:border-primary/50 transition-colors"
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      {history.map((entry) => (
                        <div
                          key={entry.id}
                          className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[85%] p-3 rounded-2xl ${
                              entry.role === 'user'
                                ? 'bg-primary text-white rounded-br-sm'
                                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-bl-sm'
                            }`}
                          >
                            <div className="text-sm">
                              {entry.role === 'assistant' ? (
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  skipHtml
                                  components={{
                                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                  }}
                                >
                                  {entry.content}
                                </ReactMarkdown>
                              ) : (
                                entry.content
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {isSending && <ThinkingBubble />}
                      <div ref={chatEndRef} />
                    </>
                  )}
                </div>

                {/* Chat Input */}
                <div className="p-3 border-t border-slate-200 dark:border-slate-700">
                  <div className="relative">
                    <textarea
                      ref={textareaRef}
                      value={userMessage}
                      onChange={(e) => {
                        setUserMessage(e.target.value);
                        adjustTextareaHeight();
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder="Describe how you'd like to change the letter..."
                      rows={1}
                      className="w-full pr-12 py-2 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                      style={{ minHeight: '40px', maxHeight: '120px' }}
                    />
                    <button
                      type="button"
                      onClick={handleSendMessage}
                      disabled={isSending || !userMessage.trim()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary hover:bg-primary/90 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                    >
                      {isSending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <p className="text-slate-500">
              Click "Generate Cover Letter" to create a tailored cover letter
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
