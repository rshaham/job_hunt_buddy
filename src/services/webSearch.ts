/**
 * Web Search Service using Tavily API
 *
 * Provides real web search capabilities for research tools.
 * Uses VITE_TAVILY_API_KEY from environment variables.
 */

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

interface TavilyResponse {
  results: TavilySearchResult[];
  answer?: string;
  query: string;
}

// Domain hints for different research types
export const COMPANY_RESEARCH_DOMAINS = [
  'glassdoor.com',
  'linkedin.com',
  'levels.fyi',
  'indeed.com',
  'comparably.com',
  'reddit.com',
];

export const TECH_STACK_DOMAINS = [
  'stackshare.io',
  'builtwith.com',
  'github.com',
  'techcrunch.com',
  'reddit.com',
];

export const NEWS_DOMAINS = [
  'techcrunch.com',
  'bloomberg.com',
  'forbes.com',
  'businessinsider.com',
  'reddit.com',
];

/**
 * Custom error class for web search failures
 */
export class WebSearchError extends Error {
  constructor(
    message: string,
    public readonly code: 'NO_API_KEY' | 'API_ERROR' | 'NETWORK_ERROR'
  ) {
    super(message);
    this.name = 'WebSearchError';
  }
}

/**
 * Check if web search is available (API key is configured)
 */
export function isWebSearchAvailable(): boolean {
  return !!import.meta.env.VITE_TAVILY_API_KEY;
}

/**
 * Search the web using Tavily API
 *
 * @param query - Search query
 * @param options - Optional search configuration
 * @returns Array of search results
 * @throws WebSearchError if search fails
 */
export async function searchWeb(
  query: string,
  options?: {
    includeDomains?: string[];
    excludeDomains?: string[];
    maxResults?: number;
    searchDepth?: 'basic' | 'advanced';
  }
): Promise<TavilySearchResult[]> {
  const apiKey = import.meta.env.VITE_TAVILY_API_KEY;

  if (!apiKey) {
    throw new WebSearchError(
      'Web search API key not configured. Add VITE_TAVILY_API_KEY to your .env file.',
      'NO_API_KEY'
    );
  }

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: options?.searchDepth || 'basic',
        include_domains: options?.includeDomains || [],
        exclude_domains: options?.excludeDomains || [],
        max_results: options?.maxResults || 5,
        include_answer: false,
        include_raw_content: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new WebSearchError(
        `Web search failed: ${response.status} - ${errorText}`,
        'API_ERROR'
      );
    }

    const data: TavilyResponse = await response.json();
    return data.results || [];
  } catch (error) {
    if (error instanceof WebSearchError) {
      throw error;
    }
    throw new WebSearchError(
      `Web search network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'NETWORK_ERROR'
    );
  }
}

/**
 * Search for company information (reviews, culture, etc.)
 */
export async function searchCompanyInfo(
  company: string,
  topics: string[] = ['culture', 'reviews', 'benefits']
): Promise<TavilySearchResult[]> {
  const query = `"${company}" ${topics.join(' ')}`;
  return searchWeb(query, {
    includeDomains: COMPANY_RESEARCH_DOMAINS,
    maxResults: 5,
  });
}

/**
 * Search for company tech stack and engineering culture
 */
export async function searchTechStack(company: string): Promise<TavilySearchResult[]> {
  const query = `"${company}" engineering tech stack technologies`;
  return searchWeb(query, {
    includeDomains: TECH_STACK_DOMAINS,
    maxResults: 5,
  });
}

/**
 * Search for interview experiences at a company
 */
export async function searchInterviewExperiences(
  company: string,
  role?: string
): Promise<TavilySearchResult[]> {
  const roleQuery = role ? ` "${role}"` : '';
  const query = `"${company}"${roleQuery} interview experience process questions`;
  return searchWeb(query, {
    includeDomains: ['glassdoor.com', 'levels.fyi', 'reddit.com', 'teamblind.com'],
    maxResults: 5,
  });
}

/**
 * General research search with custom topics
 */
export async function searchTopics(
  company: string,
  topics: string
): Promise<TavilySearchResult[]> {
  const query = `"${company}" ${topics}`;
  return searchWeb(query, {
    maxResults: 8,
    searchDepth: 'basic',
  });
}

/**
 * Extract just the source links as a formatted list
 * Used to append sources directly to AI responses
 */
export function extractSourceLinks(results: TavilySearchResult[]): string {
  if (results.length === 0) {
    return '';
  }
  return results
    .map((r, i) => `${i + 1}. [${r.title}](${r.url})`)
    .join('\n');
}

/**
 * Append a Sources section with clickable links to content
 * Used to guarantee sources appear in AI responses
 */
export function appendSourcesToContent(
  content: string,
  results: TavilySearchResult[]
): string {
  const sourceLinks = extractSourceLinks(results);
  return sourceLinks
    ? `${content}\n\n## Sources\n${sourceLinks}`
    : content;
}

/**
 * Create a preview of content, preserving the sources section
 * Truncates main content but keeps sources visible
 */
export function createPreviewWithSources(
  content: string,
  results: TavilySearchResult[],
  maxLength: number = 1500,
  truncateAt: number = 800
): string {
  if (content.length <= maxLength) {
    return content;
  }
  const sourceLinks = extractSourceLinks(results);
  const sourcesSection = sourceLinks ? `\n\n## Sources\n${sourceLinks}` : '';
  return content.substring(0, truncateAt) + '...' + sourcesSection;
}

/**
 * Format search results for AI consumption
 * Provides sources in markdown link format so AI can use them inline
 */
export function formatSearchResultsForAI(results: TavilySearchResult[]): string {
  if (results.length === 0) {
    return 'No web search results available.';
  }

  const formattedResults = results
    .map((r, i) => `### Source ${i + 1}: [${r.title}](${r.url})
${r.content}`)
    .join('\n\n---\n\n');

  return formattedResults;
}
