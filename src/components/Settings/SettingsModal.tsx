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
} from 'lucide-react';
import { Modal, Button, Input } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { testApiKey } from '../../services/ai';
import { extractTextFromPDF } from '../../services/pdfParser';
import { encodeApiKey, decodeApiKey } from '../../utils/helpers';
import { CLAUDE_MODEL_PRESETS } from '../../types';

export function SettingsModal() {
  const {
    isSettingsModalOpen,
    closeSettingsModal,
    settings,
    updateSettings,
    exportData,
    importData,
  } = useAppStore();

  const [apiKeyInput, setApiKeyInput] = useState(decodeApiKey(settings.apiKey));
  const [modelInput, setModelInput] = useState(settings.model || 'claude-sonnet-4-5-20250514');
  const [customModel, setCustomModel] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const isCustomModel = !CLAUDE_MODEL_PRESETS.some((m) => m.id === modelInput);

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

  const handleApiKeySave = async () => {
    await updateSettings({ apiKey: encodeApiKey(apiKeyInput), model: modelInput });
  };

  const handleTestApiKey = async () => {
    if (!apiKeyInput || !modelInput) return;

    setTestStatus('testing');
    const isValid = await testApiKey(apiKeyInput, modelInput);
    setTestStatus(isValid ? 'success' : 'error');

    if (isValid) {
      await handleApiKeySave();
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const text = await extractTextFromPDF(file);
      await updateSettings({
        defaultResumeText: text,
        defaultResumeName: file.name,
      });
    } catch (err) {
      console.error('Failed to parse PDF:', err);
      alert('Failed to parse PDF. Please try a different file.');
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
      alert('Data imported successfully!');
    } catch (err) {
      console.error('Failed to import:', err);
      alert('Failed to import data. Please check the file format.');
    }

    if (importInputRef.current) {
      importInputRef.current.value = '';
    }
  };

  const handleThemeToggle = () => {
    updateSettings({ theme: settings.theme === 'light' ? 'dark' : 'light' });
  };

  return (
    <Modal isOpen={isSettingsModalOpen} onClose={closeSettingsModal} title="Settings" size="lg">
      <div className="p-4 space-y-6">
        {/* API Key Section */}
        <section>
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            Claude API Key
          </h3>
          <div className="flex gap-2">
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
          <p className="text-xs text-slate-500 mt-1">
            Your API key is stored locally and never sent to our servers.
          </p>
        </section>

        {/* Model Selection Section */}
        <section>
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
            <Bot className="w-4 h-4" />
            Claude Model
          </h3>
          <div className="space-y-3">
            <select
              aria-label="Select Claude model"
              value={isCustomModel ? 'custom' : modelInput}
              onChange={(e) => handleModelChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {CLAUDE_MODEL_PRESETS.map((model) => (
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

        {/* Default Resume Section */}
        <section>
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            Default Resume
          </h3>
          {settings.defaultResumeName ? (
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <FileText className="w-8 h-8 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {settings.defaultResumeName}
                </p>
                <p className="text-xs text-slate-500">
                  {settings.defaultResumeText.length.toLocaleString()} characters extracted
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleClearResume}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleResumeUpload}
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
                {isUploading ? 'Parsing PDF...' : 'Upload Resume (PDF)'}
              </Button>
            </div>
          )}
          <p className="text-xs text-slate-500 mt-1">
            This resume will be used as the default for resume grading and cover letter generation.
          </p>
        </section>

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
              />
              <Button variant="secondary" onClick={() => importInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-1" />
                Import Data
              </Button>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Export your data as JSON for backup or import from a previous backup.
          </p>
        </section>
      </div>
    </Modal>
  );
}
