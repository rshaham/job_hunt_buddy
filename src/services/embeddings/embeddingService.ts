/**
 * Embedding Service
 *
 * High-level service for managing embeddings. Handles:
 * - Worker lifecycle and communication
 * - Text extraction from various entity types
 * - Embedding generation with progress callbacks
 * - Indexing of app content
 *
 * Usage:
 * ```ts
 * import { embeddingService } from './embeddingService';
 *
 * // Initialize (downloads model on first use)
 * await embeddingService.initialize((progress) => {
 *   console.log(`${progress.stage}: ${progress.progress}%`);
 * });
 *
 * // Embed a single job
 * await embeddingService.embedJob(job);
 *
 * // Embed query for search
 * const embedding = await embeddingService.embedText('project management');
 * ```
 *
 * @see workerTypes.ts for message protocol
 * @see vectorStore.ts for storage and search
 */

import type {
  WorkerRequest,
  WorkerResponse,
} from '../../workers/workerTypes';
import { generateRequestId, EMBEDDING_DIMENSIONS } from '../../workers/workerTypes';
import { generateEmbeddingId, deleteEmbeddingsByEntity } from '../db';
import { upsertEmbedding, upsertEmbeddings, loadCache, getTextHash } from './vectorStore';
import type { Job, SavedStory, ContextDocument, QAEntry, Note, EmbeddingRecord, EmbeddableEntityType } from '../../types';

// ============================================================================
// Chunking Configuration
// ============================================================================

/**
 * The all-MiniLM-L6-v2 model has a 512 token limit (~300-400 words).
 * We chunk long texts to ensure all content is searchable.
 */
const CHUNK_SIZE_WORDS = 300;      // Words per chunk
const CHUNK_OVERLAP_WORDS = 50;   // Overlap between chunks for context

/**
 * Split text into overlapping chunks for embedding.
 * Ensures long documents have all content indexed.
 */
function chunkText(text: string): string[] {
  const words = text.split(/\s+/).filter(Boolean);

  // If text fits in one chunk, return as-is
  if (words.length <= CHUNK_SIZE_WORDS) {
    return [text];
  }

  const chunks: string[] = [];
  const step = CHUNK_SIZE_WORDS - CHUNK_OVERLAP_WORDS;

  for (let i = 0; i < words.length; i += step) {
    const chunkWords = words.slice(i, i + CHUNK_SIZE_WORDS);
    chunks.push(chunkWords.join(' '));

    // Stop if we've captured all words
    if (i + CHUNK_SIZE_WORDS >= words.length) {
      break;
    }
  }

  return chunks;
}

/**
 * Compute SHA-256 hash of text for change detection.
 * Used to skip embedding unchanged content.
 */
async function computeHash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Check if content needs (re)embedding by comparing hashes.
 */
async function shouldEmbed(
  entityType: EmbeddableEntityType,
  entityId: string,
  text: string
): Promise<boolean> {
  const currentHash = await computeHash(text);
  const existingHash = await getTextHash(entityType, entityId);
  return currentHash !== existingHash;
}

// ============================================================================
// Types
// ============================================================================

export interface ProgressCallback {
  (progress: {
    stage: 'download' | 'load' | 'ready' | 'error';
    progress: number;
    loaded?: number;
    total?: number;
  }): void;
}

interface PendingRequest {
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
}

// ============================================================================
// Worker Management
// ============================================================================

let worker: Worker | null = null;
let isInitialized = false;
let isInitializing = false;
let initPromise: Promise<void> | null = null;

const pendingRequests = new Map<string, PendingRequest>();

/**
 * Create and configure the embedding worker.
 */
function createWorker(): Worker {
  // Import worker using Vite's worker syntax
  const newWorker = new Worker(
    new URL('../../workers/embedding.worker.ts', import.meta.url),
    { type: 'module' }
  );

  newWorker.onmessage = (event: MessageEvent<WorkerResponse>) => {
    handleWorkerResponse(event.data);
  };

  newWorker.onerror = (error) => {
    console.error('[EmbeddingService] Worker error:', error);
    // Reject all pending requests
    for (const [id, pending] of pendingRequests) {
      pending.reject(new Error(`Worker error: ${error.message}`));
      pendingRequests.delete(id);
    }
  };

  return newWorker;
}

/**
 * Handle responses from the worker.
 */
function handleWorkerResponse(response: WorkerResponse): void {
  const pending = pendingRequests.get(response.id);

  switch (response.type) {
    case 'MODEL_PROGRESS':
      // Progress updates are handled via callback, not resolved
      // The callback is set on the pending request
      if (pending && 'onProgress' in pending) {
        (pending as unknown as { onProgress: ProgressCallback }).onProgress({
          stage: response.stage,
          progress: response.progress,
          loaded: response.loaded,
          total: response.total,
        });
      }
      break;

    case 'MODEL_READY':
      isInitialized = true;
      isInitializing = false;
      if (pending) {
        pending.resolve(undefined);
        pendingRequests.delete(response.id);
      }
      break;

    case 'EMBEDDING_RESULT':
      if (pending) {
        pending.resolve({
          entityType: response.entityType,
          entityId: response.entityId,
          embedding: response.embedding,
          textHash: response.textHash,
        });
        pendingRequests.delete(response.id);
      }
      break;

    case 'BATCH_RESULT':
      if (pending) {
        pending.resolve(response.results);
        pendingRequests.delete(response.id);
      }
      break;

    case 'ERROR':
      if (pending) {
        pending.reject(new Error(response.message));
        pendingRequests.delete(response.id);
      }
      break;
  }
}

/**
 * Send a request to the worker and wait for response.
 */
async function sendRequest<T>(
  request: WorkerRequest,
  onProgress?: ProgressCallback
): Promise<T> {
  if (!worker) {
    worker = createWorker();
  }

  return new Promise<T>((resolve, reject) => {
    const pending: PendingRequest & { onProgress?: ProgressCallback } = {
      resolve: resolve as (result: unknown) => void,
      reject,
    };
    if (onProgress) {
      (pending as { onProgress: ProgressCallback }).onProgress = onProgress;
    }
    pendingRequests.set(request.id, pending);
    worker!.postMessage(request);
  });
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize the embedding service.
 * Downloads the model (~40MB) on first use.
 *
 * @param onProgress - Optional callback for download progress
 * @returns Promise that resolves when model is ready
 */
export async function initialize(onProgress?: ProgressCallback): Promise<void> {
  if (isInitialized) return;

  if (isInitializing && initPromise) {
    return initPromise;
  }

  isInitializing = true;

  initPromise = (async () => {
    try {
      // Load existing embeddings into cache
      await loadCache();

      // Initialize the model in the worker
      await sendRequest<void>(
        { type: 'INIT_MODEL', id: generateRequestId() },
        onProgress
      );

      isInitialized = true;
    } catch (error) {
      isInitializing = false;
      initPromise = null;
      throw error;
    }
  })();

  return initPromise;
}

/**
 * Check if the service is initialized.
 */
export function isReady(): boolean {
  return isInitialized;
}

/**
 * Terminate the worker (for cleanup).
 */
export function terminate(): void {
  if (worker) {
    worker.terminate();
    worker = null;
  }
  isInitialized = false;
  isInitializing = false;
  initPromise = null;
  pendingRequests.clear();
}

// ============================================================================
// Text Extraction
// ============================================================================

/**
 * Extract embeddable text from a job.
 * Combines title, company, and job description.
 */
export function extractJobText(job: Job): string {
  const parts = [
    `${job.title} at ${job.company}`,
    job.jdText,
  ];
  return parts.filter(Boolean).join('\n\n');
}

/**
 * Extract embeddable text from a saved story.
 */
export function extractStoryText(story: SavedStory): string {
  return `${story.question}\n\n${story.answer}`;
}

/**
 * Extract embeddable text from a Q&A entry.
 */
export function extractQAText(qa: QAEntry): string {
  return `Q: ${qa.question}\n\nA: ${qa.answer || ''}`;
}

/**
 * Extract embeddable text from a note.
 */
export function extractNoteText(note: Note): string {
  return note.content;
}

/**
 * Extract embeddable text from a context document.
 * Uses summary if available and enabled, otherwise full text.
 */
export function extractDocumentText(doc: ContextDocument): string {
  if (doc.useSummary && doc.summary) {
    return `${doc.name}\n\n${doc.summary}`;
  }
  return `${doc.name}\n\n${doc.fullText}`;
}

/**
 * Extract embeddable text from a cover letter.
 */
export function extractCoverLetterText(coverLetter: string, job: Job): string {
  return `Cover letter for ${job.title} at ${job.company}\n\n${coverLetter}`;
}

// ============================================================================
// Embedding Operations
// ============================================================================

/**
 * Embed arbitrary text (for queries).
 * Returns the embedding vector.
 */
export async function embedText(text: string): Promise<number[]> {
  if (!isInitialized) {
    await initialize();
  }

  const result = await sendRequest<{
    entityType: EmbeddableEntityType;
    entityId: string;
    embedding: number[];
    textHash: string;
  }>({
    type: 'EMBED_TEXT',
    id: generateRequestId(),
    text,
    entityType: 'job', // Dummy type for query embedding
    entityId: 'query',
  });

  return result.embedding;
}

/**
 * Embed a job and store in vector store.
 * Long job descriptions are chunked to ensure all content is searchable.
 */
export async function embedJob(job: Job): Promise<void> {
  if (!isInitialized) {
    await initialize();
  }

  const text = extractJobText(job);

  // Check if content has changed (skip if unchanged)
  if (!await shouldEmbed('job', job.id, text)) {
    return;
  }

  // Delete old embeddings (may have different chunk count)
  await deleteEmbeddingsByEntity('job', job.id);

  // Chunk text for long JDs
  const chunks = chunkText(text);
  const textHash = await computeHash(text);

  // Embed each chunk
  for (let i = 0; i < chunks.length; i++) {
    const result = await sendRequest<{
      entityType: EmbeddableEntityType;
      entityId: string;
      embedding: number[];
      textHash: string;
    }>({
      type: 'EMBED_TEXT',
      id: generateRequestId(),
      text: chunks[i],
      entityType: 'job',
      entityId: job.id,
    });

    const record: EmbeddingRecord = {
      id: generateEmbeddingId('job', job.id, i),
      entityType: 'job',
      entityId: job.id,
      embedding: result.embedding,
      textHash: textHash, // Same hash for all chunks (for change detection)
      chunkIndex: i,
      chunkTotal: chunks.length,
      createdAt: new Date(),
    };

    await upsertEmbedding(record);
  }
}

/**
 * Embed a saved story and store in vector store.
 */
export async function embedStory(story: SavedStory): Promise<void> {
  if (!isInitialized) {
    await initialize();
  }

  const text = extractStoryText(story);
  const result = await sendRequest<{
    entityType: EmbeddableEntityType;
    entityId: string;
    embedding: number[];
    textHash: string;
  }>({
    type: 'EMBED_TEXT',
    id: generateRequestId(),
    text,
    entityType: 'story',
    entityId: story.id,
  });

  const record: EmbeddingRecord = {
    id: generateEmbeddingId('story', story.id),
    entityType: 'story',
    entityId: story.id,
    embedding: result.embedding,
    textHash: result.textHash,
    createdAt: new Date(),
  };

  await upsertEmbedding(record);
}

/**
 * Embed a Q&A entry and store in vector store.
 */
export async function embedQA(qa: QAEntry, jobId: string): Promise<void> {
  if (!isInitialized) {
    await initialize();
  }

  const text = extractQAText(qa);
  const result = await sendRequest<{
    entityType: EmbeddableEntityType;
    entityId: string;
    embedding: number[];
    textHash: string;
  }>({
    type: 'EMBED_TEXT',
    id: generateRequestId(),
    text,
    entityType: 'qa',
    entityId: qa.id,
  });

  const record: EmbeddingRecord = {
    id: generateEmbeddingId('qa', qa.id),
    entityType: 'qa',
    entityId: qa.id,
    parentJobId: jobId,
    embedding: result.embedding,
    textHash: result.textHash,
    createdAt: new Date(),
  };

  await upsertEmbedding(record);
}

/**
 * Embed a note and store in vector store.
 */
export async function embedNote(note: Note, jobId: string): Promise<void> {
  if (!isInitialized) {
    await initialize();
  }

  const text = extractNoteText(note);
  const result = await sendRequest<{
    entityType: EmbeddableEntityType;
    entityId: string;
    embedding: number[];
    textHash: string;
  }>({
    type: 'EMBED_TEXT',
    id: generateRequestId(),
    text,
    entityType: 'note',
    entityId: note.id,
  });

  const record: EmbeddingRecord = {
    id: generateEmbeddingId('note', note.id),
    entityType: 'note',
    entityId: note.id,
    parentJobId: jobId,
    embedding: result.embedding,
    textHash: result.textHash,
    createdAt: new Date(),
  };

  await upsertEmbedding(record);
}

/**
 * Embed a context document and store in vector store.
 * Long documents are chunked to ensure all content is searchable.
 */
export async function embedDocument(doc: ContextDocument): Promise<void> {
  if (!isInitialized) {
    await initialize();
  }

  const text = extractDocumentText(doc);

  // Check if content has changed (skip if unchanged)
  if (!await shouldEmbed('doc', doc.id, text)) {
    return;
  }

  // Delete old embeddings (may have different chunk count)
  await deleteEmbeddingsByEntity('doc', doc.id);

  // Chunk text for long documents
  const chunks = chunkText(text);
  const textHash = await computeHash(text);

  // Embed each chunk
  for (let i = 0; i < chunks.length; i++) {
    const result = await sendRequest<{
      entityType: EmbeddableEntityType;
      entityId: string;
      embedding: number[];
      textHash: string;
    }>({
      type: 'EMBED_TEXT',
      id: generateRequestId(),
      text: chunks[i],
      entityType: 'doc',
      entityId: doc.id,
    });

    const record: EmbeddingRecord = {
      id: generateEmbeddingId('doc', doc.id, i),
      entityType: 'doc',
      entityId: doc.id,
      embedding: result.embedding,
      textHash: textHash,
      chunkIndex: i,
      chunkTotal: chunks.length,
      createdAt: new Date(),
    };

    await upsertEmbedding(record);
  }
}

/**
 * Embed a cover letter and store in vector store.
 */
export async function embedCoverLetter(coverLetter: string, job: Job): Promise<void> {
  if (!isInitialized) {
    await initialize();
  }

  const text = extractCoverLetterText(coverLetter, job);
  const result = await sendRequest<{
    entityType: EmbeddableEntityType;
    entityId: string;
    embedding: number[];
    textHash: string;
  }>({
    type: 'EMBED_TEXT',
    id: generateRequestId(),
    text,
    entityType: 'coverLetter',
    entityId: job.id,
  });

  const record: EmbeddingRecord = {
    id: generateEmbeddingId('coverLetter', job.id),
    entityType: 'coverLetter',
    entityId: job.id,
    parentJobId: job.id,
    embedding: result.embedding,
    textHash: result.textHash,
    createdAt: new Date(),
  };

  await upsertEmbedding(record);
}

// ============================================================================
// Batch Indexing
// ============================================================================

export interface IndexingProgress {
  current: number;
  total: number;
  entityType: EmbeddableEntityType;
  entityId: string;
}

/**
 * Index all content from jobs and settings.
 * Used for initial indexing and re-indexing.
 *
 * @param jobs - All jobs to index
 * @param stories - All saved stories to index
 * @param documents - All context documents to index
 * @param onProgress - Optional progress callback
 */
export async function indexAll(
  jobs: Job[],
  stories: SavedStory[],
  documents: ContextDocument[],
  onProgress?: (progress: IndexingProgress) => void
): Promise<void> {
  if (!isInitialized) {
    await initialize();
  }

  // Collect all items to index
  const items: Array<{
    text: string;
    entityType: EmbeddableEntityType;
    entityId: string;
    parentJobId?: string;
  }> = [];

  // Jobs
  for (const job of jobs) {
    items.push({
      text: extractJobText(job),
      entityType: 'job',
      entityId: job.id,
    });

    // Job Q&A history
    for (const qa of job.qaHistory) {
      if (qa.answer) { // Only index answered Q&As
        items.push({
          text: extractQAText(qa),
          entityType: 'qa',
          entityId: qa.id,
          parentJobId: job.id,
        });
      }
    }

    // Job notes
    for (const note of job.notes) {
      items.push({
        text: extractNoteText(note),
        entityType: 'note',
        entityId: note.id,
        parentJobId: job.id,
      });
    }

    // Cover letter
    if (job.coverLetter) {
      items.push({
        text: extractCoverLetterText(job.coverLetter, job),
        entityType: 'coverLetter',
        entityId: job.id,
        parentJobId: job.id,
      });
    }
  }

  // Stories
  for (const story of stories) {
    items.push({
      text: extractStoryText(story),
      entityType: 'story',
      entityId: story.id,
    });
  }

  // Documents
  for (const doc of documents) {
    items.push({
      text: extractDocumentText(doc),
      entityType: 'doc',
      entityId: doc.id,
    });
  }

  // Process items one at a time with chunking support
  const records: EmbeddingRecord[] = [];

  // Entity types that should be chunked (long content)
  const chunkableTypes: EmbeddableEntityType[] = ['job', 'doc'];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (onProgress) {
      onProgress({
        current: i + 1,
        total: items.length,
        entityType: item.entityType,
        entityId: item.entityId,
      });
    }

    // Compute hash for change detection
    const textHash = await computeHash(item.text);

    // Chunk long content types, use single chunk for others
    const shouldChunk = chunkableTypes.includes(item.entityType);
    const chunks = shouldChunk ? chunkText(item.text) : [item.text];

    // Embed each chunk
    for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
      const result = await sendRequest<{
        entityType: EmbeddableEntityType;
        entityId: string;
        embedding: number[];
        textHash: string;
      }>({
        type: 'EMBED_TEXT',
        id: generateRequestId(),
        text: chunks[chunkIdx],
        entityType: item.entityType,
        entityId: item.entityId,
      });

      records.push({
        id: generateEmbeddingId(item.entityType, item.entityId, shouldChunk ? chunkIdx : undefined),
        entityType: item.entityType,
        entityId: item.entityId,
        parentJobId: item.parentJobId,
        embedding: result.embedding,
        textHash: textHash,
        chunkIndex: shouldChunk ? chunkIdx : undefined,
        chunkTotal: shouldChunk ? chunks.length : undefined,
        createdAt: new Date(),
      });
    }
  }

  // Save all embeddings
  await upsertEmbeddings(records);
}

// Export embedding dimensions for reference
export { EMBEDDING_DIMENSIONS };
