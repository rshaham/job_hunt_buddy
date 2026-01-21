import { Briefcase, FileText, MessageSquare, PenTool, LayoutGrid } from 'lucide-react';
import { Button } from '../../ui';

interface WelcomeStepProps {
  onNext: () => void;
}

const features = [
  {
    icon: LayoutGrid,
    title: 'Kanban Board',
    description: 'Track applications across stages',
  },
  {
    icon: FileText,
    title: 'JD Analysis',
    description: 'AI extracts key requirements',
  },
  {
    icon: Briefcase,
    title: 'Resume Grading',
    description: 'See how well you match',
  },
  {
    icon: PenTool,
    title: 'Cover Letters',
    description: 'AI-generated and tailored',
  },
  {
    icon: MessageSquare,
    title: 'Interview Prep',
    description: 'Practice with AI coaching',
  },
];

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div className="text-center">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Welcome to Job Hunt Buddy
        </h2>
        <p className="text-foreground-muted">
          Your AI-powered job search companion
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8 max-w-lg mx-auto">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="p-3 rounded-lg bg-surface"
          >
            <feature.icon className="w-6 h-6 text-primary mx-auto mb-2" />
            <h3 className="text-sm font-medium text-foreground">
              {feature.title}
            </h3>
            <p className="text-xs text-foreground-muted">
              {feature.description}
            </p>
          </div>
        ))}
      </div>

      <p className="text-sm text-foreground-muted mb-6">
        All your data stays on your device. Private and secure.
      </p>

      <Button onClick={onNext} size="lg">
        Get Started
      </Button>
    </div>
  );
}
