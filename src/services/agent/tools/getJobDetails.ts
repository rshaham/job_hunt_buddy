import { useAppStore } from '../../../stores/appStore';
import type { ToolDefinition, ToolResult } from '../../../types/agent';
import { getJobDetailsSchema, type GetJobDetailsInput } from './schemas';

interface JobDetailsResult {
  id: string;
  company: string;
  title: string;
  status: string;
  dateAdded: string;
  lastUpdated: string;
  jdLink: string;
  shortDescription: string | null;
  requirements: string[];
  niceToHaves: string[];
  keySkills: string[];
  salary: string | null;
  jobType: string;
  level: string;
  resumeGrade: string | null;
  resumeMatchPercentage: number | null;
  noteCount: number;
  contactCount: number;
  timelineEventCount: number;
  hasCoverLetter: boolean;
  hasTailoredResume: boolean;
}

export const getJobDetailsTool: ToolDefinition<GetJobDetailsInput, JobDetailsResult> = {
  name: 'get_job_details',
  description: 'Get detailed information about a specific job by its ID. Returns full job info including summary, analysis, and tracking data.',
  category: 'read',
  inputSchema: getJobDetailsSchema,
  requiresConfirmation: false,

  async execute(input): Promise<ToolResult<JobDetailsResult>> {
    const { jobs } = useAppStore.getState();
    const job = jobs.find((j) => j.id === input.jobId);

    if (!job) {
      return {
        success: false,
        error: `Job not found with ID: ${input.jobId}`,
      };
    }

    return {
      success: true,
      data: {
        id: job.id,
        company: job.company,
        title: job.title,
        status: job.status,
        dateAdded: job.dateAdded instanceof Date ? job.dateAdded.toISOString() : String(job.dateAdded),
        lastUpdated: job.lastUpdated instanceof Date ? job.lastUpdated.toISOString() : String(job.lastUpdated),
        jdLink: job.jdLink,
        shortDescription: job.summary?.shortDescription ?? null,
        requirements: job.summary?.requirements ?? [],
        niceToHaves: job.summary?.niceToHaves ?? [],
        keySkills: job.summary?.keySkills ?? [],
        salary: job.summary?.salary ?? null,
        jobType: job.summary?.jobType ?? 'unknown',
        level: job.summary?.level ?? 'unknown',
        resumeGrade: job.resumeAnalysis?.grade ?? null,
        resumeMatchPercentage: job.resumeAnalysis?.matchPercentage ?? null,
        noteCount: job.notes.length,
        contactCount: job.contacts.length,
        timelineEventCount: job.timeline.length,
        hasCoverLetter: !!job.coverLetter,
        hasTailoredResume: !!job.tailoredResume,
      },
    };
  },
};
