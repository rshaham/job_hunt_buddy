import { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Play, ChevronDown, ThumbsUp, ThumbsDown, Bookmark, Plus, Loader2 } from 'lucide-react';
import { cn } from '../../utils/helpers';
import { useAppStore } from '../../stores/appStore';
import { generateRealtimeTeleprompterKeywords } from '../../services/ai';
import type { Job, TeleprompterInterviewType, TeleprompterCustomType, TeleprompterRoundupItem } from '../../types';
import { TELEPROMPTER_INTERVIEW_TYPE_LABELS } from '../../types';
import { ContextPanel } from './ContextPanel';

type ModalState = 'setup' | 'active' | 'roundup';

export function TeleprompterModal() {
  const {
    isTeleprompterModalOpen,
    closeTeleprompterModal,
    teleprompterPreSelectedJobId,
    teleprompterSession,
    jobs,
    teleprompterCustomTypes,
    startTeleprompterSession,
    loadTeleprompterCustomTypes,
  } = useAppStore();

  const [modalState, setModalState] = useState<ModalState>('setup');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedInterviewType, setSelectedInterviewType] = useState<TeleprompterInterviewType>('behavioral');
  const [customTypeName, setCustomTypeName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Initialize with pre-selected job
  useEffect(() => {
    if (isTeleprompterModalOpen) {
      setSelectedJobId(teleprompterPreSelectedJobId);
      loadTeleprompterCustomTypes();

      // Resume active session if exists
      if (teleprompterSession?.isActive) {
        setModalState('active');
      } else {
        setModalState('setup');
      }
    }
  }, [isTeleprompterModalOpen, teleprompterPreSelectedJobId, teleprompterSession, loadTeleprompterCustomTypes]);

  const handleStart = useCallback(async () => {
    setIsLoading(true);
    try {
      const customType = selectedInterviewType === 'custom' ? customTypeName : undefined;
      await startTeleprompterSession(selectedJobId, selectedInterviewType, customType);
      setModalState('active');
    } finally {
      setIsLoading(false);
    }
  }, [selectedJobId, selectedInterviewType, customTypeName, startTeleprompterSession]);

  // Protected close - only from explicit action
  const handleClose = useCallback(() => {
    if (modalState === 'active') {
      // Don't allow close during active session - must end interview first
      return;
    }
    closeTeleprompterModal();
    setModalState('setup');
    setSelectedJobId(null);
    setCustomTypeName('');
  }, [modalState, closeTeleprompterModal]);

  if (!isTeleprompterModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop - does NOT close on click */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-surface rounded-lg shadow-xl w-full max-w-5xl h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-2xl font-semibold text-foreground">
            Interview Teleprompter
          </h2>
          {modalState !== 'active' && (
            <button
              onClick={handleClose}
              className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="w-6 h-6 text-foreground-muted" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {modalState === 'setup' && (
            <SetupScreen
              jobs={jobs}
              selectedJobId={selectedJobId}
              onJobSelect={setSelectedJobId}
              selectedInterviewType={selectedInterviewType}
              onInterviewTypeSelect={setSelectedInterviewType}
              customTypeName={customTypeName}
              onCustomTypeNameChange={setCustomTypeName}
              teleprompterCustomTypes={teleprompterCustomTypes}
              onStart={handleStart}
              isLoading={isLoading}
            />
          )}

          {modalState === 'active' && (
            <ActiveScreen onEndInterview={() => setModalState('roundup')} />
          )}

          {modalState === 'roundup' && (
            <RoundupScreen onComplete={handleClose} />
          )}
        </div>
      </div>
    </div>
  );
}

// Setup Screen Component
interface SetupScreenProps {
  jobs: Job[];
  selectedJobId: string | null;
  onJobSelect: (id: string | null) => void;
  selectedInterviewType: TeleprompterInterviewType;
  onInterviewTypeSelect: (type: TeleprompterInterviewType) => void;
  customTypeName: string;
  onCustomTypeNameChange: (name: string) => void;
  teleprompterCustomTypes: TeleprompterCustomType[];
  onStart: () => void;
  isLoading: boolean;
}

function SetupScreen({
  jobs,
  selectedJobId,
  onJobSelect,
  selectedInterviewType,
  onInterviewTypeSelect,
  customTypeName,
  onCustomTypeNameChange,
  teleprompterCustomTypes,
  onStart,
  isLoading,
}: SetupScreenProps) {
  const interviewTypes = Object.entries(TELEPROMPTER_INTERVIEW_TYPE_LABELS) as [TeleprompterInterviewType, string][];

  // Only show jobs that are in interview-relevant stages
  const RELEVANT_STATUSES = ['applied', 'screening', 'interviewing'];
  const relevantJobs = jobs.filter(job =>
    RELEVANT_STATUSES.includes(job.status.toLowerCase())
  );

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div className="text-center">
        <h3 className="text-3xl font-bold text-foreground mb-2">
          Get Ready for Your Interview
        </h3>
        <p className="text-lg text-foreground-muted">
          Select your job and interview type to begin
        </p>
      </div>

      {/* Job Selection */}
      <div className="space-y-3">
        <label className="block text-xl font-medium text-foreground">
          Job (optional)
        </label>
        <select
          value={selectedJobId || ''}
          onChange={(e) => onJobSelect(e.target.value || null)}
          className="w-full px-4 py-4 text-xl border border-border rounded-lg bg-surface text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
        >
          <option value="">No job selected</option>
          {relevantJobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.company} - {job.title}
            </option>
          ))}
        </select>
      </div>

      {/* Interview Type Selection */}
      <div className="space-y-3">
        <label className="block text-xl font-medium text-foreground">
          Interview Type
        </label>
        <div className="grid grid-cols-2 gap-3">
          {interviewTypes.map(([type, label]) => (
            <button
              key={type}
              onClick={() => onInterviewTypeSelect(type)}
              className={cn(
                'px-4 py-4 text-lg font-medium rounded-lg border-2 transition-colors',
                selectedInterviewType === type
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-primary/50 text-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Custom type input */}
        {selectedInterviewType === 'custom' && (
          <input
            type="text"
            value={customTypeName}
            onChange={(e) => onCustomTypeNameChange(e.target.value)}
            placeholder="Enter interview type..."
            className="w-full px-4 py-4 text-xl border border-border rounded-lg bg-surface text-foreground focus:ring-2 focus:ring-primary mt-3"
          />
        )}

        {/* Saved custom types */}
        {teleprompterCustomTypes.length > 0 && (
          <div className="mt-3">
            <p className="text-sm text-foreground-muted mb-2">Saved types:</p>
            <div className="flex flex-wrap gap-2">
              {teleprompterCustomTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => {
                    onInterviewTypeSelect('custom');
                    onCustomTypeNameChange(type.name);
                  }}
                  className="px-3 py-1 text-sm bg-surface-raised rounded-full text-foreground-muted hover:text-foreground"
                >
                  {type.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Start Button */}
      <button
        onClick={onStart}
        disabled={isLoading || (selectedInterviewType === 'custom' && !customTypeName.trim())}
        className={cn(
          'w-full py-5 text-2xl font-bold rounded-lg flex items-center justify-center gap-3',
          'bg-primary text-white hover:bg-primary/90 transition-colors',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        {isLoading ? (
          'Preparing...'
        ) : (
          <>
            <Play className="w-7 h-7" />
            Get Ready
          </>
        )}
      </button>
    </div>
  );
}

// Active Screen Component - main teleprompter display during interview
interface ActiveScreenProps {
  onEndInterview: () => void;
}

function ActiveScreen({ onEndInterview }: ActiveScreenProps) {
  const {
    teleprompterSession,
    jobs,
    settings,
    promoteKeywordFromStaging,
    dismissStagingKeyword,
    dismissDisplayedKeyword,
    addKeywordsFromAI,
    addManualKeyword,
    toggleCategory,
    toggleStagingCollapsed,
    promoteAllStagingKeywords,
    dismissAllStagingKeywords,
    setTeleprompterViewMode,
  } = useAppStore();

  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  // State for manual keyword input per category
  const [addingToCategoryId, setAddingToCategoryId] = useState<string | null>(null);
  const [manualKeywordInput, setManualKeywordInput] = useState('');
  // Track keywords added from context panel
  const [contextAddedKeywords, setContextAddedKeywords] = useState<Set<string>>(new Set());

  const job = teleprompterSession?.jobId
    ? jobs.find(j => j.id === teleprompterSession.jobId)
    : null;

  // Collect all existing keywords for tracking what's been added
  const allKeywords = useMemo(() => {
    if (!teleprompterSession) return new Set<string>();
    const keywords = new Set<string>();
    // From categories
    teleprompterSession.categories.forEach(cat => {
      cat.keywords.forEach(k => keywords.add(k.text.toLowerCase()));
    });
    // From staging
    teleprompterSession.stagingKeywords.forEach(k => keywords.add(k.text.toLowerCase()));
    // From context panel additions
    contextAddedKeywords.forEach(k => keywords.add(k.toLowerCase()));
    return keywords;
  }, [teleprompterSession, contextAddedKeywords]);

  // Handle adding a keyword from the context panel - triggers AI generation
  const handleAddFromContext = useCallback(async (text: string) => {
    if (!teleprompterSession || isGenerating) return;

    setIsGenerating(true);
    setContextAddedKeywords(prev => new Set([...prev, text.toLowerCase()]));

    try {
      const currentKeywords = teleprompterSession.categories
        .flatMap(c => c.keywords.map(k => k.text));

      const result = await generateRealtimeTeleprompterKeywords(
        text,  // The context item becomes the prompt
        TELEPROMPTER_INTERVIEW_TYPE_LABELS[teleprompterSession.interviewType],
        job?.company || 'Unknown',
        currentKeywords,
        settings.additionalContext || settings.defaultResumeText || '',
        []
      );

      const keywordTexts = result.map(k => k.text);
      addKeywordsFromAI(text, keywordTexts);  // Context item becomes category name
    } catch (error) {
      console.error('Error generating keywords from context:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [teleprompterSession, job, settings, isGenerating, addKeywordsFromAI]);

  const handleInputSubmit = useCallback(async () => {
    if (!inputValue.trim() || !teleprompterSession || isGenerating) return;

    const promptText = inputValue.trim();
    setIsGenerating(true);
    try {
      const currentKeywords = teleprompterSession.categories
        .flatMap(c => c.keywords.map(k => k.text));

      const result = await generateRealtimeTeleprompterKeywords(
        promptText,
        TELEPROMPTER_INTERVIEW_TYPE_LABELS[teleprompterSession.interviewType],
        job?.company || 'Unknown',
        currentKeywords,
        settings.additionalContext || settings.defaultResumeText || '',
        [] // No category IDs needed - we use the prompt as category name
      );

      // User's prompt becomes the category name, keywords go into that category
      const keywordTexts = result.map(k => k.text);
      addKeywordsFromAI(promptText, keywordTexts);
      setInputValue('');
    } catch (error) {
      console.error('Error generating keywords:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [inputValue, teleprompterSession, job, settings, isGenerating, addKeywordsFromAI]);

  const handleManualKeywordSubmit = useCallback((categoryId: string) => {
    if (!manualKeywordInput.trim()) return;
    addManualKeyword(categoryId, manualKeywordInput);
    setManualKeywordInput('');
    setAddingToCategoryId(null);
  }, [manualKeywordInput, addManualKeyword]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleInputSubmit();
    }
  }, [handleInputSubmit]);

  if (!teleprompterSession) return null;

  return (
    <div className="h-full flex flex-col">
      {/* Top bar with job info and controls */}
      <div className="pb-4 border-b border-border mb-4 space-y-2 flex-shrink-0">
        {/* Row 1: Title + End button */}
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-2xl font-bold text-foreground min-w-0 break-words">
            {job ? `${job.company} - ${job.title}` : 'Interview Mode'}
          </h3>
          <button
            onClick={() => setShowEndConfirm(true)}
            className="flex-shrink-0 px-6 py-3 text-lg font-semibold bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            End Interview
          </button>
        </div>

        {/* Row 2: Interview type + View toggle */}
        <div className="flex items-center justify-between">
          <p className="text-lg text-foreground-muted">
            {TELEPROMPTER_INTERVIEW_TYPE_LABELS[teleprompterSession.interviewType]}
            {teleprompterSession.customInterviewType && `: ${teleprompterSession.customInterviewType}`}
          </p>
          {/* View mode toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setTeleprompterViewMode('categorized')}
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors',
                teleprompterSession.viewMode === 'categorized'
                  ? 'bg-primary text-white'
                  : 'bg-surface text-foreground-muted hover:bg-surface-raised'
              )}
            >
              Categorized
            </button>
            <button
              onClick={() => setTeleprompterViewMode('flat')}
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors',
                teleprompterSession.viewMode === 'flat'
                  ? 'bg-primary text-white'
                  : 'bg-surface text-foreground-muted hover:bg-surface-raised'
              )}
            >
              Flat
            </button>
          </div>
        </div>
      </div>

      {/* Main content area with context panel */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left side - keywords and input */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Staging area for initial suggestions */}
          {(teleprompterSession.isGeneratingInitialKeywords || teleprompterSession.stagingKeywords.length > 0) && (
            <div className="mb-4 bg-surface-raised rounded-lg border border-border overflow-hidden">
              {/* Collapsible header */}
              <button
                onClick={toggleStagingCollapsed}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface transition-colors"
              >
                <span className="text-sm font-medium text-foreground-muted">
                  {teleprompterSession.isGeneratingInitialKeywords
                    ? 'Generating suggestions...'
                    : `AI Suggestions (${teleprompterSession.stagingKeywords.length})`}
                </span>
                <div className="flex items-center gap-2">
                  {teleprompterSession.isGeneratingInitialKeywords ? (
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  ) : (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          promoteAllStagingKeywords();
                        }}
                        className="px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 rounded transition-colors"
                      >
                        Add All
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          dismissAllStagingKeywords();
                        }}
                        className="px-2 py-1 text-xs font-medium text-foreground-muted hover:bg-surface-raised rounded transition-colors"
                      >
                        Dismiss All
                      </button>
                      <ChevronDown
                        className={cn(
                          'w-5 h-5 text-foreground-muted transition-transform',
                          teleprompterSession.isStagingCollapsed && 'rotate-180'
                        )}
                      />
                    </>
                  )}
                </div>
              </button>

              {/* Keywords content - hidden when collapsed or loading */}
              {!teleprompterSession.isStagingCollapsed && !teleprompterSession.isGeneratingInitialKeywords && (
                <div className="px-4 pb-4 flex flex-wrap gap-2">
                  {teleprompterSession.stagingKeywords.map((keyword) => (
                    <button
                      key={keyword.id}
                      onClick={() => promoteKeywordFromStaging(keyword.id)}
                      className="px-3 py-2 text-base bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors"
                    >
                      {keyword.text}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          dismissStagingKeyword(keyword.id);
                        }}
                        className="ml-2 text-primary/60 hover:text-primary"
                      >
                        ×
                      </button>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Main keyword display */}
          <div className="flex-1 overflow-y-auto">
            {teleprompterSession.viewMode === 'categorized' ? (
              /* Categorized view - keywords organized by category */
              <div className="space-y-4">
                {teleprompterSession.categories.map((category) => (
                  <div key={category.id} className="border border-border rounded-lg overflow-hidden">
                    {/* Category header */}
                    <div className="flex items-center bg-surface-raised">
                      <button
                        onClick={() => toggleCategory(category.id)}
                        className="flex-1 flex items-center justify-between px-4 py-3 hover:bg-surface transition-colors"
                      >
                        <span className="text-xl font-semibold text-foreground">
                          {category.name}
                        </span>
                        <ChevronDown
                          className={cn(
                            'w-6 h-6 text-foreground-muted transition-transform',
                            category.isExpanded && 'rotate-180'
                          )}
                        />
                      </button>
                      {/* Add keyword button */}
                      <button
                        onClick={() => setAddingToCategoryId(addingToCategoryId === category.id ? null : category.id)}
                        className={cn(
                          'px-3 py-3 border-l border-border hover:bg-surface transition-colors',
                          addingToCategoryId === category.id && 'bg-primary/10 text-primary'
                        )}
                        title="Add keyword"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Manual keyword input */}
                    {addingToCategoryId === category.id && (
                      <div className="px-4 py-3 border-t border-border bg-surface flex gap-2">
                        <input
                          type="text"
                          value={manualKeywordInput}
                          onChange={(e) => setManualKeywordInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleManualKeywordSubmit(category.id);
                            }
                            if (e.key === 'Escape') {
                              setAddingToCategoryId(null);
                              setManualKeywordInput('');
                            }
                          }}
                          placeholder="Type keyword and press Enter..."
                          autoFocus
                          className="flex-1 px-3 py-2 text-base border border-border rounded bg-surface text-foreground focus:ring-2 focus:ring-primary"
                        />
                        <button
                          onClick={() => handleManualKeywordSubmit(category.id)}
                          disabled={!manualKeywordInput.trim()}
                          className="px-4 py-2 text-sm font-medium bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50 transition-colors"
                        >
                          Add
                        </button>
                      </div>
                    )}

                    {/* Keywords */}
                    {category.isExpanded && (
                      <div className="p-4 flex flex-wrap gap-3">
                        {category.keywords.filter(k => !k.inStaging).length === 0 ? (
                          <p className="text-lg text-foreground-muted italic">
                            No keywords yet. Type below to add some or click + above.
                          </p>
                        ) : (
                          category.keywords
                            .filter(k => !k.inStaging)
                            .map((keyword) => (
                              <button
                                key={keyword.id}
                                onClick={() => dismissDisplayedKeyword(category.id, keyword.id)}
                                className={cn(
                                  'px-4 py-3 text-2xl font-medium rounded-lg transition-all',
                                  'hover:opacity-70 hover:line-through cursor-pointer',
                                  keyword.source === 'profile' && 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200',
                                  keyword.source === 'ai-initial' && 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
                                  keyword.source === 'ai-realtime' && 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
                                  keyword.source === 'user' && 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200',
                                  keyword.source === 'manual' && 'bg-slate-100 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200'
                                )}
                              >
                                {keyword.text}
                              </button>
                            ))
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              /* Flat view - all keywords in a single container */
              <div className="p-4 flex flex-wrap gap-3">
                {teleprompterSession.categories.flatMap(category =>
                  category.keywords
                    .filter(k => !k.inStaging)
                    .map(keyword => (
                      <button
                        key={keyword.id}
                        title={category.name}
                        onClick={() => dismissDisplayedKeyword(category.id, keyword.id)}
                        className={cn(
                          'px-4 py-3 text-2xl font-medium rounded-lg transition-all',
                          'hover:opacity-70 hover:line-through cursor-pointer',
                          keyword.source === 'profile' && 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200',
                          keyword.source === 'ai-initial' && 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
                          keyword.source === 'ai-realtime' && 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
                          keyword.source === 'user' && 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200',
                          keyword.source === 'manual' && 'bg-slate-100 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200'
                        )}
                      >
                        {keyword.text}
                      </button>
                    ))
                )}
                {teleprompterSession.categories.every(c => c.keywords.filter(k => !k.inStaging).length === 0) && (
                  <p className="text-lg text-foreground-muted italic">
                    No keywords yet. Type below to add some.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Input area - always visible at bottom */}
          <div className="mt-4 pt-4 border-t border-border flex-shrink-0">
            <div className="flex gap-3">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a keyword for AI suggestions..."
                disabled={isGenerating}
                className="flex-1 px-4 py-4 text-xl border border-border rounded-lg bg-surface text-foreground focus:ring-2 focus:ring-primary disabled:opacity-50"
              />
              <button
                onClick={handleInputSubmit}
                disabled={!inputValue.trim() || isGenerating}
                className="px-6 py-4 text-xl font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isGenerating ? '...' : 'Add'}
              </button>
            </div>
          </div>
        </div>

        {/* Right side - context panel */}
        <ContextPanel
          job={job || null}
          addedKeywords={allKeywords}
          onAddKeyword={handleAddFromContext}
        />
      </div>

      {/* End confirmation modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50">
          <div className="bg-surface rounded-lg p-6 max-w-md mx-4">
            <h4 className="text-xl font-bold text-foreground mb-2">
              End Interview?
            </h4>
            <p className="text-foreground-muted mb-4">
              You'll be able to review which keywords were helpful before closing.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-surface-raised transition-colors"
              >
                Continue Interview
              </button>
              <button
                onClick={() => {
                  setShowEndConfirm(false);
                  onEndInterview();
                }}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                End Interview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface RoundupScreenProps {
  onComplete: () => void;
}

function RoundupScreen({ onComplete }: RoundupScreenProps) {
  const {
    endTeleprompterSession,
    saveTeleprompterFeedback,
    saveTeleprompterCustomType,
    teleprompterSession,
  } = useAppStore();

  const [roundupItems, setRoundupItems] = useState<TeleprompterRoundupItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [askSaveCustomType, setAskSaveCustomType] = useState(false);

  // Load roundup items on mount
  useEffect(() => {
    const loadRoundup = async () => {
      const items = await endTeleprompterSession();
      setRoundupItems(items);

      // Check if custom type should be saved
      if (teleprompterSession?.interviewType === 'custom' && teleprompterSession.customInterviewType) {
        setAskSaveCustomType(true);
      }
    };
    loadRoundup();
  }, [endTeleprompterSession, teleprompterSession]);

  const toggleHelpful = useCallback((index: number, helpful: boolean) => {
    setRoundupItems(items => items.map((item, i) =>
      i === index ? { ...item, helpful: item.helpful === helpful ? undefined : helpful } : item
    ));
  }, []);

  const toggleSaveToProfile = useCallback((index: number) => {
    setRoundupItems(items => items.map((item, i) =>
      i === index ? { ...item, saveToProfile: !item.saveToProfile } : item
    ));
  }, []);

  const handleComplete = useCallback(async () => {
    setIsSaving(true);
    try {
      await saveTeleprompterFeedback(roundupItems);
      onComplete();
    } finally {
      setIsSaving(false);
    }
  }, [roundupItems, saveTeleprompterFeedback, onComplete]);

  const handleSaveCustomType = useCallback(async () => {
    if (teleprompterSession?.customInterviewType) {
      await saveTeleprompterCustomType(teleprompterSession.customInterviewType);
    }
    setAskSaveCustomType(false);
  }, [teleprompterSession, saveTeleprompterCustomType]);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <h3 className="text-3xl font-bold text-foreground mb-2">
          Interview Complete!
        </h3>
        <p className="text-lg text-foreground-muted">
          Review which keywords helped you. This feedback improves future suggestions.
        </p>
      </div>

      {/* Custom type save prompt */}
      {askSaveCustomType && (
        <div className="mb-6 p-4 bg-primary/10 border border-primary/30 rounded-lg flex items-center justify-between">
          <p className="text-foreground">
            Save "{teleprompterSession?.customInterviewType}" as a custom interview type?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setAskSaveCustomType(false)}
              className="px-3 py-1 text-foreground-muted hover:text-foreground"
            >
              No
            </button>
            <button
              onClick={handleSaveCustomType}
              className="px-3 py-1 bg-primary text-white rounded hover:bg-primary/90"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Roundup items */}
      <div className="space-y-3 mb-6">
        {roundupItems.length === 0 ? (
          <p className="text-center text-foreground-muted py-8">
            No keywords were displayed during this interview.
          </p>
        ) : (
          roundupItems.map((item, index) => (
            <div
              key={item.keyword.id}
              className="flex items-center gap-4 p-4 bg-surface-raised rounded-lg border border-border"
            >
              <div className="flex-1">
                <p className="text-xl font-medium text-foreground">
                  {item.keyword.text}
                </p>
                <p className="text-sm text-foreground-muted">
                  {item.categoryName}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Helpful buttons */}
                <button
                  onClick={() => toggleHelpful(index, true)}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    item.helpful === true
                      ? 'bg-green-500 text-white'
                      : 'bg-surface hover:bg-green-100 dark:hover:bg-green-900/30 text-foreground-muted'
                  )}
                  title="Helpful"
                >
                  <ThumbsUp className="w-5 h-5" />
                </button>
                <button
                  onClick={() => toggleHelpful(index, false)}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    item.helpful === false
                      ? 'bg-red-500 text-white'
                      : 'bg-surface hover:bg-red-100 dark:hover:bg-red-900/30 text-foreground-muted'
                  )}
                  title="Not helpful"
                >
                  <ThumbsDown className="w-5 h-5" />
                </button>

                {/* Save to profile */}
                <button
                  onClick={() => toggleSaveToProfile(index)}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    item.saveToProfile
                      ? 'bg-amber-500 text-white'
                      : 'bg-surface hover:bg-amber-100 dark:hover:bg-amber-900/30 text-foreground-muted'
                  )}
                  title="Save to profile"
                >
                  <Bookmark className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Done button */}
      <button
        onClick={handleComplete}
        disabled={isSaving}
        className="w-full py-4 text-xl font-bold bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {isSaving ? 'Saving...' : 'Done'}
      </button>
    </div>
  );
}
