import type { AIMessage, AIProvider } from './index';
import type { ProviderSettings } from '../../types';

export const geminiProvider: AIProvider = {
  async call(messages: AIMessage[], systemPrompt?: string, config?: ProviderSettings): Promise<string> {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${config!.model}:generateContent?key=${config!.apiKey}`;

    // Convert to Gemini format
    const contents = messages.map((m) => ({
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

  async testConnection(config: ProviderSettings): Promise<boolean> {
    try {
      await this.call([{ role: 'user', content: 'Say OK' }], undefined, config);
      return true;
    } catch {
      return false;
    }
  },
};
