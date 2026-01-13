/**
 * Vector Store
 *
 * Provides in-memory vector similarity search using cosine similarity.
 * Embeddings are loaded from IndexedDB and cached in memory for fast queries.
 *
 * Architecture:
 * - Embeddings are persisted in IndexedDB (via db.ts)
 * - This store maintains an in-memory cache for fast similarity search
 * - Cache is synchronized with DB on startup and after changes
 *
 * Why in-memory search?
 * - IndexedDB doesn't support vector similarity queries
 * - For typical job hunt data (20-100 jobs), in-memory is fast enough
 * - Avoids external dependencies like FAISS or voy
 *
 * @see ../db.ts for persistence layer
 */

import {
  getAllEmbeddings,
  saveEmbedding,
  saveEmbeddings,
  deleteEmbedding,
  deleteEmbeddingsByEntity,
  deleteEmbeddingsByJob,
  clearAllEmbeddings,
  generateEmbeddingId,
} from '../db';
import type {
  EmbeddingRecord,
  EmbeddableEntityType,
  SimilarityResult,
  SemanticSearchOptions,
} from '../../types';

// ============================================================================
// In-Memory Cache
// ============================================================================

/**
 * In-memory cache of all embeddings for fast similarity search.
 * Kept in sync with IndexedDB.
 */
const embeddingCache: Map<string, EmbeddingRecord> = new Map();

/**
 * Whether the cache has been loaded from the database.
 */
let cacheLoaded = false;

// ============================================================================
// Math Utilities
// ============================================================================

/**
 * Compute cosine similarity between two vectors.
 * Returns a value between -1 and 1 (higher = more similar).
 *
 * For normalized vectors (which our embeddings are), this simplifies to dot product.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  // Handle zero vectors
  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Load all embeddings from IndexedDB into memory.
 * Called once on startup.
 */
export async function loadCache(): Promise<void> {
  const embeddings = await getAllEmbeddings();
  embeddingCache.clear();
  for (const record of embeddings) {
    embeddingCache.set(record.id, record);
  }
  cacheLoaded = true;
  console.log(`[VectorStore] Loaded ${embeddings.length} embeddings into cache`);
}

/**
 * Check if cache is loaded.
 */
export function isCacheLoaded(): boolean {
  return cacheLoaded;
}

/**
 * Ensure cache is loaded before operations.
 */
async function ensureCache(): Promise<void> {
  if (!cacheLoaded) {
    await loadCache();
  }
}

/**
 * Get the current cache size.
 */
export function getCacheSize(): number {
  return embeddingCache.size;
}

// ============================================================================
// CRUD Operations (with cache sync)
// ============================================================================

/**
 * Add or update an embedding in both DB and cache.
 */
export async function upsertEmbedding(record: EmbeddingRecord): Promise<void> {
  await saveEmbedding(record);
  embeddingCache.set(record.id, record);
}

/**
 * Add or update multiple embeddings in batch.
 */
export async function upsertEmbeddings(records: EmbeddingRecord[]): Promise<void> {
  await saveEmbeddings(records);
  for (const record of records) {
    embeddingCache.set(record.id, record);
  }
}

/**
 * Remove an embedding by ID.
 */
export async function removeEmbedding(id: string): Promise<void> {
  await deleteEmbedding(id);
  embeddingCache.delete(id);
}

/**
 * Remove all embeddings for an entity (including all chunks).
 */
export async function removeEmbeddingsByEntity(
  entityType: EmbeddableEntityType,
  entityId: string
): Promise<void> {
  // Find all cache entries for this entity (may have multiple chunks)
  const idsToRemove: string[] = [];
  for (const [id, record] of embeddingCache) {
    if (record.entityType === entityType && record.entityId === entityId) {
      idsToRemove.push(id);
    }
  }

  // Delete from DB (handles all chunks via compound index)
  await deleteEmbeddingsByEntity(entityType, entityId);

  // Remove from cache
  for (const id of idsToRemove) {
    embeddingCache.delete(id);
  }
}

/**
 * Remove all embeddings for a job and its related content.
 */
export async function removeEmbeddingsForJob(jobId: string): Promise<void> {
  // Get all IDs that will be removed
  const idsToRemove: string[] = [];
  for (const [id, record] of embeddingCache) {
    if (
      (record.entityType === 'job' && record.entityId === jobId) ||
      record.parentJobId === jobId
    ) {
      idsToRemove.push(id);
    }
  }

  await deleteEmbeddingsByJob(jobId);
  for (const id of idsToRemove) {
    embeddingCache.delete(id);
  }
}

/**
 * Clear all embeddings (DB and cache).
 */
export async function clearAll(): Promise<void> {
  await clearAllEmbeddings();
  embeddingCache.clear();
}

/**
 * Get total count of embeddings.
 */
export async function getCount(): Promise<number> {
  await ensureCache();
  return embeddingCache.size;
}

/**
 * Check if an embedding exists for an entity.
 * For chunked entities, checks if the first chunk (index 0) exists.
 */
export async function hasEmbedding(
  entityType: EmbeddableEntityType,
  entityId: string
): Promise<boolean> {
  await ensureCache();
  // Try both with and without chunk index (for backwards compatibility)
  const idWithChunk = generateEmbeddingId(entityType, entityId, 0);
  const idWithoutChunk = generateEmbeddingId(entityType, entityId);
  return embeddingCache.has(idWithChunk) || embeddingCache.has(idWithoutChunk);
}

/**
 * Get an embedding by entity type and ID.
 * For chunked entities, returns the first chunk (index 0).
 */
export async function getEmbedding(
  entityType: EmbeddableEntityType,
  entityId: string
): Promise<EmbeddingRecord | undefined> {
  await ensureCache();
  // Try both with and without chunk index (for backwards compatibility)
  const idWithChunk = generateEmbeddingId(entityType, entityId, 0);
  const idWithoutChunk = generateEmbeddingId(entityType, entityId);
  return embeddingCache.get(idWithChunk) || embeddingCache.get(idWithoutChunk);
}

/**
 * Get text hash for change detection.
 * Returns hash from first chunk (all chunks share the same hash).
 */
export async function getTextHash(
  entityType: EmbeddableEntityType,
  entityId: string
): Promise<string | undefined> {
  const record = await getEmbedding(entityType, entityId);
  return record?.textHash;
}

// ============================================================================
// Similarity Search
// ============================================================================

/**
 * Find similar embeddings to a query vector.
 * Deduplicates results from chunked entities - returns only the best chunk per entity.
 *
 * @param queryEmbedding - The query vector (384 dimensions)
 * @param options - Search options (limit, threshold, filters)
 * @returns Array of results sorted by similarity (highest first)
 */
export async function findSimilar(
  queryEmbedding: number[],
  options: SemanticSearchOptions = {}
): Promise<SimilarityResult[]> {
  await ensureCache();

  const {
    limit = 5,
    threshold = 0.3,
    entityTypes,
    jobId,
  } = options;

  // Map to track best score per entity (for chunk deduplication)
  // Key: entityType:entityId
  const bestPerEntity = new Map<string, SimilarityResult>();

  for (const record of embeddingCache.values()) {
    // Apply entity type filter
    if (entityTypes && !entityTypes.includes(record.entityType)) {
      continue;
    }

    // Apply job scope filter
    if (jobId) {
      const isJobMatch = record.entityType === 'job' && record.entityId === jobId;
      const isRelatedMatch = record.parentJobId === jobId;
      if (!isJobMatch && !isRelatedMatch) {
        continue;
      }
    }

    // Calculate similarity
    const score = cosineSimilarity(queryEmbedding, record.embedding);

    // Apply threshold filter
    if (score >= threshold) {
      // Deduplicate chunks: keep only the best scoring chunk per entity
      const entityKey = `${record.entityType}:${record.entityId}`;
      const existing = bestPerEntity.get(entityKey);

      if (!existing || score > existing.score) {
        bestPerEntity.set(entityKey, { record, score });
      }
    }
  }

  // Convert to array, sort by score descending and limit results
  const results = Array.from(bestPerEntity.values());
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

/**
 * Find embeddings similar to an existing entity.
 * Useful for "Find Similar Jobs" feature.
 *
 * @param entityType - Type of the source entity
 * @param entityId - ID of the source entity
 * @param options - Search options
 * @returns Similar items (excluding the source entity)
 */
export async function findSimilarToEntity(
  entityType: EmbeddableEntityType,
  entityId: string,
  options: SemanticSearchOptions = {}
): Promise<SimilarityResult[]> {
  const sourceRecord = await getEmbedding(entityType, entityId);
  if (!sourceRecord) {
    return [];
  }

  // Find similar, then exclude the source entity
  const results = await findSimilar(sourceRecord.embedding, {
    ...options,
    limit: (options.limit ?? 5) + 1, // Get one extra to account for self
  });

  // Filter out the source entity (by entityType+entityId, not just ID, to handle chunks)
  return results
    .filter((r) => !(r.record.entityType === entityType && r.record.entityId === entityId))
    .slice(0, options.limit ?? 5);
}

// ============================================================================
// Batch Operations for Indexing
// ============================================================================

/**
 * Get all entities that need embedding or re-embedding.
 * Compares text hashes to detect changes.
 *
 * @param entities - Array of {type, id, textHash} to check
 * @returns Array of entities that need (re)embedding
 */
export async function findStaleEntities(
  entities: Array<{
    entityType: EmbeddableEntityType;
    entityId: string;
    currentHash: string;
  }>
): Promise<Array<{ entityType: EmbeddableEntityType; entityId: string }>> {
  await ensureCache();

  const stale: Array<{ entityType: EmbeddableEntityType; entityId: string }> = [];

  for (const entity of entities) {
    const id = generateEmbeddingId(entity.entityType, entity.entityId);
    const existing = embeddingCache.get(id);

    if (!existing || existing.textHash !== entity.currentHash) {
      stale.push({
        entityType: entity.entityType,
        entityId: entity.entityId,
      });
    }
  }

  return stale;
}

/**
 * Get statistics about the vector store.
 */
export async function getStats(): Promise<{
  total: number;
  byType: Record<EmbeddableEntityType, number>;
}> {
  await ensureCache();

  const byType: Record<EmbeddableEntityType, number> = {
    job: 0,
    story: 0,
    qa: 0,
    note: 0,
    doc: 0,
    coverLetter: 0,
  };

  for (const record of embeddingCache.values()) {
    byType[record.entityType]++;
  }

  return {
    total: embeddingCache.size,
    byType,
  };
}
