/**
 * Smart Context Retrieval Service
 *
 * Provides intelligent context retrieval using multi-query semantic search.
 * Extracts targeted queries from job requirements, skills, and gaps for
 * better matching than single-query approaches.
 *
 * Features:
 * - Multi-query extraction based on feature type
 * - Parallel search execution with deduplication
 * - Feature-specific formatting for AI prompts
 * - Graceful fallback when embeddings unavailable
 *
 * @see contextRetrieval.ts for basic single-query retrieval
 * @see embeddings/index.ts for the embedding system
 */

import {
  semanticSearch,
  isReady as isEmbeddingReady,
  type SimilarityResult,
} from './embeddings';
import { useAppStore } from '../stores/appStore';
import type { Job, ResumeAnalysis, SavedStory, ContextDocument } from '../types';
import {
  gatherCrossJobImprovements,
  formatImprovementsContext,
} from './resumeImprovementExtractor';

// ============================================================================
// Types
// ============================================================================

export type SmartFeatureType =
  | 'coverLetter'
  | 'resumeGrading'
  | 'resumeTailoring'
  | 'interviewPrep'
  | 'refinement';

export interface SmartRetrievalOptions {
  /** The job being worked on */
  job: Job;
  /** Which feature is requesting context */
  feature: SmartFeatureType;
  /** Resume analysis (for tailoring - has gaps/missing keywords) */
  resumeAnalysis?: ResumeAnalysis;
  /** User message (for refinement features) */
  userMessage?: string;
  /** Maximum stories to retrieve total (default: 8) */
  maxStories?: number;
  /** Maximum documents to retrieve (default: 3) */
  maxDocuments?: number;
  /** Similarity threshold (default: 0.35) */
  threshold?: number;
}

export interface SmartRetrievalResult {
  /** Formatted context string for AI prompt */
  context: string;
  /** Stories that were retrieved */
  stories: SavedStory[];
  /** Documents that were retrieved */
  documents: ContextDocument[];
  /** Whether semantic search was used */
  usedSemanticSearch: boolean;
  /** Debug info: queries that were executed */
  queriesUsed: Array<{ query: string; source: string }>;
}

// ============================================================================
// Query Extraction
// ============================================================================

interface QueryWithSource {
  query: string;
  source: string;
}

/**
 * Extract targeted queries based on feature type and available data.
 */
function extractQueries(options: SmartRetrievalOptions): QueryWithSource[] {
  const { job, feature, resumeAnalysis, userMessage } = options;
  const queries: QueryWithSource[] = [];

  switch (feature) {
    case 'coverLetter':
      // Search for stories matching requirements and key skills
      if (job.summary?.requirements) {
        job.summary.requirements.slice(0, 5).forEach((req) => {
          queries.push({ query: req, source: 'requirement' });
        });
      }
      if (job.summary?.keySkills) {
        job.summary.keySkills.slice(0, 5).forEach((skill) => {
          queries.push({ query: skill, source: 'skill' });
        });
      }
      // Add role context
      if (job.title) {
        queries.push({
          query: `${job.title} ${job.summary?.level || ''} experience`,
          source: 'role',
        });
      }
      break;

    case 'resumeGrading':
      // For initial grading, use JD requirements to find relevant context
      if (job.summary?.requirements) {
        job.summary.requirements.slice(0, 5).forEach((req) => {
          queries.push({ query: req, source: 'requirement' });
        });
      }
      // Add key skills
      if (job.summary?.keySkills) {
        job.summary.keySkills.slice(0, 3).forEach((skill) => {
          queries.push({ query: skill, source: 'skill' });
        });
      }
      break;

    case 'resumeTailoring':
      // Focus on gaps and missing keywords
      if (resumeAnalysis?.gaps) {
        resumeAnalysis.gaps.forEach((gap) => {
          queries.push({ query: gap, source: 'gap' });
        });
      }
      if (resumeAnalysis?.missingKeywords) {
        resumeAnalysis.missingKeywords.slice(0, 5).forEach((keyword) => {
          queries.push({ query: keyword, source: 'missingKeyword' });
        });
      }
      // Also include some suggestions
      if (resumeAnalysis?.suggestions) {
        resumeAnalysis.suggestions.slice(0, 3).forEach((suggestion) => {
          queries.push({ query: suggestion, source: 'suggestion' });
        });
      }
      break;

    case 'interviewPrep':
      // Search for relevant interview experiences
      queries.push({
        query: `${job.title} interview preparation`,
        source: 'interviewPrep',
      });
      // Add requirements as potential interview topics
      if (job.summary?.requirements) {
        job.summary.requirements.slice(0, 5).forEach((req) => {
          queries.push({ query: req, source: 'requirement' });
        });
      }
      // Add key skills
      if (job.summary?.keySkills) {
        job.summary.keySkills.slice(0, 3).forEach((skill) => {
          queries.push({ query: `${skill} experience`, source: 'skill' });
        });
      }
      break;

    case 'refinement':
      // Use user message as primary query
      if (userMessage && userMessage.length > 10) {
        queries.push({ query: userMessage, source: 'userMessage' });
      }
      // Add some requirement context for backup
      if (job.summary?.requirements) {
        job.summary.requirements.slice(0, 3).forEach((req) => {
          queries.push({ query: req, source: 'requirement' });
        });
      }
      break;
  }

  // Fallback: if no queries extracted, use JD text
  if (queries.length === 0 && job.jdText) {
    // Use first 500 chars of JD as fallback query
    queries.push({
      query: job.jdText.slice(0, 500),
      source: 'jdFallback',
    });
  }

  return queries;
}

// ============================================================================
// Multi-Query Search
// ============================================================================

interface DeduplicatedResult {
  result: SimilarityResult;
  sources: string[];
  bestScore: number;
}

/**
 * Run multiple semantic searches in parallel and deduplicate results.
 */
async function runMultiQuerySearch(
  queries: QueryWithSource[],
  options: { limitPerQuery: number; threshold: number }
): Promise<Map<string, DeduplicatedResult>> {
  const { limitPerQuery, threshold } = options;

  // Run all queries in parallel
  const searchPromises = queries.map(async ({ query, source }) => {
    try {
      const results = await semanticSearch(query, {
        limit: limitPerQuery,
        threshold,
        entityTypes: ['story', 'doc'],
      });
      return { results, source };
    } catch (error) {
      console.warn(`[SmartRetrieval] Search failed for query "${query}":`, error);
      return { results: [], source };
    }
  });

  const allResults = await Promise.all(searchPromises);

  // Deduplicate by entity ID, keeping track of all sources and best score
  const deduped = new Map<string, DeduplicatedResult>();

  for (const { results, source } of allResults) {
    for (const result of results) {
      const key = `${result.record.entityType}:${result.record.entityId}`;
      const existing = deduped.get(key);

      if (!existing) {
        deduped.set(key, {
          result,
          sources: [source],
          bestScore: result.score,
        });
      } else {
        // Add source if not already present
        if (!existing.sources.includes(source)) {
          existing.sources.push(source);
        }
        // Update best score
        if (result.score > existing.bestScore) {
          existing.result = result;
          existing.bestScore = result.score;
        }
      }
    }
  }

  return deduped;
}

// ============================================================================
// Result Processing
// ============================================================================

/**
 * Convert search results to stories and documents.
 */
function processResults(
  results: Map<string, DeduplicatedResult>,
  maxStories: number,
  maxDocuments: number
): { stories: SavedStory[]; documents: ContextDocument[] } {
  const state = useAppStore.getState();

  const stories: SavedStory[] = [];
  const documents: ContextDocument[] = [];

  // Sort by best score (descending)
  const sortedResults = Array.from(results.values()).sort(
    (a, b) => b.bestScore - a.bestScore
  );

  for (const { result } of sortedResults) {
    if (result.record.entityType === 'story' && stories.length < maxStories) {
      const story = state.settings.savedStories?.find(
        (s) => s.id === result.record.entityId
      );
      if (story) {
        stories.push(story);
      }
    } else if (result.record.entityType === 'doc' && documents.length < maxDocuments) {
      const doc = state.settings.contextDocuments?.find(
        (d) => d.id === result.record.entityId
      );
      if (doc) {
        documents.push(doc);
      }
    }
  }

  return { stories, documents };
}

// ============================================================================
// Formatting
// ============================================================================

/**
 * Format retrieved context for AI prompts.
 * Feature-specific formatting to highlight relevance.
 */
function formatSmartContext(
  stories: SavedStory[],
  documents: ContextDocument[],
  feature: SmartFeatureType,
  additionalContext?: string,
  improvementsContext?: string
): string {
  const sections: string[] = [];

  // Add stories section
  if (stories.length > 0) {
    let heading = '## Relevant Experiences';
    if (feature === 'resumeTailoring') {
      heading = '## Experiences That Could Address Gaps';
    } else if (feature === 'interviewPrep') {
      heading = '## Relevant Interview Examples';
    } else if (feature === 'coverLetter') {
      heading = '## Relevant Experiences to Highlight';
    }

    const storiesText = stories
      .map((s) => `**${s.question}**\n${s.answer}`)
      .join('\n\n');
    sections.push(`${heading}\n\n${storiesText}`);
  }

  // Add documents section
  if (documents.length > 0) {
    const docsText = documents
      .map((d) => {
        const content = d.useSummary && d.summary ? d.summary : d.fullText;
        return `### ${d.name}\n${content}`;
      })
      .join('\n\n');
    sections.push(`## Reference Documents\n\n${docsText}`);
  }

  // Add improvements from previous tailoring (for resume tailoring only)
  if (improvementsContext?.trim()) {
    sections.push(improvementsContext);
  }

  // Add additional context if provided
  if (additionalContext?.trim()) {
    sections.push(`## Additional Context\n\n${additionalContext}`);
  }

  if (sections.length === 0) {
    return '';
  }

  return '\n\n---\n\n' + sections.join('\n\n---\n\n');
}

// ============================================================================
// Fallback
// ============================================================================

/**
 * Fallback when embeddings aren't available: return recent items.
 */
function getFallbackContext(
  maxStories: number,
  maxDocuments: number
): { stories: SavedStory[]; documents: ContextDocument[] } {
  const state = useAppStore.getState();

  const stories = (state.settings.savedStories || [])
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, maxStories);

  const documents = (state.settings.contextDocuments || [])
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, maxDocuments);

  return { stories, documents };
}

// ============================================================================
// Main Export
// ============================================================================

/**
 * Build smart context for AI prompts using multi-query semantic search.
 *
 * This function:
 * 1. Extracts targeted queries based on feature type
 * 2. Runs parallel semantic searches
 * 3. Deduplicates and ranks results
 * 4. Formats for AI consumption
 *
 * @param options - Retrieval options including job, feature type, etc.
 * @returns Context string and metadata
 */
export async function buildSmartContext(
  options: SmartRetrievalOptions
): Promise<SmartRetrievalResult> {
  const {
    job,
    feature,
    maxStories = 8,
    maxDocuments = 3,
    threshold = 0.35,
  } = options;

  // Get additional context from settings
  const state = useAppStore.getState();
  const additionalContext = state.settings.additionalContext;

  // For resume tailoring, gather improvements from other tailored resumes
  let improvementsContext = '';
  if (feature === 'resumeTailoring' || feature === 'refinement') {
    const improvements = gatherCrossJobImprovements(
      job.id,
      state.jobs,
      state.settings.defaultResumeText || ''
    );
    if (improvements.length > 0) {
      improvementsContext = formatImprovementsContext(improvements);
    }
  }

  // Extract queries based on feature
  const queries = extractQueries(options);

  // Check if embeddings are available
  if (!isEmbeddingReady() || queries.length === 0) {
    // Fallback to recent items
    const { stories, documents } = getFallbackContext(maxStories, maxDocuments);
    const context = formatSmartContext(
      stories,
      documents,
      feature,
      additionalContext,
      improvementsContext
    );

    return {
      context,
      stories,
      documents,
      usedSemanticSearch: false,
      queriesUsed: queries,
    };
  }

  try {
    // Run multi-query search
    const results = await runMultiQuerySearch(queries, {
      limitPerQuery: 3,
      threshold,
    });

    // Process results
    const { stories, documents } = processResults(results, maxStories, maxDocuments);

    // Format for AI
    const context = formatSmartContext(
      stories,
      documents,
      feature,
      additionalContext,
      improvementsContext
    );

    return {
      context,
      stories,
      documents,
      usedSemanticSearch: true,
      queriesUsed: queries,
    };
  } catch (error) {
    console.warn('[SmartRetrieval] Multi-query search failed, using fallback:', error);
    const { stories, documents } = getFallbackContext(maxStories, maxDocuments);
    const context = formatSmartContext(
      stories,
      documents,
      feature,
      additionalContext,
      improvementsContext
    );

    return {
      context,
      stories,
      documents,
      usedSemanticSearch: false,
      queriesUsed: queries,
    };
  }
}

/**
 * Convenience function that returns just the context string.
 * Use this in AI functions that only need the formatted context.
 */
export async function getSmartContext(
  options: SmartRetrievalOptions
): Promise<string> {
  const result = await buildSmartContext(options);
  return result.context;
}
