import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Send, Loader2, Sparkles, AlertCircle, Calendar, Clock, MapPin, Users,
  ChevronDown, FileText, Trash2, Download, Bookmark, ExternalLink, User,
  MessageCircle, AlertTriangle, Target, Lightbulb
} from 'lucide-react';
import { Button, Modal, ThinkingBubble, MarkdownContent } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { chatAboutJob, generateInterviewPrep, rewriteForMemory } from '../../services/ai';
import { isAIConfigured, generateId, cn } from '../../utils/helpers';
import { exportMarkdownToPdf, generatePdfFilename } from '../../utils/pdfExport';
import { showToast } from '../../stores/toastStore';
import { format } from 'date-fns';
import type { Job, InterviewRound, QAEntry, SavedStory, PrepMaterial } from '../../types';
import { getInterviewTypeLabel } from '../../types';
import { parseInterviewerIntel, isJsonIntel, type ParsedIntel } from '../TeleprompterModal/ContextPanel/intelParser';

interface InterviewPrepModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job;
  interviewRound: InterviewRound;
}

// Structured intel display component for parsed JSON intel
function StructuredIntelDisplay({ intel }: { intel: ParsedIntel }) {
  return (
    <div className="space-y-4 text-sm">
      {/* Communication Style */}
      {intel.communicationStyle && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <MessageCircle className="w-4 h-4 text-blue-500" />
            <h3 className="font-semibold text-foreground">Communication Style</h3>
          </div>
          <div className="text-foreground-muted leading-relaxed pl-5">
            <MarkdownContent content={intel.communicationStyle} />
          </div>
        </div>
      )}

      {/* What They Value */}
      {intel.whatTheyValue.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Target className="w-4 h-4 text-emerald-500" />
            <h3 className="font-semibold text-foreground">What They Value</h3>
          </div>
          <ul className="list-disc pl-9 space-y-0.5">
            {intel.whatTheyValue.map((item, idx) => (
              <li key={idx} className="text-foreground-muted leading-relaxed">
                <MarkdownContent content={item} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Talking Points */}
      {intel.talkingPoints.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <h3 className="font-semibold text-foreground">Talking Points</h3>
          </div>
          <ul className="list-disc pl-9 space-y-0.5">
            {intel.talkingPoints.map((item, idx) => (
              <li key={idx} className="text-foreground-muted leading-relaxed">
                <MarkdownContent content={item} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Questions to Ask */}
      {intel.questionsToAsk.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <MessageCircle className="w-4 h-4 text-purple-500" />
            <h3 className="font-semibold text-foreground">Questions to Ask</h3>
          </div>
          <ul className="list-disc pl-9 space-y-0.5">
            {intel.questionsToAsk.map((item, idx) => (
              <li key={idx} className="text-foreground-muted leading-relaxed">
                <MarkdownContent content={item} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Common Ground */}
      {intel.commonGround.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Users className="w-4 h-4 text-cyan-500" />
            <h3 className="font-semibold text-foreground">Common Ground</h3>
          </div>
          <ul className="list-disc pl-9 space-y-0.5">
            {intel.commonGround.map((item, idx) => (
              <li key={idx} className="text-foreground-muted leading-relaxed">
                <MarkdownContent content={item} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Red Flags to Avoid */}
      {intel.redFlags.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h3 className="font-semibold text-red-600 dark:text-red-400">Red Flags to Avoid</h3>
          </div>
          <ul className="list-disc pl-9 space-y-0.5">
            {intel.redFlags.map((item, idx) => (
              <li key={idx} className="text-red-600 dark:text-red-400 leading-relaxed">
                <MarkdownContent content={item} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Smart intel renderer that detects format and renders appropriately
function IntelDisplay({ content }: { content: string }) {
  // Only use structured display for JSON format
  // For legacy markdown format, render with full markdown support (preserves tables)
  if (isJsonIntel(content)) {
    const parsed = parseInterviewerIntel(content);
    return <StructuredIntelDisplay intel={parsed} />;
  }
  return <MarkdownContent content={content} />;
}

export function InterviewPrepModal({ isOpen, onClose, job, interviewRound }: InterviewPrepModalProps) {
  const { settings, updateJob, updateSettings } = useAppStore();
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPrep, setIsGeneratingPrep] = useState(false);
  const [isSavingMemory, setIsSavingMemory] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [selectedInterviewerId, setSelectedInterviewerId] = useState<string | null>(null);
  const [showInterviewerDropdown, setShowInterviewerDropdown] = useState(false);

  // Local chat history for this modal session (scoped to interview round)
  const [localChat, setLocalChat] = useState<QAEntry[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasAIConfigured = isAIConfigured(settings);
  const resumeText = job.resumeText || settings.defaultResumeText;

  // Get interviewers for this round
  const interviewers = useMemo(() => {
    return job.contacts?.filter(c => interviewRound.interviewerIds?.includes(c.id)) || [];
  }, [job.contacts, interviewRound.interviewerIds]);

  // Get materials linked to this round
  const linkedMaterials = useMemo(() => {
    return (job.prepMaterials || []).filter(m => m.interviewRoundId === interviewRound.id);
  }, [job.prepMaterials, interviewRound.id]);

  // Get selected interviewer
  const selectedInterviewer = interviewers.find(c => c.id === selectedInterviewerId);

  // Auto-select first interviewer with intel
  useEffect(() => {
    if (isOpen && !selectedInterviewerId) {
      const withIntel = interviewers.find(c => c.interviewerIntel);
      if (withIntel) {
        setSelectedInterviewerId(withIntel.id);
      } else if (interviewers.length === 1) {
        setSelectedInterviewerId(interviewers[0].id);
      }
    }
  }, [isOpen, interviewers, selectedInterviewerId]);

  // Scroll to bottom when chat updates
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localChat]);

  // Reset state when modal opens with new round
  useEffect(() => {
    if (isOpen) {
      setLocalChat([]);
      setQuestion('');
      setError('');
    }
  }, [isOpen, interviewRound.id]);

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';
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

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Add user question with pending answer
    const pendingEntry: QAEntry = {
      id: generateId(),
      question: userQuestion,
      answer: null,
      timestamp: new Date(),
    };

    setLocalChat(prev => [...prev, pendingEntry]);
    setIsLoading(true);

    try {
      // Build context including interview round info
      const interviewContext = `
Preparing for: ${getInterviewTypeLabel(interviewRound.type, settings.customInterviewTypes)}
${interviewRound.scheduledAt ? `Date: ${format(new Date(interviewRound.scheduledAt), 'MMMM d, yyyy h:mm a')}` : ''}
${interviewRound.location ? `Location: ${interviewRound.location}` : ''}
${interviewers.length > 0 ? `Interviewers: ${interviewers.map(i => `${i.name}${i.role ? ` (${i.role})` : ''}`).join(', ')}` : ''}
${interviewRound.notes ? `Notes: ${interviewRound.notes}` : ''}
${selectedInterviewer?.interviewerIntel ? `\nInterviewer Intel for ${selectedInterviewer.name}:\n${selectedInterviewer.interviewerIntel}` : ''}
      `.trim();

      const response = await chatAboutJob(
        job.jdText + '\n\n---\n\nINTERVIEW CONTEXT:\n' + interviewContext,
        resumeText,
        localChat.filter(e => e.answer !== null), // Only include completed entries
        userQuestion
      );

      setLocalChat(prev =>
        prev.map(e => e.id === pendingEntry.id ? { ...e, answer: response.answer } : e)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
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
      const interviewContext = {
        type: getInterviewTypeLabel(interviewRound.type, settings.customInterviewTypes),
        interviewers: interviewers.map(c => ({
          name: c.name,
          role: c.role,
          intel: c.interviewerIntel,
        })),
        notes: interviewRound.notes,
        scheduledAt: interviewRound.scheduledAt,
      };

      const prep = await generateInterviewPrep(job.jdText, resumeText, job, interviewContext);

      // Save directly as material linked to this round
      const newMaterial: PrepMaterial = {
        id: generateId(),
        title: `${getInterviewTypeLabel(interviewRound.type, settings.customInterviewTypes)} Prep - ${format(new Date(), 'MMM d, yyyy')}`,
        content: prep,
        type: 'research',
        interviewRoundId: interviewRound.id,
      };

      await updateJob(job.id, {
        prepMaterials: [...(job.prepMaterials || []), newMaterial],
      });

      showToast('Prep material saved', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate prep');
    } finally {
      setIsGeneratingPrep(false);
    }
  };

  const handleSaveToMemory = async (entryId: string, q: string, answer: string) => {
    setIsSavingMemory(entryId);
    try {
      const cleaned = await rewriteForMemory(q, answer);
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
    } catch {
      showToast('Failed to save', 'error');
    } finally {
      setIsSavingMemory(null);
    }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    const updated = (job.prepMaterials || []).filter(m => m.id !== materialId);
    await updateJob(job.id, { prepMaterials: updated });
    showToast('Material deleted', 'success');
  };

  const handleDownloadMaterial = async (title: string, content: string) => {
    try {
      const filename = generatePdfFilename(job.company, job.title, title.slice(0, 30));
      await exportMarkdownToPdf(content, { filename, title });
      showToast('Downloaded as PDF', 'success');
    } catch {
      showToast('Failed to download', 'error');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const interviewTypeLabel = getInterviewTypeLabel(interviewRound.type, settings.customInterviewTypes);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Interview Prep" size="full">
      <div className="flex flex-col h-[85vh]">
        {/* Interview Context Header - Compact */}
        <div className="px-6 py-4 border-b border-border bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                Round {interviewRound.roundNumber}
              </span>
              <h3 className="text-xl font-semibold text-foreground">{interviewTypeLabel}</h3>
            </div>
            <div className="flex items-center gap-4 text-sm text-foreground-muted">
              {interviewRound.scheduledAt && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(interviewRound.scheduledAt), 'MMM d, yyyy • h:mm a')}
                </span>
              )}
              {interviewRound.duration && (
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {interviewRound.duration} min
                </span>
              )}
              {interviewRound.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {interviewRound.location}
                </span>
              )}
              {interviewers.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  {interviewers.map(i => i.name).join(', ')}
                </span>
              )}
            </div>
          </div>
          {interviewRound.notes && (
            <p className="mt-2 text-sm text-foreground-muted">{interviewRound.notes}</p>
          )}
        </div>

        {/* Main content area - two columns */}
        <div className="flex flex-1 min-h-0">
          {/* Left column - Chat (wider) */}
          <div className="flex-1 flex flex-col min-w-0 border-r border-border">
            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {localChat.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <MessageCircle className="w-8 h-8 text-primary" />
                  </div>
                  <h4 className="text-lg font-medium text-foreground mb-2">
                    Prepare for your {interviewTypeLabel}
                  </h4>
                  <p className="text-sm text-foreground-muted mb-6 max-w-md">
                    Ask questions about this interview round. Context from the interviewers
                    and round details will be automatically included.
                  </p>
                  <div className="space-y-2 w-full max-w-md">
                    {[
                      'What questions might they ask?',
                      'How should I prepare for this type of interview?',
                      'What should I highlight from my background?',
                      'What are potential challenges I should prepare for?',
                    ].map((q, i) => (
                      <button
                        key={i}
                        type="button"
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
                  {localChat.map((entry) => (
                    <div key={entry.id} className="space-y-3">
                      {/* User question */}
                      <div className="flex justify-end">
                        <div className="max-w-[75%]">
                          <div className="p-3 bg-primary text-white rounded-2xl rounded-br-sm text-sm">
                            {entry.question}
                          </div>
                        </div>
                      </div>
                      {/* AI answer */}
                      {entry.answer === null ? (
                        <ThinkingBubble />
                      ) : (
                        <div className="flex justify-start">
                          <div className="max-w-[75%]">
                            <div className="p-4 bg-surface rounded-2xl rounded-bl-sm border border-border">
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
              <div className="px-6 py-2 flex items-center gap-2 text-sm text-danger">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Chat input */}
            <div className="p-4 border-t border-border">
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={question}
                  onChange={(e) => {
                    setQuestion(e.target.value);
                    adjustTextareaHeight();
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about this interview..."
                  rows={1}
                  className="w-full pr-14 py-3 px-4 bg-surface border border-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm min-h-[48px] max-h-[120px]"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={isLoading || !question.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-primary hover:bg-primary/90 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right column - Interviewer Intel & Materials (wider) */}
          <div className="w-[380px] flex flex-col bg-slate-50 dark:bg-slate-800/30">
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Interviewer Intel Section */}
              {interviewers.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-foreground-muted uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    Interviewer Intel
                  </h4>

                  {interviewers.length > 1 && (
                    <div className="relative mb-3">
                      <button
                        type="button"
                        onClick={() => setShowInterviewerDropdown(!showInterviewerDropdown)}
                        className="flex items-center gap-2 px-3 py-2.5 bg-surface border border-border rounded-lg text-sm hover:border-primary/50 transition-colors w-full"
                      >
                        <span className="text-foreground truncate flex-1 text-left">
                          {selectedInterviewer?.name || 'Select interviewer'}
                        </span>
                        <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      </button>

                      {showInterviewerDropdown && (
                        <div className="absolute top-full left-0 mt-1 bg-surface border border-border rounded-lg shadow-lg z-10 w-full">
                          {interviewers.map((contact) => (
                            <button
                              key={contact.id}
                              type="button"
                              onClick={() => {
                                setSelectedInterviewerId(contact.id);
                                setShowInterviewerDropdown(false);
                              }}
                              className={cn(
                                "w-full text-left px-3 py-2.5 text-sm transition-colors first:rounded-t-lg last:rounded-b-lg",
                                selectedInterviewerId === contact.id
                                  ? 'bg-primary/10 text-primary'
                                  : 'text-foreground hover:bg-slate-100 dark:hover:bg-slate-700'
                              )}
                            >
                              <span className="font-medium">{contact.name}</span>
                              {contact.role && (
                                <span className="text-foreground-muted ml-1">• {contact.role}</span>
                              )}
                              {contact.interviewerIntel && (
                                <Sparkles className="w-3 h-3 text-amber-500 inline ml-1" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Show intel for selected/only interviewer */}
                  {selectedInterviewer?.interviewerIntel ? (
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800/30">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span className="font-medium text-amber-700 dark:text-amber-400">
                          {selectedInterviewer.name}
                        </span>
                        {selectedInterviewer.role && (
                          <span className="text-sm text-amber-600 dark:text-amber-500">
                            • {selectedInterviewer.role}
                          </span>
                        )}
                      </div>
                      <IntelDisplay content={selectedInterviewer.interviewerIntel} />
                    </div>
                  ) : selectedInterviewer ? (
                    <div className="p-4 bg-surface rounded-xl border border-border text-sm text-foreground-muted">
                      No intel available for {selectedInterviewer.name}
                    </div>
                  ) : interviewers.length === 0 ? (
                    <div className="p-4 bg-surface rounded-xl border border-border text-sm text-foreground-muted">
                      No interviewers assigned to this round
                    </div>
                  ) : null}
                </div>
              )}

              {/* Materials Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold text-foreground-muted uppercase tracking-wide flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    Prep Materials ({linkedMaterials.length})
                  </h4>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleGeneratePrep}
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
                </div>

                {linkedMaterials.length > 0 ? (
                  <div className="space-y-2">
                    {linkedMaterials.map((material) => (
                      <div
                        key={material.id}
                        className="group p-3 bg-surface rounded-lg border border-border"
                      >
                        <details className="text-sm">
                          <summary className="cursor-pointer font-medium text-foreground hover:text-primary flex items-center justify-between">
                            <span className="truncate">{material.title}</span>
                            <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleDownloadMaterial(material.title, material.content);
                                }}
                                className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded text-slate-400 hover:text-blue-500"
                                title="Download as PDF"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleDeleteMaterial(material.id);
                                }}
                                className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-slate-400 hover:text-red-500"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </summary>
                          <div className="mt-3 pt-3 border-t border-border max-h-64 overflow-y-auto">
                            <MarkdownContent content={material.content} />
                          </div>
                        </details>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-surface rounded-xl border border-border text-sm text-foreground-muted text-center">
                    No prep materials for this round yet.
                    <br />
                    Click "Generate Prep" to create tailored materials.
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border flex justify-between items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                Go to Full Prep Tab
              </Button>
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
