import { useState, useRef } from 'react';
import { Upload, FileText, Trash2, Loader2, Eye, EyeOff } from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';
import { Button, ConfirmModal } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { extractTextFromPDF } from '../../services/pdfParser';
import { convertResumeToMarkdown } from '../../services/ai';
import { showToast } from '../../stores/toastStore';

export function ResumeSection(): JSX.Element {
  const { settings, updateSettings } = useAppStore();
  const [isUploading, setIsUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasResume = !!settings.defaultResumeText;

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      let text: string;

      if (file.type === 'application/pdf') {
        text = await extractTextFromPDF(file);
        text = await convertResumeToMarkdown(text);
      } else {
        text = await file.text();
      }

      await updateSettings({
        defaultResumeText: text,
        defaultResumeName: file.name,
      });
      showToast('Resume uploaded successfully', 'success');
    } catch (error) {
      console.error('Failed to upload resume:', error);
      showToast('Failed to upload resume', 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function handleClearResume(): Promise<void> {
    await updateSettings({
      defaultResumeText: '',
      defaultResumeName: '',
    });
    setShowClearConfirm(false);
    showToast('Resume cleared', 'success');
  }

  function handleUploadClick(): void {
    fileInputRef.current?.click();
  }

  function togglePreview(): void {
    setShowPreview(!showPreview);
  }

  function openClearConfirm(): void {
    setShowClearConfirm(true);
  }

  function closeClearConfirm(): void {
    setShowClearConfirm(false);
  }

  if (!hasResume) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-surface-raised rounded-full flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-foreground-subtle" />
        </div>
        <h3 className="font-display text-heading-lg text-foreground mb-2">
          No resume uploaded
        </h3>
        <p className="text-foreground-muted max-w-md mb-6">
          Upload your resume so the AI can tailor cover letters and analyze job fit.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md"
          onChange={handleFileUpload}
          className="hidden"
        />
        <Button onClick={handleUploadClick} disabled={isUploading}>
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-1" />
              Upload Resume
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-heading-lg text-foreground">Resume</h3>
          {settings.defaultResumeName && (
            <p className="text-sm text-foreground-muted">{settings.defaultResumeName}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={togglePreview}>
            {showPreview ? (
              <>
                <EyeOff className="w-4 h-4 mr-1" />
                Hide
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-1" />
                Show
              </>
            )}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.md"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={handleUploadClick}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Upload className="w-4 h-4 mr-1" />
                Replace
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={openClearConfirm}
            className="text-danger"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {showPreview && (
        <div className="bg-surface-raised rounded-lg border border-border overflow-hidden" data-color-mode={settings.theme}>
          <MDEditor
            value={settings.defaultResumeText}
            preview="preview"
            hideToolbar
            height={500}
            visibleDragbar={false}
          />
        </div>
      )}

      <ConfirmModal
        isOpen={showClearConfirm}
        onClose={closeClearConfirm}
        onConfirm={handleClearResume}
        title="Clear Resume"
        message="Are you sure you want to remove your resume? This cannot be undone."
        confirmText="Clear"
        variant="danger"
      />
    </div>
  );
}
