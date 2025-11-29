import { useState, useEffect } from 'react';
import { Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { Modal, Button, Input, Textarea } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { analyzeJobDescription } from '../../services/ai';
import { decodeApiKey } from '../../utils/helpers';
import type { Job, JobSummary } from '../../types';

type Step = 'input' | 'analyzing' | 'review';

export function AddJobModal() {
  const { isAddJobModalOpen, closeAddJobModal, addJob, settings, openSettingsModal } = useAppStore();

  const [step, setStep] = useState<Step>('input');
  const [jdLink, setJdLink] = useState('');
  const [jdText, setJdText] = useState('');
  const [error, setError] = useState('');

  // Review state
  const [company, setCompany] = useState('');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState<JobSummary | null>(null);

  const apiKey = decodeApiKey(settings.apiKey);

  // Check for extension-imported data
  useEffect(() => {
    if (isAddJobModalOpen) {
      const extData = sessionStorage.getItem('extension_jd');
      if (extData) {
        try {
          const { url, text, title: extTitle, company: extCompany } = JSON.parse(extData);
          setJdLink(url || '');
          setJdText(text || '');
          // Pre-fill company and title if extracted by extension
          if (extCompany) setCompany(extCompany);
          if (extTitle) setTitle(extTitle);
          sessionStorage.removeItem('extension_jd');
        } catch {
          // Ignore invalid JSON
        }
      }
    }
  }, [isAddJobModalOpen]);

  const handleAnalyze = async () => {
    if (!jdText.trim()) {
      setError('Please paste the job description');
      return;
    }

    if (!apiKey) {
      setError('Please configure your Claude API key in Settings first');
      return;
    }

    setError('');
    setStep('analyzing');

    try {
      const result = await analyzeJobDescription(jdText);
      setCompany(result.company);
      setTitle(result.title);
      setSummary(result.summary);
      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze job description');
      setStep('input');
    }
  };

  const handleSave = async () => {
    if (!company.trim() || !title.trim()) {
      setError('Company and title are required');
      return;
    }

    const defaultStatus = settings.statuses[0]?.name || 'Interested';

    const job: Omit<Job, 'id' | 'dateAdded' | 'lastUpdated'> = {
      company: company.trim(),
      title: title.trim(),
      jdLink: jdLink.trim(),
      jdText: jdText.trim(),
      status: defaultStatus,
      summary,
      resumeAnalysis: null,
      coverLetter: null,
      contacts: [],
      notes: [],
      timeline: [],
      prepMaterials: [],
      qaHistory: [],
    };

    await addJob(job);
    handleClose();
  };

  const handleClose = () => {
    setStep('input');
    setJdLink('');
    setJdText('');
    setError('');
    setCompany('');
    setTitle('');
    setSummary(null);
    closeAddJobModal();
  };

  const handleSkipAI = () => {
    setCompany('');
    setTitle('');
    setSummary(null);
    setStep('review');
  };

  return (
    <Modal isOpen={isAddJobModalOpen} onClose={handleClose} title="Add New Job" size="lg">
      <div className="p-4">
        {/* API Key Warning */}
        {!apiKey && step === 'input' && (
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-800 dark:text-amber-200">
                No API key configured
              </p>
              <p className="text-amber-600 dark:text-amber-300">
                Add your Claude API key in{' '}
                <button
                  onClick={() => {
                    closeAddJobModal();
                    openSettingsModal();
                  }}
                  className="underline hover:no-underline"
                >
                  Settings
                </button>{' '}
                to enable AI features.
              </p>
            </div>
          </div>
        )}

        {step === 'input' && (
          <div className="space-y-4">
            <Input
              label="Job Posting Link (optional)"
              placeholder="https://..."
              value={jdLink}
              onChange={(e) => setJdLink(e.target.value)}
            />

            <Textarea
              label="Job Description"
              placeholder="Paste the full job description here..."
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              rows={10}
              className="font-mono text-xs"
            />

            {error && (
              <p className="text-sm text-danger">{error}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button variant="secondary" onClick={handleSkipAI}>
                Skip AI Analysis
              </Button>
              <Button onClick={handleAnalyze} disabled={!apiKey}>
                <Sparkles className="w-4 h-4 mr-1" />
                Analyze with AI
              </Button>
            </div>
          </div>
        )}

        {step === 'analyzing' && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
            <p className="text-slate-600 dark:text-slate-400">Analyzing job description...</p>
            <p className="text-sm text-slate-500 mt-1">This may take a few seconds</p>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Company name"
              />
              <Input
                label="Job Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Job title"
              />
            </div>

            {summary && (
              <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <div>
                  <h4 className="text-xs font-medium text-slate-500 uppercase mb-1">Summary</h4>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {summary.shortDescription}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <h4 className="text-xs font-medium text-slate-500 uppercase mb-1">Type</h4>
                    <p className="text-sm capitalize">{summary.jobType}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-slate-500 uppercase mb-1">Level</h4>
                    <p className="text-sm">{summary.level}</p>
                  </div>
                  {summary.salary && (
                    <div>
                      <h4 className="text-xs font-medium text-slate-500 uppercase mb-1">Salary</h4>
                      <p className="text-sm">{summary.salary}</p>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-medium text-slate-500 uppercase mb-1">Key Skills</h4>
                  <div className="flex flex-wrap gap-1">
                    {summary.keySkills.slice(0, 8).map((skill, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {error && (
              <p className="text-sm text-danger">{error}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setStep('input')}>
                Back
              </Button>
              <Button onClick={handleSave}>
                Save Job
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
