/**
 * Web Search Service
 *
 * Provides real web search capabilities for research tools.
 *
 * Two modes:
 * 1. Direct mode: User provides their own Tavily API key (stored in settings)
 *    - Calls Tavily API directly from browser
 *    - No server proxy, no rate limiting
 *    - Truly local: searches never touch our servers
 *
 * 2. Proxy mode: Uses server-side proxy (/api/search/web)
 *    - API key is server-side only
 *    - Rate limited via Upstash Redis
 */

import { useAppStore } from '../stores/appStore';
import { decodeApiKey } from '../utils/helpers';

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

interface ProxyResponse {
  results: TavilySearchResult[];
  query: string;
  error?: string;
  code?: string;
  retryAfter?: number;
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
    public readonly code: 'RATE_LIMITED' | 'DAILY_CAP' | 'API_ERROR' | 'NETWORK_ERROR' | 'NOT_CONFIGURED'
  ) {
    super(message);
    this.name = 'WebSearchError';
  }
}

/**
 * Check if web search is available
 * Always returns true since the proxy handles API keys server-side
 */
export function isWebSearchAvailable(): boolean {
  return true;
}

export interface SearchWebOptions {
  includeDomains?: string[];
  excludeDomains?: string[];
  maxResults?: number;
  searchDepth?: 'basic' | 'advanced';
}

/**
 * Search the web - uses direct mode if user has their own API key,
 * otherwise falls back to server proxy.
 *
 * @param query - Search query
 * @param options - Optional search configuration
 * @returns Array of search results
 * @throws WebSearchError if search fails
 */
export async function searchWeb(
  query: string,
  options?: SearchWebOptions
): Promise<TavilySearchResult[]> {
  // Check if user has their own API key for direct mode
  const { settings } = useAppStore.getState();
  const userApiKey = settings.externalServicesConsent?.tavilyApiKey;

  if (userApiKey) {
    return searchWebDirect(query, decodeApiKey(userApiKey), options);
  }

  return searchWebViaProxy(query, options);
}

/**
 * Direct search - calls Tavily API directly from browser
 * Used when user provides their own API key
 */
async function searchWebDirect(
  query: string,
  apiKey: string,
  options?: SearchWebOptions
): Promise<TavilySearchResult[]> {
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
        `Tavily API error: ${response.status} - ${errorText}`,
        'API_ERROR'
      );
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    if (error instanceof WebSearchError) {
      throw error;
    }
    throw new WebSearchError(
      `Web search error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'NETWORK_ERROR'
    );
  }
}

/**
 * Proxy search - uses server-side proxy with rate limiting
 * Used when user doesn't have their own API key
 */
async function searchWebViaProxy(
  query: string,
  options?: SearchWebOptions
): Promise<TavilySearchResult[]> {
  try {
    const response = await fetch('/api/search/web', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        searchDepth: options?.searchDepth || 'basic',
        includeDomains: options?.includeDomains || [],
        excludeDomains: options?.excludeDomains || [],
        maxResults: options?.maxResults || 5,
      }),
    });

    const data: ProxyResponse = await response.json();

    if (!response.ok) {
      // Handle rate limiting
      if (response.status === 429) {
        const retryMsg = data.retryAfter
          ? ` Try again in ${data.retryAfter} seconds.`
          : '';
        throw new WebSearchError(
          `${data.error || 'Rate limit exceeded.'}${retryMsg}`,
          data.code === 'DAILY_CAP' ? 'DAILY_CAP' : 'RATE_LIMITED'
        );
      }

      // Handle not configured
      if (response.status === 500 && data.code === 'NOT_CONFIGURED') {
        throw new WebSearchError(
          'Web search service not configured.',
          'NOT_CONFIGURED'
        );
      }

      // Handle other API errors
      throw new WebSearchError(
        data.error || `Web search failed: ${response.status}`,
        'API_ERROR'
      );
    }

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
