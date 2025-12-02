/**
 * Worker Types for Embedding System
 *
 * This file defines the message protocol between the main thread and the
 * embedding Web Worker. All communication happens via postMessage with
 * typed messages for type safety.
 *
 * Architecture:
 * - Main thread sends requests (WorkerRequest)
 * - Worker responds with results (WorkerResponse)
 * - Each request has a unique `id` for correlation
 */

// ============================================================================
// Entity Types - What can be embedded
// ============================================================================

/**
 * Types of content that can be embedded.
 * Each type maps to a specific data source in the application.
 */
export type EmbeddableEntityType =
  | 'job'           // Job descriptions (job.jdText)
  | 'story'         // Saved stories (settings.savedStories)
  | 'qa'            // Q&A history entries (job.qaHistory)
  | 'note'          // Job notes (job.notes)
  | 'doc'           // Context documents (settings.contextDocuments)
  | 'coverLetter';  // Generated cover letters (job.coverLetter)

// ============================================================================
// Request Types - Main thread → Worker
// ============================================================================

/**
 * Request to initialize the embedding model.
 * This triggers the 40MB model download on first use.
 */
export interface InitModelRequest {
  type: 'INIT_MODEL';
  id: string;
}

/**
 * Request to embed a single piece of text.
 */
export interface EmbedTextRequest {
  type: 'EMBED_TEXT';
  id: string;
  text: string;
  entityType: EmbeddableEntityType;
  entityId: string;
}

/**
 * Request to embed multiple texts in batch.
 * More efficient than individual requests.
 */
export interface EmbedBatchRequest {
  type: 'EMBED_BATCH';
  id: string;
  items: Array<{
    text: string;
    entityType: EmbeddableEntityType;
    entityId: string;
  }>;
}

/**
 * Union of all request types
 */
export type WorkerRequest =
  | InitModelRequest
  | EmbedTextRequest
  | EmbedBatchRequest;

// ============================================================================
// Response Types - Worker → Main thread
// ============================================================================

/**
 * Progress update during model download/initialization.
 */
export interface ModelProgressResponse {
  type: 'MODEL_PROGRESS';
  id: string;
  stage: 'download' | 'load' | 'ready';
  progress: number;  // 0-100
  loaded?: number;   // Bytes loaded (for download stage)
  total?: number;    // Total bytes (for download stage)
}

/**
 * Model is ready to generate embeddings.
 */
export interface ModelReadyResponse {
  type: 'MODEL_READY';
  id: string;
}

/**
 * Single embedding result.
 */
export interface EmbeddingResultResponse {
  type: 'EMBEDDING_RESULT';
  id: string;
  entityType: EmbeddableEntityType;
  entityId: string;
  embedding: number[];  // 384-dimensional vector
  textHash: string;     // SHA-256 hash for change detection
}

/**
 * Batch embedding results.
 */
export interface BatchResultResponse {
  type: 'BATCH_RESULT';
  id: string;
  results: Array<{
    entityType: EmbeddableEntityType;
    entityId: string;
    embedding: number[];
    textHash: string;
  }>;
}

/**
 * Error response.
 */
export interface ErrorResponse {
  type: 'ERROR';
  id: string;
  message: string;
  code?: string;
}

/**
 * Union of all response types
 */
export type WorkerResponse =
  | ModelProgressResponse
  | ModelReadyResponse
  | EmbeddingResultResponse
  | BatchResultResponse
  | ErrorResponse;

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Embedding configuration options.
 */
export interface EmbeddingConfig {
  /** Model to use (default: Xenova/all-MiniLM-L6-v2) */
  model?: string;
  /** Use quantized model for smaller size (default: true) */
  quantized?: boolean;
  /** Maximum text length before truncation */
  maxLength?: number;
}

/**
 * Default embedding configuration.
 */
export const DEFAULT_EMBEDDING_CONFIG: Required<EmbeddingConfig> = {
  model: 'Xenova/all-MiniLM-L6-v2',
  quantized: true,
  maxLength: 512,  // Model's context window
};

/**
 * Embedding dimensions for the default model.
 */
export const EMBEDDING_DIMENSIONS = 384;

/**
 * Generate a unique request ID.
 */
export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
