import type { AIMessage, AIProvider } from './index';
import type { ProviderSettings } from '../../types';

const API_URL = 'https://api.anthropic.com/v1/messages';

export const anthropicProvider: AIProvider = {
  async call(messages: AIMessage[], systemPrompt?: string, config?: ProviderSettings): Promise<string> {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config!.apiKey,
        'anthropic-version': '2023-06-01',
        // Required because this is a serverless, local-first app.
        // The user owns the key, so it's safe to use directly from the client.
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

  async testConnection(config: ProviderSettings): Promise<boolean> {
    try {
      await this.call([{ role: 'user', content: 'Say OK' }], undefined, config);
      return true;
    } catch {
      return false;
    }
  },
};
