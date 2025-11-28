import { useState } from 'react';
import { Loader2, Copy, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { Button, Textarea } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { generateCoverLetter } from '../../services/ai';
import { decodeApiKey } from '../../utils/helpers';
import type { Job } from '../../types';

interface CoverLetterTabProps {
  job: Job;
}

export function CoverLetterTab({ job }: CoverLetterTabProps) {
  const { settings, updateJob } = useAppStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState('');
  const [editedLetter, setEditedLetter] = useState(job.coverLetter || '');

  const apiKey = decodeApiKey(settings.apiKey);
  const resumeText = job.resumeText || settings.defaultResumeText;

  const handleGenerate = async () => {
    if (!resumeText) {
      setError('Please upload a resume in the Resume Fit tab first');
      return;
    }

    if (!apiKey) {
      setError('Please configure your Claude API key in Settings');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const letter = await generateCoverLetter(job.jdText, resumeText);
      setEditedLetter(letter);
      await updateJob(job.id, { coverLetter: letter });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate cover letter');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    await updateJob(job.id, { coverLetter: editedLetter });
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(editedLetter);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={handleGenerate} disabled={isGenerating || !apiKey}>
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              Generating...
            </>
          ) : job.coverLetter ? (
            <>
              <RefreshCw className="w-4 h-4 mr-1" />
              Regenerate
            </>
          ) : (
            'Generate Cover Letter'
          )}
        </Button>

        {editedLetter && (
          <>
            <Button variant="secondary" onClick={handleCopy}>
              {isCopied ? (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-1" />
                  Copy
                </>
              )}
            </Button>
          </>
        )}
      </div>

      {!resumeText && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm text-amber-800 dark:text-amber-200">
          <AlertCircle className="w-4 h-4" />
          Upload a resume in the Resume Fit tab to generate a cover letter
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-danger">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Cover Letter Editor */}
      {editedLetter ? (
        <div className="space-y-2">
          <Textarea
            value={editedLetter}
            onChange={(e) => setEditedLetter(e.target.value)}
            rows={20}
            className="font-serif text-sm leading-relaxed"
          />
          {editedLetter !== job.coverLetter && (
            <div className="flex justify-end">
              <Button size="sm" onClick={handleSave}>
                Save Changes
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center h-64 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
          <p className="text-slate-500">
            Click "Generate Cover Letter" to create a tailored cover letter
          </p>
        </div>
      )}
    </div>
  );
}
