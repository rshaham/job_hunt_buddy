import { useAppStore } from '../../../stores/appStore';
import { semanticSearch, isReady as isEmbeddingReady } from '../../embeddings';
import type { ToolDefinition, ToolResult } from '../../../types/agent';
import { searchJobsSchema, type SearchJobsInput } from './schemas';

interface JobSearchResult {
  id: string;
  company: string;
  title: string;
  status: string;
  dateAdded: string;
  similarityScore?: number; // Only present for semantic search results
}

export const searchJobsTool: ToolDefinition<SearchJobsInput, JobSearchResult[]> = {
  name: 'search_jobs',
  description: 'Search through saved jobs by company name, job title, or status. Use semantic search for natural language queries like "remote engineering roles" or "jobs with leadership opportunities".',
  category: 'read',
  inputSchema: searchJobsSchema,
  requiresConfirmation: false,

  async execute(input): Promise<ToolResult<JobSearchResult[]>> {
    const { jobs } = useAppStore.getState();
    const limit = input.limit ?? 10;

    // Use semantic search if enabled and query provided
    if (input.useSemanticSearch && input.query) {
      // Check if embeddings are ready
      if (!isEmbeddingReady()) {
        return {
          success: false,
          error: 'Semantic search not available. Embeddings are still loading. Try again in a moment or use keyword search.',
        };
      }

      try {
        // Run semantic search on jobs
        const searchResults = await semanticSearch(input.query, {
          limit: limit + 10, // Get extra to allow for filtering
          threshold: 0.3,
          entityTypes: ['job'],
        });

        // Map results back to jobs
        let results: JobSearchResult[] = [];
        for (const result of searchResults) {
          const job = jobs.find((j) => j.id === result.record.entityId);
          if (job) {
            // Apply status filter if specified
            if (input.status && job.status.toLowerCase() !== input.status.toLowerCase()) {
              continue;
            }
            // Apply company filter if specified
            if (input.company && !job.company.toLowerCase().includes(input.company.toLowerCase())) {
              continue;
            }

            results.push({
              id: job.id,
              company: job.company,
              title: job.title,
              status: job.status,
              dateAdded: job.dateAdded instanceof Date ? job.dateAdded.toISOString() : String(job.dateAdded),
              similarityScore: Math.round(result.score * 100) / 100,
            });
          }
        }

        // Limit results
        results = results.slice(0, limit);

        return {
          success: true,
          data: results,
        };
      } catch (error) {
        return {
          success: false,
          error: `Semantic search failed: ${error instanceof Error ? error.message : 'Unknown error'}. Try using keyword search instead.`,
        };
      }
    }

    // Keyword-based search (original behavior)
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
