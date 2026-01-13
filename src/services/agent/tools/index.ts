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
export { generateCoverLetterTool } from './generateCoverLetterTool';
export { gradeResumeTool } from './gradeResumeTool';
export { generateInterviewPrepTool } from './generateInterviewPrepTool';
export { analyzeContactTool } from './analyzeContactTool';
export { analyzeCareerTool } from './analyzeCareerTool';
export { webResearchTool } from './webResearchTool';
export { companyAnalysisTool } from './companyAnalysisTool';
// Phase 4 tools
export { suggestLearningPathTool } from './suggestLearningPathTool';
export { addLearningTaskTool } from './addLearningTaskTool';
export { draftOutreachTool } from './draftOutreachTool';
export { bulkUpdateStatusTool } from './bulkUpdateStatusTool';
// Listing tools
export { listLearningTasksTool } from './listLearningTasksTool';
export { getFollowUpsTool } from './getFollowUpsTool';
export { listUpcomingEventsTool } from './listUpcomingEventsTool';
export { getApplicationSummaryTool } from './getApplicationSummaryTool';
export { listAllNotesTool } from './listAllNotesTool';
export { getStaleJobsTool } from './getStaleJobsTool';
// Update/Delete tools
export { updateLearningTaskTool } from './updateLearningTaskTool';
export { deleteLearningTaskTool } from './deleteLearningTaskTool';
export { updateContactTool } from './updateContactTool';
export { deleteContactTool } from './deleteContactTool';
export { updateTimelineEventTool } from './updateTimelineEventTool';
export { deleteTimelineEventTool } from './deleteTimelineEventTool';
// External job search
export { findExternalJobsTool } from './findExternalJobsTool';
// Batch scanner
export { scanCareerPagesTool } from './scanCareerPagesTool';
// Career projects
export { suggestProjectTool } from './suggestProjectTool';

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
import { generateCoverLetterTool } from './generateCoverLetterTool';
import { gradeResumeTool } from './gradeResumeTool';
import { generateInterviewPrepTool } from './generateInterviewPrepTool';
import { analyzeContactTool } from './analyzeContactTool';
import { analyzeCareerTool } from './analyzeCareerTool';
import { webResearchTool } from './webResearchTool';
import { companyAnalysisTool } from './companyAnalysisTool';
import { suggestLearningPathTool } from './suggestLearningPathTool';
import { addLearningTaskTool } from './addLearningTaskTool';
import { draftOutreachTool } from './draftOutreachTool';
import { bulkUpdateStatusTool } from './bulkUpdateStatusTool';
import { listLearningTasksTool } from './listLearningTasksTool';
import { getFollowUpsTool } from './getFollowUpsTool';
import { listUpcomingEventsTool } from './listUpcomingEventsTool';
import { getApplicationSummaryTool } from './getApplicationSummaryTool';
import { listAllNotesTool } from './listAllNotesTool';
import { getStaleJobsTool } from './getStaleJobsTool';
import { updateLearningTaskTool } from './updateLearningTaskTool';
import { deleteLearningTaskTool } from './deleteLearningTaskTool';
import { updateContactTool } from './updateContactTool';
import { deleteContactTool } from './deleteContactTool';
import { updateTimelineEventTool } from './updateTimelineEventTool';
import { deleteTimelineEventTool } from './deleteTimelineEventTool';
import { findExternalJobsTool } from './findExternalJobsTool';
import { scanCareerPagesTool } from './scanCareerPagesTool';
import { suggestProjectTool } from './suggestProjectTool';
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
  // AI Generation tools (write, require confirmation)
  generateCoverLetterTool,
  gradeResumeTool,
  generateInterviewPrepTool,
  analyzeContactTool,
  analyzeCareerTool,
  // Research tools
  webResearchTool,
  companyAnalysisTool,
  // Phase 4 tools
  suggestLearningPathTool,
  addLearningTaskTool,
  draftOutreachTool,
  bulkUpdateStatusTool,
  // Listing tools
  listLearningTasksTool,
  getFollowUpsTool,
  listUpcomingEventsTool,
  getApplicationSummaryTool,
  listAllNotesTool,
  getStaleJobsTool,
  // Update/Delete tools
  updateLearningTaskTool,
  deleteLearningTaskTool,
  updateContactTool,
  deleteContactTool,
  updateTimelineEventTool,
  deleteTimelineEventTool,
  // External job search
  findExternalJobsTool,
  // Batch scanner
  scanCareerPagesTool,
  // Career projects
  suggestProjectTool,
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
  suggestLearningPathTool,
  // Listing tools
  listLearningTasksTool,
  getFollowUpsTool,
  listUpcomingEventsTool,
  getApplicationSummaryTool,
  listAllNotesTool,
  getStaleJobsTool,
  // External job search
  findExternalJobsTool,
  // Batch scanner
  scanCareerPagesTool,
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
  generateCoverLetterTool,
  gradeResumeTool,
  generateInterviewPrepTool,
  analyzeContactTool,
  analyzeCareerTool,
  webResearchTool,
  companyAnalysisTool,
  addLearningTaskTool,
  draftOutreachTool,
  bulkUpdateStatusTool,
  // Update/Delete tools
  updateLearningTaskTool,
  deleteLearningTaskTool,
  updateContactTool,
  deleteContactTool,
  updateTimelineEventTool,
  deleteTimelineEventTool,
  // Career projects
  suggestProjectTool,
];
