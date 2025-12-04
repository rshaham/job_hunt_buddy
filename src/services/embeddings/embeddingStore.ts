/**
 * Embedding Store (Zustand)
 *
 * Manages embedding system state for the UI:
 * - Model initialization status and progress
 * - Indexing progress
 * - Error states
 *
 * This store is designed for React components to observe embedding state.
 * The actual embedding logic is in embeddingService.ts.
 *
 * @see embeddingService.ts for embedding operations
 */

import { create } from 'zustand';
import type { EmbeddingStatus } from '../../types';
import {
  initialize as initializeService,
  indexAll,
  embedJob,
  embedStory,
  embedQA,
  embedNote,
  embedDocument,
  embedCoverLetter,
  type IndexingProgress,
} from './embeddingService';
import { getStats, removeEmbeddingsForJob } from './vectorStore';
import type { Job, SavedStory, ContextDocument, QAEntry, Note } from '../../types';

// ============================================================================
// Store Types
// ============================================================================

interface EmbeddingState extends EmbeddingStatus {
  // Indexing state
  isIndexing: boolean;
  indexingProgress: IndexingProgress | null;

  // Actions
  initialize: () => Promise<void>;
  indexAllContent: (
    jobs: Job[],
    stories: SavedStory[],
    documents: ContextDocument[]
  ) => Promise<void>;

  // Individual embedding actions (for incremental updates)
  embedJobContent: (job: Job) => Promise<void>;
  embedStoryContent: (story: SavedStory) => Promise<void>;
  embedQAContent: (qa: QAEntry, jobId: string) => Promise<void>;
  embedNoteContent: (note: Note, jobId: string) => Promise<void>;
  embedDocumentContent: (doc: ContextDocument) => Promise<void>;
  embedCoverLetterContent: (coverLetter: string, job: Job) => Promise<void>;

  // Cleanup
  removeJobEmbeddings: (jobId: string) => Promise<void>;

  // Stats
  refreshStats: () => Promise<void>;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useEmbeddingStore = create<EmbeddingState>((set, get) => ({
  // Initial state
  isReady: false,
  isLoading: false,
  progress: 0,
  stage: 'idle',
  error: undefined,
  indexedCount: 0,
  pendingCount: 0,

  // Indexing state
  isIndexing: false,
  indexingProgress: null,

  /**
   * Initialize the embedding system.
   * Downloads model on first use (~40MB).
   */
  initialize: async () => {
    // Skip if already ready or loading
    if (get().isReady || get().isLoading) {
      return;
    }

    set({ isLoading: true, stage: 'download', progress: 0 });

    try {
      await initializeService((progress) => {
        set({
          stage: progress.stage,
          progress: progress.progress,
        });
      });

      // Get initial stats
      const stats = await getStats();

      set({
        isReady: true,
        isLoading: false,
        stage: 'ready',
        progress: 100,
        indexedCount: stats.total,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to initialize embeddings';
      set({
        isReady: false,
        isLoading: false,
        stage: 'error',
        error: message,
      });
      throw error;
    }
  },

  /**
   * Index all application content.
   */
  indexAllContent: async (jobs, stories, documents) => {
    const state = get();

    // Initialize if needed
    if (!state.isReady && !state.isLoading) {
      await get().initialize();
    }

    set({ isIndexing: true, indexingProgress: null });

    try {
      await indexAll(jobs, stories, documents, (progress) => {
        set({ indexingProgress: progress });
      });

      const stats = await getStats();
      set({
        isIndexing: false,
        indexingProgress: null,
        indexedCount: stats.total,
      });
    } catch (error) {
      set({ isIndexing: false, indexingProgress: null });
      throw error;
    }
  },

  /**
   * Embed a single job.
   */
  embedJobContent: async (job) => {
    const state = get();
    if (!state.isReady && !state.isLoading) {
      await get().initialize();
    }

    await embedJob(job);
    await get().refreshStats();
  },

  /**
   * Embed a saved story.
   */
  embedStoryContent: async (story) => {
    const state = get();
    if (!state.isReady && !state.isLoading) {
      await get().initialize();
    }

    await embedStory(story);
    await get().refreshStats();
  },

  /**
   * Embed a Q&A entry.
   */
  embedQAContent: async (qa, jobId) => {
    const state = get();
    if (!state.isReady && !state.isLoading) {
      await get().initialize();
    }

    await embedQA(qa, jobId);
    await get().refreshStats();
  },

  /**
   * Embed a note.
   */
  embedNoteContent: async (note, jobId) => {
    const state = get();
    if (!state.isReady && !state.isLoading) {
      await get().initialize();
    }

    await embedNote(note, jobId);
    await get().refreshStats();
  },

  /**
   * Embed a context document.
   */
  embedDocumentContent: async (doc) => {
    const state = get();
    if (!state.isReady && !state.isLoading) {
      await get().initialize();
    }

    await embedDocument(doc);
    await get().refreshStats();
  },

  /**
   * Embed a cover letter.
   */
  embedCoverLetterContent: async (coverLetter, job) => {
    const state = get();
    if (!state.isReady && !state.isLoading) {
      await get().initialize();
    }

    await embedCoverLetter(coverLetter, job);
    await get().refreshStats();
  },

  /**
   * Remove all embeddings for a job.
   */
  removeJobEmbeddings: async (jobId) => {
    await removeEmbeddingsForJob(jobId);
    await get().refreshStats();
  },

  /**
   * Refresh embedding statistics.
   */
  refreshStats: async () => {
    try {
      const stats = await getStats();
      set({ indexedCount: stats.total });
    } catch (error) {
      console.error('[EmbeddingStore] Failed to refresh stats:', error);
    }
  },
}));

// ============================================================================
// Selectors
// ============================================================================

/**
 * Select just the status portion of the store.
 */
export function selectEmbeddingStatus(state: EmbeddingState): EmbeddingStatus {
  return {
    isReady: state.isReady,
    isLoading: state.isLoading,
    progress: state.progress,
    stage: state.stage,
    error: state.error,
    indexedCount: state.indexedCount,
    pendingCount: state.pendingCount,
  };
}

/**
 * Select indexing progress.
 */
export function selectIndexingProgress(state: EmbeddingState): {
  isIndexing: boolean;
  progress: IndexingProgress | null;
} {
  return {
    isIndexing: state.isIndexing,
    progress: state.indexingProgress,
  };
}
