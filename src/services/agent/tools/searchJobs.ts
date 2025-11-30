import { useAppStore } from '../../../stores/appStore';
import type { ToolDefinition, ToolResult } from '../../../types/agent';
import { searchJobsSchema, type SearchJobsInput } from './schemas';

interface JobSearchResult {
  id: string;
  company: string;
  title: string;
  status: string;
  dateAdded: string;
}

export const searchJobsTool: ToolDefinition<SearchJobsInput, JobSearchResult[]> = {
  name: 'search_jobs',
  description: 'Search through saved jobs by company name, job title, or status. Returns a list of matching jobs with basic info.',
  category: 'read',
  inputSchema: searchJobsSchema,
  requiresConfirmation: false,

  async execute(input): Promise<ToolResult<JobSearchResult[]>> {
    const { jobs } = useAppStore.getState();
    let results = [...jobs];

    // Apply query filter (searches company and title)
    if (input.query) {
      const q = input.query.toLowerCase();
      results = results.filter(
        (j) =>
          j.company.toLowerCase().includes(q) ||
          j.title.toLowerCase().includes(q)
      );
    }

    // Apply status filter
    if (input.status) {
      const status = input.status.toLowerCase();
      results = results.filter((j) => j.status.toLowerCase() === status);
    }

    // Apply company filter
    if (input.company) {
      const company = input.company.toLowerCase();
      results = results.filter((j) => j.company.toLowerCase().includes(company));
    }

    // Limit results
    const limit = input.limit ?? 10;
    const limited = results.slice(0, limit);

    return {
      success: true,
      data: limited.map((j) => ({
        id: j.id,
        company: j.company,
        title: j.title,
        status: j.status,
        dateAdded: j.dateAdded instanceof Date ? j.dateAdded.toISOString() : String(j.dateAdded),
      })),
    };
  },
};
