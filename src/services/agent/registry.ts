import { z } from 'zod';
import type { ToolDefinitionBase, ToolResult, AnthropicToolDef, ToolUseBlock } from '../../types/agent';

/**
 * Tool Registry - manages all available tools for the agent
 */
export class ToolRegistry {
  private tools: Map<string, ToolDefinitionBase> = new Map();

  /**
   * Register a tool with the registry
   */
  register(tool: ToolDefinitionBase): void {
    if (this.tools.has(tool.name)) {
      console.warn(`Tool "${tool.name}" is already registered. Overwriting.`);
    }
    this.tools.set(tool.name, tool);
  }

  /**
   * Register multiple tools at once
   */
  registerAll(tools: ToolDefinitionBase[]): void {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  /**
   * Get a tool by name
   */
  get(name: string): ToolDefinitionBase | undefined {
    return this.tools.get(name);
  }

  /**
   * Check if a tool exists
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get all registered tools
   */
  getAll(): ToolDefinitionBase[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get all tools in Anthropic's tool format
   */
  getAnthropicTools(): AnthropicToolDef[] {
    return this.getAll().map((tool) => this.toAnthropicFormat(tool));
  }

  /**
   * Convert a single tool to Anthropic format
   */
  private toAnthropicFormat(tool: ToolDefinitionBase): AnthropicToolDef {
    // Use Zod v4's native JSON Schema conversion
    const jsonSchema = z.toJSONSchema(tool.inputSchema, {
      unrepresentable: 'any', // Handle edge cases gracefully
    }) as Record<string, unknown>;

    return {
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: 'object',
        properties: (jsonSchema.properties as Record<string, unknown>) || {},
        required: (jsonSchema.required as string[]) || [],
      },
    };
  }

  /**
   * Execute a tool call
   */
  async execute(toolCall: ToolUseBlock): Promise<ToolResult> {
    const tool = this.tools.get(toolCall.name);

    if (!tool) {
      return {
        success: false,
        error: `Unknown tool: ${toolCall.name}`,
      };
    }

    try {
      // Validate input with Zod schema
      const parseResult = tool.inputSchema.safeParse(toolCall.input);

      if (!parseResult.success) {
        return {
          success: false,
          error: `Invalid input: ${parseResult.error.message}`,
        };
      }

      // Execute the tool
      return await tool.execute(parseResult.data);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during tool execution',
      };
    }
  }

  /**
   * Check if a tool requires confirmation based on settings
   */
  needsConfirmation(
    toolName: string,
    confirmationLevel: 'all' | 'write-only' | 'destructive-only' | 'never'
  ): boolean {
    const tool = this.tools.get(toolName);
    if (!tool) return false;

    switch (confirmationLevel) {
      case 'never':
        return false;
      case 'all':
        return true;
      case 'write-only':
        return tool.category === 'write';
      case 'destructive-only':
        return tool.category === 'write' && tool.requiresConfirmation;
      default:
        return false;
    }
  }

  /**
   * Get the confirmation message for a tool
   */
  getConfirmationMessage(toolName: string, input: Record<string, unknown>): string {
    const tool = this.tools.get(toolName);
    if (!tool) return `Execute ${toolName}?`;

    if (tool.confirmationMessage) {
      return tool.confirmationMessage(input);
    }

    return `Execute ${tool.name}?`;
  }
}

// Singleton instance
export const toolRegistry = new ToolRegistry();
