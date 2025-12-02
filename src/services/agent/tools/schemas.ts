import { z } from 'zod';

// ============================================
// READ Tool Schemas
// ============================================

export const searchJobsSchema = z.object({
  query: z.string().optional().describe('Search text to match against company name or job title. With semantic search enabled, can use natural language like "backend roles at startups"'),
  status: z.string().optional().describe('Filter by job status (e.g., "Applied", "Interviewing")'),
  company: z.string().optional().describe('Filter by company name (partial match)'),
  limit: z.number().default(10).describe('Maximum number of results to return'),
  useSemanticSearch: z.boolean().default(false).describe('Use semantic search to find jobs by meaning rather than exact text match. Enable for natural language queries like "remote engineering roles" or "jobs with leadership opportunities"'),
});

export const getJobDetailsSchema = z.object({
  jobId: z.string().describe('The ID of the job to get details for'),
});

export const getJobByCompanySchema = z.object({
  company: z.string().describe('Company name to search for (partial match)'),
});

export const getJobStatsSchema = z.object({
  // No input needed - returns stats for all jobs
});

export const getSkillGapsSchema = z.object({
  limit: z.number().default(10).describe('Maximum number of skill gaps to return'),
});

export const listContactsSchema = z.object({
  jobId: z.string().optional().describe('Filter contacts by job ID'),
  company: z.string().optional().describe('Filter contacts by company name'),
});

export const getResumeAnalysisSchema = z.object({
  jobId: z.string().describe('The ID of the job to get resume analysis for'),
});

export const listTimelineSchema = z.object({
  jobId: z.string().describe('The ID of the job to get timeline events for'),
});

// ============================================
// WRITE Tool Schemas
// ============================================

export const updateJobStatusSchema = z.object({
  jobId: z.string().describe('The ID of the job to update'),
  newStatus: z.string().describe('The new status to set (e.g., "Applied", "Interviewing", "Rejected")'),
});

export const addNoteSchema = z.object({
  jobId: z.string().describe('The ID of the job to add a note to'),
  content: z.string().describe('The note content (supports markdown)'),
});

export const addTimelineEventSchema = z.object({
  jobId: z.string().describe('The ID of the job to add an event to'),
  type: z.string().describe('Event type (e.g., "Applied", "Phone Screen", "Interview")'),
  description: z.string().describe('Description of the event'),
  date: z.string().optional().describe('Event date (ISO format). Defaults to now.'),
});

export const addContactSchema = z.object({
  jobId: z.string().describe('The ID of the job to add a contact to'),
  name: z.string().describe('Contact name'),
  role: z.string().describe('Contact role (e.g., "Recruiter", "Hiring Manager")'),
  email: z.string().optional().describe('Contact email'),
  linkedin: z.string().optional().describe('LinkedIn profile URL'),
  notes: z.string().optional().describe('Additional notes about the contact'),
});

export const deleteJobSchema = z.object({
  jobId: z.string().describe('The ID of the job to delete'),
});

export const updateNoteSchema = z.object({
  jobId: z.string().describe('The ID of the job containing the note'),
  noteId: z.string().describe('The ID of the note to update'),
  content: z.string().describe('The new note content (supports markdown)'),
});

export const deleteNoteSchema = z.object({
  jobId: z.string().describe('The ID of the job containing the note'),
  noteId: z.string().describe('The ID of the note to delete'),
});

// AI Generation Tool Schemas
export const generateCoverLetterSchema = z.object({
  jobId: z.string().describe('The ID of the job to generate a cover letter for'),
});

export const gradeResumeSchema = z.object({
  jobId: z.string().describe('The ID of the job to grade the resume against'),
});

export const generateInterviewPrepSchema = z.object({
  jobId: z.string().describe('The ID of the job to generate interview prep for'),
});

export const analyzeContactSchema = z.object({
  jobId: z.string().describe('The ID of the job containing the contact'),
  contactId: z.string().describe('The ID of the contact to analyze'),
});

export const analyzeCareerSchema = z.object({
  includeAllJobs: z.boolean().default(false).describe('Include all jobs (not just last 6 months)'),
});

export const webResearchSchema = z.object({
  jobId: z.string().describe('The ID of the job to research'),
  topics: z.string().describe('What to research about the company/role (e.g., "company culture", "tech stack", "growth trajectory")'),
});

export const companyAnalysisSchema = z.object({
  jobId: z.string().describe('The ID of the job to analyze'),
  focusAreas: z.string().optional().describe('Specific areas to focus on (e.g., "market position", "competitors", "technology")'),
});

// ============================================
// Phase 4 Tool Schemas
// ============================================

export const suggestLearningPathSchema = z.object({
  jobId: z.string().optional().describe('Optionally analyze gaps for a specific job. If not provided, analyzes overall career patterns.'),
  limit: z.number().default(5).describe('Maximum number of skills to suggest'),
});

export const addLearningTaskSchema = z.object({
  jobId: z.string().describe('The ID of the job to add the learning task to'),
  skill: z.string().describe('The skill to learn'),
  description: z.string().describe('Description of the learning task'),
  priority: z.enum(['high', 'medium', 'low']).default('medium').describe('Task priority'),
  dueDate: z.string().optional().describe('Optional due date (ISO format)'),
  resourceUrl: z.string().optional().describe('Optional URL to a learning resource'),
});

export const draftOutreachSchema = z.object({
  jobId: z.string().describe('The ID of the job for context'),
  contactId: z.string().optional().describe('The ID of a specific contact to reach out to'),
  messageType: z.enum(['initial-outreach', 'follow-up', 'thank-you', 'networking']).describe('Type of outreach message'),
  customPrompt: z.string().optional().describe('Additional instructions for the message'),
});

export const bulkUpdateStatusSchema = z.object({
  jobIds: z.array(z.string()).describe('Array of job IDs to update'),
  newStatus: z.string().describe('The new status to set for all jobs'),
});

// ============================================
// Type exports
// ============================================

export type SearchJobsInput = z.infer<typeof searchJobsSchema>;
export type GetJobDetailsInput = z.infer<typeof getJobDetailsSchema>;
export type GetJobByCompanyInput = z.infer<typeof getJobByCompanySchema>;
export type GetJobStatsInput = z.infer<typeof getJobStatsSchema>;
export type GetSkillGapsInput = z.infer<typeof getSkillGapsSchema>;
export type ListContactsInput = z.infer<typeof listContactsSchema>;
export type GetResumeAnalysisInput = z.infer<typeof getResumeAnalysisSchema>;
export type ListTimelineInput = z.infer<typeof listTimelineSchema>;
export type UpdateJobStatusInput = z.infer<typeof updateJobStatusSchema>;
export type AddNoteInput = z.infer<typeof addNoteSchema>;
export type AddTimelineEventInput = z.infer<typeof addTimelineEventSchema>;
export type AddContactInput = z.infer<typeof addContactSchema>;
export type DeleteJobInput = z.infer<typeof deleteJobSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type DeleteNoteInput = z.infer<typeof deleteNoteSchema>;
export type GenerateCoverLetterInput = z.infer<typeof generateCoverLetterSchema>;
export type GradeResumeInput = z.infer<typeof gradeResumeSchema>;
export type GenerateInterviewPrepInput = z.infer<typeof generateInterviewPrepSchema>;
export type AnalyzeContactInput = z.infer<typeof analyzeContactSchema>;
export type AnalyzeCareerInput = z.infer<typeof analyzeCareerSchema>;
export type WebResearchInput = z.infer<typeof webResearchSchema>;
export type CompanyAnalysisInput = z.infer<typeof companyAnalysisSchema>;
export type SuggestLearningPathInput = z.infer<typeof suggestLearningPathSchema>;
export type AddLearningTaskInput = z.infer<typeof addLearningTaskSchema>;
export type DraftOutreachInput = z.infer<typeof draftOutreachSchema>;
export type BulkUpdateStatusInput = z.infer<typeof bulkUpdateStatusSchema>;
