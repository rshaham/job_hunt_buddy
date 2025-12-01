// Tool implementations
export { searchJobsTool } from './searchJobs';
export { getJobDetailsTool } from './getJobDetails';
export { getJobStatsTool } from './getJobStats';
export { listContactsTool } from './listContacts';
export { getSkillGapsTool } from './getSkillGaps';
export { getResumeAnalysisTool } from './getResumeAnalysis';
export { listTimelineTool } from './listTimeline';
export { updateJobStatusTool } from './updateJobStatus';
export { addNoteTool } from './addNote';
export { addContactTool } from './addContact';
export { addTimelineEventTool } from './addTimelineEvent';
export { deleteJobTool } from './deleteJob';
export { updateNoteTool } from './updateNote';
export { deleteNoteTool } from './deleteNote';

// Schemas
export * from './schemas';

// Import all tools for easy registration
import { searchJobsTool } from './searchJobs';
import { getJobDetailsTool } from './getJobDetails';
import { getJobStatsTool } from './getJobStats';
import { listContactsTool } from './listContacts';
import { getSkillGapsTool } from './getSkillGaps';
import { getResumeAnalysisTool } from './getResumeAnalysis';
import { listTimelineTool } from './listTimeline';
import { updateJobStatusTool } from './updateJobStatus';
import { addNoteTool } from './addNote';
import { addContactTool } from './addContact';
import { addTimelineEventTool } from './addTimelineEvent';
import { deleteJobTool } from './deleteJob';
import { updateNoteTool } from './updateNote';
import { deleteNoteTool } from './deleteNote';
import type { ToolDefinitionBase } from '../../../types/agent';

/**
 * All available tools for the agent
 */
export const allTools: ToolDefinitionBase[] = [
  // READ tools
  searchJobsTool,
  getJobDetailsTool,
  getJobStatsTool,
  listContactsTool,
  getSkillGapsTool,
  getResumeAnalysisTool,
  listTimelineTool,
  // WRITE tools
  updateJobStatusTool,
  addNoteTool,
  addContactTool,
  addTimelineEventTool,
  deleteJobTool,
  updateNoteTool,
  deleteNoteTool,
];

/**
 * READ-only tools (safe, no confirmation needed)
 */
export const readTools: ToolDefinitionBase[] = [
  searchJobsTool,
  getJobDetailsTool,
  getJobStatsTool,
  listContactsTool,
  getSkillGapsTool,
  getResumeAnalysisTool,
  listTimelineTool,
];

/**
 * WRITE tools (may need confirmation)
 */
export const writeTools: ToolDefinitionBase[] = [
  updateJobStatusTool,
  addNoteTool,
  addContactTool,
  addTimelineEventTool,
  deleteJobTool,
  updateNoteTool,
  deleteNoteTool,
];
