/**
 * Embeddings Module - Public API
 *
 * This module provides client-side semantic search using transformers.js.
 * Embeddings are generated locally in the browser using Web Workers.
 *
 * ## Architecture Overview
 *
 * ```
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │                        Embeddings Module                            │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │                                                                     │
 * │  ┌─────────────────┐    ┌─────────────────┐    ┌────────────────┐  │
 * │  │ embeddingStore  │    │embeddingService │    │  vectorStore   │  │
 * │  │   (Zustand)     │───▶│   (Worker API)  │───▶│  (In-Memory)   │  │
 * │  │                 │    │                 │    │                │  │
 * │  │ • UI state      │    │ • Text extract  │    │ • Similarity   │  │
 * │  │ • Progress      │    │ • Worker comm   │    │ • Cache sync   │  │
 * │  │ • Actions       │    │ • Batch ops     │    │ • Persistence  │  │
 * │  └─────────────────┘    └────────┬────────┘    └────────┬───────┘  │
 * │                                  │                      │          │
 * │                         ┌────────▼────────┐    ┌────────▼───────┐  │
 * │                         │embedding.worker │    │    IndexedDB   │  │
 * │                         │ (Web Worker)    │    │   (Dexie v2)   │  │
 * │                         │                 │    │                │  │
 * │                         │ • transformers  │    │ • embeddings   │  │
 * │                         │ • Model cache   │    │   table        │  │
 * │                         └─────────────────┘    └────────────────┘  │
 * │                                                                     │
 * └─────────────────────────────────────────────────────────────────────┘
 * ```
 *
 * ## Quick Start
 *
 * ```ts
 * import { useEmbeddingStore, semanticSearch, findSimilarJobs } from './embeddings';
 *
 * // In a React component - observe status
 * const { isReady, isLoading, progress, stage } = useEmbeddingStore();
 *
 * // Initialize (lazy - downloads ~40MB model on first use)
 * await useEmbeddingStore.getState().initialize();
 *
 * // Search for relevant content
 * const results = await semanticSearch('project management experience');
 *
 * // Find similar jobs
 * const similar = await findSimilarJobs(jobId);
 * ```
 *
 * ## Entity Types
 *
 * The system indexes these content types:
 * - `job` - Job descriptions (jdText)
 * - `story` - Saved stories from settings
 * - `qa` - Q&A history entries from jobs
 * - `note` - Notes from jobs
 * - `doc` - Context documents from settings
 * - `coverLetter` - Generated cover letters
 *
 * ## Adding New Embeddable Types
 *
 * 1. Add type to `EmbeddableEntityType` in types/index.ts
 * 2. Add text extraction in embeddingService.ts
 * 3. Add indexing trigger in appStore.ts
 * 4. Update indexAll() to include new type
 *
 * @module embeddings
 */

// ============================================================================
// Store - UI State Management
// ============================================================================

export {
  useEmbeddingStore,
  selectEmbeddingStatus,
  selectIndexingProgress,
} from './embeddingStore';

// ============================================================================
// Service - Core Embedding Operations
// ============================================================================

export {
  // Initialization
  initialize,
  isReady,
  terminate,

  // Text extraction (useful for debugging/display)
  extractJobText,
  extractStoryText,
  extractQAText,
  extractNoteText,
  extractDocumentText,
  extractCoverLetterText,

  // Embedding generation
  embedText,
  embedJob,
  embedStory,
  embedQA,
  embedNote,
  embedDocument,
  embedCoverLetter,

  // Batch operations
  indexAll,

  // Constants
  EMBEDDING_DIMENSIONS,
} from './embeddingService';

// ============================================================================
// Vector Store - Similarity Search
// ============================================================================

export {
  // Search
  findSimilar,
  findSimilarToEntity,
  cosineSimilarity,

  // Cache management
  loadCache,
  isCacheLoaded,
  getCacheSize,

  // CRUD (with cache sync)
  upsertEmbedding,
  upsertEmbeddings,
  removeEmbedding,
  removeEmbeddingsByEntity,
  removeEmbeddingsForJob,
  clearAll,

  // Queries
  hasEmbedding,
  getEmbedding,
  getTextHash,
  getCount,
  getStats,

  // Batch utilities
  findStaleEntities,
} from './vectorStore';

// ============================================================================
// Convenience Functions
// ============================================================================

import { embedText } from './embeddingService';
import { findSimilar, findSimilarToEntity } from './vectorStore';
import type { SimilarityResult, SemanticSearchOptions } from '../../types';

/**
 * Perform a semantic search across all indexed content.
 *
 * @param query - Natural language query
 * @param options - Search options (limit, threshold, filters)
 * @returns Array of similar items with scores
 *
 * @example
 * ```ts
 * const results = await semanticSearch('experience with React and TypeScript');
 * for (const { record, score } of results) {
 *   console.log(`${record.entityType}:${record.entityId} - ${score.toFixed(3)}`);
 * }
 * ```
 */
export async function semanticSearch(
  query: string,
  options?: SemanticSearchOptions
): Promise<SimilarityResult[]> {
  const queryEmbedding = await embedText(query);
  return findSimilar(queryEmbedding, options);
}

/**
 * Find jobs similar to a given job.
 *
 * @param jobId - ID of the source job
 * @param limit - Maximum number of results (default: 5)
 * @returns Array of similar jobs with scores
 *
 * @example
 * ```ts
 * const similar = await findSimilarJobs('job-123');
 * for (const { record, score } of similar) {
 *   console.log(`Job ${record.entityId} - ${(score * 100).toFixed(1)}% similar`);
 * }
 * ```
 */
export async function findSimilarJobs(
  jobId: string,
  limit = 5
): Promise<SimilarityResult[]> {
  return findSimilarToEntity('job', jobId, {
    limit,
    entityTypes: ['job'],
  });
}

/**
 * Search within a specific job's content (notes, Q&A, cover letter).
 *
 * @param query - Natural language query
 * @param jobId - ID of the job to search within
 * @param options - Additional search options
 * @returns Array of matching content with scores
 */
export async function searchWithinJob(
  query: string,
  jobId: string,
  options?: Omit<SemanticSearchOptions, 'jobId'>
): Promise<SimilarityResult[]> {
  const queryEmbedding = await embedText(query);
  return findSimilar(queryEmbedding, { ...options, jobId });
}

/**
 * Search saved stories for relevant experiences.
 *
 * @param query - Natural language query (e.g., "leadership experience")
 * @param limit - Maximum number of results
 * @returns Array of matching stories with scores
 */
export async function searchStories(
  query: string,
  limit = 5
): Promise<SimilarityResult[]> {
  const queryEmbedding = await embedText(query);
  return findSimilar(queryEmbedding, {
    limit,
    entityTypes: ['story'],
  });
}

/**
 * Search Q&A history across all jobs.
 *
 * @param query - Natural language query
 * @param limit - Maximum number of results
 * @returns Array of matching Q&A entries with scores
 */
export async function searchQAHistory(
  query: string,
  limit = 10
): Promise<SimilarityResult[]> {
  const queryEmbedding = await embedText(query);
  return findSimilar(queryEmbedding, {
    limit,
    entityTypes: ['qa'],
  });
}

// ============================================================================
// Re-export Types
// ============================================================================

export type {
  EmbeddableEntityType,
  EmbeddingRecord,
  EmbeddingStatus,
  SimilarityResult,
  SemanticSearchOptions,
} from '../../types';

export type { IndexingProgress, ProgressCallback } from './embeddingService';
