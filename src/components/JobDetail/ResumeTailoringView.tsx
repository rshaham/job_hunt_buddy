import { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Sparkles,
  Send,
  Loader2,
  Copy,
  Download,
  RefreshCw,
  RotateCcw,
  Check,
  AlertCircle,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button, ConfirmModal } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { autoTailorResume, refineTailoredResume, gradeResume } from '../../services/ai';
import { decodeApiKey, generateId, getGradeColor } from '../../utils/helpers';
import type { Job, TailoringEntry } from '../../types';

interface ResumeTailoringViewProps {
  job: Job;
  onBack: () => void;
}

export function ResumeTailoringView({ job, onBack }: ResumeTailoringViewProps) {
  const { settings, updateJob } = useAppStore();
  const [isAutoTailoring, setIsAutoTailoring] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isRegrading, setIsRegrading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [userMessage, setUserMessage] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const apiKey = decodeApiKey(settings.apiKey);
  const originalResume = job.resumeText || settings.defaultResumeText;
  const tailoredResume = job.tailoredResume || originalResume;
  const history = job.tailoringHistory || [];
  const originalAnalysis = job.resumeAnalysis;
  const tailoredAnalysis = job.tailoredResumeAnalysis;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  };

  const handleAutoTailor = async () => {
    if (!apiKey || !originalAnalysis) return;

    setIsAutoTailoring(true);
    setError('');

    try {
      const { tailoredResume: newResume, changesSummary } = await autoTailorResume(
        job.jdText,
        originalResume,
        originalAnalysis
      );

      // Auto-regrade the tailored resume
      const newAnalysis = await gradeResume(job.jdText, newResume);

      // Create initial assistant message
      const improvement = newAnalysis.matchPercentage - (originalAnalysis.matchPercentage || 0);
      const assistantMessage: TailoringEntry = {
        id: generateId(),
        role: 'assistant',
        content: `I've tailored your resume! Your match score improved from ${originalAnalysis.matchPercentage}% to ${newAnalysis.matchPercentage}% (↑${improvement}%).\n\n**Changes made:**\n${changesSummary}\n\n${newAnalysis.gaps.length > 0 ? `**Remaining gaps to address:**\n${newAnalysis.gaps.map(g => `- ${g}`).join('\n')}\n\nWant to tell me more about your experience in these areas?` : 'Your resume now covers all the key requirements!'}`,
        resumeSnapshot: newResume,
        timestamp: new Date(),
      };

      await updateJob(job.id, {
        tailoredResume: newResume,
        tailoredResumeAnalysis: newAnalysis,
        tailoringHistory: [assistantMessage],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to tailor resume');
    } finally {
      setIsAutoTailoring(false);
    }
  };

  const handleSendMessage = async () => {
    if (!userMessage.trim() || !apiKey || !originalAnalysis) return;

    setIsRefining(true);
    setError('');

    const userEntry: TailoringEntry = {
      id: generateId(),
      role: 'user',
      content: userMessage.trim(),
      timestamp: new Date(),
    };

    try {
      const { reply, updatedResume } = await refineTailoredResume(
        job.jdText,
        originalResume,
        tailoredResume,
        originalAnalysis,
        history,
        userMessage.trim()
      );

      const assistantEntry: TailoringEntry = {
        id: generateId(),
        role: 'assistant',
        content: reply,
        resumeSnapshot: updatedResume,
        timestamp: new Date(),
      };

      await updateJob(job.id, {
        tailoredResume: updatedResume,
        tailoringHistory: [...history, userEntry, assistantEntry],
      });

      setUserMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refine resume');
    } finally {
      setIsRefining(false);
    }
  };

  const handleRegrade = async () => {
    if (!apiKey) return;

    setIsRegrading(true);
    setError('');

    try {
      const newAnalysis = await gradeResume(job.jdText, tailoredResume);
      await updateJob(job.id, { tailoredResumeAnalysis: newAnalysis });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regrade resume');
    } finally {
      setIsRegrading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(tailoredResume);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([tailoredResume], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${job.company}-${job.title}-resume.md`.replace(/\s+/g, '-').toLowerCase();
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = async () => {
    await updateJob(job.id, {
      tailoredResume: undefined,
      tailoredResumeAnalysis: undefined,
      tailoringHistory: undefined,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const suggestedPrompts = originalAnalysis?.gaps.slice(0, 3).map(gap =>
    `Tell me about your experience with: ${gap}`
  ) || [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Analysis
        </Button>

        <div className="flex items-center gap-2">
          {/* Grade comparison */}
          {originalAnalysis && tailoredAnalysis && (
            <div className="flex items-center gap-2 text-sm">
              <span className={`px-2 py-0.5 rounded ${getGradeColor(originalAnalysis.grade)}`}>
                {originalAnalysis.grade} ({originalAnalysis.matchPercentage}%)
              </span>
              <span className="text-slate-400">→</span>
              <span className={`px-2 py-0.5 rounded ${getGradeColor(tailoredAnalysis.grade)}`}>
                {tailoredAnalysis.grade} ({tailoredAnalysis.matchPercentage}%)
              </span>
              {tailoredAnalysis.matchPercentage > originalAnalysis.matchPercentage && (
                <span className="text-green-600 dark:text-green-400 font-medium">
                  ↑{tailoredAnalysis.matchPercentage - originalAnalysis.matchPercentage}%
                </span>
              )}
            </div>
          )}

          {!job.tailoredResume && (
            <Button
              onClick={handleAutoTailor}
              disabled={isAutoTailoring || !apiKey}
            >
              {isAutoTailoring ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Tailoring...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-1" />
                  Auto-Tailor
                </>
              )}
            </Button>
          )}

          {job.tailoredResume && (
            <>
              <Button variant="secondary" size="sm" onClick={handleRegrade} disabled={isRegrading}>
                {isRegrading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              </Button>
              <Button variant="secondary" size="sm" onClick={handleCopy}>
                {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
              <Button variant="secondary" size="sm" onClick={handleDownload}>
                <Download className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setIsClearModalOpen(true)}>
                <RotateCcw className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-danger mt-2 px-1">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Split Pane */}
      <div className="flex-1 grid grid-cols-2 gap-4 mt-4 min-h-0">
        {/* Left: Chat Panel */}
        <div className="flex flex-col min-h-0 bg-slate-50 dark:bg-slate-800/50 rounded-xl overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Refine Your Resume</h3>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {history.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <Sparkles className="w-8 h-8 text-primary/50 mb-3" />
                <p className="text-sm text-slate-500 mb-4">
                  Click "Auto-Tailor" to generate an optimized resume based on the job requirements.
                </p>
              </div>
            ) : (
              <>
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[90%] p-3 rounded-2xl ${
                        entry.role === 'user'
                          ? 'bg-primary text-white rounded-br-sm'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-bl-sm'
                      }`}
                    >
                      <div className="text-sm whitespace-pre-wrap">
                        {entry.role === 'assistant' ? (
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                              ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                              li: ({ children }) => <li className="mb-1">{children}</li>,
                              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
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
                <div ref={chatEndRef} />
              </>
            )}
          </div>

          {/* Suggested Prompts */}
          {history.length > 0 && suggestedPrompts.length > 0 && !userMessage && (
            <div className="px-3 pb-2">
              <div className="flex flex-wrap gap-1">
                {suggestedPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => setUserMessage(prompt)}
                    className="text-xs px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors truncate max-w-full"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat Input */}
          {history.length > 0 && (
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
                  placeholder="Tell me more about your experience..."
                  rows={1}
                  className="w-full pr-12 py-2 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                  style={{ minHeight: '40px', maxHeight: '120px' }}
                />
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={isRefining || !userMessage.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary hover:bg-primary/90 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {isRefining ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Resume Preview */}
        <div className="flex flex-col min-h-0 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {job.tailoredResume ? 'Tailored Resume' : 'Original Resume'}
            </h3>
            {tailoredAnalysis && (
              <span className={`text-xs px-2 py-0.5 rounded ${getGradeColor(tailoredAnalysis.grade)}`}>
                {tailoredAnalysis.grade}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => <h1 className="text-xl font-bold mb-2">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-lg font-semibold mt-4 mb-2 text-primary">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-base font-medium mt-3 mb-1">{children}</h3>,
                  p: ({ children }) => <p className="mb-2">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
                  li: ({ children }) => <li>{children}</li>,
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                }}
              >
                {tailoredResume}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={handleReset}
        title="Reset Tailored Resume"
        message="This will discard all tailoring changes and chat history. Are you sure?"
        confirmText="Reset"
        variant="warning"
      />
    </div>
  );
}
