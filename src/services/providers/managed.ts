/**
 * Managed Provider - Pro subscription users
 * Routes AI requests through /api/ai/chat proxy
 */

import type { AIMessage, AIProvider } from './index';
import type { ProviderSettings } from '../../types';
import type { AIMessageWithTools, AIResponseWithTools, AnthropicToolDef } from '../../types/agent';
import { useAppStore } from '../../stores/appStore';

const API_URL = '/api/ai/chat';

function getCustomerId(): string | null {
  const settings = useAppStore.getState().settings;
  return settings.subscription?.customerId || null;
}

export const managedProvider: AIProvider = {
  supportsToolCalling: true,

  async call(messages: AIMessage[], systemPrompt?: string, config?: ProviderSettings): Promise<string> {
    const customerId = getCustomerId();
    if (!customerId) {
      throw new Error('Pro subscription required. Please subscribe or restore your access.');
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerId,
        messages,
        system: systemPrompt,
        model: config?.model || 'claude-sonnet-4-5-20250514',
      }),
    });

    if (response.status === 401) {
      throw new Error('Session expired. Please restore your access.');
    }
    if (response.status === 402) {
      throw new Error('Subscription required. Please subscribe to continue.');
    }
    if (response.status === 429) {
      const data = await response.json();
      throw new Error(`Token limit reached (${data.tokensUsed?.toLocaleString()}/${data.tokenLimit?.toLocaleString()}). Limit resets next billing cycle.`);
    }
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`AI request failed: ${response.status} - ${error}`);
    }

    const data = await response.json();

    // Update local usage tracking
    if (data.subscription) {
      const { updateSettings, settings } = useAppStore.getState();
      updateSettings({
        subscription: {
          ...settings.subscription!,
          tokensUsed: data.subscription.tokensUsed,
          tokenLimit: data.subscription.tokenLimit,
        },
      });
    }

    return data.content[0].text;
  },

  async callWithTools(
    messages: AIMessageWithTools[],
    tools: AnthropicToolDef[],
    systemPrompt?: string,
    config?: ProviderSettings
  ): Promise<AIResponseWithTools> {
    const customerId = getCustomerId();
    if (!customerId) {
      throw new Error('Pro subscription required. Please subscribe or restore your access.');
    }

    // For tool calling, we need a dedicated endpoint
    // For now, use basic chat and handle tools client-side
    // TODO: Add /api/ai/chat-with-tools endpoint for full tool support
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerId,
        messages,
        system: systemPrompt,
        model: config?.model || 'claude-sonnet-4-5-20250514',
        tools, // Pass tools to backend
      }),
    });

    if (response.status === 401) {
      throw new Error('Session expired. Please restore your access.');
    }
    if (response.status === 402) {
      throw new Error('Subscription required. Please subscribe to continue.');
    }
    if (response.status === 429) {
      const errorData = await response.json();
      throw new Error(`Token limit reached (${errorData.tokensUsed?.toLocaleString()}/${errorData.tokenLimit?.toLocaleString()}). Limit resets next billing cycle.`);
    }
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`AI request failed: ${response.status} - ${error}`);
    }

    const data = await response.json();

    // Update local usage tracking
    if (data.subscription) {
      const { updateSettings, settings } = useAppStore.getState();
      updateSettings({
        subscription: {
          ...settings.subscription!,
          tokensUsed: data.subscription.tokensUsed,
          tokenLimit: data.subscription.tokenLimit,
        },
      });
    }

    return {
      content: data.content,
      stop_reason: data.stop_reason,
    };
  },

  async testConnection(_config?: ProviderSettings): Promise<boolean> {
    const customerId = getCustomerId();
    if (!customerId) return false;

    try {
      // Just verify subscription status
      const response = await fetch('/api/stripe/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: useAppStore.getState().settings.subscription?.email }),
      });
      return response.ok;
    } catch {
      return false;
    }
  },
};
