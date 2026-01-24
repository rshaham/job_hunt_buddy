import { Plus, CheckCircle, Puzzle, ArrowLeft, Rocket, ExternalLink } from 'lucide-react';
import { Button } from '../../ui';

interface FirstJobStepProps {
  onBack: () => void;
  onComplete: () => void;
  onAddJob: () => void;
}

export function FirstJobStep({ onBack, onComplete, onAddJob }: FirstJobStepProps) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="relative w-24 h-24 mx-auto mb-8">
          {/* Success rings */}
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" style={{ animationDuration: '2s' }} />
          <div className="relative w-full h-full rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-500/30">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
        </div>

        <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-4 tracking-tight">
          You're All Set!
        </h2>
        <p className="text-lg text-foreground-muted max-w-sm mx-auto">
          Time to land your dream job. Here's how to get started.
        </p>
      </div>

      {/* Options */}
      <div className="max-w-lg mx-auto space-y-4 mb-12">
        {/* Primary: Add Job */}
        <button
          type="button"
          onClick={onAddJob}
          className="group w-full p-6 rounded-2xl border-2 border-primary bg-gradient-to-br from-primary/5 to-purple-500/5 hover:from-primary/10 hover:to-purple-500/10 hover:border-primary transition-all duration-300 text-left hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10"
        >
          <div className="flex items-start gap-5">
            <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Plus className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold text-foreground">
                  Add Your First Job
                </h3>
                <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                  Recommended
                </span>
              </div>
              <p className="text-foreground-muted">
                Paste a job description and let AI extract company, title, requirements, and key skills automatically.
              </p>
            </div>
            <Rocket className="w-5 h-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300 mt-1" />
          </div>
        </button>

        {/* Secondary: Browser Extension */}
        <div className="p-6 rounded-2xl border border-border bg-surface hover:border-primary/20 transition-all duration-300">
          <div className="flex items-start gap-5">
            <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
              <Puzzle className="w-7 h-7 text-foreground-muted" />
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Browser Extension
              </h3>
              <p className="text-foreground-muted mb-3">
                Capture jobs from LinkedIn, Indeed, and more with a single click while you browse.
              </p>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onComplete();
                }}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                Set up in Settings → Preferences
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between max-w-lg mx-auto">
        <Button
          variant="ghost"
          onClick={onBack}
          className="group text-foreground-muted hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform duration-200" />
          Back
        </Button>
        <Button
          variant="secondary"
          onClick={onComplete}
          className="px-6"
        >
          Skip for Now
        </Button>
      </div>
    </div>
  );
}
