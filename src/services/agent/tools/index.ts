// Tool implementations
export { searchJobsTool } from './searchJobs';
export { getJobDetailsTool } from './getJobDetails';
export { getJobStatsTool } from './getJobStats';
export { updateJobStatusTool } from './updateJobStatus';
export { addNoteTool } from './addNote';
export { addContactTool } from './addContact';

// Schemas
export * from './schemas';

// Import all tools for easy registration
import { searchJobsTool } from './searchJobs';
import { getJobDetailsTool } from './getJobDetails';
import { getJobStatsTool } from './getJobStats';
import { updateJobStatusTool } from './updateJobStatus';
import { addNoteTool } from './addNote';
import { addContactTool } from './addContact';
import type { ToolDefinitionBase } from '../../../types/agent';

/**
 * All available tools for the agent
 */
export const allTools: ToolDefinitionBase[] = [
  // READ tools
  searchJobsTool,
  getJobDetailsTool,
  getJobStatsTool,
  // WRITE tools
  updateJobStatusTool,
  addNoteTool,
  addContactTool,
];

/**
 * READ-only tools (safe, no confirmation needed)
 */
export const readTools: ToolDefinitionBase[] = [
  searchJobsTool,
  getJobDetailsTool,
  getJobStatsTool,
];

/**
 * WRITE tools (may need confirmation)
 */
export const writeTools: ToolDefinitionBase[] = [
  updateJobStatusTool,
  addNoteTool,
  addContactTool,
];
