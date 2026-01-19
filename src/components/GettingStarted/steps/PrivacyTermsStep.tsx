import { useState } from 'react';
import { Shield, Database, Key, Heart } from 'lucide-react';
import { Button } from '../../ui';
import { useAppStore } from '../../../stores/appStore';

interface PrivacyTermsStepProps {
  onNext: () => void;
}

export function PrivacyTermsStep({ onNext }: PrivacyTermsStepProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const { openPrivacyModal } = useAppStore();

  return (
    <div className="text-center">
      <div className="mb-6">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Privacy & Terms
        </h2>
        <p className="text-foreground-muted">
          Before you get started, here's what you should know
        </p>
      </div>

      <div className="text-left space-y-4 mb-6 max-w-md mx-auto">
        <div className="flex gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <Database className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-foreground text-sm">Your Data Stays Local</h3>
            <p className="text-xs text-foreground-muted">
              Everything is stored in your browser. We don't have servers storing your information.
            </p>
          </div>
        </div>

        <div className="flex gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <Key className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-foreground text-sm">API Keys Are Private</h3>
            <p className="text-xs text-foreground-muted">
              Your API key is only sent to your chosen AI provider (Anthropic, Google, etc.), never to us.
            </p>
          </div>
        </div>

        <div className="flex gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
          <Heart className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-foreground text-sm">Use Responsibly</h3>
            <p className="text-xs text-foreground-muted">
              This tool is provided as-is to help your job search. Please use it ethically and honestly.
            </p>
          </div>
        </div>
      </div>

      <label className="flex items-center justify-center gap-2 mb-6 cursor-pointer">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
          className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
        />
        <span className="text-sm text-foreground-muted">
          I understand and agree to use this tool responsibly
        </span>
      </label>

      <div className="space-y-3">
        <Button onClick={onNext} size="lg" className="w-full sm:w-auto" disabled={!acknowledged}>
          Continue
        </Button>
        <p className="text-xs text-foreground-muted">
          <button
            onClick={openPrivacyModal}
            className="text-primary hover:underline"
          >
            View full Privacy & Terms
          </button>
        </p>
      </div>
    </div>
  );
}
