import { z } from 'zod';

// ============================================
// READ Tool Schemas
// ============================================

export const searchJobsSchema = z.object({
  query: z.string().optional().describe('Search text to match against company name or job title'),
  status: z.string().optional().describe('Filter by job status (e.g., "Applied", "Interviewing")'),
  company: z.string().optional().describe('Filter by company name (partial match)'),
  limit: z.number().default(10).describe('Maximum number of results to return'),
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

// ============================================
// Type exports
// ============================================

export type SearchJobsInput = z.infer<typeof searchJobsSchema>;
export type GetJobDetailsInput = z.infer<typeof getJobDetailsSchema>;
export type GetJobByCompanyInput = z.infer<typeof getJobByCompanySchema>;
export type GetJobStatsInput = z.infer<typeof getJobStatsSchema>;
export type GetSkillGapsInput = z.infer<typeof getSkillGapsSchema>;
export type ListContactsInput = z.infer<typeof listContactsSchema>;
export type UpdateJobStatusInput = z.infer<typeof updateJobStatusSchema>;
export type AddNoteInput = z.infer<typeof addNoteSchema>;
export type AddTimelineEventInput = z.infer<typeof addTimelineEventSchema>;
export type AddContactInput = z.infer<typeof addContactSchema>;
