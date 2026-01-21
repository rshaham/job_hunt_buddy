import { useState, useEffect, useRef } from 'react';
import { Modal } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { PrivacyTermsStep } from './steps/PrivacyTermsStep';
import { WelcomeStep } from './steps/WelcomeStep';
import { ApiKeyStep } from './steps/ApiKeyStep';
import { ResumeStep } from './steps/ResumeStep';
import { FirstJobStep } from './steps/FirstJobStep';

const STEPS = [
  { id: 'privacy', title: 'Privacy' },
  { id: 'welcome', title: 'Welcome' },
  { id: 'api-key', title: 'API Key' },
  { id: 'resume', title: 'Resume' },
  { id: 'first-job', title: 'Get Started' },
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
      title="Getting Started"
      size="lg"
    >
      <div className="p-6">
        {/* Step Indicator */}
        <div className="flex items-center justify-center mb-8">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${index <= currentStep
                    ? 'bg-primary text-white'
                    : 'bg-surface-raised text-foreground-muted'
                  }
                `}
              >
                {index + 1}
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`
                    w-12 h-0.5 mx-1
                    ${index < currentStep
                      ? 'bg-primary'
                      : 'bg-surface-raised'
                    }
                  `}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="min-h-[300px]">
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
