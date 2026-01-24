import { useState, useRef, useEffect, useMemo } from 'react';
import { Loader2, Copy, RefreshCw, Check, AlertCircle, MessageSquare, Send, X, Mail } from 'lucide-react';
import { Button, Textarea, ThinkingBubble } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { generateEmailDraft, refineEmail } from '../../services/ai';
import { isAIConfigured, generateId } from '../../utils/helpers';
import { useAIOperation } from '../../hooks/useAIOperation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Job, EmailDraftEntry, EmailType } from '../../types';

interface EmailsTabProps {
  job: Job;
}

const EMAIL_TYPES: { type: EmailType; label: string; description: string }[] = [
  { type: 'thank-you', label: 'Thank You', description: 'After an interview' },
  { type: 'follow-up', label: 'Follow Up', description: 'Check application status' },
  { type: 'withdraw', label: 'Withdraw', description: 'Remove from consideration' },
  { type: 'negotiate', label: 'Negotiate', description: 'Discuss offer terms' },
  { type: 'custom', label: 'Custom', description: 'Specify your own email type' },
];

export function EmailsTab({ job }: EmailsTabProps) {
  const { settings, updateJob } = useAppStore();
  const [selectedType, setSelectedType] = useState<EmailType>(job.emailDraftType || 'thank-you');
  const [customType, setCustomType] = useState(job.emailDraftCustomType || '');
  const [additionalContext, setAdditionalContext] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [editedEmail, setEditedEmail] = useState(job.emailDraft || '');
  const [userMessage, setUserMessage] = useState('');

  const generateOp = useAIOperation<string>('email-generation');
  const refineOp = useAIOperation<{ reply: string; updatedEmail: string }>('email-refinement');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasAIConfigured = isAIConfigured(settings);
  const resumeText = job.resumeText || settings.defaultResumeText;
  const history = useMemo(() => job.emailDraftHistory || [], [job.emailDraftHistory]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  useEffect(() => {
    setEditedEmail(job.emailDraft || '');
  }, [job.emailDraft]);

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  };

  const handleGenerate = async () => {
    if (!hasAIConfigured) {
      return;
    }

    const email = await generateOp.execute(async () => {
      return await generateEmailDraft(
        { title: job.title, company: job.company, summary: job.summary },
        resumeText,
        selectedType,
        additionalContext,
        selectedType === 'custom' ? customType : undefined
      );
    });

    if (email) {
      setEditedEmail(email);
      await updateJob(job.id, {
        emailDraft: email,
        emailDraftType: selectedType,
        emailDraftCustomType: selectedType === 'custom' ? customType : undefined,
        emailDraftHistory: [],
      });
    }
  };

  const handleSave = async () => {
    await updateJob(job.id, { emailDraft: editedEmail });
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(editedEmail);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSendMessage = async () => {
    if (!userMessage.trim() || !hasAIConfigured || !job.emailDraftType) return;

    const messageContent = userMessage.trim();
    setUserMessage('');
    refineOp.reset();

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const userEntry: EmailDraftEntry = {
      id: generateId(),
      role: 'user',
      content: messageContent,
      timestamp: new Date(),
    };

    // Optimistic update: show user message immediately
    const originalHistory = history;
    await updateJob(job.id, {
      emailDraftHistory: [...history, userEntry],
    });

    const result = await refineOp.execute(async () => {
      return await refineEmail(
        { title: job.title, company: job.company },
        job.emailDraftType!, // Safe: guarded by early return
        editedEmail,
        originalHistory,
        messageContent,
        job.emailDraftCustomType
      );
    });

    if (result) {
      const { reply, updatedEmail } = result;

      const assistantEntry: EmailDraftEntry = {
        id: generateId(),
        role: 'assistant',
        content: reply,
        emailSnapshot: updatedEmail,
        timestamp: new Date(),
      };

      setEditedEmail(updatedEmail);
      await updateJob(job.id, {
        emailDraft: updatedEmail,
        emailDraftHistory: [...originalHistory, userEntry, assistantEntry],
      });
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
    'Make it shorter',
    'More direct tone',
    'Warmer greeting',
    'More formal',
    'Add enthusiasm',
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-180px)]">
      {/* Email Type Selector */}
      <div className="mb-4">
        <label className="text-xs text-slate-500 mb-2 block">Email Type</label>
        <div className="flex flex-wrap gap-2">
          {EMAIL_TYPES.map(({ type, label, description }) => (
            <button
              key={type}
              type="button"
              onClick={() => setSelectedType(type)}
              className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedType === type
                  ? 'bg-teal-500 text-white'
                  : 'bg-surface border border-border text-foreground hover:border-teal-300'
              }`}
              title={description}
            >
              {label}
            </button>
          ))}
        </div>
        {/* Custom Type Input */}
        {selectedType === 'custom' && (
          <div className="mt-3">
            <input
              type="text"
              value={customType}
              onChange={(e) => setCustomType(e.target.value)}
              placeholder="Describe your email type (e.g., 'Requesting informational interview', 'Asking for referral')"
              className="w-full px-3 py-2 text-sm border border-teal-300 dark:border-teal-700 rounded-lg bg-surface text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        )}
      </div>

      {/* Additional Context (only when no email generated yet) */}
      {!editedEmail && (
        <div className="mb-4">
          <label className="text-xs text-slate-500 mb-2 block">
            Additional Context (optional)
          </label>
          <Textarea
            value={additionalContext}
            onChange={(e) => setAdditionalContext(e.target.value)}
            placeholder="Any specific details to include? (e.g., 'I spoke with John about the ML project', 'I'd like to negotiate for 10% more')"
            rows={2}
            className="text-sm"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mb-3">
        <Button
          onClick={handleGenerate}
          disabled={generateOp.isLoading || !hasAIConfigured || (selectedType === 'custom' && !customType.trim())}
          className="bg-teal-500 hover:bg-teal-600"
        >
          {generateOp.isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              Generating...
            </>
          ) : editedEmail ? (
            <>
              <RefreshCw className="w-4 h-4 mr-1" />
              Regenerate
            </>
          ) : (
            <>
              <Mail className="w-4 h-4 mr-1" />
              Generate Email
            </>
          )}
        </Button>

        {editedEmail && !isRefining && (
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

        {editedEmail && (
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
      </div>

      {(generateOp.error || refineOp.error) && (
        <div className="flex items-center gap-2 text-sm text-danger mb-3">
          <AlertCircle className="w-4 h-4" />
          {generateOp.error || refineOp.error}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {editedEmail ? (
          <>
            {/* Email Display/Editor */}
            <div className={`${isRefining ? 'h-1/2' : 'flex-1'} overflow-y-auto mb-3`}>
              {isRefining ? (
                <div className="h-full p-4 bg-surface rounded-lg border border-teal-200 dark:border-teal-800/30 overflow-y-auto">
                  <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                    {editedEmail}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Textarea
                    value={editedEmail}
                    onChange={(e) => setEditedEmail(e.target.value)}
                    rows={12}
                    className="text-sm leading-relaxed"
                  />
                  {editedEmail !== job.emailDraft && (
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
              <div className="h-1/2 flex flex-col min-h-0 bg-teal-50 dark:bg-teal-900/20 rounded-xl overflow-hidden border border-teal-100 dark:border-teal-800/30">
                <div className="px-3 py-2 border-b border-teal-200 dark:border-teal-800/30">
                  <h3 className="text-sm font-medium text-teal-700 dark:text-teal-300">
                    Refine Your Email
                  </h3>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {history.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                      <p className="text-sm text-slate-500 mb-4">
                        Ask for changes: tone, length, style, specific sections...
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {suggestedPrompts.map((prompt, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setUserMessage(prompt)}
                            className="text-xs px-3 py-1.5 bg-surface rounded-full border border-teal-200 dark:border-teal-700 hover:border-teal-400 transition-colors"
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
                                ? 'bg-teal-500 text-white rounded-br-sm'
                                : 'bg-surface border border-border rounded-bl-sm'
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
                      {refineOp.isLoading && <ThinkingBubble />}
                      <div ref={chatEndRef} />
                    </>
                  )}
                </div>

                {/* Chat Input */}
                <div className="p-3 border-t border-teal-200 dark:border-teal-800/30">
                  <div className="relative">
                    <textarea
                      ref={textareaRef}
                      value={userMessage}
                      onChange={(e) => {
                        setUserMessage(e.target.value);
                        adjustTextareaHeight();
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder="Describe how you'd like to change the email..."
                      rows={1}
                      className="w-full pr-12 py-2 px-3 bg-surface border border-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/50 text-sm"
                      style={{ minHeight: '40px', maxHeight: '120px' }}
                    />
                    <button
                      type="button"
                      onClick={handleSendMessage}
                      disabled={refineOp.isLoading || !userMessage.trim()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-teal-500 hover:bg-teal-600 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                      title="Send message"
                    >
                      {refineOp.isLoading ? (
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
          <div className="flex-1 flex items-center justify-center bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-100 dark:border-teal-800/30">
            <div className="text-center p-6">
              <Mail className="w-12 h-12 mx-auto mb-3 text-teal-300" />
              <p className="text-slate-500 mb-2">
                Select an email type and click "Generate Email"
              </p>
              <p className="text-xs text-slate-400">
                Create thank you notes, follow-ups, withdrawal emails, or negotiation messages
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
