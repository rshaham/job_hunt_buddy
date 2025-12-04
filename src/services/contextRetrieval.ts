/**
 * Context Retrieval Service
 *
 * Provides intelligent context retrieval for AI prompts using semantic search.
 * Replaces the old "return all context" approach with targeted retrieval.
 *
 * This service:
 * - Uses embeddings to find semantically relevant content
 * - Falls back gracefully when embeddings aren't available
 * - Formats retrieved content for AI consumption
 *
 * @see embeddings/index.ts for the embedding system
 * @see ai.ts for AI service integration
 */

import {
  semanticSearch,
  searchStories,
  searchQAHistory,
  isReady as isEmbeddingReady,
  type SimilarityResult,
} from './embeddings';
import { useAppStore } from '../stores/appStore';
import type { SavedStory, ContextDocument, QAEntry } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface RetrievedContext {
  /** Relevant saved stories */
  stories: SavedStory[];
  /** Relevant Q&A history (from any job) */
  qaEntries: Array<{ qa: QAEntry; jobTitle: string; company: string }>;
  /** Relevant context documents */
  documents: ContextDocument[];
  /** Whether semantic search was used (vs fallback) */
  usedSemanticSearch: boolean;
}

export interface RetrievalOptions {
  /** Maximum stories to retrieve (default: 3) */
  maxStories?: number;
  /** Maximum Q&A entries to retrieve (default: 5) */
  maxQA?: number;
  /** Maximum documents to retrieve (default: 2) */
  maxDocuments?: number;
  /** Minimum similarity score (default: 0.35) */
  threshold?: number;
  /** Whether to include job-specific context (default: true) */
  includeJobContext?: boolean;
}

// ============================================================================
// Main Retrieval Functions
// ============================================================================

/**
 * Retrieve relevant context for an AI prompt.
 *
 * Uses semantic search when embeddings are available, otherwise
 * falls back to returning all context (legacy behavior).
 *
 * @param query - The user's question or prompt
 * @param options - Retrieval options
 * @returns Retrieved context items
 */
export async function retrieveRelevantContext(
  query: string,
  options: RetrievalOptions = {}
): Promise<RetrievedContext> {
  const {
    maxStories = 3,
    maxQA = 5,
    maxDocuments = 2,
    threshold = 0.35,
  } = options;

  // Check if embeddings are available
  if (!isEmbeddingReady()) {
    // Fallback to returning all context (legacy behavior)
    return getFallbackContext(maxStories, maxQA, maxDocuments);
  }

  try {
    // Run semantic searches in parallel
    const [storyResults, qaResults, docResults] = await Promise.all([
      searchStories(query, maxStories),
      searchQAHistory(query, maxQA),
      semanticSearch(query, {
        limit: maxDocuments,
        threshold,
        entityTypes: ['doc'],
      }),
    ]);

    // Convert results to context items
    const context = await resultsToContext(storyResults, qaResults, docResults, threshold);
    context.usedSemanticSearch = true;

    return context;
  } catch (error) {
    console.warn('[ContextRetrieval] Semantic search failed, using fallback:', error);
    return getFallbackContext(maxStories, maxQA, maxDocuments);
  }
}

/**
 * Retrieve context relevant to a specific job.
 *
 * @param jobId - The job to get context for
 * @param query - Optional query to focus the retrieval
 * @param options - Retrieval options
 */
export async function retrieveJobContext(
  jobId: string,
  query?: string,
  options: RetrievalOptions = {}
): Promise<RetrievedContext> {
  const state = useAppStore.getState();
  const job = state.jobs.find((j) => j.id === jobId);

  if (!job) {
    return {
      stories: [],
      qaEntries: [],
      documents: [],
      usedSemanticSearch: false,
    };
  }

  // If no query, use job description as context
  const searchQuery = query || `${job.title} at ${job.company}`;

  return retrieveRelevantContext(searchQuery, options);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert search results to context items.
 */
async function resultsToContext(
  storyResults: SimilarityResult[],
  qaResults: SimilarityResult[],
  docResults: SimilarityResult[],
  threshold: number
): Promise<RetrievedContext> {
  const state = useAppStore.getState();

  // Get stories
  const stories: SavedStory[] = [];
  for (const result of storyResults) {
    if (result.score < threshold) continue;
    const story = state.settings.savedStories?.find((s) => s.id === result.record.entityId);
    if (story) {
      stories.push(story);
    }
  }

  // Get Q&A entries with job info
  const qaEntries: Array<{ qa: QAEntry; jobTitle: string; company: string }> = [];
  for (const result of qaResults) {
    if (result.score < threshold) continue;
    // Find the job that contains this Q&A
    for (const job of state.jobs) {
      const qa = job.qaHistory.find((q) => q.id === result.record.entityId);
      if (qa) {
        qaEntries.push({
          qa,
          jobTitle: job.title,
          company: job.company,
        });
        break;
      }
    }
  }

  // Get documents
  const documents: ContextDocument[] = [];
  for (const result of docResults) {
    if (result.score < threshold) continue;
    const doc = state.settings.contextDocuments?.find((d) => d.id === result.record.entityId);
    if (doc) {
      documents.push(doc);
    }
  }

  return {
    stories,
    qaEntries,
    documents,
    usedSemanticSearch: true,
  };
}

/**
 * Fallback: return limited amount of all context when embeddings unavailable.
 */
function getFallbackContext(
  maxStories: number,
  maxQA: number,
  maxDocuments: number
): RetrievedContext {
  const state = useAppStore.getState();

  // Get most recent stories
  const stories = (state.settings.savedStories || [])
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, maxStories);

  // Get most recent Q&A entries across all jobs
  const allQA: Array<{ qa: QAEntry; jobTitle: string; company: string }> = [];
  for (const job of state.jobs) {
    for (const qa of job.qaHistory) {
      if (qa.answer) {
        allQA.push({
          qa,
          jobTitle: job.title,
          company: job.company,
        });
      }
    }
  }
  const qaEntries = allQA
    .sort((a, b) => new Date(b.qa.timestamp).getTime() - new Date(a.qa.timestamp).getTime())
    .slice(0, maxQA);

  // Get most recent documents
  const documents = (state.settings.contextDocuments || [])
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, maxDocuments);

  return {
    stories,
    qaEntries,
    documents,
    usedSemanticSearch: false,
  };
}

// ============================================================================
// Formatting for AI Consumption
// ============================================================================

/**
 * Format retrieved context as a string for AI prompts.
 */
export function formatContextForPrompt(context: RetrievedContext): string {
  const sections: string[] = [];

  // Stories
  if (context.stories.length > 0) {
    const storiesText = context.stories
      .map((s) => `**${s.question}**\n${s.answer}`)
      .join('\n\n');
    sections.push(`## Relevant Experiences\n${storiesText}`);
  }

  // Q&A History
  if (context.qaEntries.length > 0) {
    const qaText = context.qaEntries
      .map((e) => `**Q (${e.company} - ${e.jobTitle}):** ${e.qa.question}\n**A:** ${e.qa.answer}`)
      .join('\n\n');
    sections.push(`## Previous Q&A\n${qaText}`);
  }

  // Documents
  if (context.documents.length > 0) {
    const docsText = context.documents
      .map((d) => {
        const content = d.useSummary && d.summary ? d.summary : d.fullText;
        return `### ${d.name}\n${content}`;
      })
      .join('\n\n');
    sections.push(`## Reference Documents\n${docsText}`);
  }

  if (sections.length === 0) {
    return '';
  }

  return sections.join('\n\n---\n\n');
}

/**
 * Build context string for AI prompts using semantic retrieval.
 *
 * This is the main function to use in AI prompts. It:
 * 1. Retrieves relevant context using embeddings
 * 2. Formats it for the AI
 * 3. Falls back gracefully if embeddings unavailable
 *
 * @param query - The user's question/prompt
 * @param options - Retrieval options
 * @returns Formatted context string (or empty if no relevant context)
 */
export async function buildRelevantContext(
  query: string,
  options?: RetrievalOptions
): Promise<string> {
  const context = await retrieveRelevantContext(query, options);
  return formatContextForPrompt(context);
}
