// Registry
export { ToolRegistry, toolRegistry } from './registry';

// Executor
export { AgentExecutor, runAgent } from './executor';
export type { AgentConfig } from './executor';

// Tools
export { allTools, readTools, writeTools } from './tools';
export * from './tools';

// Initialize the default registry with all tools
import { toolRegistry } from './registry';
import { allTools } from './tools';

// Register all tools on module load
toolRegistry.registerAll(allTools);
