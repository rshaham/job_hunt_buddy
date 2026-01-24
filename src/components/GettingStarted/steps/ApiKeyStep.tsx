import { useState } from 'react';
import { Loader2, CheckCircle, XCircle, ExternalLink, ChevronDown, ChevronUp, ArrowLeft, ArrowRight, Zap, Bot, Server } from 'lucide-react';
import { Button, Input } from '../../ui';
import { useAppStore } from '../../../stores/appStore';
import { testApiKey } from '../../../services/ai';
import { encodeApiKey, decodeApiKey } from '../../../utils/helpers';
import { PROVIDER_MODELS, type ProviderType } from '../../../types';

interface ApiKeyStepProps {
  onNext: () => void;
  onBack: () => void;
  onApiKeySaved: () => void;
  apiKeySaved: boolean;
}

const PROVIDER_INFO: Record<ProviderType, { name: string; placeholder: string; helpUrl: string; helpText: string; icon: React.ElementType; gradient: string }> = {
  anthropic: {
    name: 'Anthropic (Claude)',
    placeholder: 'sk-ant-...',
    helpUrl: 'https://console.anthropic.com/settings/keys',
    helpText: 'New accounts get $5 free credit',
    icon: Zap,
    gradient: 'from-orange-500 to-amber-600',
  },
  gemini: {
    name: 'Google Gemini',
    placeholder: 'AIza...',
    helpUrl: 'https://aistudio.google.com/apikey',
    helpText: 'Free tier available',
    icon: Bot,
    gradient: 'from-blue-500 to-cyan-600',
  },
  'openai-compatible': {
    name: 'Local / Ollama',
    placeholder: 'Leave empty for local Ollama',
    helpUrl: 'https://ollama.ai/',
    helpText: 'Run AI locally (no API key)',
    icon: Server,
    gradient: 'from-slate-500 to-slate-600',
  },
};

export function ApiKeyStep({ onNext, onBack, onApiKeySaved, apiKeySaved }: ApiKeyStepProps) {
  const { settings, updateSettings } = useAppStore();

  const [activeProvider, setActiveProvider] = useState<ProviderType>(settings.activeProvider || 'anthropic');
  const providerSettings = settings.providers?.[activeProvider] || { apiKey: '', model: '', baseUrl: '' };

  const [apiKeyInput, setApiKeyInput] = useState(decodeApiKey(providerSettings.apiKey || ''));
  const [baseUrlInput, setBaseUrlInput] = useState(providerSettings.baseUrl || 'http://localhost:11434/v1');
  const [modelInput, setModelInput] = useState(providerSettings.model || PROVIDER_MODELS[activeProvider][0]?.id || '');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [showGeminiGuide, setShowGeminiGuide] = useState(false);

  const providerInfo = PROVIDER_INFO[activeProvider];
  const ProviderIcon = providerInfo.icon;

  const handleProviderChange = (provider: ProviderType) => {
    setActiveProvider(provider);
    const newProviderSettings = settings.providers?.[provider] || { apiKey: '', model: '', baseUrl: '' };
    setApiKeyInput(decodeApiKey(newProviderSettings.apiKey || ''));
    setBaseUrlInput(newProviderSettings.baseUrl || 'http://localhost:11434/v1');
    setModelInput(newProviderSettings.model || PROVIDER_MODELS[provider][0]?.id || '');
    setTestStatus('idle');
  };

  const handleTestAndSave = async () => {
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
      const newProviders = {
        ...settings.providers,
        [activeProvider]: {
          apiKey: encodeApiKey(apiKeyInput),
          model: modelInput,
          ...(activeProvider === 'openai-compatible' && { baseUrl: baseUrlInput }),
        },
      };
      await updateSettings({ activeProvider, providers: newProviders });
      onApiKeySaved();
    }
  };

  const canProceed = apiKeySaved || testStatus === 'success';
  const needsApiKey = activeProvider !== 'openai-compatible';

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${providerInfo.gradient} flex items-center justify-center mx-auto mb-6 shadow-lg transition-all duration-300`}>
          <ProviderIcon className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-3 tracking-tight">
          Set Up AI Features
        </h2>
        <p className="text-foreground-muted max-w-md mx-auto">
          This app is free and open source. Just connect your preferred AI provider.
        </p>
      </div>

      <div className="max-w-lg mx-auto space-y-6">
        {/* Provider Selection - Cards */}
        <div className="grid grid-cols-3 gap-3">
          {(Object.keys(PROVIDER_INFO) as ProviderType[]).map((provider) => {
            const info = PROVIDER_INFO[provider];
            const Icon = info.icon;
            const isActive = activeProvider === provider;

            return (
              <button
                key={provider}
                type="button"
                onClick={() => handleProviderChange(provider)}
                className={`
                  p-4 rounded-xl border-2 transition-all duration-200 text-center
                  ${isActive
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'border-border hover:border-primary/30 bg-surface'
                  }
                `}
              >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${info.gradient} flex items-center justify-center mx-auto mb-2`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <p className={`text-xs font-medium ${isActive ? 'text-primary' : 'text-foreground'}`}>
                  {provider === 'anthropic' ? 'Anthropic' : provider === 'gemini' ? 'Gemini' : 'Local'}
                </p>
                <p className="text-[10px] text-foreground-muted mt-0.5">
                  {info.helpText}
                </p>
              </button>
            );
          })}
        </div>

        {/* OpenAI-compatible specific fields */}
        {activeProvider === 'openai-compatible' && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Server URL
            </label>
            <Input
              placeholder="http://localhost:11434/v1"
              value={baseUrlInput}
              onChange={(e) => {
                setBaseUrlInput(e.target.value);
                setTestStatus('idle');
              }}
              className="bg-surface"
            />
            <p className="text-xs text-foreground-muted">
              Default Ollama URL. Make sure Ollama is running.
            </p>
          </div>
        )}

        {/* API Key Input */}
        {needsApiKey && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              API Key
            </label>
            <Input
              type="password"
              placeholder={providerInfo.placeholder}
              value={apiKeyInput}
              onChange={(e) => {
                setApiKeyInput(e.target.value);
                setTestStatus('idle');
              }}
              className="bg-surface font-mono"
            />
            <p className="text-xs text-foreground-muted">
              <a
                href={providerInfo.helpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                Get your API key
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>
        )}

        {/* Gemini Setup Guide */}
        {activeProvider === 'gemini' && (
          <div className="rounded-xl overflow-hidden border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
            <button
              type="button"
              onClick={() => setShowGeminiGuide(!showGeminiGuide)}
              className="w-full px-5 py-4 flex items-center justify-between text-left text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            >
              <span>How to get your free API key</span>
              {showGeminiGuide ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            {showGeminiGuide && (
              <div className="px-5 pb-5 space-y-4">
                <ol className="text-sm text-foreground-muted space-y-2 list-decimal list-inside">
                  <li>Click the button below to open Google AI Studio</li>
                  <li>Sign in with your Google account</li>
                  <li>Click "Get API Key" → "Create API key in new project"</li>
                  <li>Copy the key and paste it above</li>
                </ol>
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                >
                  Open Google AI Studio
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>
        )}

        {/* Model Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            Model
          </label>
          <select
            aria-label="Select model"
            value={modelInput}
            onChange={(e) => {
              setModelInput(e.target.value);
              setTestStatus('idle');
            }}
            className="w-full px-4 py-3 text-sm border rounded-xl border-border bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          >
            {PROVIDER_MODELS[activeProvider].map((model) => (
              <option key={model.id} value={model.id}>
                {model.name} - {model.description}
              </option>
            ))}
          </select>
        </div>

        {/* Test & Save Button */}
        <Button
          onClick={handleTestAndSave}
          disabled={
            (needsApiKey && !apiKeyInput) ||
            !modelInput ||
            testStatus === 'testing'
          }
          className={`w-full py-3 text-base font-semibold transition-all duration-300 ${
            testStatus === 'success'
              ? 'bg-emerald-500 hover:bg-emerald-600'
              : testStatus === 'error'
              ? 'bg-red-500 hover:bg-red-600'
              : ''
          }`}
          size="lg"
        >
          {testStatus === 'testing' && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
          {testStatus === 'success' && <CheckCircle className="w-5 h-5 mr-2" />}
          {testStatus === 'error' && <XCircle className="w-5 h-5 mr-2" />}
          {testStatus === 'idle' && 'Test & Save'}
          {testStatus === 'testing' && 'Testing Connection...'}
          {testStatus === 'success' && 'Connected!'}
          {testStatus === 'error' && 'Connection Failed - Try Again'}
        </Button>

        {testStatus === 'error' && (
          <p className="text-sm text-red-500 text-center">
            Could not connect. Please check your API key and try again.
          </p>
        )}

        {!canProceed && (
          <p className="text-sm text-amber-600 dark:text-amber-400 text-center bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
            Please save a valid API key to continue.
          </p>
        )}
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
        <Button
          onClick={onNext}
          disabled={!canProceed}
          className="group px-6"
        >
          Next
          <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
        </Button>
      </div>
    </div>
  );
}
