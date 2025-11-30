import { useState, useRef } from 'react';
import {
  Upload,
  Download,
  Loader2,
  CheckCircle,
  XCircle,
  Sun,
  Moon,
  FileText,
  Trash2,
  Bot,
  Key,
  User,
  Settings,
  Eye,
  ChevronDown,
  ChevronRight,
  Puzzle,
  Server,
  Edit3,
  AlertTriangle,
  X,
  HelpCircle,
} from 'lucide-react';
import { Modal, Button, Input, Textarea, ConfirmModal } from '../ui';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/Tabs';
import { useAppStore } from '../../stores/appStore';
import { testApiKey, convertResumeToMarkdown, summarizeDocument } from '../../services/ai';
import { extractTextFromPDF } from '../../services/pdfParser';
import { encodeApiKey, decodeApiKey } from '../../utils/helpers';
import { PROVIDER_MODELS, type ProviderType, type ContextDocument } from '../../types';
import { DEFAULT_AGENT_SETTINGS, type ConfirmationLevel } from '../../types/agent';
import { showToast } from '../../stores/toastStore';
import { exportJobsAsCSV } from '../../services/db';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function SettingsModal() {
  const {
    isSettingsModalOpen,
    closeSettingsModal,
    settings,
    updateSettings,
    exportData,
    importData,
    deleteAllData,
    addContextDocument,
    updateContextDocument,
    deleteContextDocument,
    updateSavedStory,
  } = useAppStore();

  // Provider state
  const [activeProvider, setActiveProvider] = useState<ProviderType>(settings.activeProvider || 'anthropic');
  const providerSettings = settings.providers?.[activeProvider] || { apiKey: '', model: '', baseUrl: '' };

  const [apiKeyInput, setApiKeyInput] = useState(decodeApiKey(providerSettings.apiKey || ''));
  const [modelInput, setModelInput] = useState(providerSettings.model || PROVIDER_MODELS[activeProvider][0]?.id || '');
  const [baseUrlInput, setBaseUrlInput] = useState(providerSettings.baseUrl || 'http://localhost:11434/v1');
  const [customModel, setCustomModel] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [isUploading, setIsUploading] = useState(false);
  const [additionalContextInput, setAdditionalContextInput] = useState(settings.additionalContext || '');
  const [showResumePreview, setShowResumePreview] = useState(false);
  const [expandedStoryId, setExpandedStoryId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Context documents state
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState<string | null>(null);
  const [viewingDocument, setViewingDocument] = useState<ContextDocument | null>(null);
  const [viewMode, setViewMode] = useState<'full' | 'summary'>('full');
  const [editingSummary, setEditingSummary] = useState('');

  // Story editing state
  const [editingStory, setEditingStory] = useState<{ id: string; question: string; answer: string } | null>(null);

  // Delete confirmation state
  const [deleteStoryId, setDeleteStoryId] = useState<string | null>(null);
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);
  const [showClearResumeConfirm, setShowClearResumeConfirm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const docFileInputRef = useRef<HTMLInputElement>(null);

  const currentModels = PROVIDER_MODELS[activeProvider] || [];
  const isCustomModel = !currentModels.some((m) => m.id === modelInput);

  // Update form when provider changes
  const handleProviderChange = (provider: ProviderType) => {
    setActiveProvider(provider);
    const newProviderSettings = settings.providers?.[provider] || { apiKey: '', model: '', baseUrl: '' };
    setApiKeyInput(decodeApiKey(newProviderSettings.apiKey || ''));
    setModelInput(newProviderSettings.model || PROVIDER_MODELS[provider][0]?.id || '');
    setBaseUrlInput(newProviderSettings.baseUrl || 'http://localhost:11434/v1');
    setCustomModel('');
    setTestStatus('idle');
  };

  const handleApiKeyChange = (value: string) => {
    setApiKeyInput(value);
    setTestStatus('idle');
  };

  const handleModelChange = (value: string) => {
    if (value === 'custom') {
      setCustomModel(modelInput);
    } else {
      setModelInput(value);
      setCustomModel('');
    }
    setTestStatus('idle');
  };

  const handleCustomModelChange = (value: string) => {
    setCustomModel(value);
    setModelInput(value);
    setTestStatus('idle');
  };

  const handleProviderSave = async () => {
    const newProviders = {
      ...settings.providers,
      [activeProvider]: {
        apiKey: encodeApiKey(apiKeyInput),
        model: modelInput,
        ...(activeProvider === 'openai-compatible' && { baseUrl: baseUrlInput }),
      },
    };
    await updateSettings({ activeProvider, providers: newProviders });
  };

  const handleTestApiKey = async () => {
    // OpenAI-compatible doesn't require API key
    if (activeProvider !== 'openai-compatible' && !apiKeyInput) return;
    if (!modelInput) return;

    setTestStatus('testing');
    const isValid = await testApiKey(activeProvider, {
      apiKey: apiKeyInput,
      model: modelInput,
      baseUrl: activeProvider === 'openai-compatible' ? baseUrlInput : undefined,
    });
    setTestStatus(isValid ? 'success' : 'error');

    if (isValid) {
      await handleProviderSave();
    }
  };

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

  const handleClearResume = async () => {
    await updateSettings({
      defaultResumeText: '',
      defaultResumeName: '',
    });
    setShowResumePreview(false);
  };

  const handleDownloadResume = () => {
    const blob = new Blob([settings.defaultResumeText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const baseName = settings.defaultResumeName.replace(/\.[^/.]+$/, '');
    a.download = `${baseName || 'resume'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    const data = await exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `job-hunt-buddy-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = async () => {
    const csv = await exportJobsAsCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `job-hunt-buddy-jobs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Jobs exported to CSV', 'success');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      await importData(text);
      showToast('Data imported successfully!', 'success');
    } catch (err) {
      console.error('Failed to import:', err);
      showToast('Failed to import data. Please check the file format.', 'error');
    }

    if (importInputRef.current) {
      importInputRef.current.value = '';
    }
  };

  const handleThemeToggle = () => {
    updateSettings({ theme: settings.theme === 'light' ? 'dark' : 'light' });
  };

  const handleDeleteStory = async (storyId: string) => {
    const updatedStories = (settings.savedStories || []).filter(s => s.id !== storyId);
    await updateSettings({ savedStories: updatedStories });
    if (expandedStoryId === storyId) {
      setExpandedStoryId(null);
    }
  };

  const toggleStoryExpand = (storyId: string) => {
    setExpandedStoryId(expandedStoryId === storyId ? null : storyId);
  };

  const handleDeleteAllData = async () => {
    await deleteAllData();
    closeSettingsModal();
    showToast('All data has been deleted', 'success');
  };

  // Context document handlers
  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingDoc(true);
    try {
      const text = await extractTextFromPDF(file);
      if (!text.trim()) {
        showToast('PDF appears to be empty or could not be read.', 'error');
        return;
      }

      const wordCount = text.split(/\s+/).filter(Boolean).length;
      await addContextDocument({
        name: file.name,
        fullText: text,
        wordCount,
        useSummary: false,
      });

      // Show warning for large documents
      if (wordCount > 500) {
        showToast(`Document added (${wordCount.toLocaleString()} words). Consider summarizing for better AI performance.`, 'warning');
      } else {
        showToast('Document added to context bank.', 'success');
      }
    } catch (err) {
      console.error('Failed to parse PDF:', err);
      showToast('Failed to parse PDF. Please try a different file.', 'error');
    } finally {
      setIsUploadingDoc(false);
      if (docFileInputRef.current) {
        docFileInputRef.current.value = '';
      }
    }
  };

  const handleSummarizeDocument = async (doc: ContextDocument) => {
    setIsSummarizing(doc.id);
    try {
      const summary = await summarizeDocument(doc.fullText, doc.name);
      const summaryWordCount = summary.split(/\s+/).filter(Boolean).length;
      await updateContextDocument(doc.id, {
        summary,
        summaryWordCount,
        useSummary: true,
      });

      // Update local viewing state if this is the document being viewed
      if (viewingDocument?.id === doc.id) {
        setViewingDocument({ ...doc, summary, summaryWordCount, useSummary: true });
        setEditingSummary(summary);
      }

      showToast(`Document summarized (${summaryWordCount} words).`, 'success');
    } catch (err) {
      console.error('Failed to summarize:', err);
      showToast('Failed to summarize document. Please try again.', 'error');
    } finally {
      setIsSummarizing(null);
    }
  };

  const handleToggleUseSummary = async (doc: ContextDocument) => {
    if (!doc.summary) {
      showToast('Generate a summary first.', 'error');
      return;
    }
    await updateContextDocument(doc.id, { useSummary: !doc.useSummary });
  };

  const handleDeleteDocument = async (docId: string) => {
    await deleteContextDocument(docId);
    if (viewingDocument?.id === docId) {
      setViewingDocument(null);
    }
    showToast('Document removed.', 'success');
  };

  const handleViewDocument = (doc: ContextDocument) => {
    setViewingDocument(doc);
    setViewMode(doc.summary ? 'summary' : 'full');
    setEditingSummary(doc.summary || '');
  };

  const handleSaveSummaryEdit = async () => {
    if (!viewingDocument) return;
    const summaryWordCount = editingSummary.split(/\s+/).filter(Boolean).length;
    await updateContextDocument(viewingDocument.id, {
      summary: editingSummary,
      summaryWordCount,
    });
    setViewingDocument({ ...viewingDocument, summary: editingSummary, summaryWordCount });
    showToast('Summary saved.', 'success');
  };

  // Calculate total context word count
  const calculateTotalContextWords = (): number => {
    let total = 0;
    if (settings.additionalContext) {
      total += settings.additionalContext.split(/\s+/).filter(Boolean).length;
    }
    for (const doc of settings.contextDocuments || []) {
      if (doc.useSummary && doc.summary) {
        total += doc.summaryWordCount || 0;
      } else {
        total += doc.wordCount;
      }
    }
    for (const story of settings.savedStories || []) {
      total += story.question.split(/\s+/).filter(Boolean).length;
      total += story.answer.split(/\s+/).filter(Boolean).length;
    }
    return total;
  };

  // Story editing handlers
  const handleEditStory = (story: { id: string; question: string; answer: string }) => {
    setEditingStory({ ...story });
  };

  const handleSaveStory = async () => {
    if (!editingStory) return;
    await updateSavedStory(editingStory.id, {
      question: editingStory.question,
      answer: editingStory.answer,
    });
    setEditingStory(null);
    showToast('Story updated.', 'success');
  };

  return (
    <Modal isOpen={isSettingsModalOpen} onClose={closeSettingsModal} title="Settings" size="full">
      <div className="p-4 h-full">
        <Tabs defaultValue="api" className="h-full">
          <TabsList className="mb-4">
            <TabsTrigger value="api">
              <Key className="w-4 h-4 mr-1.5 inline" />
              API
            </TabsTrigger>
            <TabsTrigger value="resume">
              <FileText className="w-4 h-4 mr-1.5 inline" />
              Resume
            </TabsTrigger>
            <TabsTrigger value="profile">
              <User className="w-4 h-4 mr-1.5 inline" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="preferences">
              <Settings className="w-4 h-4 mr-1.5 inline" />
              Preferences
            </TabsTrigger>
            <TabsTrigger value="agent">
              <Bot className="w-4 h-4 mr-1.5 inline" />
              Agent
            </TabsTrigger>
          </TabsList>

          {/* API Tab */}
          <TabsContent value="api" className="space-y-6">
            {/* Provider Selection */}
            <section>
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <Server className="w-4 h-4" />
                AI Provider
              </h3>
              <select
                aria-label="Select AI provider"
                value={activeProvider}
                onChange={(e) => handleProviderChange(e.target.value as ProviderType)}
                className="w-full max-w-xl px-3 py-2 text-sm border rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="openai-compatible">Local / OpenAI-Compatible (Ollama, LM Studio)</option>
                <option value="gemini">Google Gemini</option>
              </select>
            </section>

            {/* Provider-specific Configuration */}
            {activeProvider === 'anthropic' && (
              <>
                <section>
                  <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                    Anthropic API Key
                  </h3>
                  <div className="flex gap-2 max-w-xl">
                    <Input
                      type="password"
                      placeholder="sk-ant-..."
                      value={apiKeyInput}
                      onChange={(e) => handleApiKeyChange(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleTestApiKey}
                      disabled={!apiKeyInput || testStatus === 'testing'}
                      variant="secondary"
                    >
                      {testStatus === 'testing' && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                      {testStatus === 'success' && <CheckCircle className="w-4 h-4 mr-1 text-green-500" />}
                      {testStatus === 'error' && <XCircle className="w-4 h-4 mr-1 text-red-500" />}
                      {testStatus === 'idle' && 'Test & Save'}
                      {testStatus === 'testing' && 'Testing...'}
                      {testStatus === 'success' && 'Saved!'}
                      {testStatus === 'error' && 'Invalid'}
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Get your API key from the{' '}
                    <a
                      href="https://console.anthropic.com/settings/keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Anthropic Console
                    </a>
                    . Your key is stored locally and never sent to our servers.
                  </p>
                </section>

                <section>
                  <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                    <Bot className="w-4 h-4" />
                    Claude Model
                  </h3>
                  <div className="space-y-3 max-w-xl">
                    <select
                      aria-label="Select Claude model"
                      value={isCustomModel ? 'custom' : modelInput}
                      onChange={(e) => handleModelChange(e.target.value)}
                      className="w-full px-3 py-2 text-sm border rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {currentModels.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name} - {model.description}
                        </option>
                      ))}
                      <option value="custom">Custom model...</option>
                    </select>

                    {(isCustomModel || customModel) && (
                      <Input
                        placeholder="Enter model ID (e.g., claude-sonnet-4-5-20250514)"
                        value={customModel || modelInput}
                        onChange={(e) => handleCustomModelChange(e.target.value)}
                      />
                    )}

                    <p className="text-xs text-slate-500">
                      Current model: <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">{modelInput}</code>
                    </p>
                  </div>
                </section>
              </>
            )}

            {activeProvider === 'openai-compatible' && (
              <>
                <section>
                  <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                    Server URL
                  </h3>
                  <Input
                    placeholder="http://localhost:11434/v1"
                    value={baseUrlInput}
                    onChange={(e) => {
                      setBaseUrlInput(e.target.value);
                      setTestStatus('idle');
                    }}
                    className="max-w-xl"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Default Ollama URL: <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">http://localhost:11434/v1</code>
                  </p>
                </section>

                <section>
                  <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                    API Key (Optional)
                  </h3>
                  <Input
                    type="password"
                    placeholder="Leave empty for local Ollama"
                    value={apiKeyInput}
                    onChange={(e) => handleApiKeyChange(e.target.value)}
                    className="max-w-xl"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Only needed for remote endpoints that require authentication.
                  </p>
                </section>

                <section>
                  <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                    <Bot className="w-4 h-4" />
                    Model
                  </h3>
                  <div className="space-y-3 max-w-xl">
                    <select
                      aria-label="Select model"
                      value={isCustomModel ? 'custom' : modelInput}
                      onChange={(e) => handleModelChange(e.target.value)}
                      className="w-full px-3 py-2 text-sm border rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {currentModels.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name} - {model.description}
                        </option>
                      ))}
                      <option value="custom">Custom model...</option>
                    </select>

                    {(isCustomModel || customModel) && (
                      <Input
                        placeholder="Enter model name (e.g., llama3.2:latest)"
                        value={customModel || modelInput}
                        onChange={(e) => handleCustomModelChange(e.target.value)}
                      />
                    )}

                    <Button
                      onClick={handleTestApiKey}
                      disabled={!modelInput || testStatus === 'testing'}
                      variant="secondary"
                    >
                      {testStatus === 'testing' && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                      {testStatus === 'success' && <CheckCircle className="w-4 h-4 mr-1 text-green-500" />}
                      {testStatus === 'error' && <XCircle className="w-4 h-4 mr-1 text-red-500" />}
                      {testStatus === 'idle' && 'Test & Save'}
                      {testStatus === 'testing' && 'Testing...'}
                      {testStatus === 'success' && 'Saved!'}
                      {testStatus === 'error' && 'Connection Failed'}
                    </Button>
                  </div>
                </section>
              </>
            )}

            {activeProvider === 'gemini' && (
              <>
                <section>
                  <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                    Google API Key
                  </h3>
                  <div className="flex gap-2 max-w-xl">
                    <Input
                      type="password"
                      placeholder="AIza..."
                      value={apiKeyInput}
                      onChange={(e) => handleApiKeyChange(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleTestApiKey}
                      disabled={!apiKeyInput || testStatus === 'testing'}
                      variant="secondary"
                    >
                      {testStatus === 'testing' && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                      {testStatus === 'success' && <CheckCircle className="w-4 h-4 mr-1 text-green-500" />}
                      {testStatus === 'error' && <XCircle className="w-4 h-4 mr-1 text-red-500" />}
                      {testStatus === 'idle' && 'Test & Save'}
                      {testStatus === 'testing' && 'Testing...'}
                      {testStatus === 'success' && 'Saved!'}
                      {testStatus === 'error' && 'Invalid'}
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Get your API key from{' '}
                    <a
                      href="https://aistudio.google.com/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Google AI Studio
                    </a>
                    . Free tier available with generous limits.
                  </p>
                </section>

                <section>
                  <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                    <Bot className="w-4 h-4" />
                    Gemini Model
                  </h3>
                  <div className="space-y-3 max-w-xl">
                    <select
                      aria-label="Select Gemini model"
                      value={isCustomModel ? 'custom' : modelInput}
                      onChange={(e) => handleModelChange(e.target.value)}
                      className="w-full px-3 py-2 text-sm border rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {currentModels.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name} - {model.description}
                        </option>
                      ))}
                      <option value="custom">Custom model...</option>
                    </select>

                    {(isCustomModel || customModel) && (
                      <Input
                        placeholder="Enter model ID (e.g., gemini-1.5-pro-latest)"
                        value={customModel || modelInput}
                        onChange={(e) => handleCustomModelChange(e.target.value)}
                      />
                    )}

                    <p className="text-xs text-slate-500">
                      Current model: <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">{modelInput}</code>
                    </p>
                  </div>
                </section>
              </>
            )}
          </TabsContent>

          {/* Resume Tab */}
          <TabsContent value="resume" className="space-y-6">
            <section>
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Default Resume
              </h3>
              {settings.defaultResumeName ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg max-w-xl">
                    <FileText className="w-8 h-8 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {settings.defaultResumeName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {settings.defaultResumeText.length.toLocaleString()} characters
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowResumePreview(!showResumePreview)}
                        title="View resume"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDownloadResume}
                        title="Download as markdown"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setShowClearResumeConfirm(true)} title="Remove resume">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Resume Preview */}
                  {showResumePreview && (
                    <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-900 max-h-[50vh] overflow-y-auto">
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown skipHtml>{settings.defaultResumeText}</ReactMarkdown>
                      </div>
                    </div>
                  )}

                  <div>
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
                      {isUploading ? 'Parsing PDF...' : 'Replace Resume'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
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
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-1" />
                    )}
                    {isUploading ? 'Parsing PDF...' : 'Upload Resume (PDF)'}
                  </Button>
                </div>
              )}
              <p className="text-xs text-slate-500 mt-2">
                This resume will be used as the default for resume grading and cover letter generation.
              </p>
            </section>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            {/* Total Context Word Count Banner */}
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg max-w-2xl">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Total context being sent to AI:
                </span>
                <span className={`text-sm font-medium ${calculateTotalContextWords() > 3000 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'}`}>
                  {calculateTotalContextWords().toLocaleString()} words
                </span>
              </div>
              {calculateTotalContextWords() > 3000 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Large context may slow AI responses. Consider summarizing documents.
                </p>
              )}
            </div>

            {/* Context Documents Section */}
            <section>
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Context Documents ({settings.contextDocuments?.length || 0})
              </h3>

              {/* Document List */}
              {settings.contextDocuments?.length > 0 && (
                <div className="space-y-2 max-w-2xl mb-3">
                  {settings.contextDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                    >
                      <div className="flex items-start gap-3">
                        <FileText className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                            {doc.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {doc.wordCount.toLocaleString()} words
                            {doc.summary && ` • Summary: ${doc.summaryWordCount?.toLocaleString()} words`}
                          </p>
                          {doc.summary && (
                            <label className="flex items-center gap-2 mt-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={doc.useSummary}
                                onChange={() => handleToggleUseSummary(doc)}
                                className="rounded border-slate-300 text-primary focus:ring-primary"
                              />
                              <span className="text-xs text-slate-600 dark:text-slate-400">
                                Use summary for AI calls
                              </span>
                            </label>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDocument(doc)}
                            title="View/Edit document"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {!doc.summary && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSummarizeDocument(doc)}
                              disabled={isSummarizing === doc.id}
                              title="Summarize with AI"
                            >
                              {isSummarizing === doc.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Bot className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteDocId(doc.id)}
                            title="Remove document"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Button */}
              <div>
                <input
                  ref={docFileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleDocumentUpload}
                  className="hidden"
                  aria-label="Upload context document PDF"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => docFileInputRef.current?.click()}
                  disabled={isUploadingDoc}
                >
                  {isUploadingDoc ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-1" />
                  )}
                  {isUploadingDoc ? 'Parsing PDF...' : 'Upload PDF'}
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Upload PDFs (portfolios, project docs) to add to your AI context. Documents over 500 words can be summarized.
              </p>
            </section>

            {/* Additional Context Section */}
            <section>
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1">
                Additional Context
                <span className="group relative">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-slate-800 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    AI uses this when grading and generating content
                  </span>
                </span>
              </h3>
              <Textarea
                value={additionalContextInput}
                onChange={(e) => setAdditionalContextInput(e.target.value)}
                onBlur={() => updateSettings({ additionalContext: additionalContextInput })}
                placeholder="Add context the AI should know about you: key projects, achievements, skills not on your resume, career goals, etc."
                rows={10}
                className="text-sm max-w-2xl"
              />
              <p className="text-xs text-slate-500 mt-2">
                This context is included when grading resumes, tailoring, and generating cover letters.
              </p>
            </section>

            {/* Saved Stories Section */}
            <section>
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1">
                Saved Stories ({settings.savedStories?.length || 0})
                <span className="group relative">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-slate-800 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    Answers saved from Prep chats for reuse
                  </span>
                </span>
              </h3>
              {settings.savedStories?.length > 0 ? (
                <div className="space-y-2 max-w-2xl">
                  {settings.savedStories.map((story) => (
                    <div
                      key={story.id}
                      className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => toggleStoryExpand(story.id)}
                        className="w-full p-3 flex items-center gap-2 text-left bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        {expandedStoryId === story.id ? (
                          <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                        )}
                        <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                          {story.question}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditStory(story);
                          }}
                          className="text-slate-400 hover:text-primary p-1"
                          title="Edit story"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteStoryId(story.id);
                          }}
                          className="text-slate-400 hover:text-danger p-1"
                          title="Delete story"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </button>
                      {expandedStoryId === story.id && (
                        <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                          <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                            {story.answer}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  No saved stories yet. Save answers from Prep chats or Resume Tailoring to build your profile.
                </p>
              )}
            </section>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            {/* Theme Section */}
            <section>
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Appearance
              </h3>
              <Button variant="secondary" onClick={handleThemeToggle}>
                {settings.theme === 'light' ? (
                  <>
                    <Moon className="w-4 h-4 mr-1" />
                    Switch to Dark Mode
                  </>
                ) : (
                  <>
                    <Sun className="w-4 h-4 mr-1" />
                    Switch to Light Mode
                  </>
                )}
              </Button>
            </section>

            {/* Browser Extension Section */}
            <section>
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <Puzzle className="w-4 h-4" />
                Browser Extension
              </h3>
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg max-w-xl">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                  Capture jobs from LinkedIn, Indeed, Greenhouse, and more with one click.
                </p>
                <ol className="text-sm text-slate-600 dark:text-slate-400 list-decimal list-inside space-y-1 mb-3">
                  <li>Open <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">chrome://extensions</code> in Chrome</li>
                  <li>Enable "Developer mode" (top right toggle)</li>
                  <li>Click "Load unpacked"</li>
                  <li>Select the <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">browser-extension</code> folder</li>
                </ol>
                <p className="text-xs text-slate-500">
                  The extension is included in the app directory.
                </p>
              </div>
            </section>

            {/* Export/Import Section */}
            <section>
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Data Backup
              </h3>
              <div className="flex gap-2 flex-wrap">
                <Button variant="secondary" onClick={handleExport}>
                  <Download className="w-4 h-4 mr-1" />
                  Export JSON
                </Button>
                <Button variant="secondary" onClick={handleExportCSV}>
                  <Download className="w-4 h-4 mr-1" />
                  Export CSV
                </Button>
                <div>
                  <input
                    ref={importInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                    aria-label="Import data JSON file"
                  />
                  <Button variant="secondary" onClick={() => importInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-1" />
                    Import Data
                  </Button>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Export as JSON for full backup or CSV for spreadsheets.
              </p>
            </section>

            {/* Delete All Data Section */}
            <section>
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Danger Zone
              </h3>
              <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 className="w-4 h-4 mr-1" />
                Delete All Data
              </Button>
              <p className="text-xs text-slate-500 mt-2">
                Permanently delete all jobs, settings, API keys, and resume data.
              </p>
            </section>
          </TabsContent>

          {/* Agent Tab */}
          <TabsContent value="agent" className="space-y-6">
            {/* Confirmation Level */}
            <section>
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Tool Confirmation
              </h3>
              <select
                aria-label="Select confirmation level"
                value={settings.agentSettings?.requireConfirmation ?? DEFAULT_AGENT_SETTINGS.requireConfirmation}
                onChange={(e) => updateSettings({
                  agentSettings: {
                    ...settings.agentSettings,
                    requireConfirmation: e.target.value as ConfirmationLevel,
                    maxIterations: settings.agentSettings?.maxIterations ?? DEFAULT_AGENT_SETTINGS.maxIterations,
                  }
                })}
                className="w-full max-w-xl px-3 py-2 text-sm border rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Tool Uses - Confirm every action</option>
                <option value="write-only">Write Operations Only - Confirm changes (default)</option>
                <option value="destructive-only">Destructive Only - Confirm deletions/status changes</option>
                <option value="never">Never - Auto-execute all tools</option>
              </select>
              <p className="text-xs text-slate-500 mt-2">
                Control when the Command Bar (Ctrl+K) asks for confirmation before executing tools.
              </p>
            </section>

            {/* Max Iterations */}
            <section>
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1">
                Max Agent Iterations
                <span className="group relative">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-slate-800 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    How many tool calls the agent can make per request
                  </span>
                </span>
              </h3>
              <Input
                type="number"
                min={1}
                max={20}
                value={settings.agentSettings?.maxIterations ?? DEFAULT_AGENT_SETTINGS.maxIterations}
                onChange={(e) => {
                  const value = Math.min(20, Math.max(1, parseInt(e.target.value) || DEFAULT_AGENT_SETTINGS.maxIterations));
                  updateSettings({
                    agentSettings: {
                      ...settings.agentSettings,
                      requireConfirmation: settings.agentSettings?.requireConfirmation ?? DEFAULT_AGENT_SETTINGS.requireConfirmation,
                      maxIterations: value,
                    }
                  });
                }}
                className="max-w-[120px]"
              />
              <p className="text-xs text-slate-500 mt-2">
                Limits how many tool calls the AI can make to complete a request. Higher = more complex tasks possible. Default: 7
              </p>
            </section>

            {/* Command Bar Info */}
            <section>
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Command Bar
              </h3>
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg max-w-xl">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                  Press <kbd className="px-1.5 py-0.5 text-xs bg-slate-200 dark:bg-slate-700 rounded">Ctrl+K</kbd> (or <kbd className="px-1.5 py-0.5 text-xs bg-slate-200 dark:bg-slate-700 rounded">Cmd+K</kbd> on Mac) to open the Command Bar.
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Use natural language to search jobs, update statuses, add notes, and more.
                </p>
              </div>
            </section>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteAllData}
        title="Delete All Data?"
        message="This will permanently delete ALL data including jobs, API keys, resume, and settings. This action cannot be undone."
        confirmText="Delete Everything"
        variant="danger"
      />

      {/* Document View/Edit Modal */}
      {viewingDocument && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col mx-4">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200">
                {viewingDocument.name}
              </h3>
              <button
                type="button"
                onClick={() => setViewingDocument(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs for Full/Summary */}
            <div className="flex border-b border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('full')}
                className={`px-4 py-2 text-sm font-medium ${
                  viewMode === 'full'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Full Document ({viewingDocument.wordCount.toLocaleString()} words)
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode('summary');
                  setEditingSummary(viewingDocument.summary || '');
                }}
                className={`px-4 py-2 text-sm font-medium ${
                  viewMode === 'summary'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Summary {viewingDocument.summary ? `(${viewingDocument.summaryWordCount?.toLocaleString()} words)` : '(not created)'}
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4">
              {viewMode === 'full' ? (
                <div className="prose prose-sm dark:prose-invert max-w-none text-sm text-slate-700 dark:text-slate-300">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>
                    {viewingDocument.fullText}
                  </ReactMarkdown>
                </div>
              ) : viewingDocument.summary ? (
                <Textarea
                  value={editingSummary}
                  onChange={(e) => setEditingSummary(e.target.value)}
                  rows={15}
                  className="text-sm w-full"
                  placeholder="Edit the summary..."
                />
              ) : (
                <div className="text-center py-8">
                  <Bot className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500 mb-4">No summary yet.</p>
                  <Button
                    onClick={() => handleSummarizeDocument(viewingDocument)}
                    disabled={isSummarizing === viewingDocument.id}
                  >
                    {isSummarizing === viewingDocument.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        Summarizing...
                      </>
                    ) : (
                      <>
                        <Bot className="w-4 h-4 mr-1" />
                        Generate Summary with AI
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Footer */}
            {viewMode === 'summary' && viewingDocument.summary && (
              <div className="flex justify-end gap-2 p-4 border-t border-slate-200 dark:border-slate-700">
                <Button
                  variant="secondary"
                  onClick={() => handleSummarizeDocument(viewingDocument)}
                  disabled={isSummarizing === viewingDocument.id}
                >
                  {isSummarizing === viewingDocument.id ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Bot className="w-4 h-4 mr-1" />
                  )}
                  Regenerate
                </Button>
                <Button onClick={handleSaveSummaryEdit}>
                  Save Changes
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Story Edit Modal */}
      {editingStory && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col mx-4">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200">
                Edit Story
              </h3>
              <button
                type="button"
                onClick={() => setEditingStory(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Question/Topic
                </label>
                <Input
                  value={editingStory.question}
                  onChange={(e) => setEditingStory({ ...editingStory, question: e.target.value })}
                  placeholder="What question does this story answer?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Your Answer/Story
                </label>
                <Textarea
                  value={editingStory.answer}
                  onChange={(e) => setEditingStory({ ...editingStory, answer: e.target.value })}
                  rows={10}
                  placeholder="Your experience or story..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t border-slate-200 dark:border-slate-700">
              <Button variant="secondary" onClick={() => setEditingStory(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveStory}>
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Additional Delete Confirmation Modals */}
      <ConfirmModal
        isOpen={showClearResumeConfirm}
        onClose={() => setShowClearResumeConfirm(false)}
        onConfirm={() => {
          handleClearResume();
          setShowClearResumeConfirm(false);
        }}
        title="Clear Resume"
        message="Clear your default resume? This cannot be undone."
        confirmText="Clear"
        variant="danger"
      />

      <ConfirmModal
        isOpen={deleteStoryId !== null}
        onClose={() => setDeleteStoryId(null)}
        onConfirm={() => {
          if (deleteStoryId) {
            handleDeleteStory(deleteStoryId);
            setDeleteStoryId(null);
          }
        }}
        title="Delete Story"
        message="Delete this saved story? This cannot be undone."
        confirmText="Delete"
        variant="danger"
      />

      <ConfirmModal
        isOpen={deleteDocId !== null}
        onClose={() => setDeleteDocId(null)}
        onConfirm={() => {
          if (deleteDocId) {
            handleDeleteDocument(deleteDocId);
            setDeleteDocId(null);
          }
        }}
        title="Remove Document"
        message={`Remove "${settings.contextDocuments?.find(d => d.id === deleteDocId)?.name || 'this document'}" from context bank? This cannot be undone.`}
        confirmText="Remove"
        variant="danger"
      />
    </Modal>
  );
}
