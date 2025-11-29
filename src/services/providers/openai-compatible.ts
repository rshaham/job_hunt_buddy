import type { AIMessage, AIProvider } from './index';
import type { ProviderSettings } from '../../types';

export const openaiCompatibleProvider: AIProvider = {
  async call(messages: AIMessage[], systemPrompt?: string, config?: ProviderSettings): Promise<string> {
    const baseUrl = config!.baseUrl || 'http://localhost:11434/v1';

    // Convert to OpenAI format - system prompt becomes first message
    const openaiMessages: { role: string; content: string }[] = systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : [...messages];

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config!.apiKey && { Authorization: `Bearer ${config!.apiKey}` }),
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

  async testConnection(config: ProviderSettings): Promise<boolean> {
    try {
      await this.call([{ role: 'user', content: 'Say OK' }], undefined, config);
      return true;
    } catch {
      return false;
    }
  },
};
