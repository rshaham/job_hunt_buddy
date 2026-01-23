import { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, Loader2, ArrowLeft, ArrowRight, FileUp, Sparkles } from 'lucide-react';
import { Button } from '../../ui';
import { useAppStore } from '../../../stores/appStore';
import { extractTextFromPDF } from '../../../services/pdfParser';
import { convertResumeToMarkdown } from '../../../services/ai';
import { showToast } from '../../../stores/toastStore';

interface ResumeStepProps {
  onNext: () => void;
  onBack: () => void;
}

export function ResumeStep({ onNext, onBack }: ResumeStepProps) {
  const { settings, updateSettings } = useAppStore();
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasResume = !!settings.defaultResumeName;

  const handleResumeUpload = async (file: File) => {
    if (!file) return;

    setIsUploading(true);
    try {
      const text = await extractTextFromPDF(file);
      // Convert to markdown for better comparison/diff results
      const markdown = await convertResumeToMarkdown(text);
      await updateSettings({
        defaultResumeText: markdown,
        defaultResumeName: file.name,
      });
      showToast('Resume uploaded successfully!', 'success');
    } catch (err) {
      console.error('Failed to parse PDF:', err);
      showToast('Failed to parse PDF. Please try a different file.', 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleResumeUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      handleResumeUpload(file);
    } else {
      showToast('Please upload a PDF file', 'error');
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
          <FileText className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-3 tracking-tight">
          Upload Your Resume
        </h2>
        <p className="text-foreground-muted max-w-md mx-auto">
          Your resume powers the AI — it's used for fit grading, tailoring, and cover letter generation.
        </p>
      </div>

      <div className="max-w-lg mx-auto">
        {hasResume ? (
          /* Success State */
          <div className="p-8 rounded-2xl border-2 border-emerald-300 dark:border-emerald-700 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg">
                <CheckCircle className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground mb-1">
                  Resume Ready
                </p>
                <p className="text-sm text-foreground-muted truncate">
                  {settings.defaultResumeName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-xl bg-white/50 dark:bg-black/20 mb-6">
              <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <p className="text-sm text-foreground-muted">
                AI will use this to match you with jobs and generate tailored content.
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
              aria-label="Upload resume PDF"
            />
            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full"
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              {isUploading ? 'Processing...' : 'Replace Resume'}
            </Button>
          </div>
        ) : (
          /* Upload State */
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              relative p-10 rounded-2xl border-2 border-dashed transition-all duration-300
              ${isDragging
                ? 'border-primary bg-primary/5 scale-[1.02]'
                : 'border-border hover:border-primary/50 bg-surface'
              }
              ${isUploading ? 'pointer-events-none' : 'cursor-pointer'}
            `}
            onClick={() => !isUploading && fileInputRef.current?.click()}
          >
            {isUploading ? (
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
                <p className="font-semibold text-foreground mb-2">Processing Resume</p>
                <p className="text-sm text-foreground-muted">
                  Converting to AI-friendly format...
                </p>
              </div>
            ) : (
              <div className="text-center">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-all duration-300 ${
                  isDragging
                    ? 'bg-primary scale-110'
                    : 'bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800'
                }`}>
                  <FileUp className={`w-8 h-8 transition-colors duration-300 ${
                    isDragging ? 'text-white' : 'text-foreground-muted'
                  }`} />
                </div>
                <p className="font-semibold text-foreground mb-2">
                  {isDragging ? 'Drop your resume here' : 'Drag & drop your resume'}
                </p>
                <p className="text-sm text-foreground-muted mb-4">
                  or click to browse • PDF format
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                  <Upload className="w-4 h-4" />
                  Select File
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
              aria-label="Upload resume PDF"
            />
          </div>
        )}

        <p className="text-sm text-foreground-muted text-center mt-6 p-4 rounded-xl bg-surface-raised">
          <span className="font-medium text-foreground">Optional:</span> You can skip this and upload your resume later in Settings.
        </p>
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-10 max-w-lg mx-auto">
        <Button
          variant="ghost"
          onClick={onBack}
          className="group text-foreground-muted hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform duration-200" />
          Back
        </Button>
        <Button onClick={onNext} className="group px-6">
          {hasResume ? 'Next' : 'Skip for Now'}
          <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
        </Button>
      </div>
    </div>
  );
}
