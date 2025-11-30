import { create } from 'zustand';
import type { Job, AppSettings, Status, ContextDocument, SavedStory } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import * as db from '../services/db';
import { generateId } from '../utils/helpers';

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
    return job;
  },

  updateJob: async (id, updates) => {
    await db.updateJob(id, updates);
    set((state) => ({
      jobs: state.jobs.map((job) =>
        job.id === id ? { ...job, ...updates, lastUpdated: new Date() } : job
      ),
    }));
  },

  deleteJob: async (id) => {
    await db.deleteJob(id);
    set((state) => ({
      jobs: state.jobs.filter((job) => job.id !== id),
      selectedJobId: state.selectedJobId === id ? null : state.selectedJobId,
    }));
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
    return newDoc;
  },

  updateContextDocument: async (id, updates) => {
    const { settings } = get();
    const newDocuments = (settings.contextDocuments || []).map((doc) =>
      doc.id === id ? { ...doc, ...updates } : doc
    );
    await get().updateSettings({ contextDocuments: newDocuments });
  },

  deleteContextDocument: async (id) => {
    const { settings } = get();
    const newDocuments = (settings.contextDocuments || []).filter((doc) => doc.id !== id);
    await get().updateSettings({ contextDocuments: newDocuments });
  },

  // Saved story actions
  updateSavedStory: async (id, updates) => {
    const { settings } = get();
    const newStories = (settings.savedStories || []).map((story) =>
      story.id === id ? { ...story, ...updates } : story
    );
    await get().updateSettings({ savedStories: newStories });
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
