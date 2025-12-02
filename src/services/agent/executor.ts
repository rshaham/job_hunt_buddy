import { getProvider } from '../providers';
import { useAppStore } from '../../stores/appStore';
import { decodeApiKey } from '../../utils/helpers';
import { toolRegistry } from './registry';
import type {
  AgentExecutionState,
  AIMessageWithTools,
  AIResponseWithTools,
  ContentBlock,
  TextBlock,
  ToolUseBlock,
  ToolResultBlock,
  ConfirmationRequest,
  ConfirmationLevel,
} from '../../types/agent';
import { DEFAULT_AGENT_SETTINGS } from '../../types/agent';

const AGENT_SYSTEM_PROMPT = `You are a helpful assistant for Career Forager, a job application tracking app.
You can help users manage their job applications by searching, viewing details, updating statuses, adding notes, and more.

When a user asks you to do something:
1. Think about what tools you need to use
2. Call the appropriate tools to get information or make changes
3. Provide a helpful response based on the results

Be conversational and helpful. If you need to make changes, explain what you're doing.
If something fails, explain the error and suggest alternatives.

IMPORTANT: When tool results include source URLs or a "Sources" section (from web research or analysis tools), you MUST include these sources in your response. Display them as clickable markdown links. Never omit or summarize away the source links - users need these for verification.

Available statuses: Interested, Applied, Screening, Interviewing, Offer, Rejected, Withdrawn`;

export interface AgentConfig {
  maxIterations?: number;
  confirmationLevel?: ConfirmationLevel;
  systemPrompt?: string;
  initialMessages?: AIMessageWithTools[];
  onStateChange?: (state: AgentExecutionState) => void;
  onConfirmationRequest?: (request: ConfirmationRequest) => Promise<boolean>;
}

export class AgentExecutor {
  private config: Required<Omit<AgentConfig, 'onStateChange' | 'onConfirmationRequest'>> &
    Pick<AgentConfig, 'onStateChange' | 'onConfirmationRequest'>;
  private state: AgentExecutionState;
  private messages: AIMessageWithTools[] = [];

  constructor(config: AgentConfig = {}) {
    const settings = useAppStore.getState().settings;
    const agentSettings = settings.agentSettings ?? DEFAULT_AGENT_SETTINGS;

    this.config = {
      maxIterations: config.maxIterations ?? agentSettings.maxIterations,
      confirmationLevel: config.confirmationLevel ?? agentSettings.requireConfirmation,
      systemPrompt: config.systemPrompt ?? AGENT_SYSTEM_PROMPT,
      initialMessages: config.initialMessages ?? [],
      onStateChange: config.onStateChange,
      onConfirmationRequest: config.onConfirmationRequest,
    };

    this.state = {
      status: 'idle',
      iterationCount: 0,
      maxIterations: this.config.maxIterations,
      toolsExecuted: [],
    };
  }

  /**
   * Run the agent with a user message
   */
  async run(userMessage: string): Promise<string> {
    // Start with initial messages (for conversation continuity) plus new user message
    this.messages = [
      ...this.config.initialMessages,
      { role: 'user', content: userMessage },
    ];
    this.updateState({ status: 'thinking', iterationCount: 0, toolsExecuted: [] });

    try {
      for (let i = 0; i < this.config.maxIterations; i++) {
        this.updateState({ iterationCount: i + 1 });

        // 1. Call AI with tools
        const response = await this.callAIWithTools();

        // 2. Add response to history
        this.messages.push({ role: 'assistant', content: response.content });

        // 3. Check if done
        if (response.stop_reason === 'end_turn') {
          this.updateState({ status: 'complete' });
          return this.extractText(response.content);
        }

        // 4. Handle max tokens (shouldn't happen with 4096, but just in case)
        if (response.stop_reason === 'max_tokens') {
          this.updateState({ status: 'error', error: 'Response exceeded maximum length' });
          return this.extractText(response.content) + '\n\n(Response was truncated)';
        }

        // 5. Execute tool calls
        if (response.stop_reason === 'tool_use') {
          const toolCalls = this.extractToolCalls(response.content);
          const results = await this.executeTools(toolCalls);
          this.messages.push({ role: 'user', content: results });
        }
      }

      // Max iterations exceeded
      this.updateState({
        status: 'error',
        error: `Max iterations (${this.config.maxIterations}) exceeded`
      });

      // Return any text content we have
      const lastResponse = this.messages[this.messages.length - 1];
      if (lastResponse.role === 'assistant' && Array.isArray(lastResponse.content)) {
        const text = this.extractText(lastResponse.content as ContentBlock[]);
        if (text) {
          return text + '\n\n(Stopped: too many tool calls)';
        }
      }

      return 'I apologize, but I was unable to complete the request. Please try a simpler command.';
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.updateState({ status: 'error', error: errorMessage });
      throw error;
    }
  }

  /**
   * Call the AI provider with tool definitions
   */
  private async callAIWithTools(): Promise<AIResponseWithTools> {
    const settings = useAppStore.getState().settings;
    const provider = getProvider(settings.activeProvider);
    const storedConfig = settings.providers[settings.activeProvider];

    if (!provider.supportsToolCalling || !provider.callWithTools) {
      throw new Error(`Provider ${settings.activeProvider} does not support tool calling`);
    }

    // Decode the API key (stored as base64)
    const providerConfig = {
      ...storedConfig,
      apiKey: decodeApiKey(storedConfig.apiKey),
    };

    const tools = toolRegistry.getAnthropicTools();

    return provider.callWithTools(
      this.messages,
      tools,
      this.config.systemPrompt,
      providerConfig
    );
  }

  /**
   * Extract text content from response blocks
   */
  private extractText(content: ContentBlock[]): string {
    return content
      .filter((block): block is TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n');
  }

  /**
   * Extract tool use blocks from response content
   */
  private extractToolCalls(content: ContentBlock[]): ToolUseBlock[] {
    return content.filter((block): block is ToolUseBlock => block.type === 'tool_use');
  }

  /**
   * Execute tool calls and return results
   */
  private async executeTools(calls: ToolUseBlock[]): Promise<ToolResultBlock[]> {
    const results: ToolResultBlock[] = [];

    for (const call of calls) {
      // Check if confirmation is needed
      if (this.needsConfirmation(call.name)) {
        this.updateState({
          status: 'waiting_confirmation',
          currentTool: call.name,
          pendingConfirmation: {
            toolName: call.name,
            toolId: call.id,
            input: call.input,
            description: toolRegistry.getConfirmationMessage(call.name, call.input),
          },
        });

        const confirmed = await this.requestConfirmation(call);

        if (!confirmed) {
          results.push({
            type: 'tool_result',
            tool_use_id: call.id,
            content: 'User declined to execute this action',
            is_error: true,
          });
          continue;
        }
      }

      // Execute the tool
      this.updateState({
        status: 'executing_tool',
        currentTool: call.name,
        pendingConfirmation: undefined,
      });

      const result = await toolRegistry.execute(call);

      this.updateState({
        toolsExecuted: [...this.state.toolsExecuted, call.name],
      });

      results.push({
        type: 'tool_result',
        tool_use_id: call.id,
        content: JSON.stringify(result),
        is_error: !result.success,
      });
    }

    // Return to thinking state after tool execution
    this.updateState({ status: 'thinking', currentTool: undefined });

    return results;
  }

  /**
   * Check if a tool needs confirmation
   */
  private needsConfirmation(toolName: string): boolean {
    return toolRegistry.needsConfirmation(toolName, this.config.confirmationLevel);
  }

  /**
   * Request confirmation from the user
   */
  private async requestConfirmation(call: ToolUseBlock): Promise<boolean> {
    if (!this.config.onConfirmationRequest) {
      // No confirmation handler - auto-approve
      return true;
    }

    return this.config.onConfirmationRequest({
      toolName: call.name,
      toolId: call.id,
      input: call.input,
      description: toolRegistry.getConfirmationMessage(call.name, call.input),
    });
  }

  /**
   * Update the execution state
   */
  private updateState(updates: Partial<AgentExecutionState>): void {
    this.state = { ...this.state, ...updates };
    this.config.onStateChange?.(this.state);
  }

  /**
   * Get the current state
   */
  getState(): AgentExecutionState {
    return { ...this.state };
  }

  /**
   * Get the conversation messages (for continuing conversations)
   */
  getMessages(): AIMessageWithTools[] {
    return [...this.messages];
  }
}

/**
 * Create and run an agent with a single message
 * Convenience function for simple use cases
 */
export async function runAgent(
  message: string,
  config?: AgentConfig
): Promise<string> {
  const executor = new AgentExecutor(config);
  return executor.run(message);
}
