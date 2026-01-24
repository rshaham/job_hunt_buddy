import { Briefcase, FileText, MessageSquare, PenTool, LayoutGrid, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '../../ui';

interface WelcomeStepProps {
  onNext: () => void;
}

const features = [
  {
    icon: LayoutGrid,
    title: 'Visual Pipeline',
    description: 'Track every application at a glance',
    gradient: 'from-indigo-500 to-purple-600',
    delay: '0ms',
  },
  {
    icon: Sparkles,
    title: 'Smart Analysis',
    description: 'AI extracts what matters from JDs',
    gradient: 'from-amber-500 to-orange-600',
    delay: '50ms',
  },
  {
    icon: Briefcase,
    title: 'Resume Fit',
    description: 'Know your match before you apply',
    gradient: 'from-emerald-500 to-teal-600',
    delay: '100ms',
  },
  {
    icon: PenTool,
    title: 'Cover Letters',
    description: 'Tailored drafts in seconds',
    gradient: 'from-rose-500 to-pink-600',
    delay: '150ms',
  },
  {
    icon: MessageSquare,
    title: 'Interview Prep',
    description: 'Practice with AI coaching',
    gradient: 'from-cyan-500 to-blue-600',
    delay: '200ms',
  },
  {
    icon: FileText,
    title: 'Resume Tailoring',
    description: 'Optimize for each role',
    gradient: 'from-violet-500 to-purple-600',
    delay: '250ms',
  },
];

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Hero Section */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 mb-6">
          <Sparkles className="w-4 h-4 text-primary animate-pulse" />
          <span className="text-sm font-medium text-primary">AI-Powered Job Search</span>
        </div>

        <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4 tracking-tight">
          Welcome to{' '}
          <span className="bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
            Job Hunt Buddy
          </span>
        </h2>

        <p className="text-lg text-foreground-muted max-w-md mx-auto leading-relaxed">
          Your intelligent companion for landing the perfect role.
          Let's set you up for success.
        </p>
      </div>

      {/* Features Grid - Asymmetric */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-10 max-w-2xl mx-auto">
        {features.map((feature, index) => (
          <div
            key={feature.title}
            className="group relative p-4 rounded-xl bg-surface border border-border hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5"
            style={{ animationDelay: feature.delay }}
          >
            {/* Gradient orb background on hover */}
            <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />

            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
              <feature.icon className="w-5 h-5 text-white" />
            </div>

            <h3 className="text-sm font-semibold text-foreground mb-1 group-hover:text-primary transition-colors duration-200">
              {feature.title}
            </h3>
            <p className="text-xs text-foreground-muted leading-relaxed">
              {feature.description}
            </p>

            {/* Subtle index number */}
            <span className="absolute top-3 right-3 text-[10px] font-mono text-foreground-subtle opacity-40">
              0{index + 1}
            </span>
          </div>
        ))}
      </div>

      {/* Privacy assurance */}
      <div className="flex items-center justify-center gap-2 mb-8 text-sm text-foreground-muted">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">100% Local</span>
        </div>
        <span className="text-foreground-subtle">Your data never leaves your device</span>
      </div>

      {/* CTA */}
      <div className="flex justify-center">
        <Button
          onClick={onNext}
          size="lg"
          className="group px-8 py-3 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
        >
          Let's Go
          <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
        </Button>
      </div>
    </div>
  );
}
