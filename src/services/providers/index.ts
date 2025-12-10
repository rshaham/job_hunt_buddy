import { anthropicProvider } from './anthropic';
import { openaiCompatibleProvider } from './openai-compatible';
import { geminiProvider } from './gemini';
import { managedProvider } from './managed';
import type { ProviderType, ProviderSettings } from '../../types';
import type { AIMessageWithTools, AIResponseWithTools, AnthropicToolDef } from '../../types/agent';

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIProvider {
  call(messages: AIMessage[], systemPrompt?: string, config?: ProviderSettings): Promise<string>;
  testConnection(config: ProviderSettings): Promise<boolean>;

  // Tool calling support (optional - only Anthropic supports this initially)
  supportsToolCalling?: boolean;
  callWithTools?(
    messages: AIMessageWithTools[],
    tools: AnthropicToolDef[],
    systemPrompt?: string,
    config?: ProviderSettings
  ): Promise<AIResponseWithTools>;
}

const providers: Record<ProviderType, AIProvider> = {
  anthropic: anthropicProvider,
  'openai-compatible': openaiCompatibleProvider,
  gemini: geminiProvider,
  managed: managedProvider,
};

export function getProvider(type: ProviderType): AIProvider {
  return providers[type];
}
