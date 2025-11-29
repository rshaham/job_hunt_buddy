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
