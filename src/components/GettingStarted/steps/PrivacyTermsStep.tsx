import { useState } from 'react';
import { Shield, Database, Key, Heart, Lock, ArrowRight, Check } from 'lucide-react';
import { Button } from '../../ui';
import { useAppStore } from '../../../stores/appStore';

interface PrivacyTermsStepProps {
  onNext: () => void;
}

const trustPoints = [
  {
    icon: Database,
    title: 'Your Data Stays Local',
    description: 'Everything lives in your browser. We have no servers storing your information.',
    color: 'emerald',
    iconBg: 'bg-emerald-500',
  },
  {
    icon: Key,
    title: 'API Keys Are Private',
    description: 'Your key goes directly to your AI provider (Anthropic, Google, etc.) — never to us.',
    color: 'blue',
    iconBg: 'bg-blue-500',
  },
  {
    icon: Heart,
    title: 'Use Responsibly',
    description: 'This tool helps your job search. Please use it ethically and honestly.',
    color: 'amber',
    iconBg: 'bg-amber-500',
  },
];

export function PrivacyTermsStep({ onNext }: PrivacyTermsStepProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const { openPrivacyModal } = useAppStore();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Hero */}
      <div className="text-center mb-8">
        <div className="relative w-20 h-20 mx-auto mb-6">
          {/* Animated rings */}
          <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" style={{ animationDuration: '2s' }} />
          <div className="absolute inset-2 rounded-full border-2 border-primary/30 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
          <div className="relative w-full h-full rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/30">
            <Shield className="w-10 h-10 text-white" />
          </div>
        </div>

        <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-3 tracking-tight">
          Privacy First
        </h2>
        <p className="text-foreground-muted max-w-sm mx-auto">
          Before we begin, here's our commitment to you
        </p>
      </div>

      {/* Trust Points */}
      <div className="space-y-3 mb-8 max-w-md mx-auto">
        {trustPoints.map((point, index) => (
          <div
            key={point.title}
            className="group flex gap-4 p-4 rounded-xl bg-surface border border-border hover:border-primary/20 transition-all duration-300"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${point.iconBg} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
              <point.icon className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground mb-1">
                {point.title}
              </h3>
              <p className="text-sm text-foreground-muted leading-relaxed">
                {point.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Acknowledgment */}
      <div className="max-w-md mx-auto mb-6">
        <label
          className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
            acknowledged
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/30 bg-surface'
          }`}
        >
          <div
            className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${
              acknowledged
                ? 'border-primary bg-primary'
                : 'border-foreground-muted'
            }`}
          >
            {acknowledged && <Check className="w-4 h-4 text-white" />}
          </div>
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="sr-only"
          />
          <span className="text-sm text-foreground font-medium">
            I understand and agree to use this tool responsibly
          </span>
        </label>
      </div>

      {/* CTA */}
      <div className="flex flex-col items-center gap-4">
        <Button
          onClick={onNext}
          size="lg"
          disabled={!acknowledged}
          className={`group px-8 py-3 text-base font-semibold transition-all duration-300 ${
            acknowledged
              ? 'shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30'
              : 'opacity-50'
          }`}
        >
          Continue
          <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
        </Button>

        <button
          onClick={openPrivacyModal}
          className="text-sm text-foreground-muted hover:text-primary transition-colors duration-200 flex items-center gap-1.5"
        >
          <Lock className="w-3.5 h-3.5" />
          View full Privacy & Terms
        </button>
      </div>
    </div>
  );
}
