import { create } from 'zustand';
import type { Job, AppSettings, Status, ContextDocument, SavedStory, CareerCoachState, CareerCoachEntry, UserSkillProfile, SkillCategory, SkillEntry } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import * as db from '../services/db';
import { generateId } from '../utils/helpers';
import { useEmbeddingStore } from '../services/embeddings';

// ============================================================================
// Embedding Integration Helpers
// ============================================================================

/**
 * Trigger background embedding for a job.
 * Non-blocking - doesn't wait for embedding to complete.
 */
function triggerJobEmbedding(job: Job): void {
  // Use setTimeout to ensure this runs after the current call stack
  setTimeout(() => {
    useEmbeddingStore.getState().embedJobContent(job).catch((error) => {
      console.warn('[AppStore] Failed to embed job:', error);
    });
  }, 0);
}

/**
 * Trigger background embedding for a story.
 */
function triggerStoryEmbedding(story: SavedStory): void {
  setTimeout(() => {
    useEmbeddingStore.getState().embedStoryContent(story).catch((error) => {
      console.warn('[AppStore] Failed to embed story:', error);
    });
  }, 0);
}

/**
 * Trigger background embedding for a document.
 */
function triggerDocumentEmbedding(doc: ContextDocument): void {
  setTimeout(() => {
    useEmbeddingStore.getState().embedDocumentContent(doc).catch((error) => {
      console.warn('[AppStore] Failed to embed document:', error);
    });
  }, 0);
}

/**
 * Remove embeddings for a deleted job.
 */
function triggerJobEmbeddingRemoval(jobId: string): void {
  setTimeout(() => {
    useEmbeddingStore.getState().removeJobEmbeddings(jobId).catch((error) => {
      console.warn('[AppStore] Failed to remove job embeddings:', error);
    });
  }, 0);
}

interface AppState {
  // Jobs
  jobs: Job[];
  selectedJobId: string | null;
  isLoading: boolean;

  // Settings
  settings: AppSettings;

  // UI State
  isAddJobModalOpen: boolean;
  isSettingsModalOpen: boolean;
  isGettingStartedModalOpen: boolean;
  isPrivacyModalOpen: boolean;
  isFeatureGuideModalOpen: boolean;
  isCareerCoachModalOpen: boolean;
  isJobFinderModalOpen: boolean;

  // Career Coach State
  careerCoachState: CareerCoachState;

  // Actions
  loadData: () => Promise<void>;
  addJob: (job: Omit<Job, 'id' | 'dateAdded' | 'lastUpdated'>) => Promise<Job>;
  updateJob: (id: string, updates: Partial<Job>) => Promise<void>;
  deleteJob: (id: string) => Promise<void>;
  moveJob: (id: string, newStatus: string) => Promise<void>;
  selectJob: (id: string | null) => void;

  // Settings actions
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  addStatus: (status: Omit<Status, 'id' | 'order'>) => Promise<void>;
  removeStatus: (id: string) => Promise<void>;
  reorderStatuses: (statuses: Status[]) => Promise<void>;

  // Context document actions
  addContextDocument: (doc: Omit<ContextDocument, 'id' | 'createdAt'>) => Promise<ContextDocument>;
  updateContextDocument: (id: string, updates: Partial<ContextDocument>) => Promise<void>;
  deleteContextDocument: (id: string) => Promise<void>;

  // Saved story actions
  updateSavedStory: (id: string, updates: Partial<SavedStory>) => Promise<void>;

  // UI actions
  openAddJobModal: () => void;
  closeAddJobModal: () => void;
  openSettingsModal: () => void;
  closeSettingsModal: () => void;
  openGettingStartedModal: () => void;
  closeGettingStartedModal: () => void;
  openPrivacyModal: () => void;
  closePrivacyModal: () => void;
  openFeatureGuideModal: () => void;
  closeFeatureGuideModal: () => void;
  openCareerCoachModal: () => void;
  closeCareerCoachModal: () => void;
  openJobFinderModal: () => void;
  closeJobFinderModal: () => void;

  // Career Coach actions
  addCareerCoachEntry: (entry: Omit<CareerCoachEntry, 'id' | 'timestamp'>) => void;
  clearCareerCoachHistory: () => void;
  updateSkillProfile: (profile: UserSkillProfile) => void;
  addSkill: (skill: string, category: SkillCategory) => void;
  removeSkill: (skillName: string) => void;
  updateSkillCategory: (skillName: string, category: SkillCategory) => void;

  // Data management
  deleteAllData: () => Promise<void>;

  // Export/Import
  exportData: () => Promise<string>;
  importData: (jsonData: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  jobs: [],
  selectedJobId: null,
  isLoading: true,
  settings: DEFAULT_SETTINGS,
  isAddJobModalOpen: false,
  isSettingsModalOpen: false,
  isGettingStartedModalOpen: false,
  isPrivacyModalOpen: false,
  isFeatureGuideModalOpen: false,
  isCareerCoachModalOpen: false,
  isJobFinderModalOpen: false,
  careerCoachState: { history: [] },

  // Load initial data
  loadData: async () => {
    set({ isLoading: true });
    try {
      const [jobs, settings] = await Promise.all([
        db.getAllJobs(),
        db.getSettings(),
      ]);

      // Migrate old settings format (apiKey at root level) to new provider format
      if (settings.apiKey && !settings.providers) {
        settings.activeProvider = 'anthropic';
        settings.providers = {
          anthropic: {
            apiKey: settings.apiKey,
            model: settings.model || 'claude-sonnet-4-5',
          },
          'openai-compatible': { apiKey: '', model: 'llama3.2', baseUrl: 'http://localhost:11434/v1' },
          gemini: { apiKey: '', model: 'gemini-1.5-flash' },
        };
        // Save migrated settings
        await db.saveSettings(settings);
      }

      set({ jobs, settings, isLoading: false });

      // Auto-initialize embeddings in the background
      // Non-blocking - app is functional while embeddings load
      setTimeout(() => {
        useEmbeddingStore.getState().initialize().then(() => {
          // After model is ready, index any unindexed content
          const state = get();
          useEmbeddingStore.getState().indexAllContent(
            state.jobs,
            state.settings.savedStories || [],
            state.settings.contextDocuments || []
          ).catch((error) => {
            console.warn('[AppStore] Background indexing failed:', error);
          });
        }).catch((error) => {
          console.warn('[AppStore] Embedding initialization failed:', error);
        });
      }, 100); // Small delay to let UI render first
    } catch (error) {
      console.error('Failed to load data:', error);
      set({ isLoading: false });
    }
  },

  // Job actions
  addJob: async (jobData) => {
    const now = new Date();
    const job: Job = {
      ...jobData,
      id: generateId(),
      dateAdded: now,
      lastUpdated: now,
    };

    await db.createJob(job);
    set((state) => ({ jobs: [...state.jobs, job] }));

    // Trigger background embedding
    triggerJobEmbedding(job);

    return job;
  },

  updateJob: async (id, updates) => {
    await db.updateJob(id, updates);
    set((state) => ({
      jobs: state.jobs.map((job) =>
        job.id === id ? { ...job, ...updates, lastUpdated: new Date() } : job
      ),
    }));

    // Re-embed if embeddable content changed
    const embeddableFields = ['jdText', 'notes', 'qaHistory', 'coverLetter'];
    if (embeddableFields.some((field) => field in updates)) {
      const job = get().jobs.find((j) => j.id === id);
      if (job) {
        triggerJobEmbedding(job);
      }
    }
  },

  deleteJob: async (id) => {
    await db.deleteJob(id);
    set((state) => ({
      jobs: state.jobs.filter((job) => job.id !== id),
      selectedJobId: state.selectedJobId === id ? null : state.selectedJobId,
    }));

    // Remove job embeddings
    triggerJobEmbeddingRemoval(id);
  },

  moveJob: async (id, newStatus) => {
    await db.updateJob(id, { status: newStatus });
    set((state) => ({
      jobs: state.jobs.map((job) =>
        job.id === id ? { ...job, status: newStatus, lastUpdated: new Date() } : job
      ),
    }));
  },

  selectJob: (id) => {
    set({ selectedJobId: id });
  },

  // Settings actions
  updateSettings: async (updates) => {
    const newSettings = { ...get().settings, ...updates };
    await db.saveSettings(newSettings);
    set({ settings: newSettings });

    // Apply theme
    if (updates.theme) {
      document.documentElement.classList.toggle('dark', updates.theme === 'dark');
    }
  },

  addStatus: async (statusData) => {
    const { settings } = get();
    const newStatus: Status = {
      ...statusData,
      id: generateId(),
      order: settings.statuses.length,
    };
    const newStatuses = [...settings.statuses, newStatus];
    await get().updateSettings({ statuses: newStatuses });
  },

  removeStatus: async (id) => {
    const { settings, jobs } = get();
    // Don't remove if jobs are using this status
    const statusInUse = jobs.some((job) => {
      const status = settings.statuses.find((s) => s.id === id);
      return status && job.status === status.name;
    });

    if (statusInUse) {
      throw new Error('Cannot remove status that is in use by jobs');
    }

    const newStatuses = settings.statuses
      .filter((s) => s.id !== id)
      .map((s, i) => ({ ...s, order: i }));
    await get().updateSettings({ statuses: newStatuses });
  },

  reorderStatuses: async (statuses) => {
    await get().updateSettings({ statuses });
  },

  // Context document actions
  addContextDocument: async (docData) => {
    const { settings } = get();
    const newDoc: ContextDocument = {
      ...docData,
      id: generateId(),
      createdAt: new Date(),
    };
    const newDocuments = [...(settings.contextDocuments || []), newDoc];
    await get().updateSettings({ contextDocuments: newDocuments });

    // Trigger background embedding
    triggerDocumentEmbedding(newDoc);

    return newDoc;
  },

  updateContextDocument: async (id, updates) => {
    const { settings } = get();
    const newDocuments = (settings.contextDocuments || []).map((doc) =>
      doc.id === id ? { ...doc, ...updates } : doc
    );
    await get().updateSettings({ contextDocuments: newDocuments });

    // Re-embed if content changed
    if ('fullText' in updates || 'summary' in updates || 'useSummary' in updates) {
      const doc = newDocuments.find((d) => d.id === id);
      if (doc) {
        triggerDocumentEmbedding(doc);
      }
    }
  },

  deleteContextDocument: async (id) => {
    const { settings } = get();
    const newDocuments = (settings.contextDocuments || []).filter((doc) => doc.id !== id);
    await get().updateSettings({ contextDocuments: newDocuments });

    // Remove document embedding
    setTimeout(() => {
      import('../services/embeddings').then(({ removeEmbeddingsByEntity }) => {
        removeEmbeddingsByEntity('doc', id).catch((error) => {
          console.warn('[AppStore] Failed to remove document embedding:', error);
        });
      });
    }, 0);
  },

  // Saved story actions
  updateSavedStory: async (id, updates) => {
    const { settings } = get();
    const newStories = (settings.savedStories || []).map((story) =>
      story.id === id ? { ...story, ...updates } : story
    );
    await get().updateSettings({ savedStories: newStories });

    // Re-embed if content changed
    if ('question' in updates || 'answer' in updates) {
      const story = newStories.find((s) => s.id === id);
      if (story) {
        triggerStoryEmbedding(story);
      }
    }
  },

  // UI actions
  openAddJobModal: () => set({ isAddJobModalOpen: true }),
  closeAddJobModal: () => set({ isAddJobModalOpen: false }),
  openSettingsModal: () => set({ isSettingsModalOpen: true }),
  closeSettingsModal: () => set({ isSettingsModalOpen: false }),
  openGettingStartedModal: () => set({ isGettingStartedModalOpen: true }),
  closeGettingStartedModal: () => set({ isGettingStartedModalOpen: false }),
  openPrivacyModal: () => set({ isPrivacyModalOpen: true }),
  closePrivacyModal: () => set({ isPrivacyModalOpen: false }),
  openFeatureGuideModal: () => set({ isFeatureGuideModalOpen: true }),
  closeFeatureGuideModal: () => set({ isFeatureGuideModalOpen: false }),
  openCareerCoachModal: () => set({ isCareerCoachModalOpen: true }),
  closeCareerCoachModal: () => set({ isCareerCoachModalOpen: false }),
  openJobFinderModal: () => set({ isJobFinderModalOpen: true }),
  closeJobFinderModal: () => set({ isJobFinderModalOpen: false }),

  // Career Coach actions
  addCareerCoachEntry: (entry) => {
    const newEntry: CareerCoachEntry = {
      ...entry,
      id: generateId(),
      timestamp: new Date(),
    };
    set((state) => ({
      careerCoachState: {
        ...state.careerCoachState,
        history: [...state.careerCoachState.history, newEntry],
      },
    }));
  },

  clearCareerCoachHistory: () => {
    set((state) => ({
      careerCoachState: {
        ...state.careerCoachState,
        history: [],
        lastAnalyzedAt: undefined,
      },
    }));
  },

  updateSkillProfile: (profile) => {
    set((state) => ({
      careerCoachState: {
        ...state.careerCoachState,
        skillProfile: profile,
      },
    }));
  },

  addSkill: (skill, category) => {
    set((state) => {
      const existingSkills = state.careerCoachState.skillProfile?.skills || [];
      // Check for duplicates (case-insensitive)
      if (existingSkills.some(s => s.skill.toLowerCase() === skill.toLowerCase())) {
        return state; // Don't add duplicate
      }
      const newSkill: SkillEntry = {
        skill,
        category,
        source: 'manual',
        addedAt: new Date(),
      };
      return {
        careerCoachState: {
          ...state.careerCoachState,
          skillProfile: {
            skills: [...existingSkills, newSkill],
            lastExtractedAt: state.careerCoachState.skillProfile?.lastExtractedAt,
          },
        },
      };
    });
  },

  removeSkill: (skillName) => {
    set((state) => {
      const existingSkills = state.careerCoachState.skillProfile?.skills || [];
      return {
        careerCoachState: {
          ...state.careerCoachState,
          skillProfile: {
            skills: existingSkills.filter(s => s.skill.toLowerCase() !== skillName.toLowerCase()),
            lastExtractedAt: state.careerCoachState.skillProfile?.lastExtractedAt,
          },
        },
      };
    });
  },

  updateSkillCategory: (skillName, category) => {
    set((state) => {
      const existingSkills = state.careerCoachState.skillProfile?.skills || [];
      return {
        careerCoachState: {
          ...state.careerCoachState,
          skillProfile: {
            skills: existingSkills.map(s =>
              s.skill.toLowerCase() === skillName.toLowerCase()
                ? { ...s, category }
                : s
            ),
            lastExtractedAt: state.careerCoachState.skillProfile?.lastExtractedAt,
          },
        },
      };
    });
  },

  // Data management
  deleteAllData: async () => {
    await db.deleteAllData();
    set({ jobs: [], settings: DEFAULT_SETTINGS, selectedJobId: null });
  },

  // Export/Import
  exportData: async () => {
    const data = await db.exportData();
    return JSON.stringify(data, null, 2);
  },

  importData: async (jsonData) => {
    // Parse JSON and let db.importData validate the schema
    let data: unknown;
    try {
      data = JSON.parse(jsonData);
    } catch {
      throw new Error('Invalid JSON format');
    }
    await db.importData(data);
    await get().loadData();
  },
}));
