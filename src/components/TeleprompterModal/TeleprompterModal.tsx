import { useState, useEffect, useCallback } from 'react';
import { X, Play, ChevronDown } from 'lucide-react';
import { cn } from '../../utils/helpers';
import { useAppStore } from '../../stores/appStore';
import { generateRealtimeTeleprompterKeywords } from '../../services/ai';
import type { Job, TeleprompterInterviewType, CustomInterviewType } from '../../types';
import { TELEPROMPTER_INTERVIEW_TYPE_LABELS } from '../../types';

type ModalState = 'setup' | 'active' | 'roundup';

export function TeleprompterModal() {
  const {
    isTeleprompterModalOpen,
    closeTeleprompterModal,
    teleprompterPreSelectedJobId,
    teleprompterSession,
    jobs,
    customInterviewTypes,
    startTeleprompterSession,
    loadCustomInterviewTypes,
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
      loadCustomInterviewTypes();

      // Resume active session if exists
      if (teleprompterSession?.isActive) {
        setModalState('active');
      } else {
        setModalState('setup');
      }
    }
  }, [isTeleprompterModalOpen, teleprompterPreSelectedJobId, teleprompterSession, loadCustomInterviewTypes]);

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
              customInterviewTypes={customInterviewTypes}
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
  customInterviewTypes: CustomInterviewType[];
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
  customInterviewTypes,
  onStart,
  isLoading,
}: SetupScreenProps) {
  const interviewTypes = Object.entries(TELEPROMPTER_INTERVIEW_TYPE_LABELS) as [TeleprompterInterviewType, string][];

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
          {jobs.map((job) => (
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
        {customInterviewTypes.length > 0 && (
          <div className="mt-3">
            <p className="text-sm text-foreground-muted mb-2">Saved types:</p>
            <div className="flex flex-wrap gap-2">
              {customInterviewTypes.map((type) => (
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
            Start Interview
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
    toggleCategory,
  } = useAppStore();

  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const job = teleprompterSession?.jobId
    ? jobs.find(j => j.id === teleprompterSession.jobId)
    : null;

  const handleInputSubmit = useCallback(async () => {
    if (!inputValue.trim() || !teleprompterSession || isGenerating) return;

    setIsGenerating(true);
    try {
      const currentKeywords = teleprompterSession.categories
        .flatMap(c => c.keywords.map(k => k.text));

      const categoryIds = teleprompterSession.categories.map(c => c.id);

      const keywords = await generateRealtimeTeleprompterKeywords(
        inputValue,
        TELEPROMPTER_INTERVIEW_TYPE_LABELS[teleprompterSession.interviewType],
        job?.company || 'Unknown',
        currentKeywords,
        settings.additionalContext || settings.defaultResumeText || '',
        categoryIds
      );

      addKeywordsFromAI(keywords);
      setInputValue('');
    } catch (error) {
      console.error('Error generating keywords:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [inputValue, teleprompterSession, job, settings, isGenerating, addKeywordsFromAI]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleInputSubmit();
    }
  }, [handleInputSubmit]);

  if (!teleprompterSession) return null;

  return (
    <div className="h-full flex flex-col">
      {/* Top bar with job info and end button */}
      <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
        <div>
          <h3 className="text-2xl font-bold text-foreground">
            {job ? `${job.company} - ${job.title}` : 'Interview Mode'}
          </h3>
          <p className="text-lg text-foreground-muted">
            {TELEPROMPTER_INTERVIEW_TYPE_LABELS[teleprompterSession.interviewType]}
            {teleprompterSession.customInterviewType && `: ${teleprompterSession.customInterviewType}`}
          </p>
        </div>
        <button
          onClick={() => setShowEndConfirm(true)}
          className="px-6 py-3 text-lg font-semibold bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          End Interview
        </button>
      </div>

      {/* Staging area for initial suggestions */}
      {teleprompterSession.stagingKeywords.length > 0 && (
        <div className="mb-4 p-4 bg-surface-raised rounded-lg border border-border">
          <p className="text-sm text-foreground-muted mb-2">
            AI Suggestions (click to add to display):
          </p>
          <div className="flex flex-wrap gap-2">
            {teleprompterSession.stagingKeywords.map((keyword) => (
              <button
                key={keyword.id}
                onClick={() => {
                  // Find appropriate category (first one for now)
                  const firstCategory = teleprompterSession.categories[0];
                  if (firstCategory) {
                    promoteKeywordFromStaging(keyword.id, firstCategory.id);
                  }
                }}
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
        </div>
      )}

      {/* Main keyword display - categories */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {teleprompterSession.categories.map((category) => (
          <div key={category.id} className="border border-border rounded-lg overflow-hidden">
            {/* Category header */}
            <button
              onClick={() => toggleCategory(category.id)}
              className="w-full flex items-center justify-between px-4 py-3 bg-surface-raised hover:bg-surface transition-colors"
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

            {/* Keywords */}
            {category.isExpanded && (
              <div className="p-4 flex flex-wrap gap-3">
                {category.keywords.filter(k => !k.inStaging).length === 0 ? (
                  <p className="text-lg text-foreground-muted italic">
                    No keywords yet. Type below to add some.
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
                          keyword.source === 'user' && 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200'
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

      {/* Input area - always visible at bottom */}
      <div className="mt-4 pt-4 border-t border-border">
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

function RoundupScreen({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <p className="text-xl text-foreground-muted mb-4">Roundup Screen - Coming in Task 8</p>
      <button
        onClick={onComplete}
        className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
      >
        Complete (placeholder)
      </button>
    </div>
  );
}
