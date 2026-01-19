import { Plus, CheckCircle, Puzzle } from 'lucide-react';
import { Button } from '../../ui';

interface FirstJobStepProps {
  onBack: () => void;
  onComplete: () => void;
  onAddJob: () => void;
}

export function FirstJobStep({ onBack, onComplete, onAddJob }: FirstJobStepProps) {
  return (
    <div>
      <div className="text-center mb-6">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">
          You're All Set!
        </h2>
        <p className="text-foreground-muted">
          Start tracking your job applications.
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-4">
        {/* Add Job Option */}
        <button
          type="button"
          onClick={onAddJob}
          className="w-full p-4 border-2 border-primary rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Plus className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">
                Add Your First Job
              </h3>
              <p className="text-sm text-foreground-muted">
                Paste a job description and let AI analyze it
              </p>
            </div>
          </div>
        </button>

        {/* Browser Extension Option */}
        <div className="p-4 border border-border rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center">
              <Puzzle className="w-5 h-5 text-slate-500" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">
                Browser Extension
              </h3>
              <p className="text-sm text-foreground-muted">
                Capture jobs from LinkedIn, Indeed & more with one click.
                <br />
                <span className="text-xs">
                  Find setup instructions in Settings &gt; Preferences.
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button variant="secondary" onClick={onComplete}>
          Finish Setup
        </Button>
      </div>
    </div>
  );
}
