# Multi-Provider AI Support

## Overview

Add support for multiple AI providers beyond Anthropic/Claude:
1. **Anthropic** (existing) - Claude models
2. **Ollama/Local** - Local LLMs via OpenAI-compatible API
3. **OpenAI-Compatible** - Generic HTTP endpoint (HuggingFace, custom deployments)
4. **Google Gemini** - Google's AI models

## Architecture

### Provider Abstraction

All AI calls flow through `callClaude()` (lines 36-74 in ai.ts). Replace with provider-agnostic `callAI()` that delegates to the active provider.

```
src/services/
├── ai.ts                    # Public API (unchanged signatures)
└── providers/
    ├── index.ts             # Provider factory + types
    ├── anthropic.ts         # Claude/Anthropic implementation
    ├── openai-compatible.ts # Ollama, LM Studio, generic HTTP
    └── gemini.ts            # Google Gemini
```

### Provider Interface

```typescript
// src/services/providers/index.ts
export type ProviderType = 'anthropic' | 'openai-compatible' | 'gemini';

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ProviderConfig {
  apiKey: string;
  baseUrl?: string;  // For openai-compatible
  model: string;
}

export interface AIProvider {
  name: string;
  call(messages: AIMessage[], systemPrompt?: string, config?: ProviderConfig): Promise<string>;
  testConnection(config: ProviderConfig): Promise<boolean>;
  getAvailableModels(): { id: string; name: string; description: string }[];
}
```

---

## Files to Modify

### 1. `src/types/index.ts` - Settings Structure

**Add new types:**

```typescript
export type ProviderType = 'anthropic' | 'openai-compatible' | 'gemini';

export interface ProviderSettings {
  apiKey: string;
  baseUrl?: string;  // Only for openai-compatible
  model: string;
}

// Update AppSettings
export interface AppSettings {
  // NEW: Provider system
  activeProvider: ProviderType;
  providers: Record<ProviderType, ProviderSettings>;

  // DEPRECATED (keep for migration)
  apiKey?: string;
  model?: string;

  // Unchanged
  defaultResumeText: string;
  defaultResumeName: string;
  statuses: Status[];
  theme: 'light' | 'dark';
  additionalContext: string;
  savedStories: SavedStory[];
}

// Provider-specific model presets
export const PROVIDER_MODELS: Record<ProviderType, { id: string; name: string; description: string }[]> = {
  anthropic: [
    { id: 'claude-sonnet-4-5-20250514', name: 'Claude Sonnet 4.5', description: 'Best balance of speed and quality' },
    { id: 'claude-opus-4-5-20250514', name: 'Claude Opus 4.5', description: 'Most capable, slower' },
    { id: 'claude-haiku-4-5-20250514', name: 'Claude Haiku 4.5', description: 'Fastest, most affordable' },
  ],
  'openai-compatible': [
    { id: 'llama3.2', name: 'Llama 3.2', description: 'Meta\'s latest model' },
    { id: 'mistral', name: 'Mistral', description: 'Fast and capable' },
    { id: 'custom', name: 'Custom...', description: 'Enter model name' },
  ],
  gemini: [
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Fast, free tier available' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Most capable' },
    { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', description: 'Experimental, fast' },
  ],
};
```

### 2. `src/services/providers/index.ts` - Provider Factory

```typescript
import { anthropicProvider } from './anthropic';
import { openaiCompatibleProvider } from './openai-compatible';
import { geminiProvider } from './gemini';
import type { ProviderType, ProviderSettings } from '../../types';

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIProvider {
  call(messages: AIMessage[], systemPrompt?: string, config?: ProviderSettings): Promise<string>;
  testConnection(config: ProviderSettings): Promise<boolean>;
}

const providers: Record<ProviderType, AIProvider> = {
  anthropic: anthropicProvider,
  'openai-compatible': openaiCompatibleProvider,
  gemini: geminiProvider,
};

export function getProvider(type: ProviderType): AIProvider {
  return providers[type];
}
```

### 3. `src/services/providers/anthropic.ts`

```typescript
import type { AIMessage, AIProvider } from './index';
import type { ProviderSettings } from '../../types';

const API_URL = 'https://api.anthropic.com/v1/messages';

export const anthropicProvider: AIProvider = {
  async call(messages, systemPrompt, config) {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config!.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: config!.model,
        max_tokens: 4096,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.content[0].text;
  },

  async testConnection(config) {
    try {
      await this.call([{ role: 'user', content: 'Say OK' }], undefined, config);
      return true;
    } catch {
      return false;
    }
  },
};
```

### 4. `src/services/providers/openai-compatible.ts`

```typescript
import type { AIMessage, AIProvider } from './index';
import type { ProviderSettings } from '../../types';

export const openaiCompatibleProvider: AIProvider = {
  async call(messages, systemPrompt, config) {
    const baseUrl = config!.baseUrl || 'http://localhost:11434/v1';

    // Convert to OpenAI format
    const openaiMessages = systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : messages;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config!.apiKey && { 'Authorization': `Bearer ${config!.apiKey}` }),
      },
      body: JSON.stringify({
        model: config!.model,
        messages: openaiMessages,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  },

  async testConnection(config) {
    try {
      await this.call([{ role: 'user', content: 'Say OK' }], undefined, config);
      return true;
    } catch {
      return false;
    }
  },
};
```

### 5. `src/services/providers/gemini.ts`

```typescript
import type { AIMessage, AIProvider } from './index';
import type { ProviderSettings } from '../../types';

export const geminiProvider: AIProvider = {
  async call(messages, systemPrompt, config) {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${config!.model}:generateContent?key=${config!.apiKey}`;

    // Convert to Gemini format
    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const body: Record<string, unknown> = { contents };
    if (systemPrompt) {
      body.systemInstruction = { parts: [{ text: systemPrompt }] };
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  },

  async testConnection(config) {
    try {
      await this.call([{ role: 'user', content: 'Say OK' }], undefined, config);
      return true;
    } catch {
      return false;
    }
  },
};
```

### 6. `src/services/ai.ts` - Update Core

Replace `callClaude` with `callAI`:

```typescript
import { getProvider } from './providers';
import type { AIMessage } from './providers';

function getAIConfig() {
  const { settings } = useAppStore.getState();
  const provider = settings.activeProvider || 'anthropic';
  const providerSettings = settings.providers?.[provider];

  // Migration: handle old format
  if (!providerSettings && settings.apiKey) {
    return {
      provider: 'anthropic' as const,
      config: {
        apiKey: decodeApiKey(settings.apiKey),
        model: settings.model || 'claude-sonnet-4-5-20250514',
      },
    };
  }

  return {
    provider,
    config: {
      apiKey: decodeApiKey(providerSettings?.apiKey || ''),
      baseUrl: providerSettings?.baseUrl,
      model: providerSettings?.model || '',
    },
  };
}

async function callAI(
  messages: AIMessage[],
  systemPrompt?: string,
  overrideConfig?: { provider?: ProviderType; apiKey?: string; model?: string; baseUrl?: string }
): Promise<string> {
  const aiConfig = getAIConfig();
  const provider = overrideConfig?.provider || aiConfig.provider;
  const config = {
    apiKey: overrideConfig?.apiKey || aiConfig.config.apiKey,
    model: overrideConfig?.model || aiConfig.config.model,
    baseUrl: overrideConfig?.baseUrl || aiConfig.config.baseUrl,
  };

  if (!config.apiKey && provider !== 'openai-compatible') {
    throw new Error('API key not configured. Please add your API key in Settings.');
  }

  return getProvider(provider).call(messages, systemPrompt, config);
}

// Update testApiKey signature
export async function testApiKey(
  provider: ProviderType,
  config: { apiKey: string; model: string; baseUrl?: string }
): Promise<boolean> {
  return getProvider(provider).testConnection(config);
}

// All other functions remain unchanged - just rename callClaude → callAI internally
```

### 7. `src/stores/appStore.ts` - Migration Logic

Add migration in `loadData()`:

```typescript
async loadData() {
  const settings = await db.getSettings();

  // Migrate old settings format
  if (settings.apiKey && !settings.providers) {
    settings.activeProvider = 'anthropic';
    settings.providers = {
      anthropic: {
        apiKey: settings.apiKey,
        model: settings.model || 'claude-sonnet-4-5-20250514',
      },
      'openai-compatible': { apiKey: '', model: 'llama3.2', baseUrl: 'http://localhost:11434/v1' },
      gemini: { apiKey: '', model: 'gemini-1.5-flash' },
    };
    // Save migrated settings
    await db.saveSettings(settings);
  }

  set({ settings, ... });
}
```

### 8. `src/components/Settings/SettingsModal.tsx` - UI Updates

**API Tab redesign:**

```tsx
{/* Provider Selection */}
<section>
  <h3>AI Provider</h3>
  <select value={activeProvider} onChange={handleProviderChange}>
    <option value="anthropic">Anthropic (Claude)</option>
    <option value="openai-compatible">Local / OpenAI-Compatible</option>
    <option value="gemini">Google Gemini</option>
  </select>
</section>

{/* Provider-specific config */}
{activeProvider === 'anthropic' && (
  <section>
    <h3>Anthropic Settings</h3>
    <Input type="password" placeholder="sk-ant-..." value={...} />
    <p>Get your API key from <a href="https://console.anthropic.com/settings/keys">Anthropic Console</a></p>
    <select>{/* Claude models */}</select>
  </section>
)}

{activeProvider === 'openai-compatible' && (
  <section>
    <h3>Local / OpenAI-Compatible</h3>
    <Input placeholder="http://localhost:11434/v1" value={baseUrl} />
    <Input type="password" placeholder="API Key (optional)" value={...} />
    <Input placeholder="Model name (e.g., llama3.2)" value={...} />
    <p>Works with Ollama, LM Studio, or any OpenAI-compatible endpoint</p>
  </section>
)}

{activeProvider === 'gemini' && (
  <section>
    <h3>Google Gemini Settings</h3>
    <Input type="password" placeholder="API Key" value={...} />
    <p>Get your API key from <a href="https://aistudio.google.com/apikey">Google AI Studio</a></p>
    <select>{/* Gemini models */}</select>
  </section>
)}

<Button onClick={handleTestAndSave}>Test & Save</Button>
```

---

## Implementation Order

1. **Phase 1: Types & Provider Interface**
   - Add types to `src/types/index.ts`
   - Create `src/services/providers/index.ts` with interface

2. **Phase 2: Anthropic Provider**
   - Create `src/services/providers/anthropic.ts`
   - Refactor `ai.ts` to use new provider
   - Verify existing functionality works

3. **Phase 3: Migration**
   - Add migration logic to `appStore.ts`
   - Update default settings structure

4. **Phase 4: Settings UI**
   - Update `SettingsModal.tsx` with provider selector
   - Provider-specific configuration panels

5. **Phase 5: OpenAI-Compatible Provider**
   - Create `src/services/providers/openai-compatible.ts`
   - Test with Ollama

6. **Phase 6: Gemini Provider**
   - Create `src/services/providers/gemini.ts`
   - Test with free tier

---

## Testing Checklist

- [ ] Existing Anthropic users auto-migrate
- [ ] All 11 AI functions work with each provider
- [ ] Provider switching preserves per-provider settings
- [ ] Test & Save validates connection for active provider
- [ ] Error messages are provider-aware
- [ ] Ollama works without API key
- [ ] Gemini free tier works
