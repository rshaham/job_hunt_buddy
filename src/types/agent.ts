import type { ZodSchema } from 'zod';

// Tool categories
export type ToolCategory = 'read' | 'write';

// Tool execution result
export type ToolResult<T = unknown> =
  | { success: true; data: T; description?: string }
  | { success: false; error: string; description?: string };

// Progress callback for tools to report their progress
export type ToolProgressCallback = (message: string) => void;

// Base tool definition interface (for collections/registry)
// Uses 'any' to allow storing heterogeneous tool types
export interface ToolDefinitionBase {
  name: string;
  description: string;
  category: ToolCategory;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inputSchema: ZodSchema<any>;
  requiresConfirmation: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  confirmationMessage?: (input: any) => string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: (input: any, onProgress?: ToolProgressCallback) => Promise<ToolResult<any>>;
}

// Typed tool definition interface (for individual tool implementations)
export interface ToolDefinition<TInput = unknown, TOutput = unknown> extends Omit<ToolDefinitionBase, 'inputSchema' | 'confirmationMessage' | 'execute'> {
  inputSchema: ZodSchema<TInput>;
  confirmationMessage?: (input: TInput) => string;
  execute: (input: TInput, onProgress?: ToolProgressCallback) => Promise<ToolResult<TOutput>>;
}

// Content block types from Anthropic API
export interface TextBlock {
  type: 'text';
  text: string;
}

export interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export type ContentBlock = TextBlock | ToolUseBlock;

// Tool result to send back to the API
export interface ToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

// Extended AI message for tool calling
export interface AIMessageWithTools {
  role: 'user' | 'assistant';
  content: string | ContentBlock[] | ToolResultBlock[];
}

// AI response with potential tool calls
export interface AIResponseWithTools {
  content: ContentBlock[];
  stop_reason: 'end_turn' | 'tool_use' | 'max_tokens';
}

// Anthropic tool definition format
export interface AnthropicToolDef {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// Agent execution state (for UI)
export type AgentStatus =
  | 'idle'
  | 'thinking'
  | 'executing_tool'
  | 'waiting_confirmation'
  | 'complete'
  | 'error';

export interface AgentExecutionState {
  status: AgentStatus;
  currentTool?: string;
  /** Unique ID for the current tool call (from API tool_use block) */
  currentToolId?: string;
  /** Progress message from the currently executing tool */
  toolProgress?: string;
  iterationCount: number;
  maxIterations: number;
  toolsExecuted: string[];
  pendingConfirmation?: ConfirmationRequest;
  error?: string;
  /** Result of the last tool execution (for tracking success/failure) */
  lastToolResult?: {
    toolName: string;
    /** Unique ID to match against the tool call entry */
    toolId: string;
    success: boolean;
    error?: string;
    description?: string;
  };
}

export interface ConfirmationRequest {
  toolName: string;
  toolId: string;
  input: Record<string, unknown>;
  description: string;
}

// Agent settings
export type ConfirmationLevel = 'all' | 'write-only' | 'destructive-only' | 'never';

export interface AgentSettings {
  requireConfirmation: ConfirmationLevel;
  maxIterations: number;
}

export const DEFAULT_AGENT_SETTINGS: AgentSettings = {
  requireConfirmation: 'write-only',
  maxIterations: 50,
};

// Helper type to extract input type from a tool definition
export type ToolInput<T extends ToolDefinition> = T extends ToolDefinition<infer I, unknown> ? I : never;

// Helper type to extract output type from a tool definition
export type ToolOutput<T extends ToolDefinition> = T extends ToolDefinition<unknown, infer O> ? O : never;
