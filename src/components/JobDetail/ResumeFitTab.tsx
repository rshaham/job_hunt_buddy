import { useState, useRef } from 'react';
import { Upload, Loader2, CheckCircle, XCircle, AlertCircle, FileText, Trash2 } from 'lucide-react';
import { Button } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { gradeResume } from '../../services/ai';
import { extractTextFromPDF } from '../../services/pdfParser';
import { decodeApiKey, getGradeColor } from '../../utils/helpers';
import type { Job } from '../../types';

interface ResumeFitTabProps {
  job: Job;
}

export function ResumeFitTab({ job }: ResumeFitTabProps) {
  const { settings, updateJob } = useAppStore();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const apiKey = decodeApiKey(settings.apiKey);
  const resumeText = job.resumeText || settings.defaultResumeText;
  const hasResume = !!resumeText;

  const handleUploadResume = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError('');
    try {
      const text = await extractTextFromPDF(file);
      await updateJob(job.id, { resumeText: text });
    } catch (err) {
      setError('Failed to parse PDF. Please try a different file.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClearResume = async () => {
    await updateJob(job.id, { resumeText: undefined, resumeAnalysis: null });
  };

  const handleAnalyze = async () => {
    if (!resumeText) {
      setError('Please upload a resume first');
      return;
    }

    if (!apiKey) {
      setError('Please configure your Claude API key in Settings');
      return;
    }

    setIsAnalyzing(true);
    setError('');

    try {
      const analysis = await gradeResume(job.jdText, resumeText);
      await updateJob(job.id, { resumeAnalysis: analysis });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze resume');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Resume Upload */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Resume</h4>

        {job.resumeText ? (
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">Job-specific resume uploaded</p>
              <p className="text-xs text-slate-500">
                {job.resumeText.length.toLocaleString()} characters
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClearResume}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ) : settings.defaultResumeText ? (
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-slate-400" />
            <div className="flex-1">
              <p className="text-sm font-medium">Using default resume</p>
              <p className="text-xs text-slate-500">{settings.defaultResumeName}</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleUploadResume}
              className="hidden"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Upload Different'}
            </Button>
          </div>
        ) : (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleUploadResume}
              className="hidden"
            />
            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-1" />
              )}
              Upload Resume (PDF)
            </Button>
            <p className="text-xs text-slate-500 mt-2">
              Or set a default resume in Settings
            </p>
          </div>
        )}
      </div>

      {/* Analyze Button */}
      {hasResume && !job.resumeAnalysis && (
        <Button onClick={handleAnalyze} disabled={isAnalyzing || !apiKey}>
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              Analyzing...
            </>
          ) : (
            'Analyze Resume Fit'
          )}
        </Button>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-danger">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Analysis Results */}
      {job.resumeAnalysis && (
        <div className="space-y-4">
          {/* Grade */}
          <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <div
              className={`text-4xl font-bold px-4 py-2 rounded-lg ${getGradeColor(
                job.resumeAnalysis.grade
              )}`}
            >
              {job.resumeAnalysis.grade}
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Match Score</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full w-32">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${job.resumeAnalysis.matchPercentage}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{job.resumeAnalysis.matchPercentage}%</span>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="ml-auto"
              onClick={handleAnalyze}
              disabled={isAnalyzing}
            >
              Re-analyze
            </Button>
          </div>

          {/* Strengths */}
          <div>
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Strengths
            </h4>
            <ul className="space-y-1">
              {job.resumeAnalysis.strengths.map((strength, i) => (
                <li
                  key={i}
                  className="text-sm text-slate-600 dark:text-slate-400 pl-5 relative before:content-['✓'] before:absolute before:left-0 before:text-green-500"
                >
                  {strength}
                </li>
              ))}
            </ul>
          </div>

          {/* Gaps */}
          <div>
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1">
              <XCircle className="w-4 h-4 text-red-500" />
              Gaps
            </h4>
            <ul className="space-y-1">
              {job.resumeAnalysis.gaps.map((gap, i) => (
                <li
                  key={i}
                  className="text-sm text-slate-600 dark:text-slate-400 pl-5 relative before:content-['✗'] before:absolute before:left-0 before:text-red-500"
                >
                  {gap}
                </li>
              ))}
            </ul>
          </div>

          {/* Suggestions */}
          <div>
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              Suggestions
            </h4>
            <ul className="space-y-1">
              {job.resumeAnalysis.suggestions.map((suggestion, i) => (
                <li
                  key={i}
                  className="text-sm text-slate-600 dark:text-slate-400 pl-5 relative before:content-['→'] before:absolute before:left-0 before:text-amber-500"
                >
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
