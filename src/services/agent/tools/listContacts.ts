import { useAppStore } from '../../../stores/appStore';
import type { ToolDefinition, ToolResult } from '../../../types/agent';
import { listContactsSchema, type ListContactsInput } from './schemas';
import type { Contact } from '../../../types';

interface ContactWithJob extends Contact {
  jobId: string;
  company: string;
  jobTitle: string;
}

interface ListContactsResult {
  contacts: ContactWithJob[];
  totalCount: number;
}

export const listContactsTool: ToolDefinition<ListContactsInput, ListContactsResult> = {
  name: 'list_contacts',
  description: 'List all contacts across jobs, optionally filtered by job ID or company name. Returns contact details with their associated job information.',
  category: 'read',
  inputSchema: listContactsSchema,
  requiresConfirmation: false,

  async execute(input): Promise<ToolResult<ListContactsResult>> {
    const { jobs } = useAppStore.getState();

    let filteredJobs = jobs;

    // Filter by job ID if provided
    if (input.jobId) {
      filteredJobs = jobs.filter((j) => j.id === input.jobId);
      if (filteredJobs.length === 0) {
        return {
          success: false,
          error: `Job not found with ID: ${input.jobId}`,
        };
      }
    }

    // Filter by company if provided
    if (input.company) {
      const companyLower = input.company.toLowerCase();
      filteredJobs = filteredJobs.filter((j) =>
        j.company.toLowerCase().includes(companyLower)
      );
    }

    // Collect all contacts with job context
    const contacts: ContactWithJob[] = [];
    for (const job of filteredJobs) {
      for (const contact of job.contacts) {
        contacts.push({
          ...contact,
          jobId: job.id,
          company: job.company,
          jobTitle: job.title,
        });
      }
    }

    return {
      success: true,
      data: {
        contacts,
        totalCount: contacts.length,
      },
    };
  },
};
