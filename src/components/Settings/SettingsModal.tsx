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
} from 'lucide-react';
import { Modal, Button, Input, Textarea } from '../ui';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/Tabs';
import { useAppStore } from '../../stores/appStore';
import { testApiKey, convertResumeToMarkdown } from '../../services/ai';
import { extractTextFromPDF } from '../../services/pdfParser';
import { encodeApiKey, decodeApiKey } from '../../utils/helpers';
import { PROVIDER_MODELS, type ProviderType } from '../../types';
import { showToast } from '../../stores/toastStore';
import ReactMarkdown from 'react-markdown';

export function SettingsModal() {
  const {
    isSettingsModalOpen,
    closeSettingsModal,
    settings,
    updateSettings,
    exportData,
    importData,
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
                      <Button variant="ghost" size="sm" onClick={handleClearResume} title="Remove resume">
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
            {/* Additional Context Section */}
            <section>
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Additional Context
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
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Saved Stories ({settings.savedStories?.length || 0})
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
                            handleDeleteStory(story.id);
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
              <div className="flex gap-2">
                <Button variant="secondary" onClick={handleExport}>
                  <Download className="w-4 h-4 mr-1" />
                  Export Data
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
                Export your data as JSON for backup or import from a previous backup.
              </p>
            </section>
          </TabsContent>
        </Tabs>
      </div>
    </Modal>
  );
}
