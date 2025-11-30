import { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, Loader2 } from 'lucide-react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasResume = !!settings.defaultResumeName;

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
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

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Upload Your Resume
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Your resume helps the AI grade your fit and generate tailored cover letters.
        </p>
      </div>

      <div className="max-w-md mx-auto">
        {hasResume ? (
          <div className="text-center p-6 border-2 border-dashed border-green-300 dark:border-green-700 rounded-lg bg-green-50 dark:bg-green-900/20">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">
              Resume Uploaded
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              {settings.defaultResumeName}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleResumeUpload}
              className="hidden"
              aria-label="Upload resume PDF"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-1" />
              )}
              {isUploading ? 'Uploading...' : 'Replace Resume'}
            </Button>
          </div>
        ) : (
          <div className="text-center p-8 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg">
            <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              PDF format recommended
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleResumeUpload}
              className="hidden"
              aria-label="Upload resume PDF"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              {isUploading ? 'Parsing PDF...' : 'Upload Resume'}
            </Button>
          </div>
        )}

        <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-4">
          This step is optional. You can upload your resume later in Settings.
        </p>
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext}>
          {hasResume ? 'Next' : 'Skip for Now'}
        </Button>
      </div>
    </div>
  );
}
