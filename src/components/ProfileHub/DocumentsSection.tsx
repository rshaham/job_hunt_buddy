import { useState, useRef } from 'react';
import { Plus, FileText, Trash2, Loader2, Eye, Sparkles } from 'lucide-react';
import { Button, ConfirmModal, Modal } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { extractTextFromPDF } from '../../services/pdfParser';
import { summarizeDocument } from '../../services/ai';
import { showToast } from '../../stores/toastStore';
import type { ContextDocument } from '../../types';

export function DocumentsSection(): JSX.Element {
  const { settings, addContextDocument, updateContextDocument, deleteContextDocument } = useAppStore();
  const documents = settings.contextDocuments || [];

  const [isUploading, setIsUploading] = useState(false);
  const [summarizingDocId, setSummarizingDocId] = useState<string | null>(null);
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc] = useState<ContextDocument | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const text = await extractTextFromPDF(file);
      const wordCount = text.split(/\s+/).length;

      await addContextDocument({
        name: file.name,
        fullText: text,
        wordCount,
        useSummary: false,
      });
      showToast('Document added', 'success');
    } catch (error) {
      console.error('Failed to upload document:', error);
      showToast('Failed to upload document', 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function handleSummarize(doc: ContextDocument): Promise<void> {
    setSummarizingDocId(doc.id);
    try {
      const summary = await summarizeDocument(doc.fullText, doc.name);
      await updateContextDocument(doc.id, {
        summary,
        summaryWordCount: summary.split(/\s+/).length,
        useSummary: true,
      });
      showToast('Summary generated', 'success');
    } catch (error) {
      console.error('Failed to summarize:', error);
      showToast('Failed to generate summary', 'error');
    } finally {
      setSummarizingDocId(null);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!deleteDocId) return;
    await deleteContextDocument(deleteDocId);
    setDeleteDocId(null);
    showToast('Document removed', 'success');
  }

  function handleUploadClick(): void {
    fileInputRef.current?.click();
  }

  function handleUseSummaryChange(docId: string, useSummary: boolean): void {
    updateContextDocument(docId, { useSummary });
  }

  function openDeleteConfirm(docId: string): void {
    setDeleteDocId(docId);
  }

  function closeDeleteConfirm(): void {
    setDeleteDocId(null);
  }

  function openViewModal(doc: ContextDocument): void {
    setViewingDoc(doc);
  }

  function closeViewModal(): void {
    setViewingDoc(null);
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-surface-raised rounded-full flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-foreground-subtle" />
        </div>
        <h3 className="font-display text-heading-lg text-foreground mb-2">
          No documents uploaded
        </h3>
        <p className="text-foreground-muted max-w-md mb-6">
          Upload PDFs like performance reviews or project docs for the AI to reference.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleUpload}
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
              <Plus className="w-4 h-4 mr-1" />
              Upload Document
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
          <h3 className="font-display text-heading-lg text-foreground">Context Documents</h3>
          <p className="text-sm text-foreground-muted">{documents.length} document{documents.length !== 1 ? 's' : ''}</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleUpload}
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
              <Plus className="w-4 h-4 mr-1" />
              Add Document
            </>
          )}
        </Button>
      </div>

      <div className="space-y-3">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center justify-between p-4 bg-surface rounded-lg border border-border"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-foreground-muted" />
              <div>
                <p className="font-medium text-foreground">{doc.name}</p>
                <p className="text-xs text-foreground-muted">
                  {doc.wordCount.toLocaleString()} words
                  {doc.summary && ` · Summary: ${doc.summaryWordCount?.toLocaleString()} words`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {doc.summary ? (
                <label className="flex items-center gap-2 text-sm text-foreground-muted">
                  <input
                    type="checkbox"
                    checked={doc.useSummary}
                    onChange={(e) => handleUseSummaryChange(doc.id, e.target.checked)}
                    className="rounded border-border"
                  />
                  Use summary
                </label>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSummarize(doc)}
                  disabled={summarizingDocId === doc.id}
                >
                  {summarizingDocId === doc.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-1" />
                      Summarize
                    </>
                  )}
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => openViewModal(doc)}>
                <Eye className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openDeleteConfirm(doc.id)}
                className="text-danger"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmModal
        isOpen={!!deleteDocId}
        onClose={closeDeleteConfirm}
        onConfirm={handleDelete}
        title="Delete Document"
        message="Remove this document from your context bank?"
        confirmText="Delete"
        variant="danger"
      />

      <Modal
        isOpen={!!viewingDoc}
        onClose={closeViewModal}
        title={viewingDoc?.name || 'Document'}
      >
        <div className="max-h-[60vh] overflow-y-auto">
          <pre className="whitespace-pre-wrap text-sm text-foreground-muted font-body">
            {viewingDoc?.useSummary && viewingDoc?.summary
              ? viewingDoc.summary
              : viewingDoc?.fullText}
          </pre>
        </div>
      </Modal>
    </div>
  );
}
