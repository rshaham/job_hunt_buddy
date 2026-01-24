import { useState, useEffect, useRef } from 'react';
import { Modal } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { PrivacyTermsStep } from './steps/PrivacyTermsStep';
import { WelcomeStep } from './steps/WelcomeStep';
import { ApiKeyStep } from './steps/ApiKeyStep';
import { ResumeStep } from './steps/ResumeStep';
import { FirstJobStep } from './steps/FirstJobStep';
import { Shield, Sparkles, Key, FileText, Rocket, Check } from 'lucide-react';

const STEPS = [
  { id: 'privacy', title: 'Privacy', icon: Shield },
  { id: 'welcome', title: 'Welcome', icon: Sparkles },
  { id: 'api-key', title: 'AI Setup', icon: Key },
  { id: 'resume', title: 'Resume', icon: FileText },
  { id: 'first-job', title: 'Ready', icon: Rocket },
];

export function GettingStartedModal() {
  const {
    isGettingStartedModalOpen,
    closeGettingStartedModal,
    settings,
    updateSettings,
    openAddJobModal,
  } = useAppStore();

  const [currentStep, setCurrentStep] = useState(0);
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const wasOpenRef = useRef(false);

  // Reset to step 0 only when modal first opens (not when settings change)
  useEffect(() => {
    if (isGettingStartedModalOpen && !wasOpenRef.current) {
      // Modal just opened
      setCurrentStep(0);
      // Check if API key already exists
      const activeProviderKey = settings.providers?.[settings.activeProvider]?.apiKey;
      setApiKeySaved(!!activeProviderKey);
    }
    wasOpenRef.current = isGettingStartedModalOpen;
  }, [isGettingStartedModalOpen, settings]);

  const handleComplete = async () => {
    await updateSettings({ onboardingCompleted: true });
    closeGettingStartedModal();
  };

  const handleAddJob = async () => {
    await handleComplete();
    openAddJobModal();
  };

  const handleApiKeySaved = () => {
    setApiKeySaved(true);
  };

  return (
    <Modal
      isOpen={isGettingStartedModalOpen}
      onClose={closeGettingStartedModal}
      title=""
      size="xl"
    >
      <div className="px-6 sm:px-10 py-8 min-h-[700px] flex flex-col">
        {/* Step Indicator - Dots with connectors */}
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="flex items-center gap-2">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isComplete = index < currentStep;
              const isCurrent = index === currentStep;

              return (
                <div key={step.id} className="flex items-center gap-2">
                  <div
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                      ${isCurrent ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-110' : ''}
                      ${isComplete ? 'bg-emerald-500 text-white' : ''}
                      ${!isCurrent && !isComplete ? 'bg-surface-raised text-foreground-subtle border border-border' : ''}
                    `}
                  >
                    {isComplete ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`w-6 sm:w-10 h-0.5 rounded-full transition-colors duration-300 ${
                      isComplete ? 'bg-emerald-500' : 'bg-border'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-sm font-medium text-foreground-muted">
            Step {currentStep + 1} of {STEPS.length}: <span className="text-foreground">{STEPS[currentStep].title}</span>
          </p>
        </div>

        {/* Step Content */}
        <div className="flex-1 flex flex-col justify-center overflow-y-auto">
          {currentStep === 0 && (
            <PrivacyTermsStep onNext={() => setCurrentStep(1)} />
          )}
          {currentStep === 1 && (
            <WelcomeStep onNext={() => setCurrentStep(2)} />
          )}
          {currentStep === 2 && (
            <ApiKeyStep
              onNext={() => setCurrentStep(3)}
              onBack={() => setCurrentStep(1)}
              onApiKeySaved={handleApiKeySaved}
              apiKeySaved={apiKeySaved}
            />
          )}
          {currentStep === 3 && (
            <ResumeStep
              onNext={() => setCurrentStep(4)}
              onBack={() => setCurrentStep(2)}
            />
          )}
          {currentStep === 4 && (
            <FirstJobStep
              onBack={() => setCurrentStep(3)}
              onComplete={handleComplete}
              onAddJob={handleAddJob}
            />
          )}
        </div>
      </div>
    </Modal>
  );
}
