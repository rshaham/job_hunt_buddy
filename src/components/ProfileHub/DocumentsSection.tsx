import { useState, useRef, useEffect } from 'react';
import { Plus, FileText, Trash2, Loader2, Eye, Sparkles, RefreshCw, Wand2 } from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';
import { Button, ConfirmModal, Modal, Tabs, TabsList, TabsTrigger, TabsContent } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { extractTextFromPDF } from '../../services/pdfParser';
import { summarizeDocument, convertDocumentToMarkdown } from '../../services/ai';
import { showToast } from '../../stores/toastStore';
import { useAIOperation } from '../../hooks/useAIOperation';
import type { ContextDocument } from '../../types';

export function DocumentsSection(): JSX.Element {
  const { settings, addContextDocument, updateContextDocument, deleteContextDocument } = useAppStore();
  const documents = settings.contextDocuments || [];

  const summarizeOp = useAIOperation<string>('summarize-document');
  const regenerateOp = useAIOperation<string>('regenerate-summary');
  const formatOp = useAIOperation<string>('format-markdown');

  const [isUploading, setIsUploading] = useState(false);
  const [summarizingDocId, setSummarizingDocId] = useState<string | null>(null);
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc] = useState<ContextDocument | null>(null);
  const [viewTab, setViewTab] = useState<'full' | 'summary'>('full');
  const [editedFullText, setEditedFullText] = useState('');
  const [editedSummary, setEditedSummary] = useState('');
  const [isSavingDoc, setIsSavingDoc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync viewing doc to edit state
  useEffect(() => {
    if (viewingDoc) {
      setEditedFullText(viewingDoc.fullText);
      setEditedSummary(viewingDoc.summary || '');
      setViewTab(viewingDoc.summary ? 'summary' : 'full');
    }
  }, [viewingDoc]);

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
    const summary = await summarizeOp.execute(async () => {
      return await summarizeDocument(doc.fullText, doc.name);
    });

    if (summary) {
      await updateContextDocument(doc.id, {
        summary,
        summaryWordCount: summary.split(/\s+/).length,
        useSummary: true,
      });
      showToast('Summary generated', 'success');
    } else {
      showToast('Failed to generate summary', 'error');
    }
    setSummarizingDocId(null);
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
    setEditedFullText('');
    setEditedSummary('');
  }

  async function handleRegenerateSummary(): Promise<void> {
    if (!viewingDoc) return;
    const summary = await regenerateOp.execute(async () => {
      return await summarizeDocument(editedFullText, viewingDoc.name);
    });

    if (summary) {
      setEditedSummary(summary);
      showToast('Summary regenerated', 'success');
    } else {
      showToast('Failed to regenerate summary', 'error');
    }
  }

  async function handleFormatAsMarkdown(): Promise<void> {
    if (!viewingDoc) return;
    const formatted = await formatOp.execute(async () => {
      return await convertDocumentToMarkdown(editedFullText, viewingDoc.name);
    });

    if (formatted) {
      setEditedFullText(formatted);
      showToast('Formatted as markdown', 'success');
    } else {
      showToast('Failed to format document', 'error');
    }
  }

  async function handleSaveDocChanges(): Promise<void> {
    if (!viewingDoc) return;
    setIsSavingDoc(true);
    try {
      const updates: Partial<ContextDocument> = {
        fullText: editedFullText,
        wordCount: editedFullText.split(/\s+/).filter(Boolean).length,
      };
      if (editedSummary) {
        updates.summary = editedSummary;
        updates.summaryWordCount = editedSummary.split(/\s+/).filter(Boolean).length;
      }
      await updateContextDocument(viewingDoc.id, updates);
      // Update local viewing doc state
      setViewingDoc({
        ...viewingDoc,
        ...updates,
      } as ContextDocument);
      showToast('Changes saved', 'success');
    } catch (error) {
      console.error('Failed to save changes:', error);
      showToast('Failed to save changes', 'error');
    } finally {
      setIsSavingDoc(false);
    }
  }

  const hasDocChanges = viewingDoc && (
    editedFullText !== viewingDoc.fullText ||
    editedSummary !== (viewingDoc.summary || '')
  );

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
            className="group flex items-center justify-between p-4 bg-surface rounded-lg border border-border hover:border-border-muted hover:shadow-sm transition-all duration-fast"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-surface-raised flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-foreground-muted group-hover:text-primary transition-colors duration-fast" />
              </div>
              <div>
                <p className="font-medium text-foreground">{doc.name}</p>
                <p className="text-xs text-foreground-muted">
                  {doc.wordCount.toLocaleString()} words
                  {doc.summary && ` · Summary: ${doc.summaryWordCount?.toLocaleString()} words`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 opacity-70 group-hover:opacity-100 transition-opacity duration-fast">
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
                  disabled={summarizingDocId === doc.id && summarizeOp.isLoading}
                >
                  {summarizingDocId === doc.id && summarizeOp.isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      Summarizing...
                    </>
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
        size="full"
      >
        <div className="flex flex-col h-full" data-color-mode={settings.theme}>
          <Tabs value={viewTab} onValueChange={(v) => setViewTab(v as 'full' | 'summary')} className="flex flex-col flex-1">
            <TabsList className="px-4 pt-2">
              <TabsTrigger value="full">
                Full Document ({viewingDoc?.wordCount?.toLocaleString() || 0} words)
              </TabsTrigger>
              {(viewingDoc?.summary || editedSummary) && (
                <TabsTrigger value="summary">
                  Summary ({(editedSummary || viewingDoc?.summary || '').split(/\s+/).filter(Boolean).length} words)
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="full" className="flex-1 px-4 overflow-hidden">
              <MDEditor
                value={editedFullText}
                onChange={(val) => setEditedFullText(val || '')}
                preview="preview"
                height="100%"
                visibleDragbar={false}
              />
            </TabsContent>

            <TabsContent value="summary" className="flex-1 px-4 overflow-hidden">
              <MDEditor
                value={editedSummary}
                onChange={(val) => setEditedSummary(val || '')}
                preview="preview"
                height="100%"
                visibleDragbar={false}
              />
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 p-4 border-t border-border">
            {viewTab === 'full' && (
              <Button
                variant="secondary"
                onClick={handleFormatAsMarkdown}
                disabled={formatOp.isLoading || !editedFullText.trim()}
              >
                {formatOp.isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Formatting...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Format
                  </>
                )}
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={handleRegenerateSummary}
              disabled={regenerateOp.isLoading || !editedFullText.trim()}
            >
              {regenerateOp.isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Regenerating...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Regenerate Summary
                </>
              )}
            </Button>
            <Button
              onClick={handleSaveDocChanges}
              disabled={isSavingDoc || !hasDocChanges}
            >
              {isSavingDoc ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
