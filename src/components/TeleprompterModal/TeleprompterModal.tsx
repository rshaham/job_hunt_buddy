import { useState, useEffect, useCallback } from 'react';
import { X, Play } from 'lucide-react';
import { cn } from '../../utils/helpers';
import { useAppStore } from '../../stores/appStore';
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

// Placeholder components - will be implemented in Tasks 7-8
function ActiveScreen({ onEndInterview }: { onEndInterview: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <p className="text-xl text-foreground-muted mb-4">Active Screen - Coming in Task 7</p>
      <button
        onClick={onEndInterview}
        className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
      >
        End Interview (placeholder)
      </button>
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
