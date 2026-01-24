import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Send, Loader2, Trash2, Sparkles, AlertCircle, Bookmark, Users, ChevronDown, X, HelpCircle,
  Download, FolderOpen, Upload, Flame, Calendar, MessageSquare,
  ChevronRight, Check, ChevronUp, GripVertical
} from 'lucide-react';
import { Button, ConfirmModal, Modal, ThinkingBubble } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { chatAboutJob, generateInterviewPrep, rewriteForMemory } from '../../services/ai';
import { isAIConfigured, generateId, cn } from '../../utils/helpers';
import { exportMarkdownToPdf, generatePdfFilename } from '../../utils/pdfExport';
import { showToast } from '../../stores/toastStore';
import { format, isFuture, isToday, isTomorrow, differenceInDays } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Job, QAEntry, SavedStory, SavedPrepConversation, InterviewRound, PrepMaterial } from '../../types';
import { getInterviewTypeLabel } from '../../types';
import { InterviewPrepModal } from './InterviewPrepModal';

interface PrepTabProps {
  job: Job;
}

// Markdown renderer component with proper styling
function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="text-sm text-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
        h1: ({ children }) => (
          <h1 className="text-lg font-bold mt-4 mb-2 text-foreground first:mt-0">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-base font-semibold mt-4 mb-2 text-foreground first:mt-0">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-semibold mt-3 mb-1.5 text-foreground">
            {children}
          </h3>
        ),
        p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
        ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">{children}</strong>
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
          <blockquote className="border-l-4 border-primary/50 pl-4 italic my-3 text-foreground-muted">
            {children}
          </blockquote>
        ),
        hr: () => <hr className="my-4 border-border" />,
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
          <th className="px-3 py-2 text-left font-semibold text-foreground border border-slate-300 dark:border-slate-600">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-2 text-foreground-muted border border-slate-300 dark:border-slate-600">
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

// Helper to get formatted date label
function getDateLabel(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  const days = differenceInDays(date, new Date());
  if (days > 0 && days <= 7) return `In ${days} days`;
  return format(date, 'MMM d, yyyy');
}

// Compact NextUp banner - shows as a slim strip with round info
interface NextUpBannerProps {
  round: InterviewRound;
  job: Job;
  totalRounds: number;
  onOpenPrepModal: (round: InterviewRound) => void;
}

function NextUpBanner({ round, job, totalRounds, onOpenPrepModal }: NextUpBannerProps) {
  const { settings } = useAppStore();
  const interviewers = job.contacts?.filter(c => round.interviewerIds?.includes(c.id)) || [];
  const hasIntel = interviewers.some(c => c.interviewerIntel);

  return (
    <button
      type="button"
      onClick={() => onOpenPrepModal(round)}
      className="w-full flex items-center gap-3 px-3 py-2 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border border-orange-200 dark:border-orange-800/50 rounded-lg hover:border-orange-300 dark:hover:border-orange-700 transition-colors text-left"
    >
      <Flame className="w-4 h-4 text-orange-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
            Round {round.roundNumber}{totalRounds > 1 ? `/${totalRounds}` : ''}
          </span>
          <span className="text-sm font-medium text-foreground">
            {getInterviewTypeLabel(round.type, settings.customInterviewTypes)}
          </span>
        </div>
        {interviewers.length > 0 && (
          <span className="text-xs text-foreground-muted">
            with {interviewers.map(c => c.name).join(', ')}
            {hasIntel && <Sparkles className="w-3 h-3 text-amber-500 inline ml-1" />}
          </span>
        )}
      </div>
      <div className="text-right flex-shrink-0">
        <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
          {round.scheduledAt && getDateLabel(new Date(round.scheduledAt))}
        </span>
        {round.scheduledAt && (
          <span className="text-xs text-orange-500 dark:text-orange-400 ml-1">
            {format(new Date(round.scheduledAt), 'h:mm a')}
          </span>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-orange-400 flex-shrink-0" />
    </button>
  );
}

// Compact timeline item for sidebar
interface CompactTimelineItemProps {
  round: InterviewRound;
  onOpenPrepModal: (round: InterviewRound) => void;
  linkedMaterialsCount: number;
}

function CompactTimelineItem({ round, onOpenPrepModal, linkedMaterialsCount }: CompactTimelineItemProps) {
  const { settings } = useAppStore();
  const isCompleted = round.status === 'completed';
  const isCancelled = round.status === 'cancelled';
  const isScheduled = round.scheduledAt && isFuture(new Date(round.scheduledAt));

  return (
    <button
      type="button"
      onClick={() => onOpenPrepModal(round)}
      className={cn(
        "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors",
        isCompleted || isCancelled
          ? "opacity-60 hover:bg-slate-100 dark:hover:bg-slate-800"
          : "hover:bg-primary/5"
      )}
    >
      <div className={cn(
        "flex items-center justify-center w-5 h-5 rounded-full text-xs font-medium flex-shrink-0",
        isCompleted ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
        isCancelled ? "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400" :
        "bg-primary/10 text-primary"
      )}>
        {isCompleted ? <Check className="w-3 h-3" /> : round.roundNumber}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium text-foreground truncate block">
          {getInterviewTypeLabel(round.type, settings.customInterviewTypes)}
        </span>
      </div>
      {!isCompleted && !isCancelled && isScheduled && round.scheduledAt && (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 flex-shrink-0">
          {getDateLabel(new Date(round.scheduledAt))}
        </span>
      )}
      {linkedMaterialsCount > 0 && (
        <span className="text-[10px] text-foreground-muted flex-shrink-0">
          {linkedMaterialsCount} prep
        </span>
      )}
    </button>
  );
}

export function PrepTab({ job }: PrepTabProps) {
  const { settings, updateJob, updateSettings } = useAppStore();
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPrep, setIsGeneratingPrep] = useState(false);
  const [isSavingMemory, setIsSavingMemory] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [prepMaterial, setPrepMaterial] = useState('');
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [selectedInterviewerId, setSelectedInterviewerId] = useState<string | null>(null);
  const [showInterviewerDropdown, setShowInterviewerDropdown] = useState(false);

  // Save/load conversation state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [showLoadWarning, setShowLoadWarning] = useState(false);
  const [pendingLoadId, setPendingLoadId] = useState<string | null>(null);

  // Timeline panel state - expanded by default when there are interviews
  const [showTimelinePanel, setShowTimelinePanel] = useState(true);

  // Interview Prep Modal state
  const [selectedRoundForPrep, setSelectedRoundForPrep] = useState<InterviewRound | null>(null);
  const [isPrepModalOpen, setIsPrepModalOpen] = useState(false);

  // Resizable sidebar state
  const [sidebarWidth, setSidebarWidth] = useState(320); // Default 320px (was w-72 = 288px, slightly wider)
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const widthRef = useRef(320);
  const rafRef = useRef<number>();

  // Get contacts with interviewer intel
  const contactsWithIntel = job.contacts.filter((c) => c.interviewerIntel);
  const selectedInterviewer = contactsWithIntel.find((c) => c.id === selectedInterviewerId);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasAIConfigured = isAIConfigured(settings);
  const resumeText = job.resumeText || settings.defaultResumeText;

  // Resize handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !containerRef.current) return;

    // Cancel previous frame to coalesce rapid updates
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    rafRef.current = requestAnimationFrame(() => {
      const containerRect = containerRef.current!.getBoundingClientRect();
      const newWidth = containerRect.right - e.clientX;
      const maxWidth = containerRect.width * 0.9; // Allow up to 90% of container

      // Constrain width between 150px minimum and 90% of container
      const constrainedWidth = Math.min(Math.max(newWidth, 150), maxWidth);

      // Store in ref (no re-render)
      widthRef.current = constrainedWidth;

      // Update DOM directly (bypasses React)
      if (sidebarRef.current) {
        sidebarRef.current.style.width = `${constrainedWidth}px`;
      }
    });
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    // Cancel any pending animation frame
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    // Sync final width to React state once (single re-render)
    setSidebarWidth(widthRef.current);
    setIsResizing(false);
  }, []);

  // Add/remove global mouse listeners for resize
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Keep widthRef in sync when sidebarWidth changes externally
  useEffect(() => {
    widthRef.current = sidebarWidth;
  }, [sidebarWidth]);

  // Interview data - sorted and filtered
  const interviews = useMemo(() => {
    const rounds = job.interviews || [];
    return [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);
  }, [job.interviews]);

  // Find next upcoming interview (scheduled, future date)
  const nextInterview = useMemo(() => {
    return interviews.find(r =>
      r.status === 'scheduled' &&
      r.scheduledAt &&
      isFuture(new Date(r.scheduledAt))
    );
  }, [interviews]);

  // Group materials by interview round
  const materialsByRound = useMemo(() => {
    const materials = job.prepMaterials || [];
    const grouped: Record<string, PrepMaterial[]> = { general: [] };

    for (const material of materials) {
      if (material.interviewRoundId) {
        if (!grouped[material.interviewRoundId]) {
          grouped[material.interviewRoundId] = [];
        }
        grouped[material.interviewRoundId].push(material);
      } else {
        grouped.general.push(material);
      }
    }

    return grouped;
  }, [job.prepMaterials]);

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

  const handleDeletePrepMaterial = async (materialId: string) => {
    const updatedMaterials = (job.prepMaterials || []).filter((m) => m.id !== materialId);
    await updateJob(job.id, { prepMaterials: updatedMaterials });
    showToast('Research deleted', 'success');
  };

  const handleDownloadPrepMaterial = async (title: string, content: string) => {
    try {
      const filename = generatePdfFilename(job.company, job.title, title.slice(0, 30));
      await exportMarkdownToPdf(content, { filename, title });
      showToast('Downloaded as PDF', 'success');
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      showToast('Failed to download', 'error');
    }
  };

  const handleGeneratePrep = async () => {
    if (!hasAIConfigured) {
      setError('Please configure your AI provider in Settings');
      return;
    }

    setIsGeneratingPrep(true);
    setError('');

    try {
      const prep = await generateInterviewPrep(job.jdText, resumeText, job);
      setPrepMaterial(prep);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate prep materials');
    } finally {
      setIsGeneratingPrep(false);
    }
  };

  const handleSavePrepMaterial = async () => {
    if (!prepMaterial) return;

    const newMaterial = {
      id: generateId(),
      title: `Interview Prep - ${format(new Date(), 'MMM d, yyyy')}`,
      content: prepMaterial,
      type: 'research' as const,
    };

    await updateJob(job.id, {
      prepMaterials: [...(job.prepMaterials || []), newMaterial],
    });

    setPrepMaterial(''); // Clear the temporary state
    showToast('Prep material saved', 'success');
  };

  // Save current chat conversation
  const handleSaveChat = async () => {
    if (!job.qaHistory.length) return;

    const newSaved: SavedPrepConversation = {
      id: generateId(),
      name: saveName || `Chat ${format(new Date(), 'MMM d, h:mm a')}`,
      entries: [...job.qaHistory],
      savedAt: new Date(),
    };

    await updateJob(job.id, {
      savedPrepConversations: [...(job.savedPrepConversations || []), newSaved],
    });

    setShowSaveModal(false);
    setSaveName('');
    showToast('Chat saved', 'success');
  };

  // Load saved chat (with warning check)
  const handleLoadChat = (savedId: string) => {
    if (job.qaHistory.length > 0) {
      setPendingLoadId(savedId);
      setShowLoadWarning(true);
    } else {
      doLoadChat(savedId);
    }
  };

  // Actually load the chat
  const doLoadChat = async (savedId: string) => {
    const saved = job.savedPrepConversations?.find(s => s.id === savedId);
    if (saved) {
      await updateJob(job.id, { qaHistory: [...saved.entries] });
      showToast(`Loaded: ${saved.name}`, 'success');
    }
    setShowLoadWarning(false);
    setPendingLoadId(null);
  };

  // Delete saved chat
  const handleDeleteSavedChat = async (savedId: string) => {
    const updated = (job.savedPrepConversations || []).filter(s => s.id !== savedId);
    await updateJob(job.id, { savedPrepConversations: updated });
    showToast('Saved chat deleted', 'success');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleOpenPrepModal = (round: InterviewRound) => {
    setSelectedRoundForPrep(round);
    setIsPrepModalOpen(true);
  };

  const suggestedQuestions = [
    'What are the most important skills for this role?',
    'How should I prepare for the interview?',
    'What questions should I ask the interviewer?',
    'What are potential red flags I should address?',
    'Help me craft a response about my experience with...',
  ];

  // Check if we have interviews
  const hasInterviews = interviews.length > 0;

  // Check if we have any prep content to show in the right panel
  const hasPrepContent = prepMaterial || (materialsByRound.general && materialsByRound.general.length > 0) || (job.savedPrepConversations && job.savedPrepConversations.length > 0) || contactsWithIntel.length > 0;

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] gap-3">
      <ConfirmModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={handleClearHistory}
        title="Clear Chat History"
        message="Clear all chat history for this job? This cannot be undone."
        confirmText="Clear"
        variant="warning"
      />

      {/* Save Chat Modal */}
      <Modal
        isOpen={showSaveModal}
        onClose={() => {
          setShowSaveModal(false);
          setSaveName('');
        }}
        title="Save Chat"
        size="sm"
      >
        <div className="p-4 space-y-4">
          <p className="text-sm text-foreground-muted">
            Save this conversation to reload later.
          </p>
          <input
            type="text"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder={`Chat ${format(new Date(), 'MMM d, h:mm a')}`}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-surface text-sm"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowSaveModal(false);
                setSaveName('');
              }}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveChat}>
              Save
            </Button>
          </div>
        </div>
      </Modal>

      {/* Load Warning Modal */}
      <ConfirmModal
        isOpen={showLoadWarning}
        onClose={() => {
          setShowLoadWarning(false);
          setPendingLoadId(null);
        }}
        onConfirm={() => pendingLoadId && doLoadChat(pendingLoadId)}
        title="Load Saved Chat"
        message="Your current chat has unsaved messages. Loading will replace them. Continue?"
        confirmText="Load"
        variant="warning"
      />

      {/* Interview Prep Modal */}
      {selectedRoundForPrep && (
        <InterviewPrepModal
          isOpen={isPrepModalOpen}
          onClose={() => {
            setIsPrepModalOpen(false);
            setSelectedRoundForPrep(null);
          }}
          job={job}
          interviewRound={selectedRoundForPrep}
        />
      )}

      {/* Compact Next Up Banner - only when there's an upcoming interview */}
      {nextInterview && (
        <NextUpBanner
          round={nextInterview}
          job={job}
          totalRounds={interviews.length}
          onOpenPrepModal={handleOpenPrepModal}
        />
      )}

      {/* Main content area - Chat and Sidebar */}
      <div ref={containerRef} className="flex flex-1 min-h-0">
        {/* Left Panel - Chat */}
        <div className={cn("flex flex-col min-h-0", (hasPrepContent || hasInterviews) ? "flex-1" : "w-full")}>
          {/* Chat Header */}
          <div className="flex gap-2 mb-3 items-center flex-wrap">
            <h4 className="text-xs font-semibold text-foreground-muted uppercase tracking-wide flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              Q&A Chat
            </h4>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleGeneratePrep()}
              disabled={isGeneratingPrep || !hasAIConfigured}
            >
              {isGeneratingPrep ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-1" />
                  Generate Prep
                </>
              )}
            </Button>
            {job.qaHistory.length > 0 && (
              <>
                <Button variant="ghost" size="sm" onClick={() => setShowSaveModal(true)}>
                  <Bookmark className="w-4 h-4 mr-1" />
                  Save
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setIsClearModalOpen(true)}>
                  <Trash2 className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              </>
            )}
            <span className="group relative ml-1">
              <HelpCircle className="w-4 h-4 text-slate-400 cursor-help" />
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-slate-800 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                Ask questions, get coaching, save answers
              </span>
            </span>
          </div>

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
                      className="w-full text-left text-sm p-3 bg-surface rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors"
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
                          <div className="p-4 bg-surface rounded-2xl rounded-bl-sm border border-border shadow-sm">
                            <MarkdownContent content={entry.answer} />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSaveToMemory(entry.id, entry.question, entry.answer!)}
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
              placeholder="Ask about the job, interview prep, or get coaching..."
              rows={1}
              className="w-full pr-14 py-3 px-4 bg-surface border border-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm placeholder:text-slate-400 min-h-[48px] max-h-[120px]"
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

        {/* Resize Handle */}
        {(hasPrepContent || hasInterviews) && (
          <div
            onMouseDown={handleMouseDown}
            className={cn(
              "w-2 flex-shrink-0 cursor-col-resize flex items-center justify-center group hover:bg-primary/10 rounded transition-colors mx-1",
              isResizing && "bg-primary/20"
            )}
            title="Drag to resize"
          >
            <GripVertical className={cn(
              "w-3 h-3 text-slate-300 group-hover:text-primary transition-colors",
              isResizing && "text-primary"
            )} />
          </div>
        )}

        {/* Right Sidebar - Interviews + Materials */}
        {(hasPrepContent || hasInterviews) && (
          <div
            ref={sidebarRef}
            className="flex flex-col min-h-0 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-border flex-shrink-0"
            style={{ width: sidebarWidth }}
          >
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {/* Interview Timeline Section */}
              {hasInterviews && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowTimelinePanel(!showTimelinePanel)}
                    className="w-full flex items-center justify-between text-xs font-semibold text-foreground-muted uppercase tracking-wide mb-2"
                  >
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      Interviews ({interviews.length})
                    </span>
                    {showTimelinePanel ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                  {showTimelinePanel && (
                    <div className="space-y-0.5">
                      {interviews.map((round) => (
                        <CompactTimelineItem
                          key={round.id}
                          round={round}
                          onOpenPrepModal={handleOpenPrepModal}
                          linkedMaterialsCount={materialsByRound[round.id]?.length || 0}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Interviewer Selector */}
              {contactsWithIntel.length > 0 && (
                <div>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowInterviewerDropdown(!showInterviewerDropdown)}
                      className="flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-lg text-sm hover:border-blue-300 transition-colors w-full"
                    >
                      <Users className="w-4 h-4 text-blue-500" />
                      <span className="text-foreground-muted truncate">
                        {selectedInterviewer
                          ? `${selectedInterviewer.name}`
                          : 'Select interviewer...'}
                      </span>
                      <ChevronDown className="w-4 h-4 text-slate-400 ml-auto flex-shrink-0" />
                    </button>

                    {showInterviewerDropdown && (
                      <div className="absolute top-full left-0 mt-1 bg-surface border border-border rounded-lg shadow-lg z-10 w-full">
                        {contactsWithIntel.map((contact) => (
                          <button
                            key={contact.id}
                            type="button"
                            onClick={() => {
                              setSelectedInterviewerId(contact.id);
                              setShowInterviewerDropdown(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                              selectedInterviewerId === contact.id
                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                : 'text-foreground'
                            }`}
                          >
                            <span className="font-medium">{contact.name}</span>
                            {contact.role && (
                              <span className="text-slate-400 ml-1">• {contact.role}</span>
                            )}
                          </button>
                        ))}
                        {selectedInterviewerId && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedInterviewerId(null);
                              setShowInterviewerDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 border-t border-slate-100 dark:border-slate-700"
                          >
                            Clear selection
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Intel Summary */}
                  {selectedInterviewer && (
                    <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800/30">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-blue-500" />
                          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                            Intel: {selectedInterviewer.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedInterviewerId(null)}
                          className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800/30 rounded"
                          title="Clear interviewer selection"
                        >
                          <X className="w-3.5 h-3.5 text-blue-400" />
                        </button>
                      </div>
                      <div className="text-xs text-foreground-muted">
                        <MarkdownContent content={selectedInterviewer.interviewerIntel!} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Generated Interview Prep */}
              {prepMaterial && (
                <div className="p-3 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border border-primary/20">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-primary uppercase tracking-wide flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Interview Prep
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSavePrepMaterial}
                      className="text-xs"
                    >
                      <Bookmark className="w-3.5 h-3.5 mr-1" />
                      Save
                    </Button>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <MarkdownContent content={prepMaterial} />
                  </div>
                </div>
              )}

              {/* Saved Research Materials (General - not linked to rounds) */}
              {materialsByRound.general && materialsByRound.general.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                    <Bookmark className="w-3.5 h-3.5" />
                    Saved Research ({materialsByRound.general.length})
                  </h4>
                  {materialsByRound.general.map((material) => (
                    <div
                      key={material.id}
                      className="group p-2.5 bg-surface rounded-lg border border-border"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <details className="flex-1 min-w-0">
                          <summary className="cursor-pointer text-sm font-medium text-foreground hover:text-primary truncate">
                            {material.title}
                          </summary>
                          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 max-h-40 overflow-y-auto">
                            <MarkdownContent content={material.content} />
                          </div>
                        </details>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleDownloadPrepMaterial(material.title, material.content)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded text-slate-400 hover:text-blue-500 transition-all"
                            title="Download as PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePrepMaterial(material.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-slate-400 hover:text-red-500 transition-all"
                            title="Delete research"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Saved Chats */}
              {job.savedPrepConversations && job.savedPrepConversations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                    <FolderOpen className="w-3.5 h-3.5" />
                    Saved Chats ({job.savedPrepConversations.length})
                  </h4>
                  {job.savedPrepConversations.map((saved) => (
                    <div
                      key={saved.id}
                      className="group p-2.5 bg-surface rounded-lg border border-border"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {saved.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {saved.entries.length} messages · {format(new Date(saved.savedAt), 'MMM d')}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleLoadChat(saved.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded text-slate-400 hover:text-blue-500 transition-all"
                            title="Load this chat"
                          >
                            <Upload className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSavedChat(saved.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-slate-400 hover:text-red-500 transition-all"
                            title="Delete saved chat"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
