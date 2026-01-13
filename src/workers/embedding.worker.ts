/**
 * Embedding Web Worker
 *
 * This worker runs in a separate thread to generate embeddings without
 * blocking the main UI thread. It uses transformers.js to run the
 * all-MiniLM-L6-v2 model locally in the browser.
 *
 * Architecture:
 * - Main thread sends requests via postMessage
 * - Worker processes requests and sends back responses
 * - Model is loaded once and cached for subsequent requests
 * - Progress updates are sent during model download/initialization
 *
 * @see workerTypes.ts for message type definitions
 */

import { pipeline, env, type FeatureExtractionPipeline } from '@xenova/transformers';
import {
  type WorkerRequest,
  type WorkerResponse,
  type EmbeddableEntityType,
  DEFAULT_EMBEDDING_CONFIG,
} from './workerTypes';

// ============================================================================
// Local Model Configuration
// ============================================================================

// Configure transformers.js to use local model files
// See: https://huggingface.co/docs/transformers.js/en/api/env
env.localModelPath = '/models/';  // Base path where models are stored
env.allowRemoteModels = false;    // Don't try to fetch from HuggingFace CDN
env.allowLocalModels = true;      // Allow loading from localModelPath
env.useBrowserCache = false;      // Don't use browser cache (use fresh files)

// Model identifier (will be appended to localModelPath)
const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';

// ============================================================================
// Worker State
// ============================================================================

let embeddingPipeline: FeatureExtractionPipeline | null = null;
let isInitializing = false;
let initPromise: Promise<void> | null = null;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Send a response back to the main thread.
 */
function sendResponse(response: WorkerResponse): void {
  self.postMessage(response);
}

/**
 * Compute SHA-256 hash of text for change detection.
 * Used to determine if content needs re-embedding.
 */
async function computeTextHash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Truncate text to model's max length.
 * The model has a context window of 512 tokens.
 */
function truncateText(text: string, maxLength: number): string {
  // Simple character-based truncation (tokens ≈ chars/4 for English)
  // Being conservative to avoid exceeding token limit
  const charLimit = maxLength * 3;
  if (text.length <= charLimit) return text;
  return text.slice(0, charLimit);
}

// ============================================================================
// Model Initialization
// ============================================================================

/**
 * Initialize the embedding model.
 * Downloads the model on first use (~40MB) and caches it in browser storage.
 */
async function initializeModel(requestId: string): Promise<void> {
  // If already initialized, return immediately
  if (embeddingPipeline) {
    sendResponse({ type: 'MODEL_READY', id: requestId });
    return;
  }

  // If already initializing, wait for that to complete
  if (isInitializing && initPromise) {
    await initPromise;
    sendResponse({ type: 'MODEL_READY', id: requestId });
    return;
  }

  isInitializing = true;

  initPromise = (async () => {
    try {
      sendResponse({
        type: 'MODEL_PROGRESS',
        id: requestId,
        stage: 'download',
        progress: 0,
      });

      // Create the feature extraction pipeline
      // Uses local model files from public/models/ directory
      embeddingPipeline = await pipeline(
        'feature-extraction',
        MODEL_NAME,
        {
          quantized: DEFAULT_EMBEDDING_CONFIG.quantized,
          progress_callback: (progress: {
            status: string;
            loaded?: number;
            total?: number;
            progress?: number;
          }) => {
            if (progress.status === 'downloading' || progress.status === 'progress') {
              sendResponse({
                type: 'MODEL_PROGRESS',
                id: requestId,
                stage: 'download',
                progress: progress.progress ?? 0,
                loaded: progress.loaded,
                total: progress.total,
              });
            } else if (progress.status === 'loading') {
              sendResponse({
                type: 'MODEL_PROGRESS',
                id: requestId,
                stage: 'load',
                progress: 50,
              });
            } else if (progress.status === 'ready') {
              sendResponse({
                type: 'MODEL_PROGRESS',
                id: requestId,
                stage: 'ready',
                progress: 100,
              });
            }
          },
        }
      );

      sendResponse({ type: 'MODEL_READY', id: requestId });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to initialize model';
      sendResponse({
        type: 'ERROR',
        id: requestId,
        message,
        code: 'INIT_FAILED',
      });
      throw error;
    } finally {
      isInitializing = false;
    }
  })();

  await initPromise;
}

// ============================================================================
// Embedding Generation
// ============================================================================

/**
 * Generate embedding for a single text.
 */
async function embedText(
  requestId: string,
  text: string,
  entityType: EmbeddableEntityType,
  entityId: string
): Promise<void> {
  try {
    // Ensure model is initialized
    if (!embeddingPipeline) {
      await initializeModel(requestId);
    }

    if (!embeddingPipeline) {
      throw new Error('Model not initialized');
    }

    // Truncate text if needed
    const truncatedText = truncateText(text, DEFAULT_EMBEDDING_CONFIG.maxLength);

    // Compute hash for change detection
    const textHash = await computeTextHash(text);

    // Generate embedding
    // The model returns a tensor, we need to extract the values
    const output = await embeddingPipeline(truncatedText, {
      pooling: 'mean',
      normalize: true,
    });

    // Convert tensor to array
    const embedding = Array.from(output.data as Float32Array);

    sendResponse({
      type: 'EMBEDDING_RESULT',
      id: requestId,
      entityType,
      entityId,
      embedding,
      textHash,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate embedding';
    sendResponse({
      type: 'ERROR',
      id: requestId,
      message,
      code: 'EMBED_FAILED',
    });
  }
}

/**
 * Generate embeddings for multiple texts in batch.
 * More efficient than individual requests.
 */
async function embedBatch(
  requestId: string,
  items: Array<{
    text: string;
    entityType: EmbeddableEntityType;
    entityId: string;
  }>
): Promise<void> {
  try {
    // Ensure model is initialized
    if (!embeddingPipeline) {
      await initializeModel(requestId);
    }

    if (!embeddingPipeline) {
      throw new Error('Model not initialized');
    }

    const results: Array<{
      entityType: EmbeddableEntityType;
      entityId: string;
      embedding: number[];
      textHash: string;
    }> = [];

    // Process items one at a time (transformers.js handles batching internally)
    // We could batch the texts array, but individual processing gives better error handling
    for (const item of items) {
      const truncatedText = truncateText(item.text, DEFAULT_EMBEDDING_CONFIG.maxLength);
      const textHash = await computeTextHash(item.text);

      const output = await embeddingPipeline(truncatedText, {
        pooling: 'mean',
        normalize: true,
      });

      const embedding = Array.from(output.data as Float32Array);

      results.push({
        entityType: item.entityType,
        entityId: item.entityId,
        embedding,
        textHash,
      });
    }

    sendResponse({
      type: 'BATCH_RESULT',
      id: requestId,
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate batch embeddings';
    sendResponse({
      type: 'ERROR',
      id: requestId,
      message,
      code: 'BATCH_FAILED',
    });
  }
}

// ============================================================================
// Message Handler
// ============================================================================

/**
 * Handle incoming messages from the main thread.
 */
self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;

  switch (request.type) {
    case 'INIT_MODEL':
      await initializeModel(request.id);
      break;

    case 'EMBED_TEXT':
      await embedText(request.id, request.text, request.entityType, request.entityId);
      break;

    case 'EMBED_BATCH':
      await embedBatch(request.id, request.items);
      break;

    default: {
      // TypeScript exhaustiveness check
      const _exhaustiveCheck: never = request;
      sendResponse({
        type: 'ERROR',
        id: (_exhaustiveCheck as WorkerRequest).id || 'unknown',
        message: 'Unknown request type',
        code: 'UNKNOWN_REQUEST',
      });
    }
  }
};

// Signal that worker is ready
console.log('[EmbeddingWorker] Worker initialized and ready for messages');
