import { useState } from 'react';
import { Loader2, CheckCircle, XCircle, ExternalLink, ChevronDown, ChevronUp, CreditCard, Key, Shield, Zap, Search, Globe } from 'lucide-react';
import { Button, Input } from '../../ui';
import { useAppStore } from '../../../stores/appStore';
import { testApiKey } from '../../../services/ai';
import { encodeApiKey, decodeApiKey } from '../../../utils/helpers';
import { PROVIDER_MODELS, type ProviderType } from '../../../types';
import { showToast } from '../../../stores/toastStore';

interface ApiKeyStepProps {
  onNext: () => void;
  onBack: () => void;
  onApiKeySaved: () => void;
  apiKeySaved: boolean;
}

type SetupMode = 'choice' | 'pro' | 'byo';

const PROVIDER_INFO: Record<Exclude<ProviderType, 'managed'>, { name: string; placeholder: string; helpUrl: string; helpText: string }> = {
  anthropic: {
    name: 'Anthropic (Claude)',
    placeholder: 'sk-ant-...',
    helpUrl: 'https://console.anthropic.com/settings/keys',
    helpText: 'New accounts get $5 free credit - no card required',
  },
  gemini: {
    name: 'Google Gemini',
    placeholder: 'AIza...',
    helpUrl: 'https://aistudio.google.com/apikey',
    helpText: 'Free tier available - perfect for trying it out',
  },
  'openai-compatible': {
    name: 'Local / Ollama',
    placeholder: 'Leave empty for local Ollama',
    helpUrl: 'https://ollama.ai/',
    helpText: 'Run AI locally with Ollama (no API key needed)',
  },
};

export function ApiKeyStep({ onNext, onBack, onApiKeySaved, apiKeySaved }: ApiKeyStepProps) {
  const { settings, updateSettings } = useAppStore();

  // Mode selection: choice (initial), pro (subscription), or byo (bring your own key)
  const [mode, setMode] = useState<SetupMode>('choice');
  const [isLoading, setIsLoading] = useState(false);

  // BYO key state
  const [activeProvider, setActiveProvider] = useState<Exclude<ProviderType, 'managed'>>(
    settings.activeProvider === 'managed' ? 'anthropic' : (settings.activeProvider || 'anthropic') as Exclude<ProviderType, 'managed'>
  );
  const providerSettings = settings.providers?.[activeProvider] || { apiKey: '', model: '', baseUrl: '' };

  const [apiKeyInput, setApiKeyInput] = useState(decodeApiKey(providerSettings.apiKey || ''));
  const [baseUrlInput, setBaseUrlInput] = useState(providerSettings.baseUrl || 'http://localhost:11434/v1');
  const [modelInput, setModelInput] = useState(providerSettings.model || PROVIDER_MODELS[activeProvider][0]?.id || '');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [showGeminiGuide, setShowGeminiGuide] = useState(false);

  const providerInfo = PROVIDER_INFO[activeProvider];

  const handleProviderChange = (provider: Exclude<ProviderType, 'managed'>) => {
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

  const handleStartTrial = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trial: true }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start checkout');
      }

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Checkout failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const canProceed = apiKeySaved || testStatus === 'success';
  const needsApiKey = activeProvider !== 'openai-compatible';

  // Initial choice screen
  if (mode === 'choice') {
    return (
      <div>
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Set Up AI Features
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Choose how you'd like to power the AI features
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {/* Pro Plan Card */}
          <button
            type="button"
            onClick={() => setMode('pro')}
            className="p-5 rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 hover:border-primary transition-all text-left group"
          >
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="w-5 h-5 text-primary" />
              <span className="font-semibold text-slate-900 dark:text-white">Pro Plan</span>
              <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded-full">$15/mo</span>
            </div>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400 mb-4">
              <li className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-green-500" />
                No API key needed
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                1,000,000 tokens/month
              </li>
              <li className="flex items-center gap-2">
                <Search className="w-4 h-4 text-green-500" />
                Job search included
              </li>
              <li className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-green-500" />
                Web research included
              </li>
            </ul>
            <div className="text-xs text-primary font-medium group-hover:underline">
              Start 7-day free trial →
            </div>
          </button>

          {/* BYO Key Card */}
          <button
            type="button"
            onClick={() => setMode('byo')}
            className="p-5 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all text-left group"
          >
            <div className="flex items-center gap-2 mb-3">
              <Key className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <span className="font-semibold text-slate-900 dark:text-white">Bring Your Own Key</span>
              <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full">Free</span>
            </div>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400 mb-4">
              <li className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-500" />
                100% local & private
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-blue-500" />
                Use your own API key
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-blue-500" />
                Direct to AI provider
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-slate-400" />
                No token limits
              </li>
            </ul>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium group-hover:underline">
              Set up API key →
            </div>
          </button>
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button variant="ghost" onClick={onBack}>
            Back
          </Button>
          <div /> {/* Spacer */}
        </div>
      </div>
    );
  }

  // Pro subscription flow
  if (mode === 'pro') {
    return (
      <div>
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Start Your Free Trial
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            7 days free, then $15/month. Cancel anytime.
          </p>
        </div>

        <div className="max-w-md mx-auto space-y-4">
          {/* What's included */}
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <h3 className="font-medium text-green-800 dark:text-green-200 mb-2">What's included:</h3>
            <ul className="space-y-1.5 text-sm text-green-700 dark:text-green-300">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                AI-powered resume grading & cover letters
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                1,000,000 tokens/month (50,000 during trial)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Job search via SerApi
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Company research via Tavily
              </li>
            </ul>
          </div>

          {/* Privacy disclosure */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-2">
              <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-800 dark:text-blue-200 text-sm mb-1">How your data is handled:</h3>
                <ul className="space-y-1 text-xs text-blue-700 dark:text-blue-300">
                  <li>• AI prompts route through our server to Claude</li>
                  <li>• We don't store your conversation content</li>
                  <li>• Token usage tracked for billing only</li>
                  <li>• Payment handled by Stripe</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Start Trial Button */}
          <Button
            onClick={handleStartTrial}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isLoading ? 'Redirecting to Stripe...' : 'Start Free Trial'}
          </Button>

          <p className="text-xs text-center text-slate-500">
            Credit card required. Cancel anytime before trial ends to avoid charges.
          </p>
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button variant="ghost" onClick={() => setMode('choice')}>
            Back
          </Button>
          <div /> {/* Spacer */}
        </div>
      </div>
    );
  }

  // BYO key flow (original flow)
  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Set Up Your API Key
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          100% private - your key stays in your browser
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-4">
        {/* Provider Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            AI Provider
          </label>
          <select
            aria-label="Select AI provider"
            value={activeProvider}
            onChange={(e) => handleProviderChange(e.target.value as Exclude<ProviderType, 'managed'>)}
            className="w-full px-3 py-2 text-sm border rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="anthropic">Anthropic (Claude) - Recommended · $5 free credit</option>
            <option value="gemini">Google Gemini - Free tier · Great for trying it out</option>
            <option value="openai-compatible">Local / Ollama - No API key needed</option>
          </select>
        </div>

        {/* OpenAI-compatible specific fields */}
        {activeProvider === 'openai-compatible' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Server URL
            </label>
            <Input
              placeholder="http://localhost:11434/v1"
              value={baseUrlInput}
              onChange={(e) => {
                setBaseUrlInput(e.target.value);
                setTestStatus('idle');
              }}
            />
            <p className="text-xs text-slate-500 mt-1">
              Default Ollama URL. Make sure Ollama is running.
            </p>
          </div>
        )}

        {/* API Key Input */}
        {needsApiKey && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
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
            />
            <p className="text-xs text-slate-500 mt-1">
              <a
                href={providerInfo.helpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                {providerInfo.helpText}
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>
        )}

        {/* Gemini Setup Guide */}
        {activeProvider === 'gemini' && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowGeminiGuide(!showGeminiGuide)}
              className="w-full px-4 py-3 flex items-center justify-between text-left text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            >
              <span>How to get your free API key (2 min)</span>
              {showGeminiGuide ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            {showGeminiGuide && (
              <div className="px-4 pb-4 space-y-3">
                <ol className="text-sm text-slate-600 dark:text-slate-400 space-y-2 list-decimal list-inside">
                  <li>Click the button below to open Google AI Studio</li>
                  <li>Sign in with your Google account</li>
                  <li>Click "Get API Key" → "Create API key in new project"</li>
                  <li>Copy the key and paste it above</li>
                </ol>
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                >
                  Open Google AI Studio
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>
        )}

        {/* Model Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Model
          </label>
          <select
            aria-label="Select model"
            value={modelInput}
            onChange={(e) => {
              setModelInput(e.target.value);
              setTestStatus('idle');
            }}
            className="w-full px-3 py-2 text-sm border rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
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
          className="w-full"
        >
          {testStatus === 'testing' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {testStatus === 'success' && <CheckCircle className="w-4 h-4 mr-2 text-green-500" />}
          {testStatus === 'error' && <XCircle className="w-4 h-4 mr-2 text-red-500" />}
          {testStatus === 'idle' && 'Test & Save'}
          {testStatus === 'testing' && 'Testing...'}
          {testStatus === 'success' && 'Saved!'}
          {testStatus === 'error' && 'Connection Failed - Try Again'}
        </Button>

        {testStatus === 'error' && (
          <p className="text-sm text-red-500 text-center">
            Could not connect. Please check your API key and try again.
          </p>
        )}

        {!canProceed && (
          <p className="text-sm text-amber-600 dark:text-amber-400 text-center">
            Please save a valid API key to continue.
          </p>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <Button variant="ghost" onClick={() => setMode('choice')}>
          Back
        </Button>
        <Button onClick={onNext} disabled={!canProceed}>
          Next
        </Button>
      </div>
    </div>
  );
}
