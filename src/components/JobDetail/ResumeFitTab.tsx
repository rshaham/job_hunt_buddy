import { useState, useRef } from 'react';
import { Upload, Loader2, CheckCircle, XCircle, AlertCircle, FileText, Trash2, Sparkles, Eye, Download, Tag, HelpCircle, ChevronDown, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button, Modal } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { gradeResume, convertResumeToMarkdown } from '../../services/ai';
import { extractTextFromPDF } from '../../services/pdfParser';
import { isAIConfigured, getGradeColor } from '../../utils/helpers';
import { exportMarkdownToPdf, generatePdfFilename } from '../../utils/pdfExport';
import { ResumeTailoringView } from './ResumeTailoringView';
import { useAIOperation } from '../../hooks/useAIOperation';
import type { Job, ResumeAnalysis } from '../../types';

interface ResumeFitTabProps {
  job: Job;
}

export function ResumeFitTab({ job }: ResumeFitTabProps) {
  const { settings, updateJob } = useAppStore();
  const analyzeOp = useAIOperation<ResumeAnalysis>('resume-analysis');
  const [isUploading, setIsUploading] = useState(false);
  const [isTailoringMode, setIsTailoringMode] = useState(false);
  const [selectedKeyword, setSelectedKeyword] = useState<string | undefined>();
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [keywordsExpanded, setKeywordsExpanded] = useState(true);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasAIConfigured = isAIConfigured(settings);
  const resumeText = job.resumeText || settings.defaultResumeText;
  const hasResume = !!resumeText;

  const handleUploadResume = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError('');
    analyzeOp.reset();
    try {
      const text = await extractTextFromPDF(file);
      // Convert to markdown for better comparison/diff results
      const markdown = await convertResumeToMarkdown(text);
      await updateJob(job.id, { resumeText: markdown });
    } catch (err) {
      setUploadError('Failed to parse PDF. Please try a different file.');
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

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  const handleDownloadPDF = async () => {
    if (!job.resumeText) return;
    setIsGeneratingPdf(true);
    setShowDownloadMenu(false);
    try {
      const filename = generatePdfFilename(job.company, job.title, 'resume');
      await exportMarkdownToPdf(job.resumeText, { filename });
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleAnalyze = async () => {
    if (!resumeText) {
      setUploadError('Please upload a resume first');
      return;
    }

    if (!hasAIConfigured) {
      setUploadError('Please configure your AI provider in Settings');
      return;
    }

    setUploadError('');
    const analysis = await analyzeOp.execute(async () => {
      return await gradeResume(job.jdText, resumeText);
    });

    if (analysis) {
      await updateJob(job.id, { resumeAnalysis: analysis });
    }
  };

  // Show tailoring view if in tailoring mode
  if (isTailoringMode) {
    return (
      <div className="h-[calc(100vh-180px)] overflow-hidden">
        <ResumeTailoringView
          job={job}
          onBack={() => {
            setIsTailoringMode(false);
            setSelectedKeyword(undefined);
          }}
          initialKeyword={selectedKeyword}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resume Upload */}
      <div className="p-4 bg-surface-raised rounded-lg">
        <h4 className="text-sm font-medium text-foreground mb-3">Resume</h4>

        {job.resumeText ? (
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">Job-specific resume</p>
              <p className="text-xs text-muted">
                {job.resumeText.length.toLocaleString()} characters
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setIsViewModalOpen(true)} title="View Resume">
              <Eye className="w-4 h-4" />
            </Button>
            <div className="relative">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                disabled={isGeneratingPdf}
                title="Download"
              >
                {isGeneratingPdf ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </>
                )}
              </Button>
              {showDownloadMenu && (
                <div className="absolute right-0 mt-1 w-44 bg-surface rounded-lg shadow-lg border border-border py-1 z-10">
                  <button
                    type="button"
                    onClick={() => {
                      handleDownloadPDF();
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-surface-raised flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Download as PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleDownload();
                      setShowDownloadMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-surface-raised flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Download as Markdown
                  </button>
                </div>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={handleClearResume} title="Remove">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ) : settings.defaultResumeText ? (
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-tertiary" />
            <div className="flex-1">
              <p className="text-sm font-medium">Using default resume</p>
              <p className="text-xs text-muted">{settings.defaultResumeName}</p>
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
            <p className="text-xs text-muted mt-2">
              Or set a default resume in Settings
            </p>
          </div>
        )}
      </div>

      {/* Analyze Button */}
      {hasResume && !job.resumeAnalysis && (
        <Button onClick={handleAnalyze} disabled={analyzeOp.isLoading || !hasAIConfigured}>
          {analyzeOp.isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              Analyzing...
            </>
          ) : (
            'Analyze Resume Fit'
          )}
        </Button>
      )}

      {(uploadError || analyzeOp.error) && (
        <div className="flex items-center gap-2 text-sm text-danger">
          <AlertCircle className="w-4 h-4" />
          {uploadError || analyzeOp.error}
        </div>
      )}

      {/* Analysis Results */}
      {job.resumeAnalysis && (
        <div className="space-y-4">
          {/* Grade */}
          <div className="flex items-center gap-4 p-4 bg-surface-raised rounded-lg">
            <div
              className={`text-4xl font-bold px-4 py-2 rounded-lg ${getGradeColor(
                job.resumeAnalysis.grade
              )}`}
            >
              {job.resumeAnalysis.grade}
            </div>
            <div>
              <p className="text-sm text-foreground-muted flex items-center gap-1">
                Match Score
                <span className="group relative">
                  <HelpCircle className="w-3.5 h-3.5 text-tertiary cursor-help" />
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-slate-800 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    Based on job requirements match
                  </span>
                </span>
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-surface-raised rounded-full w-32">
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
                disabled={analyzeOp.isLoading}
              >
                {analyzeOp.isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  'Re-analyze'
                )}
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
            <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Strengths
            </h4>
            <ul className="space-y-1">
              {job.resumeAnalysis.strengths.map((strength, i) => (
                <li
                  key={i}
                  className="text-sm text-foreground-muted pl-5 relative before:content-['✓'] before:absolute before:left-0 before:text-green-500"
                >
                  {strength}
                </li>
              ))}
            </ul>
          </div>

          {/* Gaps */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-1">
              <XCircle className="w-4 h-4 text-red-500" />
              Gaps
            </h4>
            <ul className="space-y-1">
              {job.resumeAnalysis.gaps.map((gap, i) => (
                <li
                  key={i}
                  className="text-sm text-foreground-muted pl-5 relative before:content-['✗'] before:absolute before:left-0 before:text-red-500"
                >
                  {gap}
                </li>
              ))}
            </ul>
          </div>

          {/* Suggestions */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-1">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              Suggestions
            </h4>
            <ul className="space-y-1">
              {job.resumeAnalysis.suggestions.map((suggestion, i) => (
                <li
                  key={i}
                  className="text-sm text-foreground-muted pl-5 relative before:content-['→'] before:absolute before:left-0 before:text-amber-500"
                >
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>

          {/* Keywords */}
          {(job.resumeAnalysis.matchedKeywords?.length || job.resumeAnalysis.missingKeywords?.length) && (
            <div className="p-4 bg-surface-raised rounded-lg">
              <button
                type="button"
                onClick={() => setKeywordsExpanded(!keywordsExpanded)}
                className="w-full text-sm font-medium text-foreground flex items-center gap-1 hover:text-foreground transition-colors"
              >
                {keywordsExpanded ? (
                  <ChevronDown className="w-4 h-4 text-tertiary" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-tertiary" />
                )}
                <Tag className="w-4 h-4 text-primary" />
                Keywords
                {job.resumeAnalysis.matchedKeywords && job.resumeAnalysis.missingKeywords && (
                  <span className="ml-2 text-xs font-normal text-muted">
                    ({job.resumeAnalysis.matchedKeywords.length} of {job.resumeAnalysis.matchedKeywords.length + job.resumeAnalysis.missingKeywords.length} matched)
                  </span>
                )}
              </button>

              {keywordsExpanded && (
                <div className="mt-3">
                  {/* Matched Keywords */}
                  {job.resumeAnalysis.matchedKeywords && job.resumeAnalysis.matchedKeywords.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-foreground-muted mb-2 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        Matched
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {job.resumeAnalysis.matchedKeywords.map((keyword, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Missing Keywords */}
                  {job.resumeAnalysis.missingKeywords && job.resumeAnalysis.missingKeywords.length > 0 && (
                    <div>
                      <p className="text-xs text-foreground-muted mb-2 flex items-center gap-1">
                        <XCircle className="w-3 h-3 text-red-500" />
                        Missing
                        <span className="text-tertiary">- click to address in Resume Tailoring</span>
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {job.resumeAnalysis.missingKeywords.map((keyword, i) => (
                          <button
                            type="button"
                            key={i}
                            onClick={() => {
                              setSelectedKeyword(keyword);
                              setIsTailoringMode(true);
                            }}
                            className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors cursor-pointer"
                          >
                            {keyword}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
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
