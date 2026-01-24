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
  Settings,
  Eye,
  Puzzle,
  Server,
  AlertTriangle,
  HelpCircle,
  Shield,
  Globe,
} from 'lucide-react';
import { Modal, Button, Input, ConfirmModal } from '../ui';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/Tabs';
import { useAppStore } from '../../stores/appStore';
import { testApiKey, convertResumeToMarkdown } from '../../services/ai';
import { extractTextFromPDF } from '../../services/pdfParser';
import { encodeApiKey, decodeApiKey } from '../../utils/helpers';
import { PROVIDER_MODELS, type ProviderType } from '../../types';
import { DEFAULT_AGENT_SETTINGS, type ConfirmationLevel } from '../../types/agent';
import { showToast } from '../../stores/toastStore';
import { exportJobsAsCSV } from '../../services/db';
import ReactMarkdown from 'react-markdown';

export function SettingsModal() {
  const {
    isSettingsModalOpen,
    closeSettingsModal,
    settings,
    updateSettings,
    exportData,
    importData,
    deleteAllData,
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
  const [showResumePreview, setShowResumePreview] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showClearResumeConfirm, setShowClearResumeConfirm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

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

  const handleDeleteAllData = async () => {
    await deleteAllData();
    closeSettingsModal();
    showToast('All data has been deleted', 'success');
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
            <TabsTrigger value="preferences">
              <Settings className="w-4 h-4 mr-1.5 inline" />
              Preferences
            </TabsTrigger>
            <TabsTrigger value="agent">
              <Bot className="w-4 h-4 mr-1.5 inline" />
              Agent
            </TabsTrigger>
            <TabsTrigger value="privacy">
              <Shield className="w-4 h-4 mr-1.5 inline" />
              Privacy
            </TabsTrigger>
          </TabsList>

          {/* API Tab */}
          <TabsContent value="api" className="space-y-6">
            {/* Provider Selection */}
            <section>
              <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                <Server className="w-4 h-4" />
                AI Provider
              </h3>
              <select
                aria-label="Select AI provider"
                value={activeProvider}
                onChange={(e) => handleProviderChange(e.target.value as ProviderType)}
                className="w-full max-w-xl px-3 py-2 text-sm border rounded-md border-border-muted bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
                  <h3 className="text-sm font-medium text-foreground mb-3">
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
                  <p className="text-xs text-muted mt-2">
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
                  <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    <Bot className="w-4 h-4" />
                    Claude Model
                  </h3>
                  <div className="space-y-3 max-w-xl">
                    <select
                      aria-label="Select Claude model"
                      value={isCustomModel ? 'custom' : modelInput}
                      onChange={(e) => handleModelChange(e.target.value)}
                      className="w-full px-3 py-2 text-sm border rounded-md border-border-muted bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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

                    <p className="text-xs text-muted">
                      Current model: <code className="bg-surface px-1 rounded">{modelInput}</code>
                    </p>
                  </div>
                </section>
              </>
            )}

            {activeProvider === 'openai-compatible' && (
              <>
                <section>
                  <h3 className="text-sm font-medium text-foreground mb-3">
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
                  <p className="text-xs text-muted mt-2">
                    Default Ollama URL: <code className="bg-surface px-1 rounded">http://localhost:11434/v1</code>
                  </p>
                </section>

                <section>
                  <h3 className="text-sm font-medium text-foreground mb-3">
                    API Key (Optional)
                  </h3>
                  <Input
                    type="password"
                    placeholder="Leave empty for local Ollama"
                    value={apiKeyInput}
                    onChange={(e) => handleApiKeyChange(e.target.value)}
                    className="max-w-xl"
                  />
                  <p className="text-xs text-muted mt-2">
                    Only needed for remote endpoints that require authentication.
                  </p>
                </section>

                <section>
                  <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    <Bot className="w-4 h-4" />
                    Model
                  </h3>
                  <div className="space-y-3 max-w-xl">
                    <select
                      aria-label="Select model"
                      value={isCustomModel ? 'custom' : modelInput}
                      onChange={(e) => handleModelChange(e.target.value)}
                      className="w-full px-3 py-2 text-sm border rounded-md border-border-muted bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
                  <h3 className="text-sm font-medium text-foreground mb-3">
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
                  <p className="text-xs text-muted mt-2">
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
                  <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    <Bot className="w-4 h-4" />
                    Gemini Model
                  </h3>
                  <div className="space-y-3 max-w-xl">
                    <select
                      aria-label="Select Gemini model"
                      value={isCustomModel ? 'custom' : modelInput}
                      onChange={(e) => handleModelChange(e.target.value)}
                      className="w-full px-3 py-2 text-sm border rounded-md border-border-muted bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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

                    <p className="text-xs text-muted">
                      Current model: <code className="bg-surface px-1 rounded">{modelInput}</code>
                    </p>
                  </div>
                </section>
              </>
            )}
          </TabsContent>

          {/* Resume Tab */}
          <TabsContent value="resume" className="space-y-6">
            <section>
              <h3 className="text-sm font-medium text-foreground mb-3">
                Default Resume
              </h3>
              {settings.defaultResumeName ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-surface rounded-lg max-w-xl">
                    <FileText className="w-8 h-8 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {settings.defaultResumeName}
                      </p>
                      <p className="text-xs text-muted">
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
                    <div className="border border-border rounded-lg p-4 bg-background max-h-[50vh] overflow-y-auto">
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
              <p className="text-xs text-muted mt-2">
                This resume will be used as the default for resume grading and cover letter generation.
              </p>
            </section>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            {/* Theme Section */}
            <section>
              <h3 className="text-sm font-medium text-foreground mb-3">
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
              <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                <Puzzle className="w-4 h-4" />
                Browser Extension
              </h3>
              <div className="p-4 bg-surface rounded-lg max-w-xl">
                <p className="text-sm text-foreground-muted mb-3">
                  Capture jobs from LinkedIn, Indeed, Greenhouse, and more with one click.
                </p>
                <ol className="text-sm text-foreground-muted list-decimal list-inside space-y-1 mb-3">
                  <li>Open <code className="bg-surface-raised px-1 rounded">chrome://extensions</code> in Chrome</li>
                  <li>Enable "Developer mode" (top right toggle)</li>
                  <li>Click "Load unpacked"</li>
                  <li>Select the <code className="bg-surface-raised px-1 rounded">browser-extension</code> folder</li>
                </ol>
                <p className="text-xs text-muted">
                  The extension is included in the app directory.
                </p>
              </div>
            </section>

            {/* Export/Import Section */}
            <section>
              <h3 className="text-sm font-medium text-foreground mb-3">
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
              <p className="text-xs text-muted mt-2">
                Export as JSON for full backup or CSV for spreadsheets.
              </p>
            </section>

            {/* Delete All Data Section */}
            <section>
              <h3 className="text-sm font-medium text-foreground mb-3">
                Danger Zone
              </h3>
              <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 className="w-4 h-4 mr-1" />
                Delete All Data
              </Button>
              <p className="text-xs text-muted mt-2">
                Permanently delete all jobs, settings, API keys, and resume data.
              </p>
            </section>
          </TabsContent>

          {/* Agent Tab */}
          <TabsContent value="agent" className="space-y-6">
            {/* Confirmation Level */}
            <section>
              <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
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
                className="w-full max-w-xl px-3 py-2 text-sm border rounded-md border-border-muted bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Tool Uses - Confirm every action</option>
                <option value="write-only">Write Operations Only - Confirm changes (default)</option>
                <option value="destructive-only">Destructive Only - Confirm deletions/status changes</option>
                <option value="never">Never - Auto-execute all tools</option>
              </select>
              <p className="text-xs text-muted mt-2">
                Control when the Command Bar (Ctrl+K) asks for confirmation before executing tools.
              </p>
            </section>

            {/* Max Iterations */}
            <section>
              <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-1">
                Max Agent Iterations
                <span className="group relative">
                  <HelpCircle className="w-3.5 h-3.5 text-tertiary cursor-help" />
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
              <p className="text-xs text-muted mt-2">
                Limits how many tool calls the AI can make to complete a request. Higher = more complex tasks possible. Default: 7
              </p>
            </section>

            {/* Command Bar Info */}
            <section>
              <h3 className="text-sm font-medium text-foreground mb-3">
                Command Bar
              </h3>
              <div className="p-4 bg-surface rounded-lg max-w-xl">
                <p className="text-sm text-foreground-muted mb-3">
                  Press <kbd className="px-1.5 py-0.5 text-xs bg-surface-raised rounded">Ctrl+K</kbd> (or <kbd className="px-1.5 py-0.5 text-xs bg-surface-raised rounded">Cmd+K</kbd> on Mac) to open the Command Bar.
                </p>
                <p className="text-sm text-foreground-muted">
                  Use natural language to search jobs, update statuses, add notes, and more.
                </p>
              </div>
            </section>
          </TabsContent>

          {/* Privacy Tab */}
          <TabsContent value="privacy" className="space-y-6">
            {/* Privacy Impact Notice */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg max-w-xl">
              <div className="flex gap-3">
                <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-800 dark:text-blue-200 text-sm mb-1">
                    Your Data Stays Local
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    All your jobs, resumes, cover letters, and notes are stored only in your browser.
                    The optional features below send limited data to third-party services to work.
                  </p>
                </div>
              </div>
            </div>

            {/* External Services Section */}
            <section>
              <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                <Globe className="w-4 h-4" />
                External Services
              </h3>
              <div className="space-y-3 max-w-xl">
                {/* Job Search Toggle */}
                <div className="p-3 bg-surface rounded-lg">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.externalServicesConsent?.jobSearch ?? false}
                      onChange={(e) => updateSettings({
                        externalServicesConsent: {
                          ...settings.externalServicesConsent,
                          jobSearch: e.target.checked,
                          consentedAt: e.target.checked ? new Date() : settings.externalServicesConsent?.consentedAt,
                        }
                      })}
                      className="mt-1 rounded border-slate-300 text-primary focus:ring-primary"
                    />
                    <div className="flex-1">
                      <span className="font-medium text-foreground text-sm">
                        Job Search
                      </span>
                      {settings.externalServicesConsent?.serpApiKey ? (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-0.5 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Your key — uses your quota, no rate limits
                        </p>
                      ) : (
                        <p className="text-xs text-muted mt-0.5">
                          Find job listings via SerApi. <span className="text-amber-600 dark:text-amber-400">Sends:</span> search query, location.
                        </p>
                      )}
                    </div>
                  </label>
                  {/* SerApi Key Input */}
                  <div className="mt-3 pl-7">
                    <label className="block text-xs font-medium text-foreground-muted mb-1">
                      Your SerApi Key <span className="text-slate-400 dark:text-slate-500">(optional)</span>
                    </label>
                    <Input
                      type="password"
                      value={decodeApiKey(settings.externalServicesConsent?.serpApiKey || '')}
                      onChange={(e) => updateSettings({
                        externalServicesConsent: {
                          ...settings.externalServicesConsent,
                          serpApiKey: e.target.value ? encodeApiKey(e.target.value) : undefined,
                        }
                      })}
                      placeholder="Enter your SerApi key..."
                      className="text-sm"
                    />
                    <p className="text-xs text-muted mt-1">
                      Get a free key at{' '}
                      <a href="https://serpapi.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        serpapi.com
                      </a>
                      {' '}• Note: SerApi requires server proxy (CORS), but your key uses your own quota.
                    </p>
                  </div>
                </div>

                {/* Web Research Toggle */}
                <div className="p-3 bg-surface rounded-lg">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.externalServicesConsent?.webResearch ?? false}
                      onChange={(e) => updateSettings({
                        externalServicesConsent: {
                          ...settings.externalServicesConsent,
                          webResearch: e.target.checked,
                          consentedAt: e.target.checked ? new Date() : settings.externalServicesConsent?.consentedAt,
                        }
                      })}
                      className="mt-1 rounded border-slate-300 text-primary focus:ring-primary"
                    />
                    <div className="flex-1">
                      <span className="font-medium text-foreground text-sm">
                        Web Research
                      </span>
                      {settings.externalServicesConsent?.tavilyApiKey ? (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-0.5 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Direct mode — searches stay in your browser
                        </p>
                      ) : (
                        <p className="text-xs text-muted mt-0.5">
                          Research companies and people via Tavily. <span className="text-amber-600 dark:text-amber-400">Sends:</span> company name, person name, research topic.
                        </p>
                      )}
                    </div>
                  </label>
                  {/* Tavily Key Input */}
                  <div className="mt-3 pl-7">
                    <label className="block text-xs font-medium text-foreground-muted mb-1">
                      Your Tavily Key <span className="text-slate-400 dark:text-slate-500">(optional)</span>
                    </label>
                    <Input
                      type="password"
                      value={decodeApiKey(settings.externalServicesConsent?.tavilyApiKey || '')}
                      onChange={(e) => updateSettings({
                        externalServicesConsent: {
                          ...settings.externalServicesConsent,
                          tavilyApiKey: e.target.value ? encodeApiKey(e.target.value) : undefined,
                        }
                      })}
                      placeholder="Enter your Tavily key..."
                      className="text-sm"
                    />
                    <p className="text-xs text-muted mt-1">
                      Get a free key at{' '}
                      <a href="https://tavily.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        tavily.com
                      </a>
                      {' '}(1,000 searches/month free)
                    </p>
                  </div>
                </div>
              </div>

              {/* What's NOT sent */}
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg max-w-xl">
                <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span>
                    <strong>Never sent:</strong> your resume, cover letters, notes, contacts, or any personal data.
                  </span>
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

      {/* Clear Resume Confirmation Modal */}
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
    </Modal>
  );
}
