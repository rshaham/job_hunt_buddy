import { useState, useRef, useEffect, useMemo } from 'react';
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
  Save,
  Bookmark,
  Pencil,
  X,
  HelpCircle,
  ChevronDown,
  FileText,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DOMPurify from 'dompurify';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as Diff from 'diff';
import { Button, ConfirmModal, ThinkingBubble } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { autoTailorResume, refineTailoredResume, gradeResume, rewriteForMemory } from '../../services/ai';
import { isAIConfigured, generateId, getGradeColor } from '../../utils/helpers';
import { showToast } from '../../stores/toastStore';
import type { Job, TailoringEntry, SavedStory } from '../../types';

interface ResumeTailoringViewProps {
  job: Job;
  onBack: () => void;
  initialKeyword?: string;
}

export function ResumeTailoringView({ job, onBack, initialKeyword }: ResumeTailoringViewProps) {
  const { settings, updateJob, updateSettings } = useAppStore();
  const [isAutoTailoring, setIsAutoTailoring] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isRegrading, setIsRegrading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTailoredResume, setEditedTailoredResume] = useState('');
  const [isSavingMemory, setIsSavingMemory] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [userMessage, setUserMessage] = useState('');
  const [viewMode, setViewMode] = useState<'tailored' | 'compare' | 'diff'>('tailored');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasAIConfigured = isAIConfigured(settings);
  const originalResume = job.resumeText || settings.defaultResumeText;
  const tailoredResume = job.tailoredResume || originalResume;
  const history = job.tailoringHistory || [];
  const originalAnalysis = job.resumeAnalysis;
  const tailoredAnalysis = job.tailoredResumeAnalysis;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  // Sync edited resume with saved tailored resume
  useEffect(() => {
    if (job.tailoredResume) {
      setEditedTailoredResume(job.tailoredResume);
      setIsEditing(false);
    }
  }, [job.tailoredResume]);

  // Auto-populate input if initialKeyword is provided
  useEffect(() => {
    if (initialKeyword && !userMessage) {
      setUserMessage(`How can I address the missing skill: "${initialKeyword}"?`);
    }
  }, [initialKeyword]);

  // Get missing keywords from the most recent analysis
  const missingKeywords = job.tailoredResumeAnalysis?.missingKeywords ||
                          job.resumeAnalysis?.missingKeywords || [];

  const handleKeywordClick = (keyword: string) => {
    setUserMessage(`How can I address the missing skill: "${keyword}"?`);
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  };

  const handleSaveToMemory = async (entryId: string, question: string, answer: string) => {
    setIsSavingMemory(entryId);
    try {
      const cleaned = await rewriteForMemory(question, answer);
      const newStory: SavedStory = {
        id: generateId(),
        question: cleaned.question,
        answer: cleaned.answer,
        createdAt: new Date(),
      };
      await updateSettings({
        savedStories: [...(settings.savedStories || []), newStory],
      });
      showToast('Saved to profile', 'success');
    } catch (err) {
      showToast('Failed to save', 'error');
    } finally {
      setIsSavingMemory(null);
    }
  };

  const handleAutoTailor = async () => {
    if (!hasAIConfigured || !originalAnalysis) return;

    setIsAutoTailoring(true);
    setError('');

    try {
      const { tailoredResume: newResume, changesSummary, suggestedQuestions } = await autoTailorResume(
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
        tailoringSuggestions: suggestedQuestions,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to tailor resume');
    } finally {
      setIsAutoTailoring(false);
    }
  };

  const handleSendMessage = async () => {
    if (!userMessage.trim() || !hasAIConfigured || !originalAnalysis) return;

    const messageContent = userMessage.trim();
    setUserMessage('');
    setError('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const userEntry: TailoringEntry = {
      id: generateId(),
      role: 'user',
      content: messageContent,
      timestamp: new Date(),
    };

    // Optimistic update: show user message immediately
    const originalHistory = history;
    await updateJob(job.id, {
      tailoringHistory: [...history, userEntry],
    });

    setIsRefining(true);

    try {
      const { reply, updatedResume } = await refineTailoredResume(
        job.jdText,
        originalResume,
        tailoredResume,
        originalAnalysis,
        originalHistory,
        messageContent
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
        tailoringHistory: [...originalHistory, userEntry, assistantEntry],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refine resume');
      // User message stays visible
    } finally {
      setIsRefining(false);
    }
  };

  const handleRegrade = async () => {
    if (!hasAIConfigured) return;

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
    const contentToCopy = isEditing ? editedTailoredResume : tailoredResume;
    await navigator.clipboard.writeText(contentToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownload = () => {
    const contentToDownload = isEditing ? editedTailoredResume : tailoredResume;
    const blob = new Blob([contentToDownload], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${job.company}-${job.title}-resume.md`.replace(/\s+/g, '-').toLowerCase();
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleStartEditing = () => {
    setEditedTailoredResume(tailoredResume);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    await updateJob(job.id, { tailoredResume: editedTailoredResume });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedTailoredResume(tailoredResume);
    setIsEditing(false);
  };

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  const handleDownloadPDF = async () => {
    setIsGeneratingPdf(true);
    setShowDownloadMenu(false);
    try {
      // Use edited content if in edit mode
      const contentToPrint = isEditing ? editedTailoredResume : tailoredResume;

      // Convert markdown to simple HTML
      const rawHtml = contentToPrint
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^\* (.+)$/gm, '<li>$1</li>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

      // Sanitize HTML to prevent XSS attacks
      const htmlContent = DOMPurify.sanitize(rawHtml, {
        ALLOWED_TAGS: ['h1', 'h2', 'h3', 'p', 'ul', 'li', 'strong', 'em', 'br'],
        ALLOWED_ATTR: [],
      });

      // Create a temporary container for rendering
      const container = document.createElement('div');
      container.style.cssText = `
        position: absolute;
        left: -9999px;
        top: 0;
        width: 7.5in;
        padding: 0;
        font-family: Georgia, serif;
        font-size: 11pt;
        line-height: 1.4;
        color: #333;
        background: white;
      `;
      container.innerHTML = `
        <style>
          h1 { font-size: 18pt; margin-bottom: 0.3em; color: #000; }
          h2 { font-size: 13pt; margin-top: 1em; margin-bottom: 0.3em; color: #444; border-bottom: 1px solid #ddd; padding-bottom: 0.2em; }
          h3 { font-size: 11pt; margin-top: 0.8em; margin-bottom: 0.2em; }
          p { margin: 0.3em 0; }
          ul { margin: 0.3em 0; padding-left: 1.2em; }
          li { margin: 0.15em 0; }
          strong { font-weight: 600; }
        </style>
        <p>${htmlContent}</p>
      `;
      document.body.appendChild(container);

      // Render to canvas with higher scale for quality
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      // Remove temporary container
      document.body.removeChild(container);

      // Create PDF with proper page breaks
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: 'letter',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 0.5; // 0.5 inch margins
      const contentWidth = pageWidth - margin * 2;
      const contentHeight = pageHeight - margin * 2;

      // Calculate image dimensions
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = contentWidth / (imgWidth / 2); // Account for scale: 2
      const scaledHeight = (imgHeight / 2) * ratio;

      // Calculate how many pages we need
      const totalPages = Math.ceil(scaledHeight / contentHeight);

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) {
          pdf.addPage();
        }

        // Calculate the portion of the image to show on this page
        const sourceY = (page * contentHeight / ratio) * 2; // Source Y in canvas pixels
        const sourceHeight = Math.min((contentHeight / ratio) * 2, imgHeight - sourceY);

        // Create a canvas for this page's portion
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = imgWidth;
        pageCanvas.height = sourceHeight;
        const ctx = pageCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(
            canvas,
            0, sourceY, imgWidth, sourceHeight,
            0, 0, imgWidth, sourceHeight
          );

          const pageImgData = pageCanvas.toDataURL('image/png');
          const pageImgHeight = (sourceHeight / 2) * ratio;
          pdf.addImage(pageImgData, 'PNG', margin, margin, contentWidth, pageImgHeight);
        }
      }

      // Download
      const filename = `${job.company}-${job.title}-tailored-resume.pdf`.replace(/\s+/g, '-').toLowerCase();
      pdf.save(filename);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleReset = async () => {
    await updateJob(job.id, {
      tailoredResume: undefined,
      tailoredResumeAnalysis: undefined,
      tailoringHistory: undefined,
      tailoringSuggestions: undefined,
    });
  };

  const handleSaveAsJobResume = async () => {
    await updateJob(job.id, {
      resumeText: tailoredResume,
      resumeAnalysis: tailoredAnalysis,
      // Clear tailoring since this is now the base
      tailoredResume: undefined,
      tailoredResumeAnalysis: undefined,
      tailoringHistory: undefined,
      tailoringSuggestions: undefined,
    });
    setIsSaveModalOpen(false);
    onBack();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Use AI-generated follow-up questions from auto-tailoring
  const suggestedPrompts = job.tailoringSuggestions || [];

  // Compute diff between original and tailored resume (use edited content if editing)
  const currentTailoredContent = isEditing ? editedTailoredResume : tailoredResume;
  const diffParts = useMemo(() => {
    if (!job.tailoredResume && !isEditing) return [];
    return Diff.diffWords(originalResume, currentTailoredContent);
  }, [originalResume, currentTailoredContent, job.tailoredResume, isEditing]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Analysis
          </Button>
          <span className="group relative">
            <HelpCircle className="w-4 h-4 text-slate-400 cursor-help" />
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-slate-800 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              Auto-tailor or chat to customize
            </span>
          </span>
        </div>

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
              disabled={isAutoTailoring || !hasAIConfigured}
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
              {isEditing ? (
                <>
                  <Button variant="primary" size="sm" onClick={handleSaveEdit} title="Save manual edits">
                    <Check className="w-4 h-4 mr-1" />
                    Save
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleCancelEdit} title="Cancel editing">
                    <X className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="secondary" size="sm" onClick={handleStartEditing} title="Edit manually">
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="secondary" size="sm" onClick={handleRegrade} disabled={isRegrading}>
                    {isRegrading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={handleCopy}>
                    {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <div className="relative">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                      disabled={isGeneratingPdf}
                      title="Download"
                    >
                      {isGeneratingPdf ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          <ChevronDown className="w-3 h-3 ml-1" />
                        </>
                      )}
                    </Button>
                    {showDownloadMenu && (
                      <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-10">
                        <button
                          type="button"
                          onClick={() => {
                            handleDownloadPDF();
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                        >
                          <FileText className="w-4 h-4" />
                          Download as PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleDownload();
                            setShowDownloadMenu(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                        >
                          <FileText className="w-4 h-4" />
                          Download as Markdown
                        </button>
                      </div>
                    )}
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => setIsSaveModalOpen(true)} title="Save as Job Resume">
                    <Save className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setIsClearModalOpen(true)}>
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </>
              )}
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

          {/* Missing Keywords */}
          {missingKeywords.length > 0 && (
            <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 bg-red-50 dark:bg-red-900/10">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                Missing keywords - click to ask AI for help:
              </p>
              <div className="flex flex-wrap gap-1">
                {missingKeywords.map((keyword, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleKeywordClick(keyword)}
                    className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors cursor-pointer"
                  >
                    {keyword}
                  </button>
                ))}
              </div>
            </div>
          )}

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
                {history.map((entry, index) => {
                  // Find the user message that preceded this assistant message (for context)
                  const previousUserMessage = entry.role === 'assistant' && index > 0
                    ? history.slice(0, index).reverse().find(e => e.role === 'user')?.content
                    : null;

                  return (
                    <div
                      key={entry.id}
                      className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={entry.role === 'assistant' ? 'max-w-[90%]' : ''}>
                        <div
                          className={`p-3 rounded-2xl ${
                            entry.role === 'user'
                              ? 'bg-primary text-white rounded-br-sm max-w-[90%]'
                              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-bl-sm'
                          }`}
                        >
                          <div className="text-sm whitespace-pre-wrap">
                            {entry.role === 'assistant' ? (
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                skipHtml
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
                        {entry.role === 'assistant' && previousUserMessage && (
                          <button
                            type="button"
                            onClick={() => handleSaveToMemory(entry.id, previousUserMessage, entry.content)}
                            disabled={isSavingMemory === entry.id}
                            className="text-xs text-slate-400 hover:text-primary mt-1.5 ml-1 flex items-center gap-1 transition-colors disabled:opacity-50"
                          >
                            {isSavingMemory === entry.id ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Bookmark className="w-3 h-3" />
                                Save to Profile
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {isRefining && <ThinkingBubble />}
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
            <div className="flex items-center gap-2">
              {job.tailoredResume && (
                <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMode('tailored')}
                    className={`px-2 py-1 text-xs rounded-md transition-colors ${
                      viewMode === 'tailored'
                        ? 'bg-white dark:bg-slate-600 shadow-sm font-medium'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    Tailored
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('compare')}
                    className={`px-2 py-1 text-xs rounded-md transition-colors ${
                      viewMode === 'compare'
                        ? 'bg-white dark:bg-slate-600 shadow-sm font-medium'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    Compare
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('diff')}
                    className={`px-2 py-1 text-xs rounded-md transition-colors ${
                      viewMode === 'diff'
                        ? 'bg-white dark:bg-slate-600 shadow-sm font-medium'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    Changes
                  </button>
                </div>
              )}
              {!job.tailoredResume && (
                <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Original Resume
                </h3>
              )}
            </div>
            {tailoredAnalysis && (
              <span className={`text-xs px-2 py-0.5 rounded ${getGradeColor(tailoredAnalysis.grade)}`}>
                {tailoredAnalysis.grade}
              </span>
            )}
          </div>

          {viewMode === 'diff' && job.tailoredResume ? (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap font-mono text-sm leading-relaxed">
                {diffParts.map((part, index) => (
                  <span
                    key={index}
                    className={
                      part.added
                        ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200'
                        : part.removed
                        ? 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 line-through'
                        : ''
                    }
                  >
                    {part.value}
                  </span>
                ))}
              </div>
            </div>
          ) : viewMode === 'compare' && job.tailoredResume ? (
            <div className="flex-1 grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-700 overflow-hidden">
              {/* Original */}
              <div className="flex flex-col min-h-0">
                <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Original</span>
                    {originalAnalysis && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${getGradeColor(originalAnalysis.grade)}`}>
                        {originalAnalysis.grade} ({originalAnalysis.matchPercentage}%)
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3">
                  <div className="prose prose-sm dark:prose-invert max-w-none text-xs">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      skipHtml
                      components={{
                        h1: ({ children }) => <h1 className="text-base font-bold mb-1">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-sm font-semibold mt-2 mb-1 text-slate-600 dark:text-slate-400">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-xs font-medium mt-2 mb-1">{children}</h3>,
                        p: ({ children }) => <p className="mb-1 text-xs">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>,
                        li: ({ children }) => <li className="text-xs">{children}</li>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      }}
                    >
                      {originalResume}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
              {/* Tailored */}
              <div className="flex flex-col min-h-0">
                <div className="px-3 py-1.5 bg-green-50 dark:bg-green-900/20 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-green-700 dark:text-green-400">Tailored</span>
                    {tailoredAnalysis && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${getGradeColor(tailoredAnalysis.grade)}`}>
                        {tailoredAnalysis.grade} ({tailoredAnalysis.matchPercentage}%)
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3">
                  <div className="prose prose-sm dark:prose-invert max-w-none text-xs">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      skipHtml
                      components={{
                        h1: ({ children }) => <h1 className="text-base font-bold mb-1">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-sm font-semibold mt-2 mb-1 text-primary">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-xs font-medium mt-2 mb-1">{children}</h3>,
                        p: ({ children }) => <p className="mb-1 text-xs">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>,
                        li: ({ children }) => <li className="text-xs">{children}</li>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      }}
                    >
                      {tailoredResume}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          ) : isEditing ? (
            <div className="flex-1 overflow-hidden p-4">
              <textarea
                value={editedTailoredResume}
                onChange={(e) => setEditedTailoredResume(e.target.value)}
                className="w-full h-full resize-none bg-white dark:bg-slate-900 border border-primary/50 rounded-lg p-4 font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Edit your tailored resume..."
              />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  skipHtml
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
          )}
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

      <ConfirmModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onConfirm={handleSaveAsJobResume}
        title="Save as Job Resume"
        message="This will save the tailored resume as this job's custom resume and clear the tailoring history. The tailored version will become your new base resume for this job."
        confirmText="Save"
        variant="default"
      />
    </div>
  );
}
