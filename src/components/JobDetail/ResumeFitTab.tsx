import { useState, useRef } from 'react';
import { Upload, Loader2, CheckCircle, XCircle, AlertCircle, FileText, Trash2, Sparkles, Eye, Download, Printer, HelpCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DOMPurify from 'dompurify';
import { Button, Modal } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { gradeResume, convertResumeToMarkdown } from '../../services/ai';
import { extractTextFromPDF } from '../../services/pdfParser';
import { isAIConfigured, getGradeColor } from '../../utils/helpers';
import { ResumeTailoringView } from './ResumeTailoringView';
import type { Job } from '../../types';

interface ResumeFitTabProps {
  job: Job;
}

export function ResumeFitTab({ job }: ResumeFitTabProps) {
  const { settings, updateJob } = useAppStore();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isTailoringMode, setIsTailoringMode] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasAIConfigured = isAIConfigured(settings);
  const resumeText = job.resumeText || settings.defaultResumeText;
  const hasResume = !!resumeText;

  const handleUploadResume = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError('');
    try {
      const text = await extractTextFromPDF(file);
      // Convert to markdown for better comparison/diff results
      const markdown = await convertResumeToMarkdown(text);
      await updateJob(job.id, { resumeText: markdown });
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

  const handleDownload = () => {
    const blob = new Blob([job.resumeText!], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${job.company}-${job.title}-resume.md`.replace(/\s+/g, '-').toLowerCase();
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Convert markdown to HTML
    const rawHtml = job.resumeText!
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^\* (.+)$/gm, '<li>$1</li>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    // Sanitize HTML to prevent XSS attacks
    const htmlContent = DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: ['h1', 'h2', 'h3', 'p', 'ul', 'li', 'strong', 'em', 'br'],
      ALLOWED_ATTR: [],
    });

    // Sanitize title content as well
    const safeCompany = DOMPurify.sanitize(job.company, { ALLOWED_TAGS: [] });
    const safeTitle = DOMPurify.sanitize(job.title, { ALLOWED_TAGS: [] });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${safeCompany} - ${safeTitle} Resume</title>
          <style>
            body {
              font-family: 'Georgia', serif;
              max-width: 8.5in;
              margin: 0 auto;
              padding: 0.5in;
              font-size: 11pt;
              line-height: 1.4;
              color: #333;
            }
            h1 { font-size: 18pt; margin-bottom: 0.3em; color: #000; }
            h2 { font-size: 13pt; margin-top: 1em; margin-bottom: 0.3em; color: #444; border-bottom: 1px solid #ddd; padding-bottom: 0.2em; }
            h3 { font-size: 11pt; margin-top: 0.8em; margin-bottom: 0.2em; }
            p { margin: 0.3em 0; }
            ul { margin: 0.3em 0; padding-left: 1.2em; }
            li { margin: 0.15em 0; }
            strong { font-weight: 600; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <p>${htmlContent}</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleAnalyze = async () => {
    if (!resumeText) {
      setError('Please upload a resume first');
      return;
    }

    if (!hasAIConfigured) {
      setError('Please configure your AI provider in Settings');
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

  // Show tailoring view if in tailoring mode
  if (isTailoringMode) {
    return (
      <div className="h-[calc(100vh-180px)] overflow-hidden">
        <ResumeTailoringView
          job={job}
          onBack={() => setIsTailoringMode(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resume Upload */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Resume</h4>

        {job.resumeText ? (
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">Job-specific resume</p>
              <p className="text-xs text-slate-500">
                {job.resumeText.length.toLocaleString()} characters
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setIsViewModalOpen(true)} title="View Resume">
              <Eye className="w-4 h-4" />
            </Button>
            <Button variant="secondary" size="sm" onClick={handleDownload} title="Download Markdown">
              <Download className="w-4 h-4" />
            </Button>
            <Button variant="secondary" size="sm" onClick={handlePrint} title="Print / Save as PDF">
              <Printer className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClearResume} title="Remove">
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
        <Button onClick={handleAnalyze} disabled={isAnalyzing || !hasAIConfigured}>
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
              <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1">
                Match Score
                <span className="group relative">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-slate-800 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    Based on job requirements match
                  </span>
                </span>
              </p>
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
            <div className="ml-auto flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
              >
                Re-analyze
              </Button>
              <Button
                size="sm"
                onClick={() => setIsTailoringMode(true)}
              >
                <Sparkles className="w-4 h-4 mr-1" />
                Tailor Resume
              </Button>
            </div>
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

      {/* View Resume Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Job Resume"
        size="full"
      >
        <div className="p-6">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>
              {job.resumeText || ''}
            </ReactMarkdown>
          </div>
        </div>
      </Modal>
    </div>
  );
}
